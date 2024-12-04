const fs = require('fs');
const https = require('https');

async function extractLibrariesFromVersionJson() {
    try {
        // Fetch version.json from UI5 CDN
        const response = await fetch('https://ui5.sap.com/resources/sap-ui-version.json');
        const versionJson = await response.json();

        // Extract library names
        const libraryNames = versionJson.libraries
            .map(lib => lib.name)
            .filter((name, index, self) => self.indexOf(name) === index) // Remove duplicates
            .sort(); // Sort alphabetically

        // Write to file
        fs.writeFileSync('uniqueLibraries.json', JSON.stringify(libraryNames, null, 2));
        console.log(`Successfully extracted ${libraryNames.length} unique libraries to uniqueLibraries.json`);

    } catch (error) {
        console.error('Error:', error);
    }
}

// Execute the function
extractLibrariesFromVersionJson();
