/**
 * ResetEngine — pure functions for computing reset boundaries and elapsed checks.
 * No side effects, no I/O. All functions are safe to test without mocking.
 */

import { ACTIVITIES } from './config';
import type { ItemState, ResetPeriod, ActivityType } from './types';

// ---------------------------------------------------------------------------
// Daily reset
// ---------------------------------------------------------------------------

/**
 * Returns the next 00:00:00 local-time boundary as a UTC ms timestamp after `now`.
 *
 * @param now              - Current time as a Unix timestamp in ms.
 * @param timezoneOffsetMs - Local timezone offset in ms (positive = east of UTC).
 *                           Use `-new Date().getTimezoneOffset() * 60_000` for the
 *                           browser's local timezone.
 */
export function nextDailyReset(now: number, timezoneOffsetMs: number): number {
  // Shift `now` into local time, find the start of the next local day, then shift back.
  const localNow = now + timezoneOffsetMs;
  const msPerDay = 86_400_000;
  const startOfTodayLocal = Math.floor(localNow / msPerDay) * msPerDay;
  const startOfNextDayLocal = startOfTodayLocal + msPerDay;
  return startOfNextDayLocal - timezoneOffsetMs;
}

/**
 * Returns `true` iff a daily reset boundary has been crossed between `savedAt` and `now`.
 */
export function hasDailyResetElapsed(
  savedAt: number,
  now: number,
  timezoneOffsetMs: number,
): boolean {
  return now >= nextDailyReset(savedAt, timezoneOffsetMs);
}

// ---------------------------------------------------------------------------
// 3-day reset
// ---------------------------------------------------------------------------

/**
 * Returns the next 72-hour boundary after `now` relative to `anchorDate`.
 *
 * @param now        - Current time as a Unix timestamp in ms.
 * @param anchorDate - A known reset boundary (Unix timestamp in ms) used as the
 *                     origin for the 72-hour cycle.
 */
export function nextThreeDayReset(now: number, anchorDate: number): number {
  const msPerThreeDays = 259_200_000; // 72 * 60 * 60 * 1000
  const elapsed = now - anchorDate;
  const periodsElapsed = Math.floor(elapsed / msPerThreeDays);
  return anchorDate + (periodsElapsed + 1) * msPerThreeDays;
}

/**
 * Returns `true` iff a 3-day reset boundary has been crossed between `savedAt` and `now`.
 */
export function hasThreeDayResetElapsed(
  savedAt: number,
  now: number,
  anchorDate: number,
): boolean {
  return now >= nextThreeDayReset(savedAt, anchorDate);
}

// ---------------------------------------------------------------------------
// Weekly reset  (Requirements 6.1, 6.2, 6.3)
// ---------------------------------------------------------------------------

/**
 * Returns the next Wednesday 00:00 UTC timestamp strictly after `now`.
 *
 * Wednesday is UTC day-of-week 3 (getUTCDay() === 3).
 * The returned timestamp always satisfies:
 *   - new Date(result).getUTCDay()     === 3
 *   - new Date(result).getUTCHours()   === 0
 *   - new Date(result).getUTCMinutes() === 0
 *   - new Date(result).getUTCSeconds() === 0
 *   - result > now
 *
 * @param now - Current time as a Unix timestamp in ms.
 */
export function nextWeeklyReset(now: number): number {
  const msPerDay = 86_400_000;

  // Truncate `now` to the start of the current UTC day.
  const startOfTodayUTC = Math.floor(now / msPerDay) * msPerDay;

  // Day-of-week for the start of today (0 = Sunday … 6 = Saturday).
  const todayDow = new Date(startOfTodayUTC).getUTCDay();

  // Wednesday is day 3. Compute how many days until the next Wednesday.
  // If today IS Wednesday we still want the *next* one (7 days away), unless
  // `now` is exactly at midnight — in that case startOfTodayUTC === now and
  // we need to check whether `now` itself is already a valid boundary.
  const WEDNESDAY = 3;
  let daysUntilWednesday = (WEDNESDAY - todayDow + 7) % 7;

  // If `daysUntilWednesday` is 0 it means today is Wednesday.
  // The candidate boundary is startOfTodayUTC (today's midnight).
  // We need the result to be strictly greater than `now`, so if `now` is
  // already past (or equal to) today's midnight we must advance by 7 days.
  if (daysUntilWednesday === 0) {
    if (now >= startOfTodayUTC) {
      // `now` is at or after today's Wednesday midnight → next one is in 7 days.
      daysUntilWednesday = 7;
    }
    // else: `now` < startOfTodayUTC is impossible by construction.
  }

  return startOfTodayUTC + daysUntilWednesday * msPerDay;
}

/**
 * Returns `true` iff a weekly reset boundary has been crossed between `savedAt` and `now`.
 *
 * Specifically, returns `true` iff `now >= nextWeeklyReset(savedAt)`.
 */
export function hasWeeklyResetElapsed(savedAt: number, now: number): boolean {
  return now >= nextWeeklyReset(savedAt);
}

// ---------------------------------------------------------------------------
// Timer formatters
// ---------------------------------------------------------------------------

/**
 * Formats a duration in milliseconds as `"HH:MM:SS"`.
 *
 * @param durationMs - Non-negative duration in ms. Values ≥ 360,000,000 ms (100 h)
 *                     will produce hour values ≥ 100 (no upper clamp).
 */
export function formatCountdownHMS(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1_000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  ].join(':');
}

/**
 * Formats a duration in milliseconds as `"DD:HH:MM"`.
 *
 * @param durationMs - Non-negative duration in ms. Values ≥ 8,640,000,000 ms (100 days)
 *                     will produce day values ≥ 100 (no upper clamp).
 */
export function formatCountdownDHM(durationMs: number): string {
  const totalMinutes = Math.floor(durationMs / 60_000);
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const days = Math.floor(totalHours / 24);

  return [
    String(days).padStart(2, '0'),
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
  ].join(':');
}

// ---------------------------------------------------------------------------
// applyResets — pure state transformation (Requirements 4.1, 5.1, 6.1)
// ---------------------------------------------------------------------------

/**
 * Maps each `ResetPeriod` to the `ActivityType` values it should clear.
 */
const RESET_PERIOD_TYPES: Record<ResetPeriod, ActivityType[]> = {
  'daily':     ['Daily_Instance', 'Daily_Quest'],
  'three-day': ['Three_Day_Instance'],
  'weekly':    ['Weekly_Instance', 'Weekly_Quest'],
};

/**
 * Returns a new `items` record with `completed = false` for every item whose
 * `ActivityType` belongs to the given `ResetPeriod`. All other items are left
 * unchanged. The input record is never mutated.
 *
 * @param items  - Current item states keyed by item ID.
 * @param period - The reset period that has elapsed.
 */
export function applyResets(
  items: Record<string, ItemState>,
  period: ResetPeriod,
): Record<string, ItemState> {
  // Build a lookup: itemId → ActivityType, sourced from the ACTIVITIES config.
  const activityTypeById = new Map<string, ActivityType>(
    ACTIVITIES.map((a) => [a.id, a.type]),
  );

  const typesToClear = new Set<ActivityType>(RESET_PERIOD_TYPES[period]);

  const result: Record<string, ItemState> = {};

  for (const [id, state] of Object.entries(items)) {
    const activityType = activityTypeById.get(id);
    if (activityType !== undefined && typesToClear.has(activityType)) {
      result[id] = { ...state, completed: false };
    } else {
      result[id] = state;
    }
  }

  return result;
}
