// Adapter: v2 workout-engine reads → the v1 `Workout`/`PersonalBest` shapes
// that the ported profile UI (ProfileCardV2, WorkoutStatsCharts) consumes
// unchanged. Pure functions — no Supabase, testable in isolation.
//
// v2 stores `workouts.exercises` as WorkoutBlock[] (straight/superset/circuit/
// cardio). The verbatim-ported v1 charts expect a flat `exercises[]` where each
// entry exposes `.exerciseId`, `.exercise.name`, and `.sets[]` with
// weight/reps/completed. This module flattens blocks into that shape and casts
// at the boundary (the v1 types carry many builder-only fields the read path
// never needs).

import type { Workout, PersonalBest } from "@/types";
import type {
  WorkoutBlock,
  ExerciseEntry,
} from "@/features/workout-engine/types";
import type { WorkoutHistoryItem } from "@/features/workout-engine/api/fetch-history";
import type { WorkoutHistoryBlocks } from "@/features/workout-engine/api/fetch-history";
import type { PersonalBestItem } from "@/features/workout-engine/api/fetch-personal-bests";

/** Flatten a v2 block into the resistance entries it contains (cardio has none). */
function entriesOfBlock(block: WorkoutBlock): ExerciseEntry[] {
  if (block.kind === "straight") return block.exercises;
  if (block.kind === "superset") return block.exercises;
  if (block.kind === "circuit") return block.stations;
  return [];
}

/** A v1-ish workout exercise — only the fields the ported read path touches. */
interface AdaptedExercise {
  id: string;
  exerciseId: string;
  exercise: { name: string };
  sets: {
    weight: number | null;
    reps: number | null;
    completed: boolean;
  }[];
}

/**
 * Merge a v2 history item (name/volume) with its raw blocks into one v1
 * `Workout`. `userId` is passed in — every row belongs to the signed-in user
 * (RLS-scoped), and neither v2 read returns user_id.
 */
export function adaptWorkout(
  item: WorkoutHistoryItem,
  blocksRow: WorkoutHistoryBlocks | undefined,
  userId: string,
): Workout {
  const blocks = blocksRow?.blocks ?? [];
  const exercises: AdaptedExercise[] = [];

  for (const block of blocks) {
    for (const entry of entriesOfBlock(block)) {
      exercises.push({
        id: entry.id,
        exerciseId: entry.exerciseId,
        exercise: { name: entry.exerciseName },
        sets: entry.sets.map((s) => ({
          weight: s.weight,
          reps: s.reps,
          completed: s.completed,
        })),
      });
    }
  }

  const workout = {
    id: item.id,
    name: item.name || "Workout",
    exercises,
    startTime: item.performedAt,
    endTime: item.performedAt,
    totalVolume: item.totalVolume,
    userId,
    status: "completed" as const,
  };

  // Boundary cast: the read path only uses the fields set above; v1's Workout
  // type carries many builder-only fields that history rows never populate.
  return workout as unknown as Workout;
}

/**
 * Merge parallel v2 reads (history items + history-with-blocks) into a single
 * v1 `Workout[]`, keyed by workout id. Sorted newest-first by performedAt.
 */
export function adaptWorkoutHistory(
  items: WorkoutHistoryItem[],
  blocks: WorkoutHistoryBlocks[],
  userId: string,
): Workout[] {
  const blocksById = new Map<string, WorkoutHistoryBlocks>();
  for (const b of blocks) blocksById.set(b.id, b);

  return items
    .map((item) => adaptWorkout(item, blocksById.get(item.id), userId))
    .sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    );
}

/** Map a v2 PersonalBestItem into the v1 `PersonalBest` shape. */
export function adaptPersonalBest(pb: PersonalBestItem): PersonalBest {
  return {
    id: pb.id,
    exerciseId: pb.exerciseId,
    exerciseName: pb.exerciseName ?? undefined,
    userId: pb.userId,
    oneRepMax: pb.oneRepMax,
    bestWeight: pb.bestWeight,
    bestReps: pb.bestReps,
    bestVolume: pb.bestVolume,
    achievedAt: pb.achievedAt,
    workoutId: "",
  };
}
