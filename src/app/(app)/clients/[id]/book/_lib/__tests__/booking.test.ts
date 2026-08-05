import { describe, it, expect } from "vitest";
import {
  buildDateOptions,
  calculateEndTime,
  toEventType,
  workoutSelectionToEventFields,
} from "../booking";

describe("calculateEndTime", () => {
  it("adds duration within the same hour", () => {
    expect(calculateEndTime("09:00", "30")).toBe("09:30");
  });

  it("rolls over the hour", () => {
    expect(calculateEndTime("09:45", "30")).toBe("10:15");
  });

  it("rolls over midnight (23:30 + 90)", () => {
    expect(calculateEndTime("23:30", "90")).toBe("01:00");
  });
});

describe("toEventType", () => {
  it("maps pt_session to session — pt_session must never reach the payload", () => {
    expect(toEventType("pt_session")).toBe("session");
  });

  it("passes consultation and assessment through unchanged", () => {
    expect(toEventType("consultation")).toBe("consultation");
    expect(toEventType("assessment")).toBe("assessment");
  });
});

describe("workoutSelectionToEventFields — calendar_events_single_source_ck guard", () => {
  it("program mode sets programId + programDayIndex and NO templateSlug", () => {
    const fields = workoutSelectionToEventFields({
      workoutType: "program",
      programId: "prog-1",
      programDayIndex: 2,
      templateSlug: "should-be-ignored",
    });
    expect(fields).toEqual({ programId: "prog-1", programDayIndex: 2 });
    expect(fields.templateSlug).toBeUndefined();
  });

  it("template mode sets only templateSlug", () => {
    const fields = workoutSelectionToEventFields({
      workoutType: "template",
      templateSlug: "upper-3day",
      programId: "should-be-ignored",
      programDayIndex: 0,
    });
    expect(fields).toEqual({ templateSlug: "upper-3day" });
    expect(fields.programId).toBeUndefined();
    expect(fields.programDayIndex).toBeUndefined();
  });

  it("empty mode sets neither", () => {
    const fields = workoutSelectionToEventFields({ workoutType: "empty" });
    expect(fields).toEqual({});
    expect(fields.programId).toBeUndefined();
    expect(fields.templateSlug).toBeUndefined();
  });

  it("never produces both programId and templateSlug set for any mode", () => {
    const modes: Array<"program" | "template" | "empty"> = [
      "program",
      "template",
      "empty",
    ];
    for (const workoutType of modes) {
      const fields = workoutSelectionToEventFields({
        workoutType,
        programId: "prog-1",
        programDayIndex: 0,
        templateSlug: "upper-3day",
      });
      const hasProgram = fields.programId !== undefined;
      const hasTemplate = fields.templateSlug !== undefined;
      expect(hasProgram && hasTemplate).toBe(false);
    }
  });
});

describe("buildDateOptions", () => {
  it("labels the first day Today and the second Tomorrow", () => {
    const options = buildDateOptions(new Date("2026-08-05T12:00:00Z"), 3);
    expect(options).toHaveLength(3);
    expect(options[0].label).toBe("Today");
    expect(options[1].label).toBe("Tomorrow");
    expect(options[2].label).not.toBe("Today");
    expect(options[2].label).not.toBe("Tomorrow");
  });

  it("values are ISO yyyy-MM-dd", () => {
    const options = buildDateOptions(new Date("2026-08-05T12:00:00Z"), 1);
    expect(options[0].value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
