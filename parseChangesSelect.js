const fs = require('fs');
const path = require('path');

const changesDirs = ['changesSAPUI5', 'changesOpenUI5'];
const outputDir = 'de.marianzeis.ui5libdiff/webapp/data';

function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    const maxLength = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLength; i++) {
        const part1 = parts1[i] || 0;
        const part2 = parts2[i] || 0;
        
        if (part1 > part2) return -1; 
        if (part1 < part2) return 1;
    }

    return 0;
}

function generateSelectVersions() {
    changesDirs.forEach((changesDir) => {
        const versions = fs.readdirSync(changesDir);
        const allVersions = new Set();

        for (const version of versions) {
            const versionPath = path.join(changesDir, version);
            const files = fs.readdirSync(versionPath);

            for (const file of files) {
                const filePath = path.join(versionPath, file);
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

                for (const key of Object.keys(data)) {
                    allVersions.add(key);
                }
            }
        }

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

        const outputFileName = `selectVersions${changesDir.replace('changes', '')}.json`;
        fs.writeFileSync(path.join(outputDir, outputFileName), JSON.stringify(selectVersions, null, 4));
    });
}

generateSelectVersions();
