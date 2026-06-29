// Program builder constants (w2a additions).

import type { Weekday } from './types';

/**
 * Weekday ordering — used by the Schedule step fixed-day picker.
 * Ported from v1 `WEEKDAYS` (builder/page.tsx L174).
 */
export const WEEKDAYS: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/**
 * Default day labels by training frequency (2-6 days/week).
 * Used by initializeDays() when creating empty ProgramDay[] from daysPerWeek.
 */
export const DAY_LABEL_PRESETS: Record<number, string[]> = {
  2: ['Upper Body', 'Lower Body'],
  3: ['Push', 'Pull', 'Legs'],
  4: ['Upper A', 'Lower A', 'Upper B', 'Lower B'],
  5: ['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B'],
  6: ['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B'],
};

/**
 * Default weekly schedule suggestions by training frequency.
 * Maps daysPerWeek → suggested Weekday[] for scheduling.
 */
export const DEFAULT_SCHEDULE: Record<number, Weekday[]> = {
  2: ['monday', 'thursday'],
  3: ['monday', 'wednesday', 'friday'],
  4: ['monday', 'tuesday', 'thursday', 'friday'],
  5: ['monday', 'tuesday', 'wednesday', 'friday', 'saturday'],
  6: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
};

/**
 * Training goal display labels for UI.
 */
export const GOAL_LABELS: Record<string, string> = {
  hypertrophy: 'Muscle Growth',
  strength: 'Strength',
  fat_loss: 'Fat Loss',
  weight_loss: 'Weight Loss',
  conditioning: 'Conditioning',
  general_fitness: 'General Fitness',
  endurance: 'Endurance',
  mobility: 'Mobility',
};

/**
 * Training phase display labels for UI.
 */
export const PHASE_LABELS: Record<string, string> = {
  foundation: 'Foundation',
  strength: 'Strength',
  performance: 'Performance',
  return: 'Return',
};
