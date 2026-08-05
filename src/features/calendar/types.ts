// Calendar domain types (Calendar Wave 1: canonical ScheduledSession + pure selectors).
//
// DQ-1 CONFIRMED shape (Christo approved 2026-06-29).
// This is the ONE typed shape that both the Today page and the Calendar page
// render from — they can never disagree about a date because they both consume
// the same buildScheduledSessions output (parity law F-04).

export type ScheduledSessionStatus = "upcoming" | "done" | "missed" | "rest";

export type ScheduledSessionKind = "program-day" | "group-event" | "booking" | "ad-hoc";

export interface ScheduledSession {
  date: string; // ISO YYYY-MM-DD (device-local date, NOT a timestamp)
  programId?: string;
  dayIndex: number; // the program day index this session maps to (from Box 2 result; -1 if n/a)
  dayRef: string; // the program's dayLabel (stable ref)
  label: string; // human label, e.g. "Push Day" / "Upper A"
  status: ScheduledSessionStatus;
  kind: ScheduledSessionKind; // w1 produces 'program-day' only; others reserved for w3/w5
  sessionType?: "pt" | "personal";
  // P-08: only ever set for kind: "booking" (a real `calendar_events` row has
  // a human-chosen time; a program-derived day does not, and must never
  // invent one — see calendar/lib/mergeCalendarEvents.ts).
  startTime?: string; // "HH:MM" (24h, device-local)
  endTime?: string; // "HH:MM" (24h, device-local)
  eventId?: string; // the source calendar_events.id — lets consumers key off the real row instead of minting a synthetic dedupe key
}
