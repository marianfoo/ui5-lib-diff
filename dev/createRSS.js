const fs = require('fs');

function isWithinLastSixMonths(dateString) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return new Date(dateString) >= sixMonthsAgo;
}

function jsonToRss(jsonData, rssTitle, rssLink, rssDescription) {
    let rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${rssTitle}</title>
<link>${rssLink}</link>
<description>${rssDescription}</description>
<atom:link href="${rssLink}" rel="self" type="application/rss+xml" />
`;

    for (const entry of jsonData) {
        if (!isWithinLastSixMonths(entry.date)) {
            continue;  // skip this entry if older than 6 months
        }
        
        const version = entry.version;
        const date = entry.date;

        let description = `<h2>Changes in Version ${version}</h2><ul>`;

        for (const lib of entry.libraries) {
            const library = lib.library;

            description += `<li><strong>Library: ${library}</strong><ul>`;

            for (const change of lib.changes) {
                const changeType = change.type;
                const changeText = change.text;

                description += `<li>Type: ${changeType}, Description: ${changeText}</li>`;
            }

            description += `</ul></li>`;
        }

        description += `</ul>`;

        const guid = `${rssLink}?versionFrom=${version}`;

        rssFeed += `<item>
<title>Version ${version} Changes</title>
<link>${guid}</link>
<pubDate>${new Date(date).toUTCString()}</pubDate>
<description><![CDATA[${description}]]></description>
<guid>${guid}</guid>
</item>
`;
    }

    rssFeed += `
</channel>
</rss>`;

    return rssFeed;
}

fs.readFile('de.marianzeis.ui5libdiff/webapp/data/consolidated.json', 'utf-8', (err, data) => {
    if (err) {
        console.error("Error reading the file:", err);
        return;
    }

    const jsonData = JSON.parse(data);
    const rssFeed = jsonToRss(jsonData, "Changelog Feed", "https://marianfoo.github.io/ui5-lib-diff/", "Changes for each version of the software.");

    fs.writeFile('de.marianzeis.ui5libdiff/webapp/rss_feed.xml', rssFeed, (err) => {
        if (err) {
            console.error("Error writing the file:", err);
        } else {
            console.log("RSS feed written to rss_feed.xml");
        }
    });
});
