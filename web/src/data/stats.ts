import type { DashboardStat } from '../types';

export const dashboardStats: DashboardStat[] = [
  { id: 'calls', label: 'Total Calls', value: '128', change: '+12 this week', trend: 'up' },
  { id: 'minutes', label: 'Call Minutes', value: '1,942', change: '+8.4% vs last week', trend: 'up' },
  { id: 'languages', label: 'Languages Used', value: '5', change: 'Hindi most used', trend: 'flat' },
  { id: 'sessions', label: 'Translation Sessions', value: '96', change: '3 fewer than last week', trend: 'down' },
];

/** Call minutes per weekday for the activity chart (Mon → Sun). */
export const weeklyMinutes = [
  { day: 'Mon', minutes: 42 },
  { day: 'Tue', minutes: 68 },
  { day: 'Wed', minutes: 35 },
  { day: 'Thu', minutes: 91 },
  { day: 'Fri', minutes: 57 },
  { day: 'Sat', minutes: 24 },
  { day: 'Sun', minutes: 48 },
];
