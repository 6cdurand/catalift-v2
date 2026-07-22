import { describe, it, expect } from "vitest";

import { mapRowToHistoryItem } from "../api/fetch-history";
import type { WorkoutBlock } from "../types";
import { newId } from "../lib/ids";
import type { Database, Json } from "@/types/database";

type WorkoutRow = Database["public"]["Tables"]["workouts"]["Row"];

function makeRow(overrides: Partial<WorkoutRow> = {}): WorkoutRow {
  return {
    id: newId(),
    user_id: newId(),
    name: "Push Day",
    performed_at: "2026-06-28T08:00:00.000Z",
    exercises: [] as unknown as Json,
    total_volume: 0,
    notes: null,
    created_at: "2026-06-28T08:00:00.000Z",
    updated_at: "2026-06-28T08:00:00.000Z",
    ...overrides,
  };
}

function makeStraightBlock(completedSets: number): WorkoutBlock {
  return {
    id: newId(),
    kind: "straight",
    blockType: "strength",
    exercises: [
      {
        id: newId(),
        exerciseId: newId(),
        exerciseName: "Bench Press",
        sets: Array.from({ length: completedSets }, (_, i) => ({
          id: newId(),
          weight: 100,
          reps: 5,
          completed: true,
          setNumber: i + 1,
        })),
      },
    ],
  };
}

describe("mapRowToHistoryItem", () => {
  it("maps a row with a straight block — counts completed sets", () => {
    const block = makeStraightBlock(3);
    const row = makeRow({
      exercises: [block] as unknown as Json,
      total_volume: 1500,
    });
    const item = mapRowToHistoryItem(row);
    expect(item.id).toBe(row.id);
    expect(item.name).toBe("Push Day");
    expect(item.performedAt).toBe("2026-06-28T08:00:00.000Z");
    expect(item.totalVolume).toBe(1500);
    expect(item.totalSets).toBe(3);
  });

  it("counts completed sets across superset blocks", () => {
    const block: WorkoutBlock = {
      id: newId(),
      kind: "superset",
      exercises: [
        {
          id: newId(),
          exerciseId: newId(),
          exerciseName: "Curl",
          sets: [
            { id: newId(), weight: 40, reps: 10, completed: true, setNumber: 1 },
            { id: newId(), weight: 40, reps: 10, completed: false, setNumber: 2 },
          ],
        },
        {
          id: newId(),
          exerciseId: newId(),
          exerciseName: "Extension",
          sets: [
            { id: newId(), weight: 50, reps: 12, completed: true, setNumber: 1 },
          ],
        },
      ],
    };
    const row = makeRow({ exercises: [block] as unknown as Json });
    expect(mapRowToHistoryItem(row).totalSets).toBe(2);
  });

  it("handles empty exercises array (legacy row)", () => {
    const row = makeRow({ exercises: [] as unknown as Json });
    const item = mapRowToHistoryItem(row);
    expect(item.totalSets).toBe(0);
    expect(item.totalVolume).toBe(0);
  });

  it("handles null name", () => {
    const row = makeRow({ name: null });
    expect(mapRowToHistoryItem(row).name).toBeNull();
  });
});
