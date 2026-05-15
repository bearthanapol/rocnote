import type { ActivityDefinition } from './types';

export const ACTIVITIES: ActivityDefinition[] = [
  // Daily_Instance (resets every day)
  { id: 'daily-instance-1', name: 'Daily Instance A', type: 'Daily_Instance' },
  { id: 'daily-instance-2', name: 'Daily Instance B', type: 'Daily_Instance' },

  // Daily_Quest (resets every day)
  { id: 'daily-quest-1', name: 'Daily Quest A', type: 'Daily_Quest' },
  { id: 'daily-quest-2', name: 'Daily Quest B', type: 'Daily_Quest' },

  // Three_Day_Instance (resets every 72 hours)
  { id: 'three-day-instance-1', name: '3-Day Instance A', type: 'Three_Day_Instance' },
  { id: 'three-day-instance-2', name: '3-Day Instance B', type: 'Three_Day_Instance' },

  // Weekly_Instance (resets every Wednesday 00:00 UTC)
  { id: 'weekly-instance-1', name: 'Weekly Instance A', type: 'Weekly_Instance' },
  { id: 'weekly-instance-2', name: 'Weekly Instance B', type: 'Weekly_Instance' },

  // Weekly_Quest (resets every Wednesday 00:00 UTC)
  { id: 'weekly-quest-1', name: 'Weekly Quest A', type: 'Weekly_Quest' },
  { id: 'weekly-quest-2', name: 'Weekly Quest B', type: 'Weekly_Quest' },
];

// Fixed anchor date for the 3-day reset schedule (configurable at build time).
// All 3-day boundaries are computed as multiples of 72 hours from this point.
export const THREE_DAY_ANCHOR_DATE: number = new Date('2024-01-01T00:00:00Z').getTime();
