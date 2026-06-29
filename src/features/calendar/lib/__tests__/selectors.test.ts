import { describe, it, expect } from "vitest";

import type { ClientProgram, NextWorkoutResult, ProgramDay, Weekday } from "@/features/programs";

import {
  buildScheduledSessions,
  getSessionsForDate,
  deriveStatus,
  type BuildScheduledSessionsInput,
} from "../selectors";
// ─── Test fixtures ──────────────────────────────────────────────────────────

// Deterministic weekdays (local-time midnight, tz-independent):
//   2024-01-06 = Sat, 07 = Sun, 08 = Mon, 09 = Tue, 10 = Wed, 11 = Thu, 12 = Fri
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
    scheduleMode: "flexible",
    trainingDaysPerWeek: 3,
    selectedDays: [],
    cycleAcrossWeeks: true,
    sessionPTMap: {},
    nextWorkoutIndex: 0,
    autoRepeat: false,
    startDate: "2024-01-01",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
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
    isScheduledToday: false,
    isExpired: false,
    ...overrides,
  };
}

function makeInput(
  overrides: Partial<BuildScheduledSessionsInput> = {},
): BuildScheduledSessionsInput {
  return {
    program: makeProgram(),
    next: makeNextResult(),
    completedDates: [],
    rangeStart: RANGE_START,
    rangeEnd: RANGE_END,
    today: TODAY,
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("buildScheduledSessions — fixed mode", () => {
  const fixedProgram = makeProgram({
    scheduleMode: "fixed",
    weeklyPlan: [
      day("d0", "Push", "monday"),
      day("d1", "Pull", "wednesday"),
      day("d2", "Legs", "friday"),
    ],
    sessionPTMap: { 0: "pt", 1: "personal", 2: "pt" },
  });

  it("returns one program-day session per scheduled weekday in range", () => {
    const sessions = buildScheduledSessions(
      makeInput({ program: fixedProgram }),
    );

    expect(sessions).toHaveLength(3); // Mon, Wed, Fri
    expect(sessions.map((s) => s.date)).toEqual([
      "2024-01-08",
      "2024-01-10",
      "2024-01-12",
    ]);
    expect(sessions.every((s) => s.kind === "program-day")).toBe(true);
  });

  it("a date with a workouts row → status 'done'", () => {
    const sessions = buildScheduledSessions(
      makeInput({
        program: fixedProgram,
        completedDates: ["2024-01-08"], // Monday done
      }),
    );

    const monday = sessions.find((s) => s.date === "2024-01-08")!;
    expect(monday.status).toBe("done");
  });

  it("a past scheduled date with NO workouts row → status 'missed'", () => {
    // today = Wed 2024-01-10; Monday 2024-01-08 is past, no workout row
    const sessions = buildScheduledSessions(
      makeInput({ program: fixedProgram }),
    );

    const monday = sessions.find((s) => s.date === "2024-01-08")!;
    expect(monday.status).toBe("missed");
  });

  it("a future scheduled date → status 'upcoming'", () => {
    // today = Wed 2024-01-10; Friday 2024-01-12 is future
    const sessions = buildScheduledSessions(
      makeInput({ program: fixedProgram }),
    );

    const friday = sessions.find((s) => s.date === "2024-01-12")!;
    expect(friday.status).toBe("upcoming");
  });

  it("today's scheduled session with no workout row → status 'upcoming'", () => {
    // today = Wed 2024-01-10 = Pull day
    const sessions = buildScheduledSessions(
      makeInput({ program: fixedProgram }),
    );

    const wed = sessions.find((s) => s.date === "2024-01-10")!;
    expect(wed.status).toBe("upcoming");
    expect(wed.label).toBe("Pull");
  });

  it("non-slot dates are omitted (rest days)", () => {
    // Tue 2024-01-09 and Thu 2024-01-11 are not scheduled
    const sessions = buildScheduledSessions(
      makeInput({ program: fixedProgram }),
    );

    expect(sessions.find((s) => s.date === "2024-01-09")).toBeUndefined();
    expect(sessions.find((s) => s.date === "2024-01-11")).toBeUndefined();
  });

  it("maps sessionType from program.sessionPTMap", () => {
    const sessions = buildScheduledSessions(
      makeInput({ program: fixedProgram }),
    );

    expect(sessions.find((s) => s.date === "2024-01-08")?.sessionType).toBe(
      "pt",
    );
    expect(sessions.find((s) => s.date === "2024-01-10")?.sessionType).toBe(
      "personal",
    );
  });

  it("maps dayIndex from weeklyPlan position (not recomputed)", () => {
    const sessions = buildScheduledSessions(
      makeInput({ program: fixedProgram }),
    );

    expect(sessions.find((s) => s.date === "2024-01-08")?.dayIndex).toBe(0);
    expect(sessions.find((s) => s.date === "2024-01-10")?.dayIndex).toBe(1);
    expect(sessions.find((s) => s.date === "2024-01-12")?.dayIndex).toBe(2);
  });
});

describe("buildScheduledSessions — flexible mode", () => {
  const flexProgram = makeProgram({
    scheduleMode: "flexible",
    weeklyPlan: [
      day("d0", "Push"),
      day("d1", "Pull"),
      day("d2", "Legs"),
    ],
    sessionPTMap: { 1: "pt" },
  });

  it("produces ONE 'next up' session, not pinned to a scheduled weekday", () => {
    const sessions = buildScheduledSessions(
      makeInput({
        program: flexProgram,
        next: makeNextResult({
          dayIndex: 1,
          day: { id: "d1", label: "Pull", blocks: [] },
        }),
      }),
    );

    expect(sessions).toHaveLength(1);
    expect(sessions[0].label).toBe("Pull");
    expect(sessions[0].dayIndex).toBe(1);
    expect(sessions[0].status).toBe("upcoming");
  });

  it("dates the next-up session as today (injected)", () => {
    const sessions = buildScheduledSessions(
      makeInput({
        program: flexProgram,
        next: makeNextResult({ dayIndex: 0 }),
      }),
    );

    expect(sessions[0].date).toBe(TODAY);
  });

  it("does NOT create sessions for each weekday in range", () => {
    const sessions = buildScheduledSessions(
      makeInput({
        program: flexProgram,
        next: makeNextResult({ dayIndex: 0 }),
      }),
    );

    // Only one session, not 3 (one per scheduled day)
    expect(sessions).toHaveLength(1);
  });

  it("maps sessionType from program.sessionPTMap for the next dayIndex", () => {
    const sessions = buildScheduledSessions(
      makeInput({
        program: flexProgram,
        next: makeNextResult({
          dayIndex: 1,
          day: { id: "d1", label: "Pull", blocks: [] },
        }),
      }),
    );

    expect(sessions[0].sessionType).toBe("pt");
  });
});

describe("buildScheduledSessions — edge cases", () => {
  it("next === null (no active program) → returns [] (no throw)", () => {
    const sessions = buildScheduledSessions(
      makeInput({ next: null }),
    );

    expect(sessions).toEqual([]);
  });

  it("next.day === null → returns [] (no throw)", () => {
    const sessions = buildScheduledSessions(
      makeInput({
        next: makeNextResult({ day: null }),
      }),
    );

    expect(sessions).toEqual([]);
  });

  it("next.isExpired === true → returns []", () => {
    const sessions = buildScheduledSessions(
      makeInput({
        next: makeNextResult({ isExpired: true }),
      }),
    );

    expect(sessions).toEqual([]);
  });

  it("all dates are ISO YYYY-MM-DD (no timestamps)", () => {
    const sessions = buildScheduledSessions(
      makeInput({
        program: makeProgram({
          scheduleMode: "fixed",
          weeklyPlan: [
            day("d0", "Push", "monday"),
            day("d1", "Pull", "wednesday"),
          ],
        }),
      }),
    );

    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    for (const s of sessions) {
      expect(s.date).toMatch(isoDateRegex);
    }
  });
});

describe("getSessionsForDate — parity (Today page)", () => {
  const fixedProgram = makeProgram({
    scheduleMode: "fixed",
    weeklyPlan: [
      day("d0", "Push", "monday"),
      day("d1", "Pull", "wednesday"),
      day("d2", "Legs", "friday"),
    ],
  });

  it("returns the SAME objects as buildScheduledSessions (no copy, no second query)", () => {
    const sessions = buildScheduledSessions(
      makeInput({ program: fixedProgram }),
    );
    const todaySlice = getSessionsForDate(sessions, TODAY);

    expect(todaySlice).toHaveLength(1);
    // Parity: same object references (no copy)
    expect(todaySlice[0]).toBe(
      sessions.find((s) => s.date === TODAY),
    );
  });

  it("returns [] when no session on that date", () => {
    const sessions = buildScheduledSessions(
      makeInput({ program: fixedProgram }),
    );

    expect(getSessionsForDate(sessions, "2024-01-09")).toEqual([]); // Tuesday
  });
});

describe("deriveStatus — pure status rule", () => {
  it("done = hasWorkoutRow true", () => {
    expect(
      deriveStatus({
        date: "2024-01-08",
        today: "2024-01-10",
        isScheduled: true,
        hasWorkoutRow: true,
      }),
    ).toBe("done");
  });

  it("missed = date < today AND isScheduled AND no workout row", () => {
    expect(
      deriveStatus({
        date: "2024-01-08",
        today: "2024-01-10",
        isScheduled: true,
        hasWorkoutRow: false,
      }),
    ).toBe("missed");
  });

  it("upcoming = date >= today AND isScheduled AND no workout row", () => {
    expect(
      deriveStatus({
        date: "2024-01-10",
        today: "2024-01-10",
        isScheduled: true,
        hasWorkoutRow: false,
      }),
    ).toBe("upcoming");

    expect(
      deriveStatus({
        date: "2024-01-12",
        today: "2024-01-10",
        isScheduled: true,
        hasWorkoutRow: false,
      }),
    ).toBe("upcoming");
  });

  it("rest = not scheduled", () => {
    expect(
      deriveStatus({
        date: "2024-01-09",
        today: "2024-01-10",
        isScheduled: false,
        hasWorkoutRow: false,
      }),
    ).toBe("rest");
  });

  it("is pure — same inputs always same output", () => {
    const args = {
      date: "2024-01-10",
      today: "2024-01-10",
      isScheduled: true,
      hasWorkoutRow: false,
    } as const;

    expect(deriveStatus(args)).toBe(deriveStatus(args));
    expect(deriveStatus(args)).toBe("upcoming");
  });

  it("done takes priority over missed (past date with workout row)", () => {
    expect(
      deriveStatus({
        date: "2024-01-08",
        today: "2024-01-10",
        isScheduled: true,
        hasWorkoutRow: true,
      }),
    ).toBe("done");
  });
});

describe("ONE LAW — no day-index / next-day arithmetic", () => {
  it("buildScheduledSessions consumes next.dayIndex as-is (does not recompute)", () => {
    const flexProgram = makeProgram({
      scheduleMode: "flexible",
      weeklyPlan: [day("d0", "Push"), day("d1", "Pull"), day("d2", "Legs")],
    });

    // The selector should use dayIndex=2 from the input, NOT recompute it
    const sessions = buildScheduledSessions(
      makeInput({
        program: flexProgram,
        next: makeNextResult({
          dayIndex: 2,
          day: { id: "d2", label: "Legs", blocks: [] },
        }),
      }),
    );

    expect(sessions[0].dayIndex).toBe(2);
    expect(sessions[0].label).toBe("Legs");
  });

  it("fixed mode dayIndex comes from weeklyPlan position, not next-day logic", () => {
    const fixedProgram = makeProgram({
      scheduleMode: "fixed",
      weeklyPlan: [
        day("d0", "Push", "monday"),
        day("d1", "Pull", "wednesday"),
      ],
    });

    // next.dayIndex might be 1 (Wed is next), but the Monday session
    // should still have dayIndex=0 (from weeklyPlan position, not recomputed)
    const sessions = buildScheduledSessions(
      makeInput({
        program: fixedProgram,
        next: makeNextResult({
          dayIndex: 1,
          day: { id: "d1", label: "Pull", scheduledDay: "wednesday", blocks: [] },
          isScheduledToday: true,
        }),
      }),
    );

    const monday = sessions.find((s) => s.date === "2024-01-08")!;
    expect(monday.dayIndex).toBe(0); // from weeklyPlan[0], not from next.dayIndex
    expect(monday.label).toBe("Push");
  });
});
