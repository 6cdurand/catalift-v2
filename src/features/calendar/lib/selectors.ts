// Pure calendar selectors (Calendar Wave 1).
//
// THE ONE LAW: these selectors CONSUME the already-computed
// `getNextProgramWorkout` result from the programs feature — they NEVER
// recompute which day is next. No day-index / next-day arithmetic here.
// The selector maps the programs result + schedule configuration to
// `ScheduledSession` rows that both Today and Calendar render.
//
// All selectors are PURE: no store reads, no fetches, no `Date.now()`.
// `today` is injected by the caller (device-local, single tz authority).
// All dates are ISO YYYY-MM-DD (device-local, never a timestamp).

import type { ClientProgram, NextWorkoutResult, Weekday } from "@/features/programs";

import type { ScheduledSession, ScheduledSessionStatus } from "../types";

// ─── Public input interface ────────────────────────────────────────────────

export interface BuildScheduledSessionsInput {
  /** The active client program (read-only: schedule config + sessionPTMap). */
  program: ClientProgram;
  /** The v2 programs getNextProgramWorkout result (consumed, NOT recomputed). */
  next: NextWorkoutResult | null;
  /** ISO dates that have a `workouts` row (from Box 1) — drives 'done' status. */
  completedDates: string[];
  /** ISO date — inclusive range start. */
  rangeStart: string;
  /** ISO date — inclusive range end. */
  rangeEnd: string;
  /** ISO device-local "today" (injected, never computed inside selectors). */
  today: string;
}

// ─── Public selectors ──────────────────────────────────────────────────────

/**
 * Build the list of program-day sessions across [rangeStart, rangeEnd].
 *
 * Fixed-day programs: one session per scheduled weekday in range.
 * Flexible programs: a single "next up" session (not pinned to a date).
 * Rest days are omitted — callers can infer them from the absence of a session.
 */
export function buildScheduledSessions(
  input: BuildScheduledSessionsInput,
): ScheduledSession[] {
  const { program, next, completedDates, rangeStart, rangeEnd, today } = input;

  if (!next || !next.day) return [];
  if (next.isExpired) return [];

  const completedSet = new Set(completedDates);

  if (program.scheduleMode === "fixed") {
    return buildFixedSessions(
      program,
      completedSet,
      rangeStart,
      rangeEnd,
      today,
    );
  }

  return buildFlexibleSession(program, next, today);
}

/**
 * The Today page is just the sessions list filtered to date === today.
 * Returns the SAME objects (no copy, no second query) — parity proven by test.
 */
export function getSessionsForDate(
  sessions: ScheduledSession[],
  date: string,
): ScheduledSession[] {
  return sessions.filter((s) => s.date === date);
}

/**
 * Pure status rule for one date (DQ-1 confirmed).
 *
 * done     = a workouts row exists for that date
 * missed   = date < today AND isScheduled AND no workout row
 * upcoming = date >= today AND isScheduled
 * rest     = not scheduled that day
 */
export function deriveStatus(args: {
  date: string;
  today: string;
  isScheduled: boolean;
  hasWorkoutRow: boolean;
}): ScheduledSessionStatus {
  if (!args.isScheduled) return "rest";
  if (args.hasWorkoutRow) return "done";
  if (args.date < args.today) return "missed";
  return "upcoming";
}

// ─── Internal builders ─────────────────────────────────────────────────────

/**
 * Fixed-day: iterate the date range and create one session per scheduled
 * weekday. Reads `weeklyPlan[i].scheduledDay` to know which weekdays have
 * sessions (schedule configuration, NOT next-day arithmetic).
 */
function buildFixedSessions(
  program: ClientProgram,
  completedSet: Set<string>,
  rangeStart: string,
  rangeEnd: string,
  today: string,
): ScheduledSession[] {
  const sessions: ScheduledSession[] = [];
  const dates = enumerateDateRange(rangeStart, rangeEnd);

  for (const date of dates) {
    const weekday = isoToWeekday(date);
    const planIdx = program.weeklyPlan.findIndex(
      (d) => d.scheduledDay === weekday,
    );

    if (planIdx === -1) continue; // rest day — omitted

    const day = program.weeklyPlan[planIdx];
    const hasWorkoutRow = completedSet.has(date);

    sessions.push({
      date,
      programId: program.id,
      dayIndex: planIdx,
      dayRef: day.label,
      label: day.label,
      status: deriveStatus({
        date,
        today,
        isScheduled: true,
        hasWorkoutRow,
      }),
      kind: "program-day",
      sessionType: program.sessionPTMap[planIdx],
    });
  }

  return sessions;
}

/**
 * Flexible: a single "next up" session. The dayIndex and day come from the
 * already-computed `NextWorkoutResult` — we do NOT recompute which day is next.
 * Dated as `today` (the day the user should train), status is always 'upcoming'
 * because `getNextProgramWorkout` already advanced past completed days.
 */
function buildFlexibleSession(
  program: ClientProgram,
  next: NextWorkoutResult,
  today: string,
): ScheduledSession[] {
  if (!next.day) return [];

  return [
    {
      date: today,
      programId: program.id,
      dayIndex: next.dayIndex,
      dayRef: next.day.label,
      label: next.day.label,
      status: "upcoming",
      kind: "program-day",
      sessionType: program.sessionPTMap[next.dayIndex],
    },
  ];
}

// ─── Pure date helpers (no Date.now(), no new Date() without args) ──────────

const WEEKDAY_NAMES: Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/** Parse an ISO YYYY-MM-DD string as a local-time Date (NOT UTC). */
function parseISODate(iso: string): Date {
  return new Date(iso + "T00:00:00");
}

/** Format a Date as ISO YYYY-MM-DD using local-time methods. */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Get the Weekday name for an ISO date string. */
function isoToWeekday(iso: string): Weekday {
  return WEEKDAY_NAMES[parseISODate(iso).getDay()];
}

/** Enumerate all ISO YYYY-MM-DD dates in [start, end] (inclusive). */
function enumerateDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = parseISODate(start);
  const end_ = parseISODate(end);
  while (current <= end_) {
    dates.push(toISODate(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}
