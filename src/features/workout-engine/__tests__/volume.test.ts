import { describe, it, expect } from "vitest";

import {
  computeSetVolume,
  computeBlockVolume,
  computeTotalVolume,
} from "../lib/volume";
import { newId } from "../lib/ids";
import type {
  ExerciseEntry,
  LoggedSet,
  WorkoutBlock,
  CardioPayload,
} from "../types";

function set(
  weight: number | null,
  reps: number | null,
  completed = true,
  extra: Partial<LoggedSet> = {},
): LoggedSet {
  return { id: newId(), weight, reps, completed, ...extra };
}

function entry(sets: LoggedSet[]): ExerciseEntry {
  return {
    id: newId(),
    exerciseId: newId(),
    exerciseName: "Bench Press",
    sets,
  };
}

function straight(e: ExerciseEntry): WorkoutBlock {
  return { id: newId(), kind: "straight", exercise: e };
}

const cardio: CardioPayload = { durationSeconds: 1200, distanceMeters: 5000 };

describe("computeSetVolume (G-13)", () => {
  it("multiplies weight × reps for a completed set", () => {
    expect(computeSetVolume(set(100, 5))).toBe(500);
  });

  it("incomplete set contributes 0", () => {
    expect(computeSetVolume(set(100, 5, false))).toBe(0);
  });

  it("bodyweight (weight=null) → 0 volume, no NaN", () => {
    const v = computeSetVolume(set(null, 12));
    expect(v).toBe(0);
    expect(Number.isNaN(v)).toBe(false);
  });

  it("null reps → 0 volume", () => {
    expect(computeSetVolume(set(100, null))).toBe(0);
  });
});

describe("computeBlockVolume / computeTotalVolume (SUM, never MAX)", () => {
  it("straight-sum: [100×5, 100×5, 90×8] → 1720", () => {
    const block = straight(entry([set(100, 5), set(100, 5), set(90, 8)]));
    expect(computeBlockVolume(block)).toBe(1720);
    expect(computeTotalVolume([block])).toBe(1720);
  });

  it("not-max regression: [100×5=500, 50×5=250] → 750, NOT 500", () => {
    const block = straight(entry([set(100, 5), set(50, 5)]));
    expect(computeBlockVolume(block)).toBe(750);
    expect(computeBlockVolume(block)).not.toBe(500); // v1 MAX bug
  });

  it("incomplete-excluded: uncompleted set adds 0", () => {
    const block = straight(entry([set(100, 5), set(100, 5, false)]));
    expect(computeBlockVolume(block)).toBe(500);
  });

  it("bodyweight-null: weight=null sets sum to 0", () => {
    const block = straight(entry([set(null, 10), set(null, 8)]));
    expect(computeBlockVolume(block)).toBe(0);
  });

  it("superset-sum: two exercises → sum of both", () => {
    const block: WorkoutBlock = {
      id: newId(),
      kind: "superset",
      exercises: [entry([set(100, 5)]), entry([set(40, 10)])],
    };
    expect(computeBlockVolume(block)).toBe(500 + 400);
  });

  it("circuit-sum: 3 rounds × 2 stations, each round a set → all 6 summed", () => {
    const stationSets = (w: number) =>
      [0, 1, 2].map((round) => set(w, 10, true, { roundIndex: round }));
    const block: WorkoutBlock = {
      id: newId(),
      kind: "circuit",
      rounds: 3,
      stations: [entry(stationSets(20)), entry(stationSets(30))],
    };
    // station A: 3 × (20×10)=600 ; station B: 3 × (30×10)=900 → 1500
    expect(computeBlockVolume(block)).toBe(1500);
  });

  it("cardio-zero: a cardio block contributes 0", () => {
    const block: WorkoutBlock = {
      id: newId(),
      kind: "cardio",
      exerciseId: newId(),
      exerciseName: "Run",
      cardio,
    };
    expect(computeBlockVolume(block)).toBe(0);
  });

  it("mixed-total: straight + cardio + circuit → straight + circuit (+0 cardio)", () => {
    const straightBlock = straight(entry([set(100, 5)])); // 500
    const circuitBlock: WorkoutBlock = {
      id: newId(),
      kind: "circuit",
      rounds: 2,
      stations: [
        entry([
          set(20, 10, true, { roundIndex: 0 }),
          set(20, 10, true, { roundIndex: 1 }),
        ]),
      ], // 400
    };
    const cardioBlock: WorkoutBlock = {
      id: newId(),
      kind: "cardio",
      exerciseId: newId(),
      exerciseName: "Row",
      cardio,
    };
    expect(
      computeTotalVolume([straightBlock, cardioBlock, circuitBlock]),
    ).toBe(900);
  });
});
