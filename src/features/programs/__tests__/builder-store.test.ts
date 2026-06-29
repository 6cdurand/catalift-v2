import { describe, it, expect, beforeEach } from "vitest";

import { useProgramsStore } from "../store";
import type { ProgramDay } from "../types";

function makeDay(label: string, blocks: ProgramDay["blocks"] = []): ProgramDay {
  return { id: crypto.randomUUID(), label, blocks };
}

beforeEach(() => {
  useProgramsStore.getState().reset();
  useProgramsStore.getState().resetBuilder();
});

describe("builder mutators (w2b-1)", () => {
  it("setDays replaces the builder days array", () => {
    const store = useProgramsStore.getState();
    store.setDays([makeDay("Push"), makeDay("Pull")]);
    expect(useProgramsStore.getState().builderDays).toHaveLength(2);
    expect(useProgramsStore.getState().builderDays[0].label).toBe("Push");
  });

  it("addDay appends a new empty day", () => {
    const store = useProgramsStore.getState();
    store.setDays([makeDay("A")]);
    store.addDay();
    const days = useProgramsStore.getState().builderDays;
    expect(days).toHaveLength(2);
    expect(days[1].blocks).toEqual([]);
  });

  it("copyDay deep-copies with new UUIDs", () => {
    const store = useProgramsStore.getState();
    const day = makeDay("Push", [
      {
        id: crypto.randomUUID(),
        type: "work",
        name: "Main",
        exercises: [
          {
            id: crypto.randomUUID(),
            exerciseId: "bench-press",
            exerciseName: "Bench Press",
            movementPattern: "compound",
            sets: 3,
            reps: "8-12",
            rest: "60s",
          },
        ],
      },
    ]);
    store.setDays([day]);
    store.copyDay(0);
    const days = useProgramsStore.getState().builderDays;
    expect(days).toHaveLength(2);
    expect(days[1].label).toBe("Push (Copy)");
    expect(days[1].id).not.toBe(days[0].id);
    expect(days[1].blocks[0].id).not.toBe(days[0].blocks[0].id);
    expect(days[1].blocks[0].exercises[0].id).not.toBe(days[0].blocks[0].exercises[0].id);
    expect(days[1].blocks[0].exercises[0].exerciseName).toBe("Bench Press");
  });

  it("removeDay removes by index and clamps activeDayIndex", () => {
    const store = useProgramsStore.getState();
    store.setDays([makeDay("A"), makeDay("B"), makeDay("C")]);
    store.setActiveDayIndex(2);
    store.removeDay(2);
    const state = useProgramsStore.getState();
    expect(state.builderDays).toHaveLength(2);
    expect(state.activeDayIndex).toBe(1);
  });

  it("removeDay enforces minimum 1 day", () => {
    const store = useProgramsStore.getState();
    store.setDays([makeDay("Only")]);
    store.removeDay(0);
    expect(useProgramsStore.getState().builderDays).toHaveLength(1);
  });

  it("addBlock adds a block to the specified day and sorts by type", () => {
    const store = useProgramsStore.getState();
    store.setDays([makeDay("A")]);
    store.addBlock(0, "work");
    store.addBlock(0, "warmup");
    const blocks = useProgramsStore.getState().builderDays[0].blocks;
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("warmup");
    expect(blocks[1].type).toBe("work");
  });

  it("removeBlock removes by ID across all days", () => {
    const store = useProgramsStore.getState();
    store.setDays([makeDay("A"), makeDay("B")]);
    store.addBlock(0, "work");
    const blockId = useProgramsStore.getState().builderDays[0].blocks[0].id;
    store.removeBlock(blockId);
    expect(useProgramsStore.getState().builderDays[0].blocks).toHaveLength(0);
  });

  it("updateBlockName updates the block name", () => {
    const store = useProgramsStore.getState();
    store.setDays([makeDay("A")]);
    store.addBlock(0, "work");
    const blockId = useProgramsStore.getState().builderDays[0].blocks[0].id;
    store.updateBlockName(blockId, "Heavy Lifts");
    expect(useProgramsStore.getState().builderDays[0].blocks[0].name).toBe("Heavy Lifts");
  });

  it("addExerciseToBlock adds an exercise with sensible defaults", () => {
    const store = useProgramsStore.getState();
    store.setDays([makeDay("A")]);
    store.addBlock(0, "work");
    const blockId = useProgramsStore.getState().builderDays[0].blocks[0].id;
    store.addExerciseToBlock(blockId, { id: "bench-press", name: "Bench Press", pattern: "compound" });
    const ex = useProgramsStore.getState().builderDays[0].blocks[0].exercises[0];
    expect(ex.exerciseName).toBe("Bench Press");
    expect(ex.sets).toBe(3);
    expect(ex.reps).toBe("8-12");
    expect(ex.rest).toBe("60s");
  });

  it("addExerciseToBlock uses time-based defaults for warmup pattern", () => {
    const store = useProgramsStore.getState();
    store.setDays([makeDay("A")]);
    store.addBlock(0, "warmup");
    const blockId = useProgramsStore.getState().builderDays[0].blocks[0].id;
    store.addExerciseToBlock(blockId, { id: "arm-circles", name: "Arm Circles", pattern: "warmup" });
    const ex = useProgramsStore.getState().builderDays[0].blocks[0].exercises[0];
    expect(ex.reps).toBe("30s");
    expect(ex.repType).toBe("time");
  });

  it("removeExercise removes by IDs", () => {
    const store = useProgramsStore.getState();
    store.setDays([makeDay("A")]);
    store.addBlock(0, "work");
    const blockId = useProgramsStore.getState().builderDays[0].blocks[0].id;
    store.addExerciseToBlock(blockId, { id: "squat", name: "Squat", pattern: "compound" });
    const exId = useProgramsStore.getState().builderDays[0].blocks[0].exercises[0].id;
    store.removeExercise(blockId, exId);
    expect(useProgramsStore.getState().builderDays[0].blocks[0].exercises).toHaveLength(0);
  });

  it("updateExercise partially updates an exercise", () => {
    const store = useProgramsStore.getState();
    store.setDays([makeDay("A")]);
    store.addBlock(0, "work");
    const blockId = useProgramsStore.getState().builderDays[0].blocks[0].id;
    store.addExerciseToBlock(blockId, { id: "squat", name: "Squat", pattern: "compound" });
    const exId = useProgramsStore.getState().builderDays[0].blocks[0].exercises[0].id;
    store.updateExercise(blockId, exId, { sets: 5, reps: "3-5" });
    const ex = useProgramsStore.getState().builderDays[0].blocks[0].exercises[0];
    expect(ex.sets).toBe(5);
    expect(ex.reps).toBe("3-5");
    expect(ex.exerciseName).toBe("Squat");
  });

  it("resetBuilder clears builderDays and activeDayIndex", () => {
    const store = useProgramsStore.getState();
    store.setDays([makeDay("A"), makeDay("B")]);
    store.setActiveDayIndex(1);
    store.resetBuilder();
    const state = useProgramsStore.getState();
    expect(state.builderDays).toHaveLength(0);
    expect(state.activeDayIndex).toBe(0);
  });

  it("round-trip: setDays → mutate → verify immutability", () => {
    const store = useProgramsStore.getState();
    const original = [makeDay("A"), makeDay("B")];
    store.setDays(original);
    store.updateDayLabel(0, "Alpha");
    const state = useProgramsStore.getState();
    expect(state.builderDays[0].label).toBe("Alpha");
    expect(original[0].label).toBe("A");
  });
});
