import type { PersistedState, ItemState, SaveResult } from './types';

const STORAGE_KEY = 'game-checklist-state';

/**
 * Validates that a parsed value conforms to the PersistedState schema.
 * Returns the typed object if valid, or null if any rule is violated.
 */
function validateSchema(parsed: unknown): PersistedState | null {
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    console.warn('[StorageService] Invalid root: expected a non-null object');
    return null;
  }

  const obj = parsed as Record<string, unknown>;

  const version = obj['version'];
  if (version !== 1 && version !== 2) {
    console.warn('[StorageService] Schema version mismatch: expected 1 or 2, got', version);
    return null;
  }

  // items must be a non-null object (not an array)
  const items = obj['items'];
  if (items === null || typeof items !== 'object' || Array.isArray(items)) {
    console.warn('[StorageService] Invalid "items": expected a non-null object');
    return null;
  }

  // Each item value must have completed: boolean and lastChangedAt: number
  for (const [key, value] of Object.entries(items as Record<string, unknown>)) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      console.warn(`[StorageService] Invalid item "${key}": expected an object`);
      return null;
    }
    const item = value as Record<string, unknown>;
    if (typeof item['completed'] !== 'boolean') {
      console.warn(`[StorageService] Invalid item "${key}": "completed" must be a boolean`);
      return null;
    }
    if (typeof item['lastChangedAt'] !== 'number') {
      console.warn(`[StorageService] Invalid item "${key}": "lastChangedAt" must be a number`);
      return null;
    }
  }

  // nextResetBoundaries must have all three keys as positive numbers
  const boundaries = obj['nextResetBoundaries'];
  if (boundaries === null || typeof boundaries !== 'object' || Array.isArray(boundaries)) {
    console.warn('[StorageService] Invalid "nextResetBoundaries": expected a non-null object');
    return null;
  }

  const b = boundaries as Record<string, unknown>;
  for (const key of ['daily', 'threeDay', 'weekly'] as const) {
    if (typeof b[key] !== 'number' || (b[key] as number) <= 0) {
      console.warn(`[StorageService] Invalid "nextResetBoundaries.${key}": must be a positive number`);
      return null;
    }
  }

  // Validate history (or initialize it if migrating from v1)
  let history: Record<string, Record<string, boolean>> = {};
  if (version === 2) {
    const histRaw = obj['history'];
    if (histRaw === null || typeof histRaw !== 'object' || Array.isArray(histRaw)) {
      console.warn('[StorageService] Invalid "history": expected a non-null object');
      return null;
    }
    
    for (const [dateKey, dayData] of Object.entries(histRaw as Record<string, unknown>)) {
      if (dayData === null || typeof dayData !== 'object' || Array.isArray(dayData)) {
         console.warn(`[StorageService] Invalid history day "${dateKey}": expected an object`);
         return null;
      }
      for (const [itemId, completed] of Object.entries(dayData as Record<string, unknown>)) {
         if (typeof completed !== 'boolean') {
           console.warn(`[StorageService] Invalid history entry for "${dateKey} / ${itemId}": "completed" must be boolean`);
           return null;
         }
      }
    }
    history = histRaw as Record<string, Record<string, boolean>>;
  }

  return {
    version: 2,
    items: items as Record<string, ItemState>,
    history,
    nextResetBoundaries: {
      daily: b['daily'] as number,
      threeDay: b['threeDay'] as number,
      weekly: b['weekly'] as number,
    },
  };
}

export const StorageService = {
  /**
   * Reads and validates the persisted state from localStorage.
   * Returns null if the key is missing, the value is not valid JSON,
   * or the parsed value does not conform to the schema.
   */
  load(): PersistedState | null {
    let raw: string | null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      console.warn('[StorageService] Failed to read from localStorage:', err);
      return null;
    }

    if (raw === null) {
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
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
  save(state: PersistedState): SaveResult {
    try {
      const serialized = JSON.stringify(state);
      localStorage.setItem(STORAGE_KEY, serialized);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: message };
    }
  },
};
