import { describe, it, expect } from "vitest";

import { sanitizeProgramForSave } from "../lib/get-next-workout";
import type { ClientProgram, ProgramDay, Weekday } from "../types";

function day(id: string, scheduledDay?: Weekday): ProgramDay {
  return { id, label: id, scheduledDay, blocks: [] };
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

describe("sanitizeProgramForSave", () => {
  it("flexible-strips-weekday: clears scheduledDay on every day + empties selectedDays", () => {
    const program = makeProgram({
      scheduleMode: "flexible",
      selectedDays: ["monday", "wednesday"],
      weeklyPlan: [day("d0", "monday"), day("d1", "wednesday")],
    });

    const sanitized = sanitizeProgramForSave(program);

    expect(sanitized.weeklyPlan.every((d) => d.scheduledDay === undefined)).toBe(
      true,
    );
    expect(sanitized.selectedDays).toEqual([]);
  });

  it("fixed-keeps-weekday: leaves scheduledDay intact for fixed programs", () => {
    const program = makeProgram({
      scheduleMode: "fixed",
      selectedDays: ["monday", "saturday"],
      weeklyPlan: [day("d0", "monday"), day("d1", "saturday")],
    });

    const sanitized = sanitizeProgramForSave(program);

    expect(sanitized.weeklyPlan[0].scheduledDay).toBe("monday");
    expect(sanitized.weeklyPlan[1].scheduledDay).toBe("saturday");
    expect(sanitized.selectedDays).toEqual(["monday", "saturday"]);
  });
});
