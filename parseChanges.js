const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const changesDirs = ['changesSAPUI5', 'changesOpenUI5'];
const outputDir = 'de.marianzeis.ui5libdiff/webapp/data';
const outputFiles = ['consolidatedSAPUI5.json', 'consolidatedOpenUI5.json'];
const commitsFile = './openui5-commits.json.gz';
const matchesFile = './commits-changes-match.json';

// Load files once at the start
const matchesData = JSON.parse(fs.readFileSync(matchesFile, 'utf8'));
// Read and decompress the gzipped commits file
const compressedCommitsData = fs.readFileSync(commitsFile);
const commitsData = JSON.parse(zlib.gunzipSync(compressedCommitsData).toString('utf8'));

function findMatchingCommit(note, commits) {
    // Find the matching entry using note.id
    const match = matchesData.find(m => m.noteId === note.id);
    if (!match) return null;
    
    // Find the corresponding commit using the sha
    const commit = commits.find(c => c.sha === match.sha);
    return commit || null;
}

function extractDataFromFile(filePath) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const filename = path.basename(filePath);
    const libraryName = filename.split('-')[0];

    const output = {};

    for (const [key, value] of Object.entries(data)) {
        try {
            const notes = value['notes'].map(note => {
                let matchingCommit = undefined;
                try {
                    matchingCommit = findMatchingCommit(note, commitsData);
                } catch (error) {
                    console.error(`Error finding matching commit for note ${note.id}: ${error}`);
                }
                return {
                    type: note.type,
                    text: note.text,
                    commit_url: matchingCommit ? matchingCommit.url : null,
                    id: note.id || `${note.type}_${note.text.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}`
                };
            });

            if (!output[key]) {
                output[key] = {
                    date: value.date,  // <-- Capture the date here
                    libraries: []
                };
            }
            output[key].libraries.push({
                library: libraryName,
                changes: notes
            });
        } catch (error) {
            console.error(`Error parsing ${filePath}: ${error}`);
        }
    }

    return output;
}


function sortChangesByType(changes) {
    return changes.sort((a, b) => {
        if (a.type === "FEATURE" && b.type !== "FEATURE") return -1;
        if (b.type === "FEATURE" && a.type !== "FEATURE") return 1;
        return 0;
    });
}

function transformDateString(dateStr) {
    const monthNames = [
        "January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"
    ];

    const monthAbbreviations = monthNames.map(m => m.substr(0, 3)); // ["Jan", "Feb", ...]
    const monthExtendedAbbreviations = [...monthAbbreviations, "Sept"];  // Adding "Sept" as an extra abbreviation for September

    let month, year;

    // Case: "YYYY"
    if (/^\d{4}$/.test(dateStr)) {
        year = dateStr;
        month = 1; // Default to January

    // Case: "YYYY-MM-DD"
    } else if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) {
        [year, month] = dateStr.split('-');

    // Case: "Mon YYYY" or "Monn YYYY"
    } else {
        const parts = dateStr.split(' ');
        month = monthNames.indexOf(parts[0]) + 1;
        if (month === 0) { // If not found in full month names, check abbreviations
            month = monthAbbreviations.indexOf(parts[0]) + 1;
            if (month === 0) {  // If not found in standard abbreviations, check extended abbreviations
                month = monthExtendedAbbreviations.indexOf(parts[0]) + 1;
            }
        }
        year = parts[1];
    }

    if (!year || month === 0) {
        console.error(`Invalid date string encountered: "${dateStr}"`);
        return `${year || 'undefined'}.${month.toString().padStart(2, '0')}.01`;
    }

    return `${year}.${month.toString().padStart(2, '0')}.01`;
}

function consolidateJsonFiles() {
    changesDirs.forEach((changesDir, idx) => {
        const versions = fs.readdirSync(changesDir);
        const allData = [];

        for (const version of versions) {
            const versionPath = path.join(changesDir, version);
            const files = fs.readdirSync(versionPath);

            const consolidatedData = {};
            for (const file of files) {
                const filePath = path.join(versionPath, file);
                const extractedData = extractDataFromFile(filePath);

                for (const [key, data] of Object.entries(extractedData)) {
                    if (!consolidatedData[key]) {
                        consolidatedData[key] = {
                            date: data.date,
                            libraries: []
                        };
                    }
                    consolidatedData[key].libraries.push(...data.libraries);
                }
            }

            const versionData = Object.entries(consolidatedData).map(([version, data]) => {
                for (const lib of data.libraries) {
                    lib.changes = sortChangesByType(lib.changes);
                }
                return {
                    version,
                    date: transformDateString(data.date),
                    libraries: data.libraries
                };
            });

            allData.push(...versionData);
        }

        // Ensure the output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        // Save all consolidated data to the respective output file, minified
        fs.writeFileSync(path.join(outputDir, outputFiles[idx]), JSON.stringify(allData));
    });
}

consolidateJsonFiles();