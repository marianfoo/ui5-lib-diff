const test = require("node:test");
const assert = require("node:assert/strict");
const {
    normalizeChangeType,
    createChangeFromNote,
    compareVersions,
    normalizeDataset,
    summarizeDataset,
    summarizeWhatsNew
} = require("../lib/ui5DiffData");

test("normalizes supported change types and drops noisy markers", () => {
    assert.equal(normalizeChangeType("FEATURE"), "FEATURE");
    assert.equal(normalizeChangeType("Feature"), "FEATURE");
    assert.equal(normalizeChangeType("feature"), "FEATURE");
    assert.equal(normalizeChangeType("Fix"), "FIX");
    assert.equal(normalizeChangeType("DEPRECATED"), "DEPRECATED");
    assert.equal(normalizeChangeType("INTERNAL"), null);
    assert.equal(normalizeChangeType("INETRNAL"), null);
    assert.equal(normalizeChangeType("[INTERNAL] ALP"), null);
    assert.equal(normalizeChangeType("LEGACY"), null);
    assert.equal(normalizeChangeType(null), null);
});

test("creates safe canonical changes from raw notes", () => {
    const change = createChangeFromNote(
        { type: "feature", text: "New API", id: "abc" },
        () => ({ url: "https://github.com/SAP/openui5/commit/abc" })
    );

    assert.deepEqual(change, {
        type: "FEATURE",
        text: "New API",
        commit_url: "https://github.com/SAP/openui5/commit/abc",
        id: "abc"
    });
    assert.equal(createChangeFromNote(null), null);
    assert.equal(createChangeFromNote({ type: "INTERNAL", text: "skip" }), null);
});

test("compares UI5 versions numerically", () => {
    assert.equal(compareVersions("1.120.0", "1.120"), 0);
    assert.ok(compareVersions("1.148.0", "1.99.0") > 0);
    assert.ok(compareVersions("1.108.0", "1.108.1") < 0);
});

test("normalizes a consolidated dataset for the static API bundle", () => {
    const normalized = normalizeDataset([
        {
            version: "1.120.5",
            date: "2026.01.01",
            libraries: [
                {
                    library: "sap.m",
                    changes: [
                        { type: "feature", text: "New API", id: "a" },
                        { type: "Fix", text: "Bug fix", id: "b" },
                        { type: "INTERNAL", text: "Internal", id: "c" }
                    ]
                }
            ]
        }
    ]);

    assert.deepEqual(normalized, [
        {
            version: "1.120.5",
            date: "2026.01.01",
            libraries: [
                {
                    library: "sap.m",
                    changes: [
                        { type: "FEATURE", text: "New API", id: "a" },
                        { type: "FIX", text: "Bug fix", id: "b" }
                    ]
                }
            ]
        }
    ]);
});

test("summarizes consolidated data for API consumers", () => {
    const summary = summarizeDataset([
        {
            version: "1.100.0",
            libraries: [{ library: "sap.m", changes: [{ type: "FEATURE" }] }]
        },
        {
            version: "1.120.5",
            libraries: [{ library: "sap.ui.core", changes: [{ type: "Fix" }, { type: "INTERNAL" }] }]
        }
    ]);

    assert.deepEqual(summary, {
        versionCount: 2,
        minVersion: "1.100.0",
        maxVersion: "1.120.5",
        totalChanges: 3,
        changeTypeCounts: {
            FEATURE: 1,
            FIX: 1,
            DEPRECATED: 0
        },
        nonCanonicalTypes: {
            Fix: 1,
            INTERNAL: 1
        }
    });
});

test("summarizes What's New data for API consumers", () => {
    const summary = summarizeWhatsNew([
        { Version: "1.120", Type: "Changed", Category: "Control" },
        { Version: "1.130", Type: "New", Category: "Feature" },
        { Version: "1.108", Type: "Changed", Category: "Control" }
    ]);

    assert.deepEqual(summary, {
        entryCount: 3,
        minVersion: "1.108",
        maxVersion: "1.130",
        typeCounts: {
            Changed: 2,
            New: 1
        },
        categoryCounts: {
            Control: 2,
            Feature: 1
        }
    });
});
