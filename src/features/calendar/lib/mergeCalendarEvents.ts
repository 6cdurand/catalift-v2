// P-08 — the ONE merge function (parity law F-04).
//
// Both `useScheduledSessions` (client/`useScheduledSessions.ts`) and
// `useTrainerWeekSchedule` (`@/features/trainer-ops`) call this to combine
// program-derived sessions (`buildScheduledSessionsResult`) with the
// `calendar_events` rows `listVisibleCalendarEvents` already scope-filtered.
// There must never be a second implementation of "what is on my calendar" —
// see the P-08 brief §5.
//
// THE TRAP (§4): v1's booking screen can write a `calendar_events` row that
// carries `program_id` + `program_day_index` for the SAME session the
// program-derived path independently generates (e.g. "Push Day" booked for
// the date it would have appeared on anyway). The booked row is the MORE
// SPECIFIC record — a human chose a real date and a real time for it — so it
// wins: the colliding program-derived session is dropped, never both. A
// booking with no `programId` (template booking, or empty mode) carries no
// collision key and is therefore purely additive.
//
// Pure: no store reads, no fetches, no device-clock reads. `today` is
// injected by the caller, same convention as `lib/selectors.ts`.

import type { CalendarEvent } from "@/types";

import type { ScheduledSession, ScheduledSessionStatus } from "../types";

export interface MergeCalendarEventsArgs {
  /** Program-derived sessions, e.g. `buildScheduledSessionsResult(...).sessions`. */
  sessions: ScheduledSession[];
  /** `calendar_events` rows, already scope-filtered by `listVisibleCalendarEvents`. */
  events: CalendarEvent[];
  /** ISO device-local "today" — drives the booked-session status rule. */
  today: string;
}

function collisionKey(programId: string, dayIndex: number, date: string): string {
  return `${programId}|${dayIndex}|${date}`;
}

/**
 * Status rule for a booked session (mirrors `deriveStatus` in
 * `lib/selectors.ts`, but keyed off the event's own `status` column instead
 * of a `workouts` row — a booking's completion is recorded on the event
 * itself, not inferred from a separate table).
 */
function deriveBookingStatus(
  event: CalendarEvent,
  today: string,
): ScheduledSessionStatus {
  if (event.status === "completed") return "done";
  return event.date < today ? "missed" : "upcoming";
}

function toBookingSession(
  event: CalendarEvent,
  today: string,
): ScheduledSession {
  return {
    date: event.date,
    programId: event.programId,
    dayIndex: event.programDayIndex ?? -1,
    dayRef: event.title,
    label: event.title,
    status: deriveBookingStatus(event, today),
    kind: "booking",
    startTime: event.startTime,
    endTime: event.endTime,
    eventId: event.id,
  };
}

/**
 * Combine program-derived `sessions` with `calendar_events` rows into the
 * ONE `ScheduledSession[]` both surfaces render.
 *
 * - Cancelled events never render (defensive — `listVisibleCalendarEvents`
 *   already hides them by default, but this function must be correct even
 *   if a caller passes `hideCancelled: false` for an audit view).
 * - A booking with `programId` + `programDayIndex` matching a program-derived
 *   session on the same date suppresses that program-derived session (§4).
 * - Every other booking is additive.
 */
export function mergeCalendarEventsIntoSessions(
  args: MergeCalendarEventsArgs,
): ScheduledSession[] {
  const { sessions, events, today } = args;

  const liveEvents = events.filter((e) => e.status !== "cancelled");

  const collisions = new Set(
    liveEvents
      .filter(
        (e): e is CalendarEvent & { programId: string; programDayIndex: number } =>
          Boolean(e.programId) && e.programDayIndex !== undefined,
      )
      .map((e) => collisionKey(e.programId, e.programDayIndex, e.date)),
  );

  const survivingProgramSessions = sessions.filter((s) => {
    if (s.kind !== "program-day" || !s.programId) return true;
    return !collisions.has(collisionKey(s.programId, s.dayIndex, s.date));
  });

  const bookingSessions = liveEvents.map((e) => toBookingSession(e, today));

  return [...survivingProgramSessions, ...bookingSessions];
}
