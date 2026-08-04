/**
 * calendarScope.test.ts — the calendar visibility filter.
 *
 * Locked down as part of B1 (`calendar_events` table). Until B1 there were no
 * real `calendar_events` rows, so the absence of a visibility filter was
 * harmless — every session was derived from the viewer's own ClientProgram.
 * The table changes that, and RLS only solves half of it:
 *
 *   • a client reading a trainer's private event  -> stopped by RLS;
 *   • a trainer's OWN calendar filling up with every workout they assigned to
 *     every client -> NOT stoppable by RLS (the trainer owns those rows).
 *
 * The second one is this function's job, so it gets tests before any UI
 * consumes it.
 */

import { describe, it, expect } from "vitest";
import { getVisibleCalendarEvents } from "../calendarScope";
import type { CalendarEvent } from "@/types";

const TRAINER = "trainer-1";
const CLIENT = "client-1";
const OTHER_CLIENT = "client-2";

function event(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: overrides.id ?? "e1",
    title: "Session",
    type: "session",
    date: "2026-08-03",
    status: "scheduled",
    ...overrides,
  };
}

describe("getVisibleCalendarEvents — trainer mode", () => {
  it("shows the trainer's own PT sessions", () => {
    const e = event({ trainerId: TRAINER, clientId: CLIENT });
    expect(
      getVisibleCalendarEvents([e], { userId: TRAINER, mode: "trainer" }),
    ).toEqual([e]);
  });

  it("shows the trainer's personal events", () => {
    const e = event({
      trainerId: TRAINER,
      type: "workout",
      eventScope: "trainer_personal",
      ownerUserId: TRAINER,
    });
    expect(
      getVisibleCalendarEvents([e], { userId: TRAINER, mode: "trainer" }),
    ).toEqual([e]);
  });

  it("HIDES workouts assigned to a client — they belong on the client's calendar", () => {
    const e = event({
      trainerId: TRAINER,
      clientId: CLIENT,
      type: "workout",
      eventScope: "client_assigned",
      ownerUserId: CLIENT,
    });
    expect(
      getVisibleCalendarEvents([e], { userId: TRAINER, mode: "trainer" }),
    ).toEqual([]);
  });

  it("never shows another trainer's events", () => {
    const e = event({ trainerId: "trainer-2", clientId: CLIENT });
    expect(
      getVisibleCalendarEvents([e], { userId: TRAINER, mode: "trainer" }),
    ).toEqual([]);
  });
});

describe("getVisibleCalendarEvents — client mode", () => {
  it("shows sessions booked with the client", () => {
    const e = event({ trainerId: TRAINER, clientId: CLIENT });
    expect(
      getVisibleCalendarEvents([e], { userId: CLIENT, mode: "user" }),
    ).toEqual([e]);
  });

  it("shows the client's own personal events via ownerUserId", () => {
    const e = event({ ownerUserId: CLIENT, eventScope: "trainer_personal" });
    expect(
      getVisibleCalendarEvents([e], { userId: CLIENT, mode: "user" }),
    ).toEqual([e]);
  });

  it("HIDES a trainer's private event from the client", () => {
    const e = event({
      trainerId: TRAINER,
      eventScope: "trainer_personal",
      ownerUserId: TRAINER,
    });
    expect(
      getVisibleCalendarEvents([e], { userId: CLIENT, mode: "user" }),
    ).toEqual([]);
  });

  it("HIDES another client's assigned workout", () => {
    const e = event({
      trainerId: TRAINER,
      clientId: OTHER_CLIENT,
      type: "workout",
      eventScope: "client_assigned",
      ownerUserId: OTHER_CLIENT,
    });
    expect(
      getVisibleCalendarEvents([e], { userId: CLIENT, mode: "user" }),
    ).toEqual([]);
  });

  it("falls back to the symmetric predicate for legacy rows with no scope fields", () => {
    const e = event({ trainerId: TRAINER });
    expect(
      getVisibleCalendarEvents([e], { userId: TRAINER, mode: "user" }),
    ).toEqual([e]);
  });
});

describe("getVisibleCalendarEvents — cancelled events", () => {
  const cancelled = event({
    trainerId: TRAINER,
    clientId: CLIENT,
    status: "cancelled",
  });

  it("hides cancelled events by default", () => {
    expect(
      getVisibleCalendarEvents([cancelled], {
        userId: TRAINER,
        mode: "trainer",
      }),
    ).toEqual([]);
  });

  it("includes them when hideCancelled is explicitly false (audit views)", () => {
    expect(
      getVisibleCalendarEvents(
        [cancelled],
        { userId: TRAINER, mode: "trainer" },
        { hideCancelled: false },
      ),
    ).toEqual([cancelled]);
  });
});
