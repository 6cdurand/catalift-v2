// Pure week-window helpers for the trainer Today day-selector.
//
// PARITY LAW SCOPE: these helpers do CALENDAR-DATE arithmetic only — which
// dates are in the visible week, and how to label them. They NEVER decide which
// program day a client trains; that is owned exclusively by
// getNextProgramWorkout + buildScheduledSessions (see the grep-guard test).
//
// Every value is an ISO YYYY-MM-DD device-local date string. Every shift goes
// through date-fns `addDays`, which is calendar-correct across DST transitions
// and month/year boundaries (unlike raw millisecond math).

import { addDays, format, startOfWeek } from "date-fns";

export const DAYS_IN_WEEK = 7;

/** Format a Date as ISO YYYY-MM-DD using local-time fields (never UTC). */
export function toISODate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/** Parse an ISO YYYY-MM-DD string as a local-midnight Date (never UTC). */
export function parseISODate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/** Shift an ISO date by a whole number of calendar days (may be negative). */
export function shiftISODate(iso: string, deltaDays: number): string {
  return toISODate(addDays(parseISODate(iso), deltaDays));
}

/** The Monday of the week containing `iso` (weeks start Monday, per v1). */
export function startOfWeekISO(iso: string): string {
  return toISODate(startOfWeek(parseISODate(iso), { weekStartsOn: 1 }));
}

/** The 7 ISO dates Mon→Sun of the week that begins at `weekStartISO`. */
export function getWeekDays(weekStartISO: string): string[] {
  const start = parseISODate(weekStartISO);
  return Array.from({ length: DAYS_IN_WEEK }, (_, offset) =>
    toISODate(addDays(start, offset)),
  );
}

export interface WeekWindow {
  /** Monday of the visible week (ISO). */
  weekStart: string;
  /** Inclusive range start === weekStart. */
  rangeStart: string;
  /** Inclusive range end === the Sunday of the visible week. */
  rangeEnd: string;
  /** The 7 ISO dates Mon→Sun. */
  days: string[];
}

/** The Mon→Sun window containing `anchorISO`. */
export function getWeekWindow(anchorISO: string): WeekWindow {
  const weekStart = startOfWeekISO(anchorISO);
  const days = getWeekDays(weekStart);
  return {
    weekStart,
    rangeStart: days[0],
    rangeEnd: days[DAYS_IN_WEEK - 1],
    days,
  };
}

// ─── Display formatting (pure) ─────────────────────────────────────────────

/** "MON" — the day-strip pill's top line. */
export function formatWeekdayShort(iso: string): string {
  return format(parseISODate(iso), "EEE").toUpperCase();
}

/** "28" — the day-strip pill's day number. */
export function formatDayNumber(iso: string): string {
  return format(parseISODate(iso), "d");
}

/** "Jul 28" — the schedule section header when the selection is not today. */
export function formatMonthDay(iso: string): string {
  return format(parseISODate(iso), "MMM d");
}

/** "Tuesday" — used in the empty state copy. */
export function formatWeekdayLong(iso: string): string {
  return format(parseISODate(iso), "EEEE");
}

/** "Tuesday 28 July" — the accessible name prefix for a day-strip pill. */
export function formatAccessibleDate(iso: string): string {
  return format(parseISODate(iso), "EEEE d MMMM");
}
