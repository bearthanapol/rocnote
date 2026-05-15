export type ActivityType =
  | 'Daily_Instance'
  | 'Daily_Quest'
  | 'Three_Day_Instance'
  | 'Weekly_Instance'
  | 'Weekly_Quest';

export type ResetPeriod = 'daily' | 'three-day' | 'weekly';

export type ResetType = 'daily' | 'three-day' | 'weekly';

export interface ActivityDefinition {
  id: string;
  name: string;
  type: ActivityType;
}

export interface ChecklistItem {
  id: string;
  name: string;
  activityType: ActivityType;
  completed: boolean;
}

export interface ActivityGroup {
  resetPeriod: ResetPeriod;
  label: string;
  items: ChecklistItem[];
  nextResetAt: number;
}

export interface ResetDateEntry {
  date: Date;
  type: ResetType;
  label: string;
}

export interface CalendarProps {
  today: Date;
  resetDates: ResetDateEntry[];
}

export interface ChecklistProps {
  groups: ActivityGroup[];
  onToggle: (itemId: string, checked: boolean) => void;
}

export interface ItemState {
  completed: boolean;
  lastChangedAt: number;
}

export interface PersistedState {
  version: 2;
  items: Record<string, ItemState>;
  history: Record<string, Record<string, boolean>>; // dateString (YYYY-MM-DD) -> itemId -> completed
  nextResetBoundaries: {
    daily: number;
    threeDay: number;
    weekly: number;
  };
}

export type SaveResult = { ok: true } | { ok: false; error: string };
