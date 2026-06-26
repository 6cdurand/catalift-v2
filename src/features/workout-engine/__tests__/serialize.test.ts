import { describe, it, expect } from "vitest";

import { toRow, fromRow } from "../lib/serialize";
import { newId } from "../lib/ids";
import type { LoggedWorkout, WorkoutBlock } from "../types";

function makeWorkout(): LoggedWorkout {
  const block: WorkoutBlock = {
    id: newId(),
    kind: "straight",
    exercise: {
      id: newId(),
      exerciseId: newId(),
      exerciseName: "Deadlift",
      sets: [
        { id: newId(), weight: 140, reps: 5, completed: true, setNumber: 1 },
        { id: newId(), weight: 140, reps: 5, completed: true, setNumber: 2 },
      ],
    },
  };
  return {
    id: newId(),
    userId: newId(),
    name: "Pull Day",
    performedAt: "2026-06-24T08:00:00.000Z",
    blocks: [block],
    totalVolume: 1400, // 2 × (140×5)
    notes: null,
  };
}

describe("serialize seam (blocks ↔ exercises, totalVolume ↔ total_volume)", () => {
  it("round-trip: fromRow(toRow(w)) deep-equals w (totalVolume recomputed)", () => {
    const w = makeWorkout();
    expect(fromRow(toRow(w))).toEqual(w);
  });

  it("legacy-empty: fromRow({exercises: []}) → blocks=[], totalVolume=0, no throw (G-09)", () => {
    const out = fromRow({ exercises: [] });
    expect(out.blocks).toEqual([]);
    expect(out.totalVolume).toBe(0);
  });

  it("legacy: fromRow tolerates a missing exercises field without throwing", () => {
    expect(() => fromRow({})).not.toThrow();
    expect(fromRow({}).blocks).toEqual([]);
  });

  it("write-recomputes: toRow sets total_volume from blocks, ignoring stale input", () => {
    const w = makeWorkout();
    w.totalVolume = 999999; // stale / wrong value on the in-memory object
    const row = toRow(w);
    expect(row.total_volume).toBe(1400); // recomputed from blocks, not the stale 999999
  });
});
