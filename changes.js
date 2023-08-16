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

async function main() {
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
        if (!highestPatchVersions[minorVersion] || patch.version > highestPatchVersions[minorVersion]) {
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
            const url = `https://ui5.sap.com/test-resources/${formattedLibrary}/relnotes/changes-${version}.json`;

            const shouldRequest = !requestLog[version] || 
                                 !requestLog[version][library] || 
                                 (requestLog[version].highestPatch && requestLog[version].highestPatch !== highestPatchVersions[version]);

            if (shouldRequest) {
                try {
                    const { data } = await axios.get(url);
                    await fs.writeFile(path.join(versionPath, `${library}-${version}.json`), JSON.stringify(data, null, 4));
                    if (!requestLog[version]) {
                        requestLog[version] = {};
                    }
                    requestLog[version][library] = true;

                } catch (err) {
                    if (err.response && err.response.status === 404) {
                        console.log(`Following URL returned a 404: ${url}`);
                    } else {
                        console.error(`Error fetching ${url}: ${err.message}`);
                    }
                    // Indicate in the requestLog that this URL returned a 404
                    if (!requestLog[version]) {
                        requestLog[version] = {};
                    }
                    requestLog[version][library] = '404';
                    
                }

                // Save to requestLog after every request (regardless of the try-catch outcome)
                await saveToRequestLog(requestLog, requestLogPath);

                progress++;
                const percentage = ((progress / totalRequests) * 100).toFixed(2);
                process.stdout.write(`Progress: ${percentage}%\r`);

                await new Promise(resolve => setTimeout(resolve, 50)); // wait for 50ms before the next request
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
