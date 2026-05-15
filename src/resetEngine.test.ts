import { describe, it, expect } from 'vitest';
import {
  formatCountdownHMS,
  formatCountdownDHM,
  nextThreeDayReset,
  hasThreeDayResetElapsed,
} from './resetEngine';

// Fixed anchor: 2024-01-01T00:00:00Z = 1704067200000
const ANCHOR = new Date('2024-01-01T00:00:00Z').getTime();
const THREE_DAY_MS = 72 * 60 * 60 * 1000; // 259_200_000

describe('formatCountdownHMS', () => {
  it('formats zero duration as 00:00:00', () => {
    expect(formatCountdownHMS(0)).toBe('00:00:00');
  });

  it('formats 1 second correctly', () => {
    expect(formatCountdownHMS(1_000)).toBe('00:00:01');
  });

  it('formats 1 minute correctly', () => {
    expect(formatCountdownHMS(60_000)).toBe('00:01:00');
  });

  it('formats 1 hour correctly', () => {
    expect(formatCountdownHMS(3_600_000)).toBe('01:00:00');
  });

  it('formats 1h 2m 3s correctly', () => {
    expect(formatCountdownHMS(1 * 3_600_000 + 2 * 60_000 + 3 * 1_000)).toBe('01:02:03');
  });

  it('seconds component stays in [0, 59]', () => {
    // 59 seconds
    expect(formatCountdownHMS(59_000)).toBe('00:00:59');
    // 60 seconds rolls over to 1 minute
    expect(formatCountdownHMS(60_000)).toBe('00:01:00');
  });

  it('minutes component stays in [0, 59]', () => {
    // 59 minutes
    expect(formatCountdownHMS(59 * 60_000)).toBe('00:59:00');
    // 60 minutes rolls over to 1 hour
    expect(formatCountdownHMS(60 * 60_000)).toBe('01:00:00');
  });

  it('hours can exceed 99 (zero-padded to at least 2 digits)', () => {
    // 100 hours
    expect(formatCountdownHMS(100 * 3_600_000)).toBe('100:00:00');
  });

  it('sub-second durations truncate to whole seconds', () => {
    expect(formatCountdownHMS(999)).toBe('00:00:00');
    expect(formatCountdownHMS(1_999)).toBe('00:00:01');
  });
});

describe('formatCountdownDHM', () => {
  it('formats zero duration as 00:00:00', () => {
    expect(formatCountdownDHM(0)).toBe('00:00:00');
  });

  it('formats 1 minute correctly', () => {
    expect(formatCountdownDHM(60_000)).toBe('00:00:01');
  });

  it('formats 1 hour correctly', () => {
    expect(formatCountdownDHM(3_600_000)).toBe('00:01:00');
  });

  it('formats 1 day correctly', () => {
    expect(formatCountdownDHM(86_400_000)).toBe('01:00:00');
  });

  it('formats 1d 2h 3m correctly', () => {
    expect(formatCountdownDHM(1 * 86_400_000 + 2 * 3_600_000 + 3 * 60_000)).toBe('01:02:03');
  });

  it('minutes component stays in [0, 59]', () => {
    expect(formatCountdownDHM(59 * 60_000)).toBe('00:00:59');
    expect(formatCountdownDHM(60 * 60_000)).toBe('00:01:00');
  });

  it('hours component stays in [0, 23]', () => {
    expect(formatCountdownDHM(23 * 3_600_000)).toBe('00:23:00');
    expect(formatCountdownDHM(24 * 3_600_000)).toBe('01:00:00');
  });

  it('days can be large (zero-padded to at least 2 digits)', () => {
    // 100 days
    expect(formatCountdownDHM(100 * 86_400_000)).toBe('100:00:00');
  });

  it('sub-minute durations truncate to whole minutes', () => {
    expect(formatCountdownDHM(59_999)).toBe('00:00:00');
    expect(formatCountdownDHM(60_000)).toBe('00:00:01');
  });
});

// ---------------------------------------------------------------------------
// nextThreeDayReset — task 2.4 (Requirements 5.1, 5.3, 5.5)
// ---------------------------------------------------------------------------

describe('nextThreeDayReset', () => {
  it('returns the first boundary when now equals the anchor', () => {
    // now === anchor → next boundary is anchor + 1 period
    expect(nextThreeDayReset(ANCHOR, ANCHOR)).toBe(ANCHOR + THREE_DAY_MS);
  });

  it('returns a value strictly greater than now', () => {
    const now = ANCHOR + 1000; // 1 second after anchor
    const next = nextThreeDayReset(now, ANCHOR);
    expect(next).toBeGreaterThan(now);
  });

  it('returns the correct boundary 1ms before a boundary', () => {
    // 1ms before the second boundary → next should be the second boundary
    const secondBoundary = ANCHOR + 2 * THREE_DAY_MS;
    const now = secondBoundary - 1;
    expect(nextThreeDayReset(now, ANCHOR)).toBe(secondBoundary);
  });

  it('returns the next boundary when now is exactly on a boundary', () => {
    // now === first boundary → next should be the second boundary
    const firstBoundary = ANCHOR + THREE_DAY_MS;
    expect(nextThreeDayReset(firstBoundary, ANCHOR)).toBe(ANCHOR + 2 * THREE_DAY_MS);
  });

  it('consecutive boundaries are exactly 72 hours apart', () => {
    const now = ANCHOR + 100_000;
    const b1 = nextThreeDayReset(now, ANCHOR);
    const b2 = nextThreeDayReset(b1, ANCHOR);
    expect(b2 - b1).toBe(THREE_DAY_MS);
  });

  it('works for now before the anchor date', () => {
    const now = ANCHOR - 1000; // 1 second before anchor
    const next = nextThreeDayReset(now, ANCHOR);
    // elapsed = -1000, floor(-1000 / 259_200_000) = -1, so next = anchor + 0 * period = anchor
    expect(next).toBe(ANCHOR);
    expect(next).toBeGreaterThan(now);
  });
});

// ---------------------------------------------------------------------------
// hasThreeDayResetElapsed — task 2.4 (Requirements 5.1, 5.2)
// ---------------------------------------------------------------------------

describe('hasThreeDayResetElapsed', () => {
  it('returns false when now is before the next boundary after savedAt', () => {
    const savedAt = ANCHOR;
    const now = ANCHOR + THREE_DAY_MS - 1; // 1ms before the boundary
    expect(hasThreeDayResetElapsed(savedAt, now, ANCHOR)).toBe(false);
  });

  it('returns true when now equals the next boundary after savedAt', () => {
    const savedAt = ANCHOR;
    const now = ANCHOR + THREE_DAY_MS; // exactly at the boundary
    expect(hasThreeDayResetElapsed(savedAt, now, ANCHOR)).toBe(true);
  });

  it('returns true when now is well past the next boundary', () => {
    const savedAt = ANCHOR;
    const now = ANCHOR + 5 * THREE_DAY_MS;
    expect(hasThreeDayResetElapsed(savedAt, now, ANCHOR)).toBe(true);
  });

  it('returns false when savedAt and now are in the same period', () => {
    const savedAt = ANCHOR + 1000;
    const now = ANCHOR + 2000;
    expect(hasThreeDayResetElapsed(savedAt, now, ANCHOR)).toBe(false);
  });

  it('is consistent with nextThreeDayReset: true iff now >= nextThreeDayReset(savedAt)', () => {
    const savedAt = ANCHOR + 50_000;
    const boundary = nextThreeDayReset(savedAt, ANCHOR);

    expect(hasThreeDayResetElapsed(savedAt, boundary - 1, ANCHOR)).toBe(false);
    expect(hasThreeDayResetElapsed(savedAt, boundary, ANCHOR)).toBe(true);
    expect(hasThreeDayResetElapsed(savedAt, boundary + 1, ANCHOR)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// applyResets — task 6.1 (Requirements 4.1, 5.1, 6.1)
// ---------------------------------------------------------------------------

import { applyResets } from './resetEngine';
import type { ItemState } from './types';

/** Helper: build an ItemState with a given completed flag. */
function makeState(completed: boolean): ItemState {
  return { completed, lastChangedAt: 0 };
}

describe('applyResets', () => {
  // A representative set of items covering all five ActivityTypes.
  const allItems: Record<string, ItemState> = {
    'daily-instance-1':    makeState(true),
    'daily-instance-2':    makeState(true),
    'daily-quest-1':       makeState(true),
    'daily-quest-2':       makeState(true),
    'three-day-instance-1': makeState(true),
    'three-day-instance-2': makeState(true),
    'weekly-instance-1':   makeState(true),
    'weekly-instance-2':   makeState(true),
    'weekly-quest-1':      makeState(true),
    'weekly-quest-2':      makeState(true),
  };

  // ── daily reset ──────────────────────────────────────────────────────────

  it('daily reset clears Daily_Instance items', () => {
    const result = applyResets(allItems, 'daily');
    expect(result['daily-instance-1'].completed).toBe(false);
    expect(result['daily-instance-2'].completed).toBe(false);
  });

  it('daily reset clears Daily_Quest items', () => {
    const result = applyResets(allItems, 'daily');
    expect(result['daily-quest-1'].completed).toBe(false);
    expect(result['daily-quest-2'].completed).toBe(false);
  });

  it('daily reset leaves Three_Day_Instance items unchanged', () => {
    const result = applyResets(allItems, 'daily');
    expect(result['three-day-instance-1'].completed).toBe(true);
    expect(result['three-day-instance-2'].completed).toBe(true);
  });

  it('daily reset leaves Weekly_Instance and Weekly_Quest items unchanged', () => {
    const result = applyResets(allItems, 'daily');
    expect(result['weekly-instance-1'].completed).toBe(true);
    expect(result['weekly-instance-2'].completed).toBe(true);
    expect(result['weekly-quest-1'].completed).toBe(true);
    expect(result['weekly-quest-2'].completed).toBe(true);
  });

  // ── three-day reset ───────────────────────────────────────────────────────

  it('three-day reset clears Three_Day_Instance items', () => {
    const result = applyResets(allItems, 'three-day');
    expect(result['three-day-instance-1'].completed).toBe(false);
    expect(result['three-day-instance-2'].completed).toBe(false);
  });

  it('three-day reset leaves Daily_Instance and Daily_Quest items unchanged', () => {
    const result = applyResets(allItems, 'three-day');
    expect(result['daily-instance-1'].completed).toBe(true);
    expect(result['daily-quest-1'].completed).toBe(true);
  });

  it('three-day reset leaves Weekly_Instance and Weekly_Quest items unchanged', () => {
    const result = applyResets(allItems, 'three-day');
    expect(result['weekly-instance-1'].completed).toBe(true);
    expect(result['weekly-quest-1'].completed).toBe(true);
  });

  // ── weekly reset ──────────────────────────────────────────────────────────

  it('weekly reset clears Weekly_Instance items', () => {
    const result = applyResets(allItems, 'weekly');
    expect(result['weekly-instance-1'].completed).toBe(false);
    expect(result['weekly-instance-2'].completed).toBe(false);
  });

  it('weekly reset clears Weekly_Quest items', () => {
    const result = applyResets(allItems, 'weekly');
    expect(result['weekly-quest-1'].completed).toBe(false);
    expect(result['weekly-quest-2'].completed).toBe(false);
  });

  it('weekly reset leaves Daily_Instance and Daily_Quest items unchanged', () => {
    const result = applyResets(allItems, 'weekly');
    expect(result['daily-instance-1'].completed).toBe(true);
    expect(result['daily-quest-1'].completed).toBe(true);
  });

  it('weekly reset leaves Three_Day_Instance items unchanged', () => {
    const result = applyResets(allItems, 'weekly');
    expect(result['three-day-instance-1'].completed).toBe(true);
    expect(result['three-day-instance-2'].completed).toBe(true);
  });

  // ── immutability ──────────────────────────────────────────────────────────

  it('does not mutate the input record', () => {
    const input: Record<string, ItemState> = {
      'daily-instance-1': makeState(true),
    };
    applyResets(input, 'daily');
    expect(input['daily-instance-1'].completed).toBe(true);
  });

  it('returns a new object reference', () => {
    const input: Record<string, ItemState> = {
      'daily-instance-1': makeState(true),
    };
    const result = applyResets(input, 'daily');
    expect(result).not.toBe(input);
  });

  // ── unknown item IDs ──────────────────────────────────────────────────────

  it('preserves items with IDs not in ACTIVITIES config unchanged', () => {
    const input: Record<string, ItemState> = {
      'unknown-item-xyz': makeState(true),
    };
    const result = applyResets(input, 'daily');
    expect(result['unknown-item-xyz'].completed).toBe(true);
  });

  // ── already-false items ───────────────────────────────────────────────────

  it('items already unchecked remain unchecked after reset', () => {
    const input: Record<string, ItemState> = {
      'daily-instance-1': makeState(false),
    };
    const result = applyResets(input, 'daily');
    expect(result['daily-instance-1'].completed).toBe(false);
  });

  // ── preserves other ItemState fields ─────────────────────────────────────

  it('preserves lastChangedAt on cleared items', () => {
    const ts = 1_700_000_000_000;
    const input: Record<string, ItemState> = {
      'daily-instance-1': { completed: true, lastChangedAt: ts },
    };
    const result = applyResets(input, 'daily');
    expect(result['daily-instance-1'].lastChangedAt).toBe(ts);
  });
});
