# Implementation Plan: Game Checklist

## Overview

Build a client-side SPA with vanilla TypeScript + Vite. The implementation proceeds in layers: shared types and config first, then the pure `ResetEngine` (most testable), then `StorageService`, then the `ResetScheduler`, and finally the two UI components (`CalendarComponent`, `ChecklistComponent`) wired together in `main.ts`. Property-based tests (Vitest + fast-check) are placed immediately after the code they validate.

---

## Tasks

- [x] 1. Project scaffold and shared foundations
  - [x] 1.1 Initialize Vite + TypeScript project and install dependencies
    - Run `npm create vite@latest . -- --template vanilla-ts`, then install `vitest` and `fast-check`
    - Add `vitest.config.ts` with `globals: true` and `environment: 'jsdom'`
    - Add `"test"` script to `package.json`: `vitest --run`
    - _Requirements: 8.1_

  - [x] 1.2 Create `src/types.ts` with all shared interfaces and enums
    - Define `ActivityType`, `ResetPeriod`, `ResetType`, `ActivityDefinition`, `ChecklistItem`, `ActivityGroup`, `ResetDateEntry`, `CalendarProps`, `ChecklistProps`, `PersistedState`, `ItemState`, `SaveResult`
    - _Requirements: 2.1, 2.2, 3.1, 7.1_

  - [x] 1.3 Create `src/config.ts` with build-time constants
    - Export `ACTIVITIES: ActivityDefinition[]` covering all five `ActivityType` values (at least two items per type)
    - Export `THREE_DAY_ANCHOR_DATE: number` defaulting to `new Date('2024-01-01T00:00:00Z').getTime()`
    - _Requirements: 5.5_

- [x] 2. ResetEngine — pure reset logic
  - [x] 2.1 Implement `nextDailyReset` and `hasDailyResetElapsed` in `src/resetEngine.ts`
    - `nextDailyReset(now, timezoneOffsetMs)` returns the next 00:00:00 local-time boundary as a UTC ms timestamp
    - `hasDailyResetElapsed(savedAt, now, timezoneOffsetMs)` returns `true` iff `now >= nextDailyReset(savedAt, timezoneOffsetMs)`
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 2.2 Write property test PBT-1 (partial) for `nextDailyReset`
    - **Property 1: Reset boundary is always in the future** (daily)
    - **Validates: Requirements 4.3**
    - Use `fc.integer({ min: 0, max: 2**53 - 1 })` for `now`
    - `// Feature: game-checklist, Property 1: Reset boundary is always in the future`

  - [ ]* 2.3 Write property test PBT-2 (partial) for daily elapsed detection
    - **Property 2: Reset elapsed detection is consistent with boundary computation** (daily)
    - **Validates: Requirements 4.2, 7.2**
    - Use `fc.tuple(fc.integer({ min: 0 }), fc.integer({ min: 0 }))` for `(savedAt, now)`
    - `// Feature: game-checklist, Property 2: Reset elapsed detection consistent with boundary`

  - [x] 2.4 Implement `nextThreeDayReset` and `hasThreeDayResetElapsed` in `src/resetEngine.ts`
    - `nextThreeDayReset(now, anchorDate)` returns the next 72-hour boundary after `now` relative to `anchorDate`
    - `hasThreeDayResetElapsed(savedAt, now, anchorDate)` returns `true` iff `now >= nextThreeDayReset(savedAt, anchorDate)`
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

  - [ ]* 2.5 Write property tests PBT-1 (partial), PBT-2 (partial), PBT-3 for three-day reset
    - **Property 1: Reset boundary is always in the future** (three-day)
    - **Property 2: Reset elapsed detection consistent with boundary** (three-day)
    - **Property 3: 3-day reset boundaries are exactly 72 hours apart**
    - **Validates: Requirements 5.1, 5.2, 5.5**
    - Use `fc.integer({ min: 0, max: 2**53 - 1 })` for `t`
    - `// Feature: game-checklist, Property 3: 3-day boundaries are exactly 72 hours apart`

  - [x] 2.6 Implement `nextWeeklyReset` and `hasWeeklyResetElapsed` in `src/resetEngine.ts`
    - `nextWeeklyReset(now)` returns the next Wednesday 00:00 UTC timestamp after `now`
    - `hasWeeklyResetElapsed(savedAt, now)` returns `true` iff `now >= nextWeeklyReset(savedAt)`
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 2.7 Write property tests PBT-1 (partial), PBT-2 (partial), PBT-4 for weekly reset
    - **Property 1: Reset boundary is always in the future** (weekly)
    - **Property 2: Reset elapsed detection consistent with boundary** (weekly)
    - **Property 4: Weekly reset always lands on Wednesday 00:00 UTC**
    - **Validates: Requirements 6.1, 6.2, 6.3**
    - Use `fc.integer({ min: 0, max: 2**53 - 1 })` for `now`
    - `// Feature: game-checklist, Property 4: Weekly reset always lands on Wednesday 00:00 UTC`

  - [x] 2.8 Implement `formatCountdownHMS` and `formatCountdownDHM` in `src/resetEngine.ts`
    - `formatCountdownHMS(durationMs)` returns `"HH:MM:SS"` string
    - `formatCountdownDHM(durationMs)` returns `"DD:HH:MM"` string
    - _Requirements: 2.5, 4.3, 5.3, 6.3_

  - [ ]* 2.9 Write property tests PBT-5 and PBT-6 for timer formatters
    - **Property 5: HH:MM:SS format encodes duration correctly**
    - **Property 6: DD:HH:MM format encodes duration correctly**
    - **Validates: Requirements 2.5, 4.3, 5.3, 6.3**
    - Use `fc.integer({ min: 0, max: 359_999_999 })` for HMS and `fc.integer({ min: 0, max: 8_639_999_999 })` for DHM
    - `// Feature: game-checklist, Property 5: HH:MM:SS format encodes duration correctly`
    - `// Feature: game-checklist, Property 6: DD:HH:MM format encodes duration correctly`

- [x] 3. Checkpoint — ResetEngine tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. StorageService — localStorage persistence
  - [x] 4.1 Implement `StorageService` in `src/storageService.ts`
    - `load()`: reads `game-checklist-state` from `localStorage`, validates schema (version === 1, required fields, positive timestamps), returns `PersistedState | null`; logs console warning on failure
    - `save(state)`: serializes and writes to `localStorage`; catches quota/security errors and returns `{ ok: false, error }`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 4.2 Write property test PBT-7 for storage round-trip
    - **Property 7: Storage serialization round-trip**
    - **Validates: Requirements 7.1, 7.4**
    - Use a custom `fc.record(...)` arbitrary that generates valid `PersistedState` objects
    - `// Feature: game-checklist, Property 7: Storage serialization round-trip`

  - [ ]* 4.3 Write property test PBT-8 for invalid storage
    - **Property 8: Invalid storage always returns null**
    - **Validates: Requirements 7.3**
    - Use `fc.oneof(fc.string(), fc.anything())` to generate invalid payloads written directly to `localStorage`
    - `// Feature: game-checklist, Property 8: Invalid storage always returns null`

  - [ ]* 4.4 Write unit tests for StorageService edge cases
    - Test: valid schema loads correctly
    - Test: each schema violation type (wrong version, missing fields, wrong types, negative timestamps) returns `null`
    - Test: save failure (mock `localStorage.setItem` to throw) surfaces `{ ok: false }`
    - _Requirements: 7.2, 7.3_

- [ ] 5. Checkpoint — StorageService tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Reset application logic — state management
  - [x] 6.1 Implement `applyResets` helper in `src/resetEngine.ts`
    - Pure function: given a `Record<string, ItemState>` and a `ResetPeriod`, returns a new record with `completed = false` for all items belonging to that period's activity types; leaves other items unchanged
    - Daily reset clears `Daily_Instance` and `Daily_Quest`; 3-day clears `Three_Day_Instance`; weekly clears `Weekly_Instance` and `Weekly_Quest`
    - _Requirements: 4.1, 5.1, 6.1_

  - [ ]* 6.2 Write property test PBT-9 for reset group isolation
    - **Property 9: Reset clears exactly the correct activity group**
    - **Validates: Requirements 4.1, 5.1, 6.1**
    - Use `fc.record(...)` for checklist state + `fc.constantFrom('daily', 'three-day', 'weekly')`
    - `// Feature: game-checklist, Property 9: Reset clears exactly the correct activity group`

- [ ] 7. ResetScheduler — tick loop
  - [~] 7.1 Implement `ResetScheduler` in `src/resetScheduler.ts`
    - `start(callbacks)`: starts a `setInterval` at 1000 ms; on each tick calls `onTick(Date.now())`, checks daily/3-day/weekly boundaries and fires the appropriate reset callback, checks for calendar day change and fires `onDayChange`
    - `stop()`: clears the interval
    - _Requirements: 4.4, 5.4, 6.4, 1.2_

- [ ] 8. CalendarComponent — calendar UI
  - [~] 8.1 Implement `CalendarComponent` in `src/components/CalendarComponent.ts`
    - Renders a month grid into a given container element
    - Highlights today's cell
    - Renders reset indicators (`ResetDateEntry[]`) on matching dates with distinct labels ("Daily Reset", "3-Day Reset", "Weekly Reset")
    - Supports previous/next month navigation (updates displayed month only)
    - Shows a notice when `resetDates` is empty
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.6, 6.5_

  - [ ]* 8.2 Write property test PBT-12 for calendar reset indicators
    - **Property 12: Calendar reset indicators match the reset schedule exactly**
    - **Validates: Requirements 1.3, 1.5, 5.6, 6.5**
    - Use `fc.array(fc.record({ date: fc.date(), type: fc.constantFrom('daily', 'three-day', 'weekly') }))` for reset dates
    - `// Feature: game-checklist, Property 12: Calendar reset indicators match the reset schedule exactly`

  - [ ]* 8.3 Write unit tests for CalendarComponent
    - Test: correct month grid cell count for months with 28/29/30/31 days
    - Test: today's cell has the highlight class
    - Test: reset indicators appear on correct dates and not on others
    - _Requirements: 1.1, 1.3_

- [ ] 9. ChecklistComponent — checklist UI
  - [~] 9.1 Implement `ChecklistComponent` in `src/components/ChecklistComponent.ts`
    - Renders `ActivityGroup[]` in the required order: `Daily_Instance` → `Daily_Quest` → `Three_Day_Instance` → `Weekly_Instance` → `Weekly_Quest`
    - Each item renders a checkbox, activity name, and `ActivityType` label
    - Completed items get strikethrough + 50% opacity
    - Each group shows a `Reset_Timer` (HMS for daily, DHM for 3-day/weekly) and a progress indicator (`"k / n"`)
    - Calls `onToggle(itemId, checked)` on checkbox change
    - Displays a non-blocking warning banner when `StorageService.save()` returns `{ ok: false }`
    - _Requirements: 2.1, 2.2, 2.5, 3.1, 3.2, 3.4, 3.5_

  - [ ]* 9.2 Write property test PBT-10 for progress indicator
    - **Property 10: Progress indicator matches actual completion state**
    - **Validates: Requirements 3.5**
    - Use `fc.array(fc.boolean())` for item completion states
    - `// Feature: game-checklist, Property 10: Progress indicator matches completion state`

  - [ ]* 9.3 Write property test PBT-11 for check/uncheck round-trip
    - **Property 11: Check/uncheck round-trip restores original state**
    - **Validates: Requirements 3.1, 3.2**
    - Use `fc.boolean()` for initial `completed` flag
    - `// Feature: game-checklist, Property 11: Check/uncheck round-trip restores original state`

  - [ ]* 9.4 Write unit tests for ChecklistComponent
    - Test: items render in the correct group order
    - Test: timer format is HMS for daily group and DHM for 3-day/weekly groups
    - Test: progress indicator updates immediately after toggle
    - _Requirements: 2.1, 2.5, 3.5_

- [~] 10. Checkpoint — component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Wire everything together in `main.ts`
  - [~] 11.1 Implement `src/main.ts` — bootstrap and wiring
    - Call `StorageService.load()`; if `null`, initialize fresh state from `ACTIVITIES`
    - Run `ResetEngine` elapsed checks on load; apply resets as needed; save updated state
    - Compute `ResetDateEntry[]` for the next 30 days (daily, 3-day, weekly boundaries) and pass to `CalendarComponent`
    - Initialize `CalendarComponent` and `ChecklistComponent` with resolved state
    - Start `ResetScheduler`; on reset callbacks: call `applyResets`, save state, re-render `ChecklistComponent`; on `onDayChange`: re-render `CalendarComponent`
    - Wire `ChecklistComponent.onToggle` → update state → `StorageService.save()` → show warning banner on failure
    - _Requirements: 2.3, 2.4, 3.3, 4.2, 5.2, 6.2, 7.2_

  - [ ]* 11.2 Write integration smoke tests
    - Test: full page renders without JS errors on load (jsdom)
    - Test: checking an item and calling `StorageService.save()` + `load()` restores the checked state
    - Test: manipulating stored `nextResetBoundaries` to a past timestamp causes items to appear unchecked after re-initialization
    - _Requirements: 2.3, 2.4, 7.2_

- [ ] 12. Responsive layout and styling
  - [~] 12.1 Create `src/styles/main.css` with CSS custom properties and dark theme
    - Define CSS custom properties for background (luminance < 0.1), accent color, text color
    - Ensure text-to-background contrast ratio ≥ 4.5:1 (WCAG 2.1 AA)
    - _Requirements: 8.5, 8.6_

  - [~] 12.2 Implement responsive two-column / single-column layout
    - Default (≥ 768px): two-column flex/grid layout, each panel ≥ 40% viewport width
    - Below 768px: single-column stacked layout, no horizontal scroll
    - Verify renders correctly from 320px to 2560px
    - _Requirements: 8.1, 8.2, 8.3_

  - [~] 12.3 Add ARIA attributes and keyboard accessibility to interactive elements
    - All checkboxes must have associated `<label>` elements
    - Navigation buttons (prev/next month) must have `aria-label`
    - Ensure tab order is logical
    - _Requirements: 8.4_

- [~] 13. Final checkpoint — all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use the comment tag `// Feature: game-checklist, Property N: ...` for identification
- All 12 correctness properties from the design document are covered by PBT sub-tasks
- `ResetEngine` is pure (no I/O) — all its functions are safe to test without mocking
- `StorageService` PBT-7 and PBT-8 require a `jsdom` environment to access `localStorage`
- The `THREE_DAY_ANCHOR_DATE` constant makes 3-day reset boundaries deterministic and independently verifiable

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.4", "2.6", "2.8"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.5", "2.7", "2.9", "4.1", "6.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.4", "6.2", "7.1"] },
    { "id": 4, "tasks": ["8.1", "9.1"] },
    { "id": 5, "tasks": ["8.2", "8.3", "9.2", "9.3", "9.4"] },
    { "id": 6, "tasks": ["11.1", "12.1"] },
    { "id": 7, "tasks": ["11.2", "12.2", "12.3"] }
  ]
}
```
