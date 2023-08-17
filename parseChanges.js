const fs = require('fs');
const path = require('path');

const changesDir = 'changes';
const outputDir = 'de.marianzeis.ui5libdiff/webapp/data';
const outputFile = 'consolidated.json';

function extractDataFromFile(filePath) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const filename = path.basename(filePath);
    const libraryName = filename.split('-')[0];

    const output = {};

    for (const [key, value] of Object.entries(data)) {
        try {
            const notes = value['notes'].map(note => ({ type: note.type, text: note.text }));
            if (!output[key]) {
                output[key] = [];
            }
            output[key].push({
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

function consolidateJsonFiles() {
    const versions = fs.readdirSync(changesDir);
    const allData = [];

    for (const version of versions) {
        const versionPath = path.join(changesDir, version);
        const files = fs.readdirSync(versionPath);
        
        const consolidatedData = {};

        for (const file of files) {
            const filePath = path.join(versionPath, file);
            const extractedData = extractDataFromFile(filePath);

            for (const [key, libraries] of Object.entries(extractedData)) {
                if (!consolidatedData[key]) {
                    consolidatedData[key] = [];
                }
                consolidatedData[key].push(...libraries);
            }
        }

        const versionData = Object.entries(consolidatedData).map(([version, libraries]) => {
            for (const lib of libraries) {
                lib.changes = sortChangesByType(lib.changes);
            }
            return {
                version,
                libraries
            };
        });

        allData.push(...versionData);
    }

    // Ensure the output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    // Save all consolidated data to the single output file
    fs.writeFileSync(path.join(outputDir, outputFile), JSON.stringify(allData, null, 4));
}

consolidateJsonFiles();
