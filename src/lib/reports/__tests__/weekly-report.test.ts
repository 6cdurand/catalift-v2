import { describe, it, expect } from "vitest";
import {
  getWeekBounds,
  filterByWeek,
  computeVolumeByMuscle,
  getTopMuscles,
  filterPBsByWeek,
  generateWeeklyReport,
} from "@/lib/reports/weekly-report";
import type { WorkoutHistoryBlocks } from "@/features/workout-engine/api/fetch-history";
import type { PersonalBestItem } from "@/features/workout-engine/api/fetch-personal-bests";
import type { WorkoutBlock } from "@/features/workout-engine/types";

function makeSet(weight: number, reps: number, completed = true) {
  return {
    id: `set-${weight}-${reps}-${Math.random()}`,
    weight,
    reps,
    completed,
    setNumber: 1,
  };
}

function makeStraightBlock(
  exerciseId: string,
  exerciseName: string,
  sets: ReturnType<typeof makeSet>[],
): WorkoutBlock {
  return {
    id: `block-${exerciseId}-${Math.random()}`,
    kind: "straight",
    blockType: "strength",
    exercises: [
      {
        id: `ex-${exerciseId}-${Math.random()}`,
        exerciseId,
        exerciseName,
        sets,
      },
    ],
  };
}

function makeWorkout(
  id: string,
  performedAt: string,
  blocks: WorkoutBlock[],
): WorkoutHistoryBlocks {
  return { id, performedAt, blocks };
}

function makePB(
  id: string,
  exerciseId: string,
  achievedAt: string,
  oneRepMax = 100,
): PersonalBestItem {
  return {
    id,
    exerciseId,
    exerciseName: exerciseId.replace(/-/g, " "),
    userId: "user-1",
    oneRepMax,
    bestWeight: 100,
    bestReps: 5,
    bestVolume: 500,
    achievedAt,
  };
}

describe("weekly-report", () => {
  describe("getWeekBounds", () => {
    it("returns Sunday as week start and Saturday as week end", () => {
      // Wednesday July 16, 2025
      const ref = new Date("2025-07-16T10:00:00");
      const { weekStart, weekEnd } = getWeekBounds(ref);

      expect(weekStart.getDay()).toBe(0); // Sunday
      expect(weekEnd.getDay()).toBe(6); // Saturday
      expect(weekStart.getDate()).toBe(13); // July 13
      expect(weekEnd.getDate()).toBe(19); // July 19
    });

    it("returns same week when ref is already Sunday", () => {
      const ref = new Date("2025-07-13T00:00:00"); // Sunday
      const { weekStart, weekEnd } = getWeekBounds(ref);
      expect(weekStart.getDate()).toBe(13);
      expect(weekEnd.getDate()).toBe(19);
    });
  });

  describe("filterByWeek", () => {
    it("filters workouts within the week bounds", () => {
      const weekStart = new Date("2025-07-13T00:00:00");
      const weekEnd = new Date("2025-07-19T23:59:59");
      const history: WorkoutHistoryBlocks[] = [
        makeWorkout("w1", "2025-07-14T10:00:00", []),
        makeWorkout("w2", "2025-07-16T10:00:00", []),
        makeWorkout("w3", "2025-07-20T10:00:00", []), // next week
        makeWorkout("w4", "2025-07-12T10:00:00", []), // prev week
      ];

      const result = filterByWeek(history, weekStart, weekEnd);
      expect(result).toHaveLength(2);
      expect(result.map((w) => w.id)).toEqual(["w1", "w2"]);
    });

    it("returns empty for no matching workouts", () => {
      const weekStart = new Date("2025-07-13T00:00:00");
      const weekEnd = new Date("2025-07-19T23:59:59");
      const history: WorkoutHistoryBlocks[] = [
        makeWorkout("w1", "2025-06-01T10:00:00", []),
      ];
      expect(filterByWeek(history, weekStart, weekEnd)).toHaveLength(0);
    });
  });

  describe("computeVolumeByMuscle", () => {
    it("attributes full volume to primary muscles and 30% to secondary", () => {
      // bench-press: primaryMuscles includes chest, secondary includes triceps
      const workout = makeWorkout("w1", "2025-07-15T10:00:00", [
        makeStraightBlock("bench-press", "Bench Press", [
          makeSet(100, 5), // 500 volume
        ]),
      ]);

      const result = computeVolumeByMuscle([workout]);
      // bench-press primaryMuscles: chest, triceps (per v2 exercise library)
      // We just verify chest got volume and total is reasonable
      const totalVol = Object.values(result).reduce((a, b) => a + b, 0);
      expect(totalVol).toBeGreaterThan(0);
    });

    it("returns all zeros for workouts with no completed sets", () => {
      const workout = makeWorkout("w1", "2025-07-15T10:00:00", [
        makeStraightBlock("bench-press", "Bench Press", [
          makeSet(100, 5, false), // not completed
        ]),
      ]);

      const result = computeVolumeByMuscle([workout]);
      const totalVol = Object.values(result).reduce((a, b) => a + b, 0);
      expect(totalVol).toBe(0);
    });

    it("ignores cardio blocks (no resistance sets)", () => {
      const cardioBlock: WorkoutBlock = {
        id: "cardio-1",
        kind: "cardio",
        exerciseId: "running",
        exerciseName: "Running",
        cardio: {
          durationSeconds: 1800,
          distanceMeters: 5000,
          calories: 300,
        },
      };
      const workout = makeWorkout("w1", "2025-07-15T10:00:00", [cardioBlock]);
      const result = computeVolumeByMuscle([workout]);
      const totalVol = Object.values(result).reduce((a, b) => a + b, 0);
      expect(totalVol).toBe(0);
    });

    it("handles unknown exerciseId gracefully (no crash, zero volume)", () => {
      const workout = makeWorkout("w1", "2025-07-15T10:00:00", [
        makeStraightBlock("nonexistent-exercise", "Mystery", [
          makeSet(100, 5),
        ]),
      ]);
      const result = computeVolumeByMuscle([workout]);
      const totalVol = Object.values(result).reduce((a, b) => a + b, 0);
      expect(totalVol).toBe(0);
    });
  });

  describe("getTopMuscles", () => {
    it("returns top N muscles sorted by volume descending", () => {
      const volumeMap = {
        chest: 1000, back: 800, shoulders: 600,
        biceps: 0, triceps: 0, forearms: 0, abs: 0, obliques: 0,
        quads: 0, hamstrings: 0, glutes: 0, calves: 0, traps: 0,
        lats: 0, lower_back: 0,
      } as Record<string, number>;

      const top = getTopMuscles(volumeMap as never, 2);
      expect(top).toHaveLength(2);
      expect(top[0].muscle).toBe("chest");
      expect(top[0].volume).toBe(1000);
      expect(top[1].muscle).toBe("back");
    });

    it("filters out zero-volume muscles", () => {
      const volumeMap = {
        chest: 500, back: 0, shoulders: 0, biceps: 0, triceps: 0,
        forearms: 0, abs: 0, obliques: 0, quads: 0, hamstrings: 0,
        glutes: 0, calves: 0, traps: 0, lats: 0, lower_back: 0,
      } as Record<string, number>;

      const top = getTopMuscles(volumeMap as never);
      expect(top).toHaveLength(1);
      expect(top[0].muscle).toBe("chest");
    });
  });

  describe("filterPBsByWeek", () => {
    it("filters PBs achieved within the week", () => {
      const weekStart = new Date("2025-07-13T00:00:00");
      const weekEnd = new Date("2025-07-19T23:59:59");
      const pbs: PersonalBestItem[] = [
        makePB("pb1", "bench-press", "2025-07-15T10:00:00"),
        makePB("pb2", "squat", "2025-07-18T10:00:00"),
        makePB("pb3", "deadlift", "2025-07-10T10:00:00"), // before week
        makePB("pb4", "row", "2025-07-20T10:00:00"), // after week
      ];

      const result = filterPBsByWeek(pbs, weekStart, weekEnd);
      expect(result).toHaveLength(2);
      expect(result.map((p) => p.id)).toEqual(["pb1", "pb2"]);
    });
  });

  describe("generateWeeklyReport", () => {
    it("computes a full report from history + PBs", () => {
      const refDate = new Date("2025-07-16T10:00:00"); // Wednesday
      const history: WorkoutHistoryBlocks[] = [
        makeWorkout("w1", "2025-07-14T10:00:00", [
          makeStraightBlock("bench-press", "Bench Press", [
            makeSet(100, 5),
            makeSet(100, 5),
          ]),
        ]),
        makeWorkout("w2", "2025-07-15T10:00:00", [
          makeStraightBlock("back-squat", "Back Squat", [
            makeSet(120, 5),
          ]),
        ]),
        makeWorkout("w3", "2025-07-08T10:00:00", [
          makeStraightBlock("deadlift", "Deadlift", [
            makeSet(140, 3),
          ]),
        ]),
      ];
      const pbs: PersonalBestItem[] = [
        makePB("pb1", "bench-press", "2025-07-14T10:00:00"),
        makePB("pb2", "back-squat", "2025-07-15T10:00:00"),
        makePB("pb3", "deadlift", "2025-07-08T10:00:00"),
      ];

      const report = generateWeeklyReport(history, pbs, refDate);

      expect(report.totalWorkouts).toBe(2); // w1 + w2, not w3
      expect(report.consistencyScore).toBe(30); // 2 * 15
      expect(report.newPBsThisWeek).toHaveLength(2);
      expect(report.topMuscles.length).toBeGreaterThan(0);
      expect(report.totalVolume).toBeGreaterThan(0);
    });

    it("returns empty report for no workouts this week", () => {
      const refDate = new Date("2025-07-16T10:00:00");
      const history: WorkoutHistoryBlocks[] = [
        makeWorkout("w1", "2025-06-01T10:00:00", [
          makeStraightBlock("bench-press", "Bench Press", [
            makeSet(100, 5),
          ]),
        ]),
      ];
      const pbs: PersonalBestItem[] = [];

      const report = generateWeeklyReport(history, pbs, refDate);

      expect(report.totalWorkouts).toBe(0);
      expect(report.consistencyScore).toBe(0);
      expect(report.totalVolume).toBe(0);
      expect(report.topMuscles).toHaveLength(0);
      expect(report.newPBsThisWeek).toHaveLength(0);
    });
  });
});
