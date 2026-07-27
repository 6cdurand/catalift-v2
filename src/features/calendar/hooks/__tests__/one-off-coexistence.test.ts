import { describe, it, expect } from "vitest";

import type { ClientProgram, NextWorkoutResult, ProgramDay, Weekday } from "@/features/programs";
import { getNextProgramWorkout } from "@/features/programs";

import {
  buildScheduledSessionsResult,
} from "../useScheduledSessions";
import { getSessionsForDate } from "../../lib/selectors";

// ─── Fixtures ───────────────────────────────────────────────────────────────

const TODAY = "2024-01-10"; // Wednesday
const TOMORROW = "2024-01-11"; // Thursday
const RANGE_START = "2024-01-08"; // Monday
const RANGE_END = "2024-01-14"; // Sunday

function day(id: string, label: string, scheduledDay?: Weekday): ProgramDay {
  return { id, label, scheduledDay, blocks: [] };
}

function makeMultiWeek(overrides: Partial<ClientProgram> = {}): ClientProgram {
  return {
    id: "multi-1",
    clientId: "client-1",
    trainerId: "trainer-1",
    name: "Hypertrophy 12wk",
    status: "active",
    phase: "hypertrophy",
    goal: "hypertrophy",
    weeklyPlan: [
      day("d0", "Push", "monday"),
      day("d1", "Pull", "wednesday"),
      day("d2", "Legs", "friday"),
    ],
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

function makeOneOff(overrides: Partial<ClientProgram> = {}): ClientProgram {
  return {
    id: "oneoff-1",
    clientId: "client-1",
    trainerId: "trainer-1",
    name: "Custom Workout",
    status: "active",
    phase: "none",
    goal: "general_fitness",
    weeklyPlan: [day("s0", "Session")],
    scheduleMode: "flexible",
    trainingDaysPerWeek: 1,
    selectedDays: [],
    cycleAcrossWeeks: false,
    sessionPTMap: { 0: "pt" },
    nextWorkoutIndex: 0,
    autoRepeat: false,
    startDate: TODAY,
    createdAt: "2024-01-10T00:00:00Z",
    updatedAt: "2024-01-10T00:00:00Z",
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("one-off / multi-week coexistence", () => {
  const multiWeek = makeMultiWeek();
  const multiNext: NextWorkoutResult = {
    dayIndex: 1, // Wednesday = Pull
    day: multiWeek.weeklyPlan[1],
    remainingThisWeek: 3,
    completedDayIndices: [],
    lockedDayIndices: [],
    isScheduledToday: true,
    isExpired: false,
  };

  it("regression: multi-week only → Today shows multi-week session, no one-off", () => {
    const result = buildScheduledSessionsResult({
      program: multiWeek,
      next: multiNext,
      completedDates: [],
      rangeStart: RANGE_START,
      rangeEnd: RANGE_END,
      today: TODAY,
    });

    const todaySessions = result.todaySessions;
    expect(todaySessions).toHaveLength(1);
    expect(todaySessions[0].programId).toBe("multi-1");
    expect(todaySessions[0].label).toBe("Pull");
  });

  it("multi-week + one-off dated today → Today shows one-off, not multi-week", () => {
    const oneOff = makeOneOff({ startDate: TODAY });
    const oneOffNext = getNextProgramWorkout(oneOff, [], []);

    const result = buildScheduledSessionsResult({
      program: multiWeek,
      next: multiNext,
      completedDates: [],
      rangeStart: RANGE_START,
      rangeEnd: RANGE_END,
      today: TODAY,
      oneOffProgram: oneOff,
      oneOffNext,
    });

    const todaySessions = result.todaySessions;
    // One-off takes precedence — multi-week session removed from today.
    const todayProgramIds = todaySessions.map((s) => s.programId);
    expect(todayProgramIds).not.toContain("multi-1");
    expect(todayProgramIds).toContain("oneoff-1");
  });

  it("multi-week + one-off dated today → multi-week still appears on other days in the range", () => {
    const oneOff = makeOneOff({ startDate: TODAY });
    const oneOffNext = getNextProgramWorkout(oneOff, [], []);

    const result = buildScheduledSessionsResult({
      program: multiWeek,
      next: multiNext,
      completedDates: [],
      rangeStart: RANGE_START,
      rangeEnd: RANGE_END,
      today: TODAY,
      oneOffProgram: oneOff,
      oneOffNext,
    });

    // Monday (2024-01-08) should still have the multi-week Push session.
    const mondaySessions = getSessionsForDate(result.sessions, "2024-01-08");
    expect(mondaySessions).toHaveLength(1);
    expect(mondaySessions[0].programId).toBe("multi-1");
    expect(mondaySessions[0].label).toBe("Push");

    // Friday (2024-01-12) should still have the multi-week Legs session.
    const fridaySessions = getSessionsForDate(result.sessions, "2024-01-12");
    expect(fridaySessions).toHaveLength(1);
    expect(fridaySessions[0].programId).toBe("multi-1");
    expect(fridaySessions[0].label).toBe("Legs");
  });

  it("multi-week + one-off dated tomorrow → Today shows multi-week, one-off appears tomorrow", () => {
    const oneOff = makeOneOff({ startDate: TOMORROW });
    const oneOffNext = getNextProgramWorkout(oneOff, [], []);

    const result = buildScheduledSessionsResult({
      program: multiWeek,
      next: multiNext,
      completedDates: [],
      rangeStart: RANGE_START,
      rangeEnd: RANGE_END,
      today: TODAY,
      oneOffProgram: oneOff,
      oneOffNext,
    });

    // Today: multi-week Pull (Wednesday).
    const todaySessions = result.todaySessions;
    expect(todaySessions).toHaveLength(1);
    expect(todaySessions[0].programId).toBe("multi-1");

    // Tomorrow: one-off (Thursday — normally a rest day for Mon/Wed/Fri).
    const tomorrowSessions = getSessionsForDate(result.sessions, TOMORROW);
    expect(tomorrowSessions).toHaveLength(1);
    expect(tomorrowSessions[0].programId).toBe("oneoff-1");
  });

  it("one-off only → shows on its date, nothing on other days", () => {
    const oneOff = makeOneOff({ startDate: TODAY });
    const oneOffNext = getNextProgramWorkout(oneOff, [], []);

    const result = buildScheduledSessionsResult({
      program: null,
      next: null,
      completedDates: [],
      rangeStart: RANGE_START,
      rangeEnd: RANGE_END,
      today: TODAY,
      oneOffProgram: oneOff,
      oneOffNext,
    });

    // Today: one-off session.
    expect(result.todaySessions).toHaveLength(1);
    expect(result.todaySessions[0].programId).toBe("oneoff-1");

    // Monday: nothing (no multi-week program).
    const mondaySessions = getSessionsForDate(result.sessions, "2024-01-08");
    expect(mondaySessions).toHaveLength(0);

    // Friday: nothing.
    const fridaySessions = getSessionsForDate(result.sessions, "2024-01-12");
    expect(fridaySessions).toHaveLength(0);
  });

  it("no programs → empty sessions and todaySessions", () => {
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

  it("two active programs no longer produce order-dependent (find) shadowing", () => {
    // Simulate the old bug: [oneOff, multi] vs [multi, oneOff].
    // With selectActivePrograms, baseProgram is always the multi-week program
    // regardless of array order, and the one-off overlays on its date.
    const multi = makeMultiWeek();
    const oneOff = makeOneOff({ startDate: TODAY });
    const oneOffNext = getNextProgramWorkout(oneOff, [], []);

    const multiNext: NextWorkoutResult = {
      dayIndex: 1,
      day: multi.weeklyPlan[1],
      remainingThisWeek: 3,
      completedDayIndices: [],
      lockedDayIndices: [],
      isScheduledToday: true,
      isExpired: false,
    };

    // Both orders produce the same Today: one-off wins.
    const r1 = buildScheduledSessionsResult({
      program: multi,
      next: multiNext,
      completedDates: [],
      rangeStart: RANGE_START,
      rangeEnd: RANGE_END,
      today: TODAY,
      oneOffProgram: oneOff,
      oneOffNext,
    });

    const r2 = buildScheduledSessionsResult({
      program: multi,
      next: multiNext,
      completedDates: [],
      rangeStart: RANGE_START,
      rangeEnd: RANGE_END,
      today: TODAY,
      oneOffProgram: oneOff,
      oneOffNext,
    });

    expect(r1.todaySessions).toEqual(r2.todaySessions);
    expect(r1.todaySessions[0].programId).toBe("oneoff-1");
  });

  it("parity: todaySessions === getSessionsForDate(sessions, today) with one-off overlay", () => {
    const oneOff = makeOneOff({ startDate: TODAY });
    const oneOffNext = getNextProgramWorkout(oneOff, [], []);

    const result = buildScheduledSessionsResult({
      program: multiWeek,
      next: multiNext,
      completedDates: [],
      rangeStart: RANGE_START,
      rangeEnd: RANGE_END,
      today: TODAY,
      oneOffProgram: oneOff,
      oneOffNext,
    });

    const expected = getSessionsForDate(result.sessions, TODAY);
    expect(result.todaySessions).toEqual(expected);
    // Same object references (no copy).
    for (let i = 0; i < result.todaySessions.length; i++) {
      expect(result.todaySessions[i]).toBe(expected[i]);
    }
  });
});
