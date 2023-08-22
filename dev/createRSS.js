const fs = require('fs');

function escapeXML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;');
}

function isWithinLastSixMonths(dateString) {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return new Date(dateString) >= sixMonthsAgo;
}

function previousVersion(version) {
  let [major, minor, patch] = version.split('.').map(Number);

  if (patch > 0) {
    patch--;
  } else if (minor > 0) {
    minor--;
    patch = 99;
  } else if (major > 0) {
    major--;
    minor = 99;
  }

  return `${major}.${minor}.${patch}`;
}

function jsonToRss(jsonData, rssTitle, rssLink, rssDescription) {
  let rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${escapeXML(rssTitle)}</title>
<link>${escapeXML(rssLink)}</link>
<description>${escapeXML(rssDescription)}</description>
<atom:link href="${escapeXML(rssLink)}" rel="self" type="application/rss+xml" />
`;

  for (const entry of jsonData) {
    if (!isWithinLastSixMonths(entry.date)) {
      continue;
    }

    const version = escapeXML(entry.version);
    const date = escapeXML(entry.date);

    let description = `<h2>Changes in Version ${version}</h2><ul>`;

    for (const lib of entry.libraries) {
      const library = escapeXML(lib.library);

      description += `<li><strong>Library: ${library}</strong><ul>`;

      for (const change of lib.changes) {
        const changeType = escapeXML(change.type);
        const changeText = escapeXML(change.text);

        description += `<li>Type: ${changeType}, Description: ${changeText}</li>`;
      }

      description += `</ul></li>`;
    }

    description += `</ul>`;

    const versionTo = previousVersion(version);
    const guid = `${rssLink}?versionFrom=${versionTo}&versionTo=${version}`;

    rssFeed += `<item>
<title>Version ${version} Changes</title>
<link>${escapeXML(guid)}</link>
<pubDate>${new Date(date).toUTCString()}</pubDate>
<description><![CDATA[${description}]]></description>
<guid>${escapeXML(guid)}</guid>
</item>
`;
  }

  rssFeed += `
</channel>
</rss>`;

  return rssFeed;
}

function generateRssForFile(consolidatedFilePath, rssOutputPath) {
  fs.readFile(consolidatedFilePath, 'utf-8', (err, data) => {
    if (err) {
      console.error('Error reading the file:', err);
      return;
    }

    const jsonData = JSON.parse(data);
    const rssFeed = jsonToRss(
      jsonData,
      'Changelog Feed',
      'https://marianfoo.github.io/ui5-lib-diff/',
      'Changes for each version of the software.'
    );

    fs.writeFile(rssOutputPath, rssFeed, (err) => {
      if (err) {
        console.error('Error writing the file:', err);
      } else {
        console.log(`RSS feed written to ${rssOutputPath}`);
      }
    });
  });
}

const filesToProcess = [
  {
    inputFile: 'de.marianzeis.ui5libdiff/webapp/data/consolidatedSAPUI5.json',
    outputFile: 'de.marianzeis.ui5libdiff/webapp/rss_feed_SAPUI5.xml',
  },
  {
    inputFile: 'de.marianzeis.ui5libdiff/webapp/data/consolidatedOpenUI5.json',
    outputFile: 'de.marianzeis.ui5libdiff/webapp/rss_feed_OpenUI5.xml',
  },
];

for (const fileInfo of filesToProcess) {
  generateRssForFile(fileInfo.inputFile, fileInfo.outputFile);
}
