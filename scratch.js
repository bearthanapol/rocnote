"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
var STORAGE_KEY = 'game-checklist-state';
/**
 * Validates that a parsed value conforms to the PersistedState schema.
 * Returns the typed object if valid, or null if any rule is violated.
 */
function validateSchema(parsed) {
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        console.warn('[StorageService] Invalid root: expected a non-null object');
        return null;
    }
    var obj = parsed;
    var version = obj['version'];
    if (version !== 1 && version !== 2) {
        console.warn('[StorageService] Schema version mismatch: expected 1 or 2, got', version);
        return null;
    }
    // items must be a non-null object (not an array)
    var items = obj['items'];
    if (items === null || typeof items !== 'object' || Array.isArray(items)) {
        console.warn('[StorageService] Invalid "items": expected a non-null object');
        return null;
    }
    // Each item value must have completed: boolean and lastChangedAt: number
    for (var _i = 0, _a = Object.entries(items); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        if (value === null || typeof value !== 'object' || Array.isArray(value)) {
            console.warn("[StorageService] Invalid item \"".concat(key, "\": expected an object"));
            return null;
        }
        var item = value;
        if (typeof item['completed'] !== 'boolean') {
            console.warn("[StorageService] Invalid item \"".concat(key, "\": \"completed\" must be a boolean"));
            return null;
        }
        if (typeof item['lastChangedAt'] !== 'number') {
            console.warn("[StorageService] Invalid item \"".concat(key, "\": \"lastChangedAt\" must be a number"));
            return null;
        }
    }
    // nextResetBoundaries must have all three keys as positive numbers
    var boundaries = obj['nextResetBoundaries'];
    if (boundaries === null || typeof boundaries !== 'object' || Array.isArray(boundaries)) {
        console.warn('[StorageService] Invalid "nextResetBoundaries": expected a non-null object');
        return null;
    }
    var b = boundaries;
    for (var _c = 0, _d = ['daily', 'threeDay', 'weekly']; _c < _d.length; _c++) {
        var key = _d[_c];
        if (typeof b[key] !== 'number' || b[key] <= 0) {
            console.warn("[StorageService] Invalid \"nextResetBoundaries.".concat(key, "\": must be a positive number"));
            return null;
        }
    }
    // Validate history (or initialize it if migrating from v1)
    var history = {};
    if (version === 2) {
        var histRaw = obj['history'];
        if (histRaw === null || typeof histRaw !== 'object' || Array.isArray(histRaw)) {
            console.warn('[StorageService] Invalid "history": expected a non-null object');
            return null;
        }
        for (var _e = 0, _f = Object.entries(histRaw); _e < _f.length; _e++) {
            var _g = _f[_e], dateKey = _g[0], dayData = _g[1];
            if (dayData === null || typeof dayData !== 'object' || Array.isArray(dayData)) {
                console.warn("[StorageService] Invalid history day \"".concat(dateKey, "\": expected an object"));
                return null;
            }
            for (var _h = 0, _j = Object.entries(dayData); _h < _j.length; _h++) {
                var _k = _j[_h], itemId = _k[0], completed = _k[1];
                if (typeof completed !== 'boolean') {
                    console.warn("[StorageService] Invalid history entry for \"".concat(dateKey, " / ").concat(itemId, "\": \"completed\" must be boolean"));
                    return null;
                }
            }
        }
        history = histRaw;
    }
    return {
        version: 2,
        items: items,
        history: history,
        nextResetBoundaries: {
            daily: b['daily'],
            threeDay: b['threeDay'],
            weekly: b['weekly'],
        },
    };
}
exports.StorageService = {
    /**
     * Reads and validates the persisted state from localStorage.
     * Returns null if the key is missing, the value is not valid JSON,
     * or the parsed value does not conform to the schema.
     */
    load: function () {
        var raw;
        try {
            raw = localStorage.getItem(STORAGE_KEY);
        }
        catch (err) {
            console.warn('[StorageService] Failed to read from localStorage:', err);
            return null;
        }
        if (raw === null) {
            return null;
        }
        var parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch (err) {
            console.warn('[StorageService] Failed to parse stored JSON:', err);
            return null;
        }
        return validateSchema(parsed);
    },
    /**
     * Serializes and writes the given state to localStorage.
     * Returns { ok: true } on success, or { ok: false, error } if the write fails
     * (e.g. quota exceeded, private browsing restrictions).
     */
    save: function (state) {
        try {
            var serialized = JSON.stringify(state);
            localStorage.setItem(STORAGE_KEY, serialized);
            return { ok: true };
        }
        catch (err) {
            var message = err instanceof Error ? err.message : String(err);
            return { ok: false, error: message };
        }
    },
};
