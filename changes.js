const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const versionData = require('./versionoverview.json');
const libraries = require('./uniqueLibraries.json');

function getMinorVersion(version) {
    const parts = version.split('.');
    return parts[0] + '.' + parts[1];
}

async function saveToRequestLog(requestLog, requestLogPath) {
    await fs.writeFile(requestLogPath, JSON.stringify(requestLog, null, 4));
}

async function fetchVersionOverview() {
    const url = 'https://sapui5.hana.ondemand.com/versionoverview.json';
    try {
        const { data } = await axios.get(url);
        await fs.writeFile(path.join(__dirname, 'versionoverview.json'), JSON.stringify(data, null, 4));
        console.log('versionoverview.json updated successfully.');
    } catch (error) {
        console.error(`Failed to fetch versionoverview.json: ${error.message}`);
    }
}

async function fetchReleaseNotes(url, versionPath, library, version, requestLog) {
    try {
        const { data } = await axios.get(url);
        await fs.writeFile(path.join(versionPath, `${library}-${version}.json`), JSON.stringify(data, null, 4));
        if (!requestLog[version]) {
            requestLog[version] = {};
        }
        requestLog[version][library] = true;
        return true;  // Successfully fetched and saved data
    } catch (err) {
        return err;
    }
}


function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        if (parts1[i] > (parts2[i] || 0)) return 1;
        if (parts1[i] < (parts2[i] || 0)) return -1;
    }
    
    return 0;
}


async function main() {
    try {
        await fetchVersionOverview();
    } catch (error) {
        
    }
    const requestLogPath = path.join(__dirname, 'requestLog.json');
    let requestLog = {};

    try {
        requestLog = require(requestLogPath);
    } catch (e) {
        // If the file doesn't exist, we start with an empty log.
    }

    const highestPatchVersions = {};
    for (const patch of versionData.patches) {
        const minorVersion = getMinorVersion(patch.version);
        if (!highestPatchVersions[minorVersion] || compareVersions(patch.version, highestPatchVersions[minorVersion]) > 0) {
            highestPatchVersions[minorVersion] = patch.version;
        }
    }

    const targetVersions = Object.values(highestPatchVersions).map(getMinorVersion);

    let progress = 0;
    const totalRequests = targetVersions.length * libraries.length;

    for (const version of targetVersions) {
        const versionPath = path.join(__dirname, 'changes', version);
        await fs.mkdir(versionPath, { recursive: true });

        for (const library of libraries) {
            const formattedLibrary = library.replace(/\./g, '/');
            const primaryUrl = `https://ui5.sap.com/${highestPatchVersions[version]}/test-resources/${formattedLibrary}/relnotes/changes-${version}.json`;
            const fallbackUrl = `https://ui5.sap.com/test-resources/${formattedLibrary}/relnotes/changes-${version}.json`;

            const shouldRequest = !requestLog[version] || 
                                 !requestLog[version][library] || 
                                 (requestLog[version].highestPatch && requestLog[version].highestPatch !== highestPatchVersions[version]);

            if (shouldRequest) {
                const result = await fetchReleaseNotes(primaryUrl, versionPath, library, version, requestLog);
    
                if (result === true) {
                    // Successful fetch, no further actions needed
                } else if (result && result.response && result.response.status === 404) {
                    console.log(`Following URL returned a 404: ${primaryUrl}`);
                    // Now we try the fallback URL
                    const fallbackResult = await fetchReleaseNotes(fallbackUrl, versionPath, library, version, requestLog);
                    if (fallbackResult && fallbackResult.response && fallbackResult.response.status === 404) {
                        console.log(`Fallback URL also returned a 404: ${fallbackUrl}`);
                        if (!requestLog[version]) {
                            requestLog[version] = {};
                        }
                        requestLog[version][library] = '404';
                    }
                } else if (result) {
                    console.error(`Error fetching ${primaryUrl}: ${result.message}`);
                    // Handle other errors here if needed
                }

                // Save to requestLog after every request (regardless of the outcome)
                await saveToRequestLog(requestLog, requestLogPath);

                progress++;
                const percentage = ((progress / totalRequests) * 100).toFixed(2);
                process.stdout.write(`Progress: ${percentage}%\r`);

                await new Promise(resolve => setTimeout(resolve, 25)); // wait for 50ms before the next request
            }
        }
        // After all libraries for this version have been processed:
        if (!requestLog[version]) {
            requestLog[version] = {};
        }
        requestLog[version].highestPatch = highestPatchVersions[version];
        await saveToRequestLog(requestLog, requestLogPath);  // Save the highest patch version
    }

    console.log('\nCompleted.');
}

main().catch(err => console.error(err));
