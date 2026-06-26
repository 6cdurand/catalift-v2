import { describe, it, expect } from "vitest";

import { getNextProgramWorkout } from "../lib/get-next-workout";
import type { ClientProgram, ProgramDay, Weekday } from "../types";

// Deterministic weekdays (local-time midnight, tz-independent):
//   Jan 1 2024 = Monday → 2=Tue, 6=Sat, 7=Sun.
const SATURDAY = new Date(2024, 0, 6);
const TUESDAY = new Date(2024, 0, 2);

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

describe("getNextProgramWorkout — fixed mode (BUG-001)", () => {
  it("fixed-today: Saturday with nothing done returns Saturday (idx 1), not Monday (idx 0)", () => {
    const program = makeProgram({
      scheduleMode: "fixed",
      weeklyPlan: [
        day("d0", "Push", "monday"),
        day("d1", "Pull", "saturday"),
        day("d2", "Legs", "sunday"),
      ],
    });

    const result = getNextProgramWorkout(program, [], [], SATURDAY);

    expect(result.dayIndex).toBe(1);
    expect(result.day?.label).toBe("Pull");
    expect(result.isScheduledToday).toBe(true);
  });

  it("fixed-today-done: Saturday done returns Sunday (next upcoming)", () => {
    const program = makeProgram({
      scheduleMode: "fixed",
      weeklyPlan: [
        day("d0", "Push", "monday"),
        day("d1", "Pull", "saturday"),
        day("d2", "Legs", "sunday"),
      ],
    });

    const result = getNextProgramWorkout(program, [1], [], SATURDAY);

    expect(result.dayIndex).toBe(2);
    expect(result.day?.label).toBe("Legs");
    expect(result.isScheduledToday).toBe(false);
  });

  it("fixed-rest-day: Tuesday on a Mon/Wed/Fri program returns Wednesday", () => {
    const program = makeProgram({
      scheduleMode: "fixed",
      weeklyPlan: [
        day("d0", "Push", "monday"),
        day("d1", "Pull", "wednesday"),
        day("d2", "Legs", "friday"),
      ],
    });

    const result = getNextProgramWorkout(program, [], [], TUESDAY);

    expect(result.dayIndex).toBe(1);
    expect(result.day?.label).toBe("Pull");
    expect(result.isScheduledToday).toBe(false);
  });

  it("fixed-all-done: all days completed → remainingThisWeek 0, wraps to idx 0", () => {
    const program = makeProgram({
      scheduleMode: "fixed",
      weeklyPlan: [
        day("d0", "Push", "monday"),
        day("d1", "Pull", "saturday"),
        day("d2", "Legs", "sunday"),
      ],
    });

    const result = getNextProgramWorkout(program, [0, 1, 2], [], SATURDAY);

    expect(result.dayIndex).toBe(0);
    expect(result.remainingThisWeek).toBe(0);
  });
});

describe("getNextProgramWorkout — flexible mode (BUG-010)", () => {
  const flexible = () =>
    makeProgram({
      scheduleMode: "flexible",
      weeklyPlan: [
        day("d0", "Push"),
        day("d1", "Pull"),
        day("d2", "Legs"),
      ],
    });

  it("flexible-clean-cycle: completed [0,1,2] wraps to idx 0 (Push)", () => {
    const result = getNextProgramWorkout(flexible(), [0, 1, 2], [], SATURDAY);

    expect(result.dayIndex).toBe(0);
    expect(result.day?.label).toBe("Push");
  });

  it("flexible-partial: completed [0] returns idx 1 (Pull)", () => {
    const result = getNextProgramWorkout(flexible(), [0], [], SATURDAY);

    expect(result.dayIndex).toBe(1);
    expect(result.day?.label).toBe("Pull");
  });

  it("flexible-stray-weekday: ignores a stray scheduledDay, uses cycle order", () => {
    // A flexible program that wrongly carries scheduledDay='saturday' on day 0.
    // Fixed logic would anchor to Saturday today; flexible logic must ignore it.
    const program = makeProgram({
      scheduleMode: "flexible",
      weeklyPlan: [
        day("d0", "Push", "saturday"),
        day("d1", "Pull"),
        day("d2", "Legs"),
      ],
    });

    const result = getNextProgramWorkout(program, [0], [], SATURDAY);

    // cycle order after completing 0 → 1, NOT the weekday-anchored 0.
    expect(result.dayIndex).toBe(1);
  });
});

describe("getNextProgramWorkout — expiry + edge cases", () => {
  const flexible = () =>
    makeProgram({
      scheduleMode: "flexible",
      weeklyPlan: [day("d0", "Push"), day("d1", "Pull")],
    });

  it("expired-no-autorepeat: past endDate + autoRepeat false → isExpired true", () => {
    const program = flexible();
    program.endDate = "2023-12-01";
    program.autoRepeat = false;

    const result = getNextProgramWorkout(program, [], [], SATURDAY);

    expect(result.isExpired).toBe(true);
  });

  it("expired-autorepeat: past endDate + autoRepeat true → isExpired false, keeps cycling", () => {
    const program = flexible();
    program.endDate = "2023-12-01";
    program.autoRepeat = true;

    const result = getNextProgramWorkout(program, [0], [], SATURDAY);

    expect(result.isExpired).toBe(false);
    expect(result.dayIndex).toBe(1);
  });

  it("empty-plan: weeklyPlan [] returns an empty result without crashing", () => {
    const program = makeProgram({ weeklyPlan: [] });

    const result = getNextProgramWorkout(program, [], [], SATURDAY);

    expect(result.dayIndex).toBe(0);
    expect(result.day).toBeNull();
    expect(result.remainingThisWeek).toBe(0);
  });
});
