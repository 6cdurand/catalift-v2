import { describe, it, expect } from "vitest";

import {
  isDatedOneOff,
  selectActivePrograms,
} from "../select-active-programs";
import type { ClientProgram, ProgramDay, Weekday } from "../../types";

// ─── Fixtures ───────────────────────────────────────────────────────────────

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

function makeOneOff(overrides: Partial<ClientProgram> = {}): ClientProgram {
  return makeProgram({
    id: "oneoff-1",
    name: "Custom Workout",
    scheduleMode: "flexible",
    trainingDaysPerWeek: 1,
    weeklyPlan: [day("s0", "Session")],
    startDate: "2024-01-10",
    ...overrides,
  });
}

function makeMultiWeek(overrides: Partial<ClientProgram> = {}): ClientProgram {
  return makeProgram({
    id: "multi-1",
    name: "Hypertrophy 12wk",
    scheduleMode: "fixed",
    trainingDaysPerWeek: 3,
    weeklyPlan: [
      day("d0", "Push", "monday"),
      day("d1", "Pull", "wednesday"),
      day("d2", "Legs", "friday"),
    ],
    startDate: "2024-01-01",
    ...overrides,
  });
}

const TODAY = "2024-01-10"; // Wednesday

// ─── isDatedOneOff ──────────────────────────────────────────────────────────

describe("isDatedOneOff", () => {
  it("returns true for a single-day, 1-day/week program (workout-builder shape)", () => {
    expect(isDatedOneOff(makeOneOff())).toBe(true);
  });

  it("returns false for a multi-day program", () => {
    expect(isDatedOneOff(makeMultiWeek())).toBe(false);
  });

  it("returns false for a single-day program with trainingDaysPerWeek > 1", () => {
    expect(
      isDatedOneOff(
        makeOneOff({ trainingDaysPerWeek: 2 }),
      ),
    ).toBe(false);
  });

  it("returns false for a multi-day program with trainingDaysPerWeek === 1", () => {
    expect(
      isDatedOneOff(
        makeMultiWeek({
          trainingDaysPerWeek: 1,
          weeklyPlan: [day("d0", "Push"), day("d1", "Pull")],
        }),
      ),
    ).toBe(false);
  });
});

// ─── selectActivePrograms ───────────────────────────────────────────────────

describe("selectActivePrograms", () => {
  it("returns baseProgram = multi-week, oneOffForToday = null when only a multi-week program exists", () => {
    const multi = makeMultiWeek();
    const result = selectActivePrograms([multi], TODAY);

    expect(result.baseProgram).toBe(multi);
    expect(result.oneOffForToday).toBeNull();
  });

  it("returns baseProgram = one-off, oneOffForToday = null when only a one-off exists (dated today)", () => {
    const oneOff = makeOneOff({ startDate: TODAY });
    const result = selectActivePrograms([oneOff], TODAY);

    // One-off IS the base — no overlay needed.
    expect(result.baseProgram).toBe(oneOff);
    expect(result.oneOffForToday).toBeNull();
  });

  it("returns baseProgram = one-off, oneOffForToday = null when only a one-off exists (dated another day)", () => {
    const oneOff = makeOneOff({ startDate: "2024-01-15" });
    const result = selectActivePrograms([oneOff], TODAY);

    expect(result.baseProgram).toBe(oneOff);
    expect(result.oneOffForToday).toBeNull();
  });

  it("returns baseProgram = multi-week, oneOffForToday = one-off when both exist and one-off is dated today", () => {
    const multi = makeMultiWeek();
    const oneOff = makeOneOff({ startDate: TODAY });
    const result = selectActivePrograms([multi, oneOff], TODAY);

    expect(result.baseProgram).toBe(multi);
    expect(result.oneOffForToday).toBe(oneOff);
  });

  it("returns baseProgram = multi-week, oneOffForToday = null when one-off is dated a different day", () => {
    const multi = makeMultiWeek();
    const oneOff = makeOneOff({ startDate: "2024-01-15" });
    const result = selectActivePrograms([multi, oneOff], TODAY);

    expect(result.baseProgram).toBe(multi);
    expect(result.oneOffForToday).toBeNull();
  });

  it("is order-independent: [oneOff, multi] produces the same result as [multi, oneOff]", () => {
    const multi = makeMultiWeek();
    const oneOff = makeOneOff({ startDate: TODAY });

    const r1 = selectActivePrograms([oneOff, multi], TODAY);
    const r2 = selectActivePrograms([multi, oneOff], TODAY);

    expect(r1.baseProgram).toBe(r2.baseProgram);
    expect(r1.baseProgram).toBe(multi);
    expect(r1.oneOffForToday).toBe(r2.oneOffForToday);
    expect(r1.oneOffForToday).toBe(oneOff);
  });

  it("returns null/null when no active programs exist", () => {
    const expired = makeMultiWeek({ status: "completed" });
    const result = selectActivePrograms([expired], TODAY);

    expect(result.baseProgram).toBeNull();
    expect(result.oneOffForToday).toBeNull();
  });

  it("returns null/null for an empty array", () => {
    const result = selectActivePrograms([], TODAY);

    expect(result.baseProgram).toBeNull();
    expect(result.oneOffForToday).toBeNull();
  });

  it("prefers the first multi-week program as base when multiple multi-week programs exist", () => {
    const multi1 = makeMultiWeek({ id: "multi-1" });
    const multi2 = makeMultiWeek({ id: "multi-2" });
    const result = selectActivePrograms([multi1, multi2], TODAY);

    expect(result.baseProgram).toBe(multi1);
    expect(result.oneOffForToday).toBeNull();
  });

  it("surfaces the one-off dated today when multiple one-offs exist", () => {
    const multi = makeMultiWeek();
    const oneOffOther = makeOneOff({ id: "oo-other", startDate: "2024-01-15" });
    const oneOffToday = makeOneOff({ id: "oo-today", startDate: TODAY });
    const result = selectActivePrograms([multi, oneOffOther, oneOffToday], TODAY);

    expect(result.baseProgram).toBe(multi);
    expect(result.oneOffForToday).toBe(oneOffToday);
  });
});
