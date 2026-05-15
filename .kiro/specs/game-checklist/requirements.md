# Requirements Document

## Introduction

A modern game checklist website that helps players track their recurring in-game activities. The site displays a calendar view at the top and a checklist of activities below it. Activities are grouped by reset period — daily, 3-day, and weekly — and each group resets automatically when its time period expires. Players can check off completed activities and see at a glance what still needs to be done.

## Glossary

- **Checklist**: The full list of game activities a player needs to complete within a reset period.
- **Checklist_Item**: A single trackable activity in the checklist (e.g., one daily quest or one weekly instance).
- **Activity_Type**: The category of a checklist item. One of: Daily_Instance, Daily_Quest, Three_Day_Instance, Weekly_Instance, Weekly_Quest.
- **Reset_Period**: The time interval after which a group of checklist items reverts to unchecked. Periods are: daily (24 hours), 3-day (72 hours), and weekly (7 days).
- **Calendar**: The calendar widget displayed at the top of the page showing the current date and reset countdowns.
- **Reset_Timer**: A countdown displayed per activity group showing time remaining until the next reset.
- **Player**: The end user of the website.
- **Completion_State**: The checked/unchecked status of a Checklist_Item for the current reset period.

---

## Requirements

### Requirement 1: Display Calendar View

**User Story:** As a player, I want to see a calendar at the top of the page, so that I can understand the current date and how it relates to my activity reset schedule.

#### Acceptance Criteria

1. THE Calendar SHALL display the current month and highlight the current day.
2. WHEN the current day changes, THE Calendar SHALL update the highlighted day automatically within 60 seconds without requiring a page reload.
3. THE Calendar SHALL display reset indicators on dates when a Daily reset, Three_Day reset, or Weekly reset occurs, with a visible label per reset type (Daily, Three_Day, Weekly).
4. WHEN reset schedule data is unavailable, THE Calendar SHALL display dates without reset indicators and show a notice to the player that reset schedule data could not be loaded.
5. WHEN a player navigates to a previous or next month, THE Calendar SHALL display that month's dates and show reset indicators only for dates covered by the loaded reset schedule data.

---

### Requirement 2: Display Checklist Items

**User Story:** As a player, I want to see all my game activities in a checklist below the calendar, so that I can track what I have and have not completed.

#### Acceptance Criteria

1. THE Checklist SHALL display all Checklist_Items grouped by Activity_Type in the following order: Daily_Instance, Daily_Quest, Three_Day_Instance, Weekly_Instance, Weekly_Quest.
2. THE Checklist SHALL display each Checklist_Item with a checkbox, an activity name, and its Activity_Type label.
3. WHEN a player loads the page and the Reset_Period boundary has not been crossed since the Completion_State was last saved, THE Checklist SHALL restore each Checklist_Item's Completion_State from the previous session.
4. WHEN a player loads the page and the Reset_Period boundary has been crossed since the Completion_State was last saved, THE Checklist SHALL display all items in that group as unchecked.
5. THE Checklist SHALL display a Reset_Timer for each activity group showing the time remaining until the next reset in HH:MM:SS format, updating once per second.

---

### Requirement 3: Check Off Activities

**User Story:** As a player, I want to mark activities as complete, so that I can track my progress for the current reset period.

#### Acceptance Criteria

1. WHEN a player checks a Checklist_Item, THE Checklist SHALL update that item's Completion_State to completed and display it with strikethrough text and reduced opacity (50% or less) to visually distinguish it from unchecked items.
2. WHEN a player unchecks a completed Checklist_Item, THE Checklist SHALL update that item's Completion_State to unchecked and remove the strikethrough and opacity styling.
3. WHEN a player checks or unchecks a Checklist_Item, THE Checklist SHALL persist the updated Completion_State to local storage within 100ms.
4. WHEN a local storage write fails, THE Checklist SHALL display a non-blocking warning message to the player indicating that progress could not be saved.
5. THE Checklist SHALL display a progress indicator per activity group showing the count of completed items out of total items (e.g., "3 / 5"), updating immediately after each check or uncheck action.

---

### Requirement 4: Automatic Daily Reset

**User Story:** As a player, I want my daily activities to reset every day, so that I can track fresh completions each day without manually clearing the list.

#### Acceptance Criteria

1. WHEN the daily Reset_Period expires, THE Checklist SHALL set the Completion_State of all Daily_Instance and Daily_Quest items to unchecked.
2. WHEN a player opens the page after a daily reset has occurred, THE Checklist SHALL display all Daily_Instance and Daily_Quest items as unchecked regardless of the previous session's Completion_State.
3. WHILE the daily Reset_Timer is counting down, THE Reset_Timer SHALL display the time remaining until 00:00:00 of the next day in the player's local timezone in HH:MM:SS format.
4. WHEN the daily Reset_Timer reaches zero, THE Reset_Timer SHALL display zero for 1 to 2 seconds before updating to the countdown targeting 00:00:00 of the following day in the player's local timezone.

---

### Requirement 5: Automatic 3-Day Reset

**User Story:** As a player, I want my 3-day instance activities to reset every 3 days, so that I can track them on their correct schedule.

#### Acceptance Criteria

1. WHEN one or more 3-day Reset_Period boundaries have elapsed since the Completion_State was last saved, THE Checklist SHALL set the Completion_State of all Three_Day_Instance items to unchecked.
2. WHEN a player opens the page after one or more 3-day resets have occurred, THE Checklist SHALL display all Three_Day_Instance items as unchecked regardless of the previous session's Completion_State.
3. WHILE the 3-day Reset_Timer is counting down, THE Reset_Timer SHALL display the days, hours, and minutes remaining until the next 3-day reset boundary in DD:HH:MM format, updating once per minute.
4. WHEN the 3-day Reset_Timer reaches zero, THE Reset_Timer SHALL display zero for 1 to 2 seconds before updating to the countdown for the next 3-day reset boundary.
5. THE 3-day reset schedule SHALL use a fixed anchor date (configurable at build time, defaulting to a known reset date) so that reset boundaries are deterministic and independently verifiable by testers.
6. THE Calendar SHALL display a visual indicator on each date within the next 30 days on which a 3-day reset occurs, using a distinct color or icon labeled "3-Day Reset".

---

### Requirement 6: Automatic Weekly Reset

**User Story:** As a player, I want my weekly activities to reset every week, so that I can track them on their correct weekly schedule.

#### Acceptance Criteria

1. WHEN the weekly Reset_Period expires, THE Checklist SHALL set the Completion_State of all Weekly_Instance and Weekly_Quest items to unchecked.
2. WHEN a player opens the page after a weekly reset has occurred, THE Checklist SHALL display all Weekly_Instance and Weekly_Quest items as unchecked regardless of the previous session's Completion_State.
3. WHILE the weekly Reset_Timer is counting down, THE Reset_Timer SHALL display the days, hours, and minutes remaining until the next Wednesday 00:00 UTC reset boundary in DD:HH:MM format, updating once per minute.
4. WHEN the weekly Reset_Timer reaches zero, THE Reset_Timer SHALL display zero for 1 to 2 seconds before updating to the full countdown to the next Wednesday 00:00 UTC reset boundary.
5. THE Calendar SHALL display a visual indicator on each Wednesday within the displayed month using a distinct color or icon labeled "Weekly Reset".

---

### Requirement 7: Persist State Across Sessions

**User Story:** As a player, I want my checklist progress to be saved in my browser, so that I do not lose my completion state when I close and reopen the page.

#### Acceptance Criteria

1. THE Checklist SHALL store each Checklist_Item's Completion_State and the timestamp of the last state-change action (check or uncheck) in the browser's local storage.
2. WHEN a player opens the page, THE Checklist SHALL read Completion_State from local storage, compare the stored timestamp against the current time to determine whether the reset boundary has been crossed, and reset affected items to unchecked if the boundary has been crossed.
3. IF local storage data is missing or cannot be parsed or does not match the expected schema, THEN THE Checklist SHALL initialize all Checklist_Items to unchecked and log a warning to the browser console.
4. WHEN the Checklist saves state, THE Checklist SHALL store the next reset boundary timestamp for each Reset_Period so that resets are evaluated correctly even when the page is closed during a reset window.

---

### Requirement 8: Responsive and Modern UI

**User Story:** As a player, I want the website to look modern and work well on both desktop and mobile, so that I can use it comfortably on any device.

#### Acceptance Criteria

1. THE Website SHALL render correctly on viewport widths from 320px to 2560px without horizontal scrolling.
2. WHEN the viewport width is below 768px, THE Website SHALL stack the Calendar and Checklist vertically in a single column layout.
3. WHILE the viewport width is 768px or above, THE Website SHALL display the Calendar and Checklist in a two-column layout where each component occupies at least 40% of the viewport width.
4. THE Website SHALL achieve a Lighthouse accessibility score of 90 or above.
5. THE Website SHALL use a dark background color with a luminance value below 0.1 (per WCAG relative luminance) as the default color scheme, with a consistent accent color applied to all interactive elements.
6. THE Website SHALL maintain a contrast ratio of at least 4.5:1 between text and background colors in accordance with WCAG 2.1 AA, including all text rendered on the dark background.
