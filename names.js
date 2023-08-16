const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function extractLibrariesFromFolder(folderPath) {
    const files = fs.readdirSync(folderPath);
    let libraryNames = [];

    for (let file of files) {
        if (path.extname(file) === '.json') {
            const filePath = path.join(folderPath, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const jsonContent = JSON.parse(content);

            if (jsonContent.libraries) {
                for (let library of jsonContent.libraries) {
                    if (library.name) {
                        libraryNames.push(library.name);
                    }
                }
            }
        }
    }

    return [...new Set(libraryNames)];  // Remove duplicates using Set
}

async function main() {
    const uniqueLibraryNames = await extractLibrariesFromFolder('./versions');
    fs.writeFileSync('./uniqueLibraries.json', JSON.stringify(uniqueLibraryNames, null, 2));
}

main().then(() => {
    console.log('Finished writing unique library names to uniqueLibraries.json');
}).catch((error) => {
    console.error('Error:', error);
});
