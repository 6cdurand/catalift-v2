import { describe, it, expect } from "vitest";

import { toRow, fromRow } from "../lib/serialize";
import { newId } from "../lib/ids";
import type { LoggedWorkout, WorkoutBlock } from "../types";

function makeWorkout(): LoggedWorkout {
  const block: WorkoutBlock = {
    id: newId(),
    kind: "straight",
    blockType: "strength",
    exercises: [
      {
        id: newId(),
        exerciseId: newId(),
        exerciseName: "Deadlift",
        sets: [
          { id: newId(), weight: 140, reps: 5, completed: true, setNumber: 1 },
          { id: newId(), weight: 140, reps: 5, completed: true, setNumber: 2 },
        ],
      },
    ],
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

  it("legacy straight upgrade: {kind:'straight', exercise:E} → {blockType:'strength', exercises:[E]}", () => {
    // A workout logged BEFORE the v1-parity change: straight block held ONE `exercise`
    // (singular) with no `blockType`. fromRow must transparently upgrade it so old rows
    // still render, sum volume, and yield PBs on the new multi-exercise shape.
    const legacyEntry = {
      id: "entry-legacy",
      exerciseId: "bench",
      exerciseName: "Bench Press",
      sets: [{ id: "s1", weight: 100, reps: 5, completed: true, setNumber: 1 }],
    };
    const out = fromRow({
      id: "w-legacy",
      user_id: "u-legacy",
      performed_at: "2026-01-01T00:00:00.000Z",
      exercises: [{ id: "blk-legacy", kind: "straight", exercise: legacyEntry }],
    });

    expect(out.blocks).toHaveLength(1);
    const block = out.blocks[0];
    expect(block.kind).toBe("straight");
    if (block.kind !== "straight") throw new Error("expected straight");
    expect(block.blockType).toBe("strength");
    expect(block.exercises).toEqual([legacyEntry]);
    // Volume still computes off the upgraded shape (100×5).
    expect(out.totalVolume).toBe(500);
  });

  it("legacy straight upgrade leaves superset/circuit untouched", () => {
    const out = fromRow({
      exercises: [
        {
          id: "ss",
          kind: "superset",
          exercises: [
            { id: "e1", exerciseId: "a", exerciseName: "A", sets: [] },
            { id: "e2", exerciseId: "b", exerciseName: "B", sets: [] },
          ],
        },
      ],
    });
    expect(out.blocks[0]).toEqual({
      id: "ss",
      kind: "superset",
      exercises: [
        { id: "e1", exerciseId: "a", exerciseName: "A", sets: [] },
        { id: "e2", exerciseId: "b", exerciseName: "B", sets: [] },
      ],
    });
  });

  it("write-recomputes: toRow sets total_volume from blocks, ignoring stale input", () => {
    const w = makeWorkout();
    w.totalVolume = 999999; // stale / wrong value on the in-memory object
    const row = toRow(w);
    expect(row.total_volume).toBe(1400); // recomputed from blocks, not the stale 999999
  });
});
