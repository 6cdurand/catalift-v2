// weekly-report.ts — pure, on-demand weekly report derivation.
//
// Ported from v1 reportStore.generateWeeklyReport() logic, rewired to v2
// data seams: consumes WorkoutHistoryBlocks[] (from fetchWorkoutHistoryWithBlocks)
// and PersonalBestItem[] (from fetchPersonalBests). No persistence — the report
// is regenerated each time the page loads (guardrail: no localStorage for
// domain data).
//
// Week scoping = Sunday-start (getDay() === 0), matching v1. This is REPORT
// scoping only — it does NOT touch the program scheduling parity law.
//
// Volume-by-muscle: for each completed set, weight × reps is attributed to the
// exercise's primaryMuscles (full volume) and secondaryMuscles (30% volume),
// matching v1 reportStore logic. Cardio blocks contribute zero resistance
// volume (they have no sets).

import type { WorkoutBlock, ExerciseEntry } from "@/features/workout-engine/types";
import type { MuscleGroup } from "@/types";
import type { WorkoutHistoryBlocks } from "@/features/workout-engine/api/fetch-history";
import type { PersonalBestItem } from "@/features/workout-engine/api/fetch-personal-bests";
import { exerciseLibraryMap } from "@/lib/exercises";

export interface MuscleVolumeEntry {
  muscle: MuscleGroup;
  volume: number;
}

export interface WeeklyReport {
  weekStartDate: string;
  weekEndDate: string;
  totalWorkouts: number;
  totalVolume: number;
  totalDurationMinutes: number;
  volumeByMuscle: Record<MuscleGroup, number>;
  topMuscles: MuscleVolumeEntry[];
  newPBsThisWeek: PersonalBestItem[];
  consistencyScore: number;
  generatedAt: string;
}

const ALL_MUSCLE_GROUPS: MuscleGroup[] = [
  "chest", "back", "shoulders", "biceps", "triceps",
  "forearms", "abs", "obliques", "quads", "hamstrings",
  "glutes", "calves", "traps", "lats", "lower_back",
];

function emptyMuscleMap(): Record<MuscleGroup, number> {
  const map = {} as Record<MuscleGroup, number>;
  for (const m of ALL_MUSCLE_GROUPS) {
    map[m] = 0;
  }
  return map;
}

function entriesOf(block: WorkoutBlock): ExerciseEntry[] {
  if (block.kind === "straight") return block.exercises;
  if (block.kind === "superset") return block.exercises;
  if (block.kind === "circuit") return block.stations;
  return [];
}

function computeExerciseVolume(entry: ExerciseEntry): number {
  let vol = 0;
  for (const s of entry.sets) {
    if (s.completed && s.weight != null && s.reps != null) {
      vol += s.weight * s.reps;
    }
    if (s.drops) {
      for (const d of s.drops) {
        vol += d.weight * d.reps;
      }
    }
  }
  return vol;
}

/**
 * Get the Sunday-start week boundaries for a given reference date.
 * Sunday = getDay() 0. Returns [weekStart, weekEnd] at local midnight / end-of-day.
 */
export function getWeekBounds(ref: Date): { weekStart: Date; weekEnd: Date } {
  const weekStart = new Date(ref);
  weekStart.setDate(ref.getDate() - ref.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

/**
 * Filter workout history to only sessions within the given week bounds.
 */
export function filterByWeek(
  history: WorkoutHistoryBlocks[],
  weekStart: Date,
  weekEnd: Date,
): WorkoutHistoryBlocks[] {
  return history.filter((w) => {
    const d = new Date(w.performedAt);
    return d >= weekStart && d <= weekEnd;
  });
}

/**
 * Compute volume-by-muscle-group from a set of workout blocks.
 * Primary muscles get full exercise volume; secondary muscles get 30%.
 */
export function computeVolumeByMuscle(
  workouts: WorkoutHistoryBlocks[],
): Record<MuscleGroup, number> {
  const volumeByMuscle = emptyMuscleMap();

  for (const workout of workouts) {
    for (const block of workout.blocks) {
      for (const entry of entriesOf(block)) {
        const exerciseVolume = computeExerciseVolume(entry);
        if (exerciseVolume <= 0) continue;

        const exercise = exerciseLibraryMap.get(entry.exerciseId);
        if (!exercise) continue;

        for (const muscle of exercise.primaryMuscles) {
          volumeByMuscle[muscle] += exerciseVolume;
        }
        for (const muscle of exercise.secondaryMuscles) {
          volumeByMuscle[muscle] += exerciseVolume * 0.3;
        }
      }
    }
  }

  return volumeByMuscle;
}

/**
 * Get the top N muscles by volume, sorted descending.
 */
export function getTopMuscles(
  volumeByMuscle: Record<MuscleGroup, number>,
  limit = 5,
): MuscleVolumeEntry[] {
  return (Object.entries(volumeByMuscle) as [MuscleGroup, number][])
    .filter(([, vol]) => vol > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([muscle, volume]) => ({ muscle, volume }));
}

/**
 * Filter PBs to only those achieved within the given week bounds.
 */
export function filterPBsByWeek(
  pbs: PersonalBestItem[],
  weekStart: Date,
  weekEnd: Date,
): PersonalBestItem[] {
  return pbs.filter((pb) => {
    const d = new Date(pb.achievedAt);
    return d >= weekStart && d <= weekEnd;
  });
}

/**
 * Generate a complete weekly report from existing v2 data seams.
 * Pure function — no side effects, no persistence.
 *
 * @param history Workout history with blocks (from fetchWorkoutHistoryWithBlocks)
 * @param pbs Personal bests (from fetchPersonalBests)
 * @param refDate Reference date for the week (defaults to now)
 */
export function generateWeeklyReport(
  history: WorkoutHistoryBlocks[],
  pbs: PersonalBestItem[],
  refDate: Date = new Date(),
): WeeklyReport {
  const { weekStart, weekEnd } = getWeekBounds(refDate);
  const thisWeekWorkouts = filterByWeek(history, weekStart, weekEnd);
  const volumeByMuscle = computeVolumeByMuscle(thisWeekWorkouts);
  const topMuscles = getTopMuscles(volumeByMuscle);
  const totalVolume = Object.values(volumeByMuscle).reduce((a, b) => a + b, 0);
  const newPBsThisWeek = filterPBsByWeek(pbs, weekStart, weekEnd);

  return {
    weekStartDate: weekStart.toISOString(),
    weekEndDate: weekEnd.toISOString(),
    totalWorkouts: thisWeekWorkouts.length,
    totalVolume: Math.round(totalVolume),
    totalDurationMinutes: 0,
    volumeByMuscle,
    topMuscles,
    newPBsThisWeek,
    consistencyScore: Math.min(100, thisWeekWorkouts.length * 15),
    generatedAt: new Date().toISOString(),
  };
}
