const fs = require('fs');
const axios = require('axios');
const path = require('path');

// Ensure 'versions' directory exists
const versionsDir = path.join(__dirname, 'versions');
if (!fs.existsSync(versionsDir)) {
    fs.mkdirSync(versionsDir);
}

// Read the JSON file
const data = JSON.parse(fs.readFileSync('versionoverview.json', 'utf8'));

// Create an async function to handle asynchronous operations
async function fetchAndSaveVersions() {
    // Iterate over the patches
    for (let patch of data.patches) {
        const patchVersion = patch.version;

        // Convert the version number to use underscores instead of dots
        const filename = `${patchVersion.replace(/\./g, '_')}.json`;
        
        // If the file already exists, continue to the next iteration
        if (fs.existsSync(path.join(versionsDir, filename))) {
            console.log(`File for version ${patchVersion} already exists. Skipping.`);
            continue;
        }

        try {
            // Fetch the data from the URL using the version number
            const response = await axios.get(`https://ui5.sap.com/${patchVersion}/resources/sap-ui-version.json`);
            
            // Save the response JSON to the versions folder with the modified filename
            fs.writeFileSync(path.join(versionsDir, filename), JSON.stringify(response.data, null, 2));
        } catch (error) {
            console.error(`Error fetching or saving data for version ${patchVersion}: ${error.message}`);
        }
    }
}

// Call the async function
fetchAndSaveVersions().catch(error => {
    console.error(`General error: ${error.message}`);
});
