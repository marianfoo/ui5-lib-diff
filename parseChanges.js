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
                        date: data.date,  // set the date
                        libraries: []
                    };
                }
                consolidatedData[key].libraries.push(...data.libraries);  // pushing onto the libraries array
            }
        }
        

        const versionData = Object.entries(consolidatedData).map(([version, data]) => {
            for (const lib of data.libraries) {
                lib.changes = sortChangesByType(lib.changes);
            }
            return {
                version,
                date: transformDateString(data.date),  // <-- Use the transformDateString function here
                libraries: data.libraries
            };
        });        

        allData.push(...versionData);
    }

    // Ensure the output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    // Save all consolidated data to the single output file, minified
    fs.writeFileSync(path.join(outputDir, outputFile), JSON.stringify(allData));
}

consolidateJsonFiles();
