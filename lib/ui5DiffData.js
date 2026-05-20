const CANONICAL_TYPES = new Set(["FEATURE", "FIX", "DEPRECATED"]);

function normalizeChangeType(rawType) {
    if (typeof rawType !== "string") {
        return null;
    }

    const upperType = rawType.trim().toUpperCase();
    return CANONICAL_TYPES.has(upperType) ? upperType : null;
}

function createChangeFromNote(note, findMatchingCommit = () => null) {
    if (!note || typeof note !== "object") {
        return null;
    }

    const type = normalizeChangeType(note.type);
    if (!type) {
        return null;
    }

    const text = typeof note.text === "string" ? note.text : "";
    const matchingCommit = findMatchingCommit(note);

    return {
        type,
        text,
        commit_url: matchingCommit ? matchingCommit.url : null,
        id: note.id || `${type}_${text.substring(0, 20).replace(/[^a-zA-Z0-9]/g, "_")}`
    };
}

function parseVersion(version) {
    return String(version || "")
        .replace(/^v/i, "")
        .split(".")
        .slice(0, 3)
        .map((part) => {
            const number = Number.parseInt(part.replace(/[^0-9]/g, ""), 10);
            return Number.isFinite(number) ? number : 0;
        });
}

function compareVersions(a, b) {
    const aa = parseVersion(a);
    const bb = parseVersion(b);

    for (let index = 0; index < 3; index++) {
        const left = aa[index] || 0;
        const right = bb[index] || 0;
        if (left !== right) {
            return left - right;
        }
    }

    return 0;
}

function normalizeChangeRecord(change) {
    if (!change || typeof change !== "object") {
        return null;
    }

    const type = normalizeChangeType(change.type);
    if (!type) {
        return null;
    }

    return {
        ...change,
        type
    };
}

function normalizeDataset(data) {
    if (!Array.isArray(data)) {
        return [];
    }

    return data
        .filter((block) => block && block.version)
        .map((block) => ({
            ...block,
            libraries: (block.libraries || [])
                .filter((library) => library && library.library)
                .map((library) => ({
                    ...library,
                    changes: (library.changes || [])
                        .map(normalizeChangeRecord)
                        .filter(Boolean)
                }))
                .filter((library) => library.changes.length > 0)
        }))
        .filter((block) => block.libraries.length > 0);
}

function summarizeDataset(data) {
    const counts = {
        FEATURE: 0,
        FIX: 0,
        DEPRECATED: 0
    };
    const nonCanonicalTypes = {};
    let totalChanges = 0;
    let minVersion;
    let maxVersion;

    for (const block of Array.isArray(data) ? data : []) {
        if (!block || !block.version) {
            continue;
        }

        if (!minVersion || compareVersions(block.version, minVersion) < 0) {
            minVersion = block.version;
        }
        if (!maxVersion || compareVersions(block.version, maxVersion) > 0) {
            maxVersion = block.version;
        }

        for (const library of block.libraries || []) {
            for (const change of library.changes || []) {
                totalChanges++;
                const rawType = change ? change.type : undefined;
                if (typeof rawType !== "string" || !CANONICAL_TYPES.has(rawType)) {
                    const key = typeof rawType === "string" ? rawType : String(rawType);
                    nonCanonicalTypes[key] = (nonCanonicalTypes[key] || 0) + 1;
                }
                const type = normalizeChangeType(rawType);
                if (type) {
                    counts[type]++;
                }
            }
        }
    }

    return {
        versionCount: Array.isArray(data) ? data.length : 0,
        minVersion,
        maxVersion,
        totalChanges,
        changeTypeCounts: counts,
        nonCanonicalTypes
    };
}

module.exports = {
    CANONICAL_TYPES,
    normalizeChangeType,
    createChangeFromNote,
    compareVersions,
    normalizeDataset,
    summarizeDataset
};
