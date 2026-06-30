import { describe, it, expect } from "vitest";

import type { ClientProgram, ProgramDay, Weekday } from "@/features/programs";
import type { NextWorkoutResult } from "@/features/programs";

import {
  buildScheduledSessionsResult,
  deriveCompletedDayIndices,
  toISODate,
} from "../useScheduledSessions";
import { getSessionsForDate } from "../../lib/selectors";

// ─── Test fixtures ──────────────────────────────────────────────────────────

const TODAY = "2024-01-10"; // Wednesday
const RANGE_START = "2024-01-08"; // Monday
const RANGE_END = "2024-01-12"; // Friday

function day(id: string, label: string, scheduledDay?: Weekday): ProgramDay {
  return { id, label, scheduledDay, blocks: [] };
}

function makeProgram(overrides: Partial<ClientProgram> = {}): ClientProgram {
  return {
    id: "prog-1",
    clientId: "client-1",
    trainerId: "trainer-1",
    name: "Test Program",
    status: "active",
    phase: "hypertrophy",
    goal: "hypertrophy",
    weeklyPlan: [],
    scheduleMode: "fixed",
    trainingDaysPerWeek: 3,
    selectedDays: [],
    cycleAcrossWeeks: false,
    sessionPTMap: {},
    nextWorkoutIndex: 0,
    autoRepeat: false,
    startDate: "2024-01-01",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeNextResult(
  overrides: Partial<NextWorkoutResult> = {},
): NextWorkoutResult {
  return {
    dayIndex: 0,
    day: { id: "d0", label: "Push", blocks: [] },
    remainingThisWeek: 3,
    completedDayIndices: [],
    lockedDayIndices: [],
    isScheduledToday: true,
    isExpired: false,
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("buildScheduledSessionsResult — PARITY (the one law)", () => {
  const fixedProgram = makeProgram({
    scheduleMode: "fixed",
    weeklyPlan: [
      day("d0", "Push", "monday"),
      day("d1", "Pull", "wednesday"),
      day("d2", "Legs", "friday"),
    ],
  });

  it("todaySessions === getSessionsForDate(sessions, today) — same objects", () => {
    const result = buildScheduledSessionsResult({
      program: fixedProgram,
      next: makeNextResult(),
      completedDates: [],
      rangeStart: RANGE_START,
      rangeEnd: RANGE_END,
      today: TODAY,
    });

    const expected = getSessionsForDate(result.sessions, TODAY);
    expect(result.todaySessions).toEqual(expected);
    // Parity: same object references (no copy)
    for (let i = 0; i < result.todaySessions.length; i++) {
      expect(result.todaySessions[i]).toBe(expected[i]);
    }
  });

  it("todaySessions is a SLICE of sessions — not a second query", () => {
    const result = buildScheduledSessionsResult({
      program: fixedProgram,
      next: makeNextResult(),
      completedDates: [],
      rangeStart: RANGE_START,
      rangeEnd: RANGE_END,
      today: TODAY,
    });

    // Every todaySession must be in sessions (same reference)
    for (const ts of result.todaySessions) {
      expect(result.sessions).toContain(ts);
    }
  });

  it("returns empty sessions + todaySessions when program is null", () => {
    const result = buildScheduledSessionsResult({
      program: null,
      next: null,
      completedDates: [],
      rangeStart: RANGE_START,
      rangeEnd: RANGE_END,
      today: TODAY,
    });

    expect(result.sessions).toEqual([]);
    expect(result.todaySessions).toEqual([]);
  });
});

describe("deriveCompletedDayIndices", () => {
  const fixedProgram = makeProgram({
    scheduleMode: "fixed",
    weeklyPlan: [
      day("d0", "Push", "monday"),
      day("d1", "Pull", "wednesday"),
      day("d2", "Legs", "friday"),
    ],
  });

  it("maps completed dates to weeklyPlan indices (fixed mode)", () => {
    // 2024-01-08 = Monday → planIdx 0
    // 2024-01-10 = Wednesday → planIdx 1
    const indices = deriveCompletedDayIndices(fixedProgram, [
      "2024-01-08",
      "2024-01-10",
    ]);

    expect(indices).toContain(0);
    expect(indices).toContain(1);
    expect(indices).toHaveLength(2);
  });

  it("deduplicates when multiple dates map to the same plan index", () => {
    // Two Mondays → same planIdx 0
    const indices = deriveCompletedDayIndices(fixedProgram, [
      "2024-01-08",
      "2024-01-15",
    ]);

    expect(indices).toEqual([0]);
  });

  it("returns [] for empty completedDates", () => {
    expect(deriveCompletedDayIndices(fixedProgram, [])).toEqual([]);
  });

  it("flexible mode returns sequential [0, 1, ..., count-1]", () => {
    const flexProgram = makeProgram({
      scheduleMode: "flexible",
      weeklyPlan: [day("d0", "Push"), day("d1", "Pull"), day("d2", "Legs")],
    });

    const indices = deriveCompletedDayIndices(flexProgram, [
      "2024-01-08",
      "2024-01-09",
      "2024-01-10",
    ]);

    expect(indices).toEqual([0, 1, 2]);
  });

  it("flexible mode clamps to plan length", () => {
    const flexProgram = makeProgram({
      scheduleMode: "flexible",
      weeklyPlan: [day("d0", "Push"), day("d1", "Pull")],
    });

    const indices = deriveCompletedDayIndices(flexProgram, [
      "2024-01-08",
      "2024-01-09",
      "2024-01-10",
      "2024-01-11",
    ]);

    expect(indices).toEqual([0, 1]);
  });
});

describe("toISODate", () => {
  it("formats a Date as ISO YYYY-MM-DD using local time", () => {
    expect(toISODate(new Date(2024, 0, 8))).toBe("2024-01-08");
    expect(toISODate(new Date(2024, 11, 31))).toBe("2024-12-31");
  });

  it("pads single-digit months and days", () => {
    expect(toISODate(new Date(2024, 2, 5))).toBe("2024-03-05");
  });
});
