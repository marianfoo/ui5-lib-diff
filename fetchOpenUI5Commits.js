require('dotenv').config();
const fs = require('fs');
const zlib = require('zlib');

const GITHUB_API_URL = 'https://api.github.com/repos/SAP/openui5/commits';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN is not set in .env file');
}
const OUTPUT_FILE = 'openui5-commits.json.gz';

async function fetchCommits() {
    let commits = [];
    if (fs.existsSync(OUTPUT_FILE)) {
        // Read and decompress the gzipped file
        const compressedData = fs.readFileSync(OUTPUT_FILE);
        commits = JSON.parse(zlib.gunzipSync(compressedData).toString('utf8'));
        console.log(`Loaded ${commits.length} existing commits from ${OUTPUT_FILE}`);
    }

    // Find the most recent commit date from existing commits
    const mostRecentDate = commits.length > 0 
        ? new Date(commits[0].date).getTime()
        : 0;

    let page = 1;
    const perPage = 100;

    try {
        while (true) {
            console.log(`Fetching page ${page}...`);
            const response = await fetch(`${GITHUB_API_URL}?per_page=${perPage}&page=${page}`, {
                headers: {
                    Authorization: `token ${GITHUB_TOKEN}`,
                    Accept: 'application/vnd.github.v3+json'
                }
            });

            const data = await response.json();

            if (data.length === 0) {
                break; // No more commits
            }

            // Check if all commits in this page are older than our most recent commit
            const allCommitsAreOlder = data.every(commit => 
                new Date(commit.commit.author.date).getTime() <= mostRecentDate
            );

            if (allCommitsAreOlder) {
                console.log('No newer commits found, stopping fetch');
                break;
            }

            const newCommits = data
                .filter(commit => new Date(commit.commit.author.date).getTime() > mostRecentDate)
                .map(commit => ({
                    sha: commit.sha,
                    author: commit.commit.author.name,
                    author_login: commit.author?.login || 'unknown',
                    date: new Date(commit.commit.author.date).toUTCString(), // Format date to match example
                    message: commit.commit.message,
                    url: commit.html_url
                }));

            if (newCommits.length > 0) {
                // Add new commits to the beginning to maintain chronological order
                commits = newCommits.concat(commits);
                
                // Save to compressed file after each fetch if we have new commits
                const compressedData = zlib.gzipSync(JSON.stringify(commits, null, 2));
                fs.writeFileSync(OUTPUT_FILE, compressedData);
                console.log(`Fetched page ${page} with ${newCommits.length} new commits. Total: ${commits.length} commits saved to ${OUTPUT_FILE}`);
            } else {
                console.log(`Page ${page}: No new commits found`);
            }

            // Add rate limit handling
            const rateLimit = response.headers.get('x-ratelimit-remaining');
            if (rateLimit && parseInt(rateLimit) < 1) {
                console.log('GitHub API rate limit reached. Waiting before next request...');
                await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
            }

            page++;
        }
    } catch (error) {
        console.error('Error fetching commits:', error.response ? error.response.data : error.message);
    }
}

fetchCommits();
