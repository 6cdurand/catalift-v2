import { describe, it, expect } from "vitest";

import type { CalendarEvent } from "@/types";
import type { ScheduledSession } from "../../types";
import { mergeCalendarEventsIntoSessions } from "../mergeCalendarEvents";

const TODAY = "2026-08-05";

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "event-1",
    title: "PT Session with Anna",
    type: "session",
    date: TODAY,
    status: "scheduled",
    ...overrides,
  };
}

function makeProgramSession(
  overrides: Partial<ScheduledSession> = {},
): ScheduledSession {
  return {
    date: TODAY,
    programId: "prog-1",
    dayIndex: 0,
    dayRef: "Push Day",
    label: "Push Day",
    status: "upcoming",
    kind: "program-day",
    ...overrides,
  };
}

describe("mergeCalendarEventsIntoSessions", () => {
  it("a calendar_events booking appears as a ScheduledSession with kind: 'booking' and its startTime preserved", () => {
    const event = makeEvent({ startTime: "09:00", endTime: "10:00" });

    const merged = mergeCalendarEventsIntoSessions({
      sessions: [],
      events: [event],
      today: TODAY,
    });

    expect(merged).toHaveLength(1);
    expect(merged[0].kind).toBe("booking");
    expect(merged[0].startTime).toBe("09:00");
    expect(merged[0].endTime).toBe("10:00");
    expect(merged[0].eventId).toBe("event-1");
  });

  it("THE TRAP (§4): a booked row colliding with a program-derived session on (programId, dayIndex, date) yields exactly one session — the booked one", () => {
    const programSession = makeProgramSession({
      programId: "prog-1",
      dayIndex: 0,
      date: TODAY,
      label: "Push Day",
    });
    const bookedEvent = makeEvent({
      id: "event-42",
      title: "PT Session with Anna",
      programId: "prog-1",
      programDayIndex: 0,
      date: TODAY,
      startTime: "17:00",
    });

    const merged = mergeCalendarEventsIntoSessions({
      sessions: [programSession],
      events: [bookedEvent],
      today: TODAY,
    });

    expect(merged).toHaveLength(1);
    expect(merged[0].kind).toBe("booking");
    expect(merged[0].eventId).toBe("event-42");
    expect(merged[0].startTime).toBe("17:00");
  });

  it("a booking with no programId is additive — it never suppresses a program-derived session", () => {
    const programSession = makeProgramSession();
    const templateBooking = makeEvent({
      id: "event-7",
      title: "Consultation",
      programId: undefined,
      programDayIndex: undefined,
    });

    const merged = mergeCalendarEventsIntoSessions({
      sessions: [programSession],
      events: [templateBooking],
      today: TODAY,
    });

    expect(merged).toHaveLength(2);
    expect(merged).toContainEqual(programSession);
    expect(merged.some((s) => s.eventId === "event-7")).toBe(true);
  });

  it("program-derived sessions with no booking are unchanged — startTime stays undefined", () => {
    const programSession = makeProgramSession();

    const merged = mergeCalendarEventsIntoSessions({
      sessions: [programSession],
      events: [],
      today: TODAY,
    });

    expect(merged).toEqual([programSession]);
    expect(merged[0].startTime).toBeUndefined();
  });

  it("a cancelled event does not render by default", () => {
    const cancelled = makeEvent({ status: "cancelled" });

    const merged = mergeCalendarEventsIntoSessions({
      sessions: [],
      events: [cancelled],
      today: TODAY,
    });

    expect(merged).toEqual([]);
  });

  it("a completed booking renders with status 'done'", () => {
    const completed = makeEvent({ status: "completed" });

    const merged = mergeCalendarEventsIntoSessions({
      sessions: [],
      events: [completed],
      today: TODAY,
    });

    expect(merged[0].status).toBe("done");
  });

  // P-09, the reported symptom: a session the trainer completed came back the
  // NEXT DAY as "missed". "completed" must beat "the date has passed" — and a
  // same-day event does not exercise the `date < today` branch at all.
  it("a PAST completed booking renders as 'done', not 'missed'", () => {
    const pastCompleted = makeEvent({
      date: "2026-08-01",
      status: "completed",
    });

    const merged = mergeCalendarEventsIntoSessions({
      sessions: [],
      events: [pastCompleted],
      today: TODAY,
    });

    expect(merged[0].status).toBe("done");
  });

  it("a past, still-scheduled booking renders as 'missed'", () => {
    const past = makeEvent({ date: "2026-08-01", status: "scheduled" });

    const merged = mergeCalendarEventsIntoSessions({
      sessions: [],
      events: [past],
      today: TODAY,
    });

    expect(merged[0].status).toBe("missed");
  });

  it("a non-colliding booking on a different date does not touch the program-derived session", () => {
    const programSession = makeProgramSession({ date: TODAY, dayIndex: 0 });
    const otherDayBooking = makeEvent({
      programId: "prog-1",
      programDayIndex: 0,
      date: "2026-08-06",
    });

    const merged = mergeCalendarEventsIntoSessions({
      sessions: [programSession],
      events: [otherDayBooking],
      today: TODAY,
    });

    expect(merged).toHaveLength(2);
    expect(merged).toContainEqual(programSession);
  });
});
