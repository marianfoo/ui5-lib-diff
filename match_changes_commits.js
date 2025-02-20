/**
 * createMatchFile-main.js
 *
 * Spawns multiple workers. Each worker:
 *  - Receives the entire commits array
 *  - Builds a Map of cleaned commit messages => commits
 *  - Matches a subset of notes
 *
 * Finally we combine all match results into commits-changes-match.json
 *
 * NOTE: We no longer use multi-threading. Instead, we perform the matching logic
 * in a single pass, incorporating the logic from match_changes_commits-worker.js.
 */

const fs = require('fs');
const path = require('path');

// Directories containing note JSON
const changesDirs = ['changesSAPUI5', 'changesOpenUI5'];
const commitsFilePath = './openui5-commits.json';
const outputMatchFile = 'commits-changes-match.json';

/**
 * Gather all notes from the changes directories.
 * Each note => { noteId, text, (optional) sha }
 * (If no "id" in the JSON, generate one.)
 */
function loadAllNotes() {
  let uniqueIdCounter = 0;
  const allNotes = [];

  for (const dir of changesDirs) {
    const versions = fs.readdirSync(dir);
    for (const version of versions) {
      const versionPath = path.join(dir, version);
      const files = fs.readdirSync(versionPath);
      for (const f of files) {
        const filePath = path.join(versionPath, f);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        // data format: { [versionKey]: { date, notes: [...] }, ... }
        Object.values(data).forEach(({ notes }) => {
          notes.forEach(n => {
            // Skip null/undefined notes
            if (!n) return;
            const noteId = n.id ? n.id : `generated-${++uniqueIdCounter}`;
            // The note may or may not have a 'sha' property
            allNotes.push({ noteId, text: n.text, sha: n.sha });
          });
        });
      }
    }
  }
  return allNotes;
}

/**
 * Utility: tokenize string into lowercase words
 * e.g. "Merge [FIX] sap.f.Card" => ["merge", "fix", "sap", "f", "card"]
 */
function tokenize(str) {
  return str
    .toLowerCase()
    // split on non-alphanumeric (keep letters/numbers only)
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
}

/**
 * Build the inverted index: Map<token, commit[]>
 *
 * We'll store each commit in a structure with:
 * {
 *   lowerMsg,      // the full message in lowercase
 *   originalMsg,   // the original commit message
 *   date,          // for picking newest
 *   sha            // commit SHA
 * }
 */
function buildInvertedIndex(commits) {
  const index = new Map();

  for (const c of commits) {
    const lowerMsg = c.message.toLowerCase();
    const tokens = tokenize(lowerMsg);

    const commitObj = {
      lowerMsg,
      originalMsg: c.message,
      date: c.date,
      sha: c.sha
    };

    // Insert into inverted index (token -> array of commit objects)
    const uniqueTokens = new Set(tokens); // avoid duplicates
    for (const t of uniqueTokens) {
      if (!index.has(t)) {
        index.set(t, []);
      }
      index.get(t).push(commitObj);
    }
  }

  return index;
}

/**
 * For each note, do these steps:
 * 1) tokenize note text => tokens
 * 2) intersect sets of commits for each token
 * 3) do a final .includes() check for the entire note text (lowercase) among the candidates
 * 4) skip merges if possible
 * 5) pick newest
 */
function findMatchingCommit(noteText, invertedIndex) {
  // Add null check for noteText
  if (noteText == null) return null;

  const noteLower = noteText.trim().toLowerCase();
  if (!noteLower) return null;

  // Tokenize the note text
  const tokens = tokenize(noteLower);
  if (tokens.length === 0) {
    return null;
  }

  // Intersect commits for each token
  const firstTokenCommits = invertedIndex.get(tokens[0]) || [];
  let candidateCommits = firstTokenCommits;

  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i];
    const tokenCommits = invertedIndex.get(t) || [];
    const tokenSet = new Set(tokenCommits);
    candidateCommits = candidateCommits.filter(c => tokenSet.has(c));

    if (candidateCommits.length === 0) {
      return null;
    }
  }

  // Now we verify the entire note is a substring (non-merge first, fallback to merges)
  const nonMergeMatches = candidateCommits.filter(c => {
    return !c.lowerMsg.startsWith('merge') && c.lowerMsg.includes(noteLower);
  });

  const finalMatches = nonMergeMatches.length > 0
    ? nonMergeMatches
    : candidateCommits.filter(c => c.lowerMsg.includes(noteLower));

  if (finalMatches.length === 0) {
    return null;
  }

  // If multiple remain, pick the newest
  finalMatches.sort((a, b) => new Date(b.date) - new Date(a.date));
  return finalMatches[0];
}

async function run() {
  console.time('Total matching');

  // 1) Load commits data once
  console.time('Reading commits');
  const commitsData = JSON.parse(fs.readFileSync(commitsFilePath, 'utf8'));
  console.timeEnd('Reading commits');

  // 2) Collect all notes
  console.time('Loading notes');
  const notesArray = loadAllNotes();
  console.timeEnd('Loading notes');
  console.log(`Collected ${notesArray.length} notes total.`);

  // Build the inverted index from commits
  console.time('Building inverted index');
  const invertedIndex = buildInvertedIndex(commitsData);
  console.timeEnd('Building inverted index');

  // 3) Match each note against the inverted index in a single pass
  console.time('Matching notes');
  const results = [];
  for (const note of notesArray) {
    // If note already has a sha assigned, skip
    if (note.sha) {
      continue;
    }
    // Otherwise, try to find a matching commit
    const matchedCommit = findMatchingCommit(note.text, invertedIndex);
    if (matchedCommit) {
      results.push({ sha: matchedCommit.sha, noteId: note.noteId });
    } else {
      // If no commit found, mark with NO_COMMIT_FOUND
      results.push({ sha: "NO_COMMIT_FOUND", noteId: note.noteId });
    }
  }
  console.timeEnd('Matching notes');

  // 4) Filter out duplicates by noteId
  const seenNoteIds = new Set();
  const uniqueResults = results.filter(result => {
    if (seenNoteIds.has(result.noteId)) {
      return false;
    }
    seenNoteIds.add(result.noteId);
    return true;
  });

  // 5) Write out final match file
  fs.writeFileSync(outputMatchFile, JSON.stringify(uniqueResults, null, 2));
  console.log(`✅ Wrote ${uniqueResults.length} matched notes (including NO_COMMIT_FOUND) to ${outputMatchFile}`);

  // If duplicates were removed
  if (uniqueResults.length < results.length) {
    console.warn(`⚠️  Removed ${results.length - uniqueResults.length} duplicate notes`);
  }

  console.timeEnd('Total matching');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
