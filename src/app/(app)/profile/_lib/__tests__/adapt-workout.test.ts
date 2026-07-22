import { describe, it, expect } from "vitest";
import {
  adaptWorkout,
  adaptWorkoutHistory,
  adaptPersonalBest,
} from "../adapt-workout";
import type { WorkoutBlock } from "@/features/workout-engine/types";
import type {
  WorkoutHistoryItem,
  WorkoutHistoryBlocks,
} from "@/features/workout-engine/api/fetch-history";
import type { PersonalBestItem } from "@/features/workout-engine/api/fetch-personal-bests";

const USER = "user-1";

function item(over: Partial<WorkoutHistoryItem> = {}): WorkoutHistoryItem {
  return {
    id: "w1",
    name: "Push Day",
    performedAt: "2024-06-01T10:00:00.000Z",
    totalVolume: 5000,
    totalSets: 6,
    ...over,
  };
}

const straightBlock: WorkoutBlock = {
  id: "b1",
  kind: "straight",
  blockType: "strength",
  exercises: [
    {
      id: "e1",
      exerciseId: "bench-press",
      exerciseName: "Bench Press",
      sets: [
        { id: "s1", setNumber: 1, weight: 100, reps: 5, completed: true },
        { id: "s2", setNumber: 2, weight: 100, reps: 5, completed: false },
      ],
    },
  ],
};

const supersetBlock: WorkoutBlock = {
  id: "b2",
  kind: "superset",
  exercises: [
    {
      id: "e2",
      exerciseId: "curl",
      exerciseName: "Curl",
      sets: [{ id: "s3", setNumber: 1, weight: 20, reps: 10, completed: true }],
    },
    {
      id: "e3",
      exerciseId: "pushdown",
      exerciseName: "Pushdown",
      sets: [{ id: "s4", setNumber: 1, weight: 30, reps: 10, completed: true }],
    },
  ],
};

const cardioBlock: WorkoutBlock = {
  id: "b3",
  kind: "cardio",
  exerciseId: "run",
  exerciseName: "Run",
  cardio: { durationSeconds: 1200, distanceMeters: 5000 },
};

describe("adaptWorkout", () => {
  it("flattens straight + superset blocks into flat exercises with sets", () => {
    const blocksRow: WorkoutHistoryBlocks = {
      id: "w1",
      performedAt: "2024-06-01T10:00:00.000Z",
      blocks: [straightBlock, supersetBlock],
    };

    const w = adaptWorkout(item(), blocksRow, USER);

    expect(w.id).toBe("w1");
    expect(w.userId).toBe(USER);
    expect(w.name).toBe("Push Day");
    expect(w.startTime).toBe("2024-06-01T10:00:00.000Z");
    expect(w.totalVolume).toBe(5000);
    // 1 (straight) + 2 (superset) = 3 flattened exercises
    expect(w.exercises).toHaveLength(3);
    expect(w.exercises[0].exerciseId).toBe("bench-press");
    expect(w.exercises[0].sets).toHaveLength(2);
    expect(w.exercises[0].sets[0].completed).toBe(true);
  });

  it("skips cardio blocks (no resistance entries)", () => {
    const blocksRow: WorkoutHistoryBlocks = {
      id: "w1",
      performedAt: "2024-06-01T10:00:00.000Z",
      blocks: [cardioBlock],
    };
    const w = adaptWorkout(item(), blocksRow, USER);
    expect(w.exercises).toHaveLength(0);
  });

  it("falls back to a default name and empty blocks when missing", () => {
    const w = adaptWorkout(item({ name: null }), undefined, USER);
    expect(w.name).toBe("Workout");
    expect(w.exercises).toHaveLength(0);
  });
});

describe("adaptWorkoutHistory", () => {
  it("merges items with blocks by id and sorts newest-first", () => {
    const items: WorkoutHistoryItem[] = [
      item({ id: "old", performedAt: "2024-01-01T00:00:00.000Z" }),
      item({ id: "new", performedAt: "2024-12-01T00:00:00.000Z" }),
    ];
    const blocks: WorkoutHistoryBlocks[] = [
      { id: "new", performedAt: "2024-12-01T00:00:00.000Z", blocks: [straightBlock] },
    ];

    const result = adaptWorkoutHistory(items, blocks, USER);

    expect(result.map((w) => w.id)).toEqual(["new", "old"]);
    // "new" has blocks merged; "old" has none
    expect(result[0].exercises).toHaveLength(1);
    expect(result[1].exercises).toHaveLength(0);
  });
});

describe("adaptPersonalBest", () => {
  it("maps a PB item to the v1 PersonalBest shape with null coalescing", () => {
    const pb: PersonalBestItem = {
      id: "pb1",
      exerciseId: "squat",
      exerciseName: "Squat",
      userId: USER,
      oneRepMax: 180,
      bestWeight: 160,
      bestReps: 3,
      bestVolume: 480,
      achievedAt: "2024-05-01T00:00:00.000Z",
    };

    const result = adaptPersonalBest(pb);

    expect(result).toMatchObject({
      id: "pb1",
      exerciseId: "squat",
      exerciseName: "Squat",
      userId: USER,
      oneRepMax: 180,
      bestWeight: 160,
      bestReps: 3,
      bestVolume: 480,
      achievedAt: "2024-05-01T00:00:00.000Z",
      workoutId: "",
    });
  });
});
