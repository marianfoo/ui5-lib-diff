const fs = require("fs");
const path = require("path");
const { normalizeDataset, summarizeDataset } = require("./lib/ui5DiffData");

const webappDir = path.join("de.marianzeis.ui5libdiff", "webapp");
const dataDir = path.join(webappDir, "data");
const apiDir = path.join(webappDir, "api", "v1");
const bundleFile = "/api/v1/all-changes.json";

const datasets = {
    SAPUI5: {
        consolidated: "/data/consolidatedSAPUI5.json",
        versions: "/data/selectVersionsSAPUI5.json"
    },
    OpenUI5: {
        consolidated: "/data/consolidatedOpenUI5.json",
        versions: "/data/selectVersionsOpenUI5.json"
    }
};

function readJson(relativeUrl) {
    return JSON.parse(fs.readFileSync(path.join(webappDir, relativeUrl), "utf8"));
}

function buildStaticApi() {
    const generatedAt = new Date().toISOString();
    const manifestDatasets = {};
    const bundleDatasets = {};

    for (const [name, endpoints] of Object.entries(datasets)) {
        const consolidated = readJson(endpoints.consolidated);
        const apiDataset = normalizeDataset(consolidated);
        bundleDatasets[name] = apiDataset;
        manifestDatasets[name] = {
            ...endpoints,
            ...summarizeDataset(apiDataset)
        };
    }

    const bundle = {
        schemaVersion: 1,
        generatedAt,
        datasets: bundleDatasets
    };

    const manifest = {
        schemaVersion: 1,
        generatedAt,
        baseUrl: "https://ui5-lib-diff.marianzeis.de",
        bundle: bundleFile,
        datasets: manifestDatasets,
        rangeSemantics: {
            description: "Diff ranges are exclusive at versionFrom and inclusive at versionTo.",
            expression: "version > versionFrom && version <= versionTo"
        },
        recommendedConsumerFlow: [
            "Fetch /api/v1/manifest.json to discover the current dataset URLs and bounds.",
            "Download /api/v1/all-changes.json during setup when the consumer wants one local file with both SAPUI5 and OpenUI5 changes.",
            "If only one flavor is needed, fetch the matching consolidated JSON file.",
            "Read the local JSON file at runtime and filter by version range, change type, UI5 library, and query in the consuming tool."
        ],
        notes: [
            "The browser URL with versionFrom/versionTo is a UI route, not a JSON API. Static consumers should use the dataset URLs above.",
            "The current generator normalizes change types to FEATURE, FIX, or DEPRECATED and omits internal and legacy note markers. If a dataset reports nonCanonicalTypes, it was generated before this normalization shipped."
        ],
        examples: {
            appUrl: "https://ui5-lib-diff.marianzeis.de/?versionFrom=1.146.0&versionTo=1.148.0&ui5Type=SAPUI5",
            manifestUrl: "https://ui5-lib-diff.marianzeis.de/api/v1/manifest.json",
            bundleUrl: "https://ui5-lib-diff.marianzeis.de/api/v1/all-changes.json",
            sapui5DataUrl: "https://ui5-lib-diff.marianzeis.de/data/consolidatedSAPUI5.json",
            openui5DataUrl: "https://ui5-lib-diff.marianzeis.de/data/consolidatedOpenUI5.json"
        }
    };

    return { manifest, bundle };
}

fs.mkdirSync(apiDir, { recursive: true });
const { manifest, bundle } = buildStaticApi();
fs.writeFileSync(
    path.join(apiDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
);
fs.writeFileSync(
    path.join(webappDir, bundleFile),
    `${JSON.stringify(bundle)}\n`,
    "utf8"
);
console.log(`Wrote ${path.join(apiDir, "manifest.json")}`);
console.log(`Wrote ${path.join(webappDir, bundleFile)}`);
