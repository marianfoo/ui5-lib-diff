const axios = require('axios');
const fs = require('fs');

const endpoints = [
    {
        url: 'https://ui5.sap.com/docs/api/api-index-deprecated.json',
        consolidatedPath: 'de.marianzeis.ui5libdiff/webapp/data/consolidatedSAPUI5.json'
    },
    {
        url: 'https://sdk.openui5.org/docs/api/api-index-deprecated.json',
        consolidatedPath: 'de.marianzeis.ui5libdiff/webapp/data/consolidatedOpenUI5.json'
    }
];

const fetchDataAndSave = (url, consolidatedPath) => {
    axios.get(url)
        .then(response => {
            const deprecatedData = response.data;
            const consolidatedData = JSON.parse(fs.readFileSync(consolidatedPath, 'utf8'));

            for (const version in deprecatedData) {
                const formattedVersion = `${version}.0`;

                // Find the matching version in the consolidated data
                const versionEntry = consolidatedData.find(entry => entry.version === formattedVersion);

                if (versionEntry) {
                    const deprecatedLib = {
                        "library": "deprecated",
                        "changes": deprecatedData[version].apis.map(api => ({
                            "type": "DEPRECATED",
                            "text": `[${api.control}#${api.entityName}] ${api.text}`
                        }))
                    };

                    // Add the deprecated library info
                    versionEntry.libraries.push(deprecatedLib);
                }
            }

            // Save the updated data
            fs.writeFileSync(consolidatedPath, JSON.stringify(consolidatedData, null, 2), 'utf8');
            console.log(`Data updated and saved to ${consolidatedPath}`);
        })
        .catch(error => {
            console.error('Error:', error.message);
        });
}

endpoints.forEach(endpoint => fetchDataAndSave(endpoint.url, endpoint.consolidatedPath));
