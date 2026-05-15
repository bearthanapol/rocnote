import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { StorageService } from './storageService';
import type { PersistedState } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'game-checklist-state';

function setRaw(value: string): void {
  localStorage.setItem(STORAGE_KEY, value);
}

function makeValidState(overrides?: Partial<PersistedState>): PersistedState {
  return {
    version: 2,
    items: {
      'daily-instance-1': { completed: true, lastChangedAt: 1700000000000 },
      'daily-quest-1': { completed: false, lastChangedAt: 1700000001000 },
    },
    history: {},
    nextResetBoundaries: {
      daily: 1700010000000,
      threeDay: 1700100000000,
      weekly: 1700200000000,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Unit tests — task 4.4
// ---------------------------------------------------------------------------

describe('StorageService.load — unit tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when localStorage is empty', () => {
    expect(StorageService.load()).toBeNull();
  });

  it('loads a valid PersistedState correctly', () => {
    const state = makeValidState();
    StorageService.save(state);
    const loaded = StorageService.load();
    expect(loaded).not.toBeNull();
    expect(loaded).toEqual(state);
  });

  it('returns null for invalid JSON', () => {
    setRaw('not-valid-json{{{');
    expect(StorageService.load()).toBeNull();
  });

  it('returns null when version is not 1 or 2 (version 3)', () => {
    setRaw(JSON.stringify({ ...makeValidState(), version: 3 }));
    expect(StorageService.load()).toBeNull();
  });

  it('returns null when version is missing', () => {
    const { version: _v, ...noVersion } = makeValidState();
    setRaw(JSON.stringify(noVersion));
    expect(StorageService.load()).toBeNull();
  });

  it('returns null when items is an array instead of object', () => {
    setRaw(JSON.stringify({ ...makeValidState(), items: [] }));
    expect(StorageService.load()).toBeNull();
  });

  it('returns null when items is null', () => {
    setRaw(JSON.stringify({ ...makeValidState(), items: null }));
    expect(StorageService.load()).toBeNull();
  });

  it('returns null when an item is missing "completed"', () => {
    setRaw(
      JSON.stringify({
        ...makeValidState(),
        items: { 'daily-instance-1': { lastChangedAt: 1700000000000 } },
      }),
    );
    expect(StorageService.load()).toBeNull();
  });

  it('returns null when an item has "completed" as a string', () => {
    setRaw(
      JSON.stringify({
        ...makeValidState(),
        items: { 'daily-instance-1': { completed: 'yes', lastChangedAt: 1700000000000 } },
      }),
    );
    expect(StorageService.load()).toBeNull();
  });

  it('returns null when an item is missing "lastChangedAt"', () => {
    setRaw(
      JSON.stringify({
        ...makeValidState(),
        items: { 'daily-instance-1': { completed: true } },
      }),
    );
    expect(StorageService.load()).toBeNull();
  });

  it('returns null when an item has "lastChangedAt" as a string', () => {
    setRaw(
      JSON.stringify({
        ...makeValidState(),
        items: { 'daily-instance-1': { completed: true, lastChangedAt: '1700000000000' } },
      }),
    );
    expect(StorageService.load()).toBeNull();
  });

  it('returns null when nextResetBoundaries is missing', () => {
    const { nextResetBoundaries: _b, ...noB } = makeValidState();
    setRaw(JSON.stringify(noB));
    expect(StorageService.load()).toBeNull();
  });

  it('returns null when nextResetBoundaries.daily is missing', () => {
    const state = makeValidState();
    const { daily: _d, ...noBoundary } = state.nextResetBoundaries;
    setRaw(JSON.stringify({ ...state, nextResetBoundaries: noBoundary }));
    expect(StorageService.load()).toBeNull();
  });

  it('returns null when nextResetBoundaries.threeDay is zero (not positive)', () => {
    setRaw(
      JSON.stringify({
        ...makeValidState(),
        nextResetBoundaries: { daily: 1, threeDay: 0, weekly: 1 },
      }),
    );
    expect(StorageService.load()).toBeNull();
  });

  it('returns null when nextResetBoundaries.weekly is negative', () => {
    setRaw(
      JSON.stringify({
        ...makeValidState(),
        nextResetBoundaries: { daily: 1, threeDay: 1, weekly: -1 },
      }),
    );
    expect(StorageService.load()).toBeNull();
  });

  it('returns null when root value is an array', () => {
    setRaw(JSON.stringify([]));
    expect(StorageService.load()).toBeNull();
  });

  it('returns null when root value is a string', () => {
    setRaw(JSON.stringify('hello'));
    expect(StorageService.load()).toBeNull();
  });

  it('returns null when root value is null', () => {
    setRaw(JSON.stringify(null));
    expect(StorageService.load()).toBeNull();
  });
});

describe('StorageService.save — unit tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns { ok: true } on a successful save', () => {
    const result = StorageService.save(makeValidState());
    expect(result).toEqual({ ok: true });
  });

  it('persists the state so that load() returns it', () => {
    const state = makeValidState();
    StorageService.save(state);
    expect(StorageService.load()).toEqual(state);
  });

  it('returns { ok: false, error } when localStorage.setItem throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    const result = StorageService.save(makeValidState());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(typeof result.error).toBe('string');
    }
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// PBT-7: Storage serialization round-trip  (task 4.2)
// Feature: game-checklist, Property 7: Storage serialization round-trip
// Validates: Requirements 7.1, 7.4
// ---------------------------------------------------------------------------

// Arbitrary for a single ItemState
const itemStateArb = fc.record({
  completed: fc.boolean(),
  lastChangedAt: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
});

// Arbitrary for a Record<string, ItemState> (0–5 items)
const itemsArb = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 30 }),
  itemStateArb,
);

// Arbitrary for nextResetBoundaries (all three keys must be positive numbers)
const boundariesArb = fc.record({
  daily: fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }),
  threeDay: fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }),
  weekly: fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }),
});

const historyArb = fc.dictionary(
  fc.string(),
  fc.dictionary(fc.string(), fc.boolean())
);

// Arbitrary for a valid PersistedState
const persistedStateArb: fc.Arbitrary<PersistedState> = fc.record({
  version: fc.constant(2 as const),
  items: itemsArb,
  history: historyArb,
  nextResetBoundaries: boundariesArb,
});

describe('PBT-7: Storage serialization round-trip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('save then load returns a value deeply equal to the original', () => {
    // Feature: game-checklist, Property 7: Storage serialization round-trip
    fc.assert(
      fc.property(persistedStateArb, (state) => {
        localStorage.clear();
        const saveResult = StorageService.save(state);
        expect(saveResult.ok).toBe(true);
        const loaded = StorageService.load();
        expect(loaded).toEqual(state);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// PBT-8: Invalid storage always returns null  (task 4.3)
// Feature: game-checklist, Property 8: Invalid storage always returns null
// Validates: Requirements 7.3
// ---------------------------------------------------------------------------

describe('PBT-8: Invalid storage always returns null', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('non-JSON strings always return null', () => {
    // Feature: game-checklist, Property 8: Invalid storage always returns null
    fc.assert(
      fc.property(
        fc.string().filter((s) => {
          try {
            JSON.parse(s);
            return false; // skip valid JSON strings
          } catch {
            return true;
          }
        }),
        (invalidJson) => {
          setRaw(invalidJson);
          expect(StorageService.load()).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('arbitrary JSON values that are not valid PersistedState return null', () => {
    // Feature: game-checklist, Property 8: Invalid storage always returns null
    // Generate JSON-serializable values that are NOT valid PersistedState objects
    const invalidPayloadArb = fc.oneof(
      // Wrong version
      fc.record({
        version: fc.integer().filter((v) => v !== 1 && v !== 2),
        items: fc.constant({}),
        history: fc.constant({}),
        nextResetBoundaries: fc.constant({ daily: 1, threeDay: 1, weekly: 1 }),
      }),
      // Missing items
      fc.record({
        version: fc.constant(2),
        history: fc.constant({}),
        nextResetBoundaries: fc.constant({ daily: 1, threeDay: 1, weekly: 1 }),
      }),
      // items is an array
      fc.record({
        version: fc.constant(2),
        items: fc.constant([]),
        history: fc.constant({}),
        nextResetBoundaries: fc.constant({ daily: 1, threeDay: 1, weekly: 1 }),
      }),
      // nextResetBoundaries has a non-positive value
      fc.record({
        version: fc.constant(2),
        items: fc.constant({}),
        history: fc.constant({}),
        nextResetBoundaries: fc.record({
          daily: fc.integer({ max: 0 }),
          threeDay: fc.constant(1),
          weekly: fc.constant(1),
        }),
      }),
      // Primitive values
      fc.integer(),
      fc.boolean(),
      fc.constant(null),
      fc.constant([]),
    );

    fc.assert(
      fc.property(invalidPayloadArb, (payload) => {
        setRaw(JSON.stringify(payload));
        expect(StorageService.load()).toBeNull();
      }),
      { numRuns: 100 },
    );
  });
});
