const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

function getMinorVersion(version) {
  const parts = version.split('.');
  return parts[0] + '.' + parts[1];
}

async function saveToRequestLog(requestLog, requestLogPath) {
  await fs.writeFile(requestLogPath, JSON.stringify(requestLog, null, 4));
}

async function fetchVersionOverview(uiVersion) {
  const url =
    uiVersion === 'SAPUI5'
      ? 'https://sapui5.hana.ondemand.com/versionoverview.json'
      : 'https://openui5.hana.ondemand.com/versionoverview.json';
  const filename = `versionoverview${uiVersion}.json`;
  try {
    const { data } = await axios.get(url);
    await fs.writeFile(
      path.join(__dirname, filename),
      JSON.stringify(data, null, 4)
    );
    console.log(`${filename} updated successfully.`);
  } catch (error) {
    console.error(`Failed to fetch ${filename}: ${error.message}`);
  }
}

async function fetchReleaseNotes(
  url,
  versionPath,
  library,
  version,
  requestLog,
  uiVersion
) {
  try {
    const { data } = await axios.get(url);
    await fs.writeFile(
      path.join(versionPath, `${library}-${version}-${uiVersion}.json`),
      JSON.stringify(data, null, 4)
    );
    if (!requestLog[version]) {
      requestLog[version] = {};
    }
    requestLog[version][library] = true;
    return true; // Successfully fetched and saved data
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

async function main(uiVersion) {
  if (!['SAPUI5', 'OpenUI5'].includes(uiVersion)) {
    console.error(
      "Invalid UI version provided. Choose between 'SAPUI5' and 'OpenUI5'."
    );
    return;
  }

  const versionData = require(`./versionoverview${uiVersion}.json`);
  const libraries = require('./uniqueLibraries.json');
  const baseURL =
    uiVersion === 'SAPUI5' ? 'https://ui5.sap.com' : 'https://sdk.openui5.org';
  const changesDir = `changes${uiVersion}`;
  const requestLogPath = path.join(__dirname, `requestLog${uiVersion}.json`);

  try {
    await fetchVersionOverview(uiVersion);
  } catch (error) {
    console.error(
      `Failed to run fetchVersionOverview for ${uiVersion}: ${error.message}`
    );
  }

  let requestLog = {};

  try {
    requestLog = require(requestLogPath);
  } catch (e) {
    // If the file doesn't exist, we start with an empty log.
  }

  const highestPatchVersions = {};
  for (const patch of versionData.patches) {
    const minorVersion = getMinorVersion(patch.version);
    if (
      !highestPatchVersions[minorVersion] ||
      compareVersions(patch.version, highestPatchVersions[minorVersion]) > 0
    ) {
      highestPatchVersions[minorVersion] = patch.version;
    }
  }

  const targetVersions =
    Object.values(highestPatchVersions).map(getMinorVersion);

  let progress = 0;
  const totalRequests = targetVersions.length * libraries.length;

  for (const version of targetVersions) {
    const versionPath = path.join(__dirname, changesDir, version);
    await fs.mkdir(versionPath, { recursive: true });

    for (const library of libraries) {
        const formattedLibrary = library.replace(/\./g, '/');
        const primaryUrl = `${baseURL}/${highestPatchVersions[version]}/test-resources/${formattedLibrary}/relnotes/changes-${version}.json`;
        const fallbackUrl = `${baseURL}/test-resources/${formattedLibrary}/relnotes/changes-${version}.json`;
    
        const shouldRequest =
            !requestLog[version] ||
            !requestLog[version][library] ||
            (requestLog[version].highestPatch &&
            requestLog[version].highestPatch !==
                highestPatchVersions[version]);
    
        if (shouldRequest) {
            const result = await fetchReleaseNotes(primaryUrl, versionPath, library, version, requestLog);
    
            if (result && result.response && result.response.status === 404) {
                console.log(`Following URL returned a 404: ${primaryUrl}. Trying fallback URL...`);
                
                // Now we try the fallback URL
                const fallbackResult = await fetchReleaseNotes(fallbackUrl, versionPath, library, version, requestLog);
                if (fallbackResult && fallbackResult.response && fallbackResult.response.status === 404) {
                    console.log(`Fallback URL also returned a 404: ${fallbackUrl}`);
                    if (!requestLog[version]) {
                        requestLog[version] = {};
                    }
                    requestLog[version][library] = '404';
                }
            } else if (result && result !== true) {
                console.error(`Error fetching ${primaryUrl}: ${result.message}`);
            }
    
            await saveToRequestLog(requestLog, requestLogPath);
    
            progress++;
            const percentage = ((progress / totalRequests) * 100).toFixed(2);
            process.stdout.write(`Progress: ${percentage}%\r`);
    
            await new Promise((resolve) => setTimeout(resolve, 25));
        }
    }
    

    if (!requestLog[version]) {
      requestLog[version] = {};
    }
    requestLog[version].highestPatch = highestPatchVersions[version];
    await saveToRequestLog(requestLog, requestLogPath);
  }

  console.log(`\nCompleted for ${uiVersion}.`);
}

main('SAPUI5').catch((err) => console.error(err));
main('OpenUI5').catch((err) => console.error(err));
