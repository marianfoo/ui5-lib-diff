const fs = require('fs');
const path = require('path');

const changesDir = 'changes';
const outputDir = 'de.marianzeis.ui5libdiff/webapp/data';

function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    const maxLength = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLength; i++) {
        const part1 = parts1[i] || 0;
        const part2 = parts2[i] || 0;
        
        if (part1 > part2) return -1; // If v1 > v2, return -1 to sort descending
        if (part1 < part2) return 1;
    }

    return 0;
}

function generateSelectVersions() {
    const versions = fs.readdirSync(changesDir);
    const allVersions = new Set();

    for (const version of versions) {
        const versionPath = path.join(changesDir, version);
        const files = fs.readdirSync(versionPath);

        for (const file of files) {
            const filePath = path.join(versionPath, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            // Add all keys (i.e., versions) from the JSON data to the Set
            for (const key of Object.keys(data)) {
                allVersions.add(key);
            }
        }
    }

    // Convert Set to Array, sort the versions using the comparison function, then map them to desired format
    const selectVersions = [...allVersions]
        .sort(compareVersions)
        .map(version => ({
            key: version,
            value: version
        }));

    // Ensure the output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    // Save the selectVersions.json
    fs.writeFileSync(path.join(outputDir, 'selectVersions.json'), JSON.stringify(selectVersions, null, 4));
}

generateSelectVersions();
