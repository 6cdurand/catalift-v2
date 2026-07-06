// history-stats.ts — pure, read-only computations derived from workout history:
//   • detectNewPRs()       → new-PR badge labels for the finish summary (Target 2)
//   • buildPreviousBests() → last logged weight×reps per exerciseId (Previous column)
//
// Reuses the shared PB engine (src/lib/exerciseStats) by adapting the v2 block
// shape into the minimal v1 `Workout` shape it reads. No writes, no schema, no
// feature flags — purely derived from data the caller already fetched via
// features/workout-engine/api/fetch-history.

import type { WorkoutBlock, ExerciseEntry } from '../types';
import type { Workout, WorkoutExercise } from '@/types';
import { recalculateAllPBs, normalizeExerciseId } from '@/lib/exerciseStats';

export interface HistoryWorkout {
  id: string;
  performedAt: string;
  blocks: WorkoutBlock[];
}

export interface PreviousBest {
  weight: number | null;
  reps: number | null;
}

function entriesOf(block: WorkoutBlock): ExerciseEntry[] {
  if (block.kind === 'straight') return [block.exercise];
  if (block.kind === 'superset') return block.exercises;
  if (block.kind === 'circuit') return block.stations;
  return []; // cardio has no logged resistance sets
}

// Adapt a v2 blocks workout into the minimal v1 Workout shape exerciseStats reads
// (it only touches userId, id, startTime/endTime, exercises[].exerciseId/exercise.name
// and sets[].completed/weight/reps).
function toStatsWorkout(w: HistoryWorkout, userId: string): Workout {
  const exercises = w.blocks.flatMap((b) =>
    entriesOf(b).map((entry) => ({
      id: entry.id,
      exerciseId: entry.exerciseId,
      exercise: { id: entry.exerciseId, name: entry.exerciseName },
      sets: entry.sets.map((s) => ({
        id: s.id,
        setNumber: s.setNumber,
        type: 'normal',
        weight: s.weight ?? undefined,
        reps: s.reps ?? undefined,
        completed: s.completed,
      })),
      restTimerSeconds: 0,
    })),
  ) as unknown as WorkoutExercise[];

  return {
    id: w.id,
    name: '',
    exercises,
    startTime: w.performedAt,
    endTime: w.performedAt,
    totalVolume: 0,
    userId,
    status: 'completed',
  } as unknown as Workout;
}

/**
 * New-PR badge labels set by `completed`, compared against prior `history`.
 * A PR is "new" when the best 1RM for an exercise came from the just-finished
 * session — i.e. it strictly beat every prior session, or is the first ever.
 *
 * `recalculateAllPBs` keeps the single strictly-greater best per exercise and
 * records the producing workout. History is fed BEFORE the completed session so
 * a tie keeps the older workout → `completed.id` only surfaces on a genuine
 * improvement (or a first-time lift).
 */
export function detectNewPRs(
  completed: HistoryWorkout,
  history: HistoryWorkout[],
  userId: string,
): string[] {
  const completedStats = toStatsWorkout(completed, userId);
  const historyStats = history
    .filter((h) => h.id !== completed.id)
    .map((h) => toStatsWorkout(h, userId));

  // Human display name per normalized exercise id, from the finished session.
  const nameByNorm = new Map<string, string>();
  for (const b of completed.blocks) {
    for (const e of entriesOf(b)) {
      nameByNorm.set(normalizeExerciseId(e.exerciseId || e.exerciseName), e.exerciseName);
    }
  }

  const pbs = recalculateAllPBs([...historyStats, completedStats], userId);
  return pbs
    .filter((pb) => pb.workoutId === completed.id && pb.bestWeight > 0)
    .map((pb) => {
      const name = nameByNorm.get(pb.exerciseId) ?? pb.exerciseId;
      return `${name} · ${pb.bestWeight}kg × ${pb.bestReps}`;
    });
}

/**
 * Map of exerciseId → last logged weight×reps from workout `history`.
 * Drives the "Previous" column + tap-to-fill in set rows (Target 4).
 * `history` MUST be ordered newest-first (as fetch-history returns it); the
 * first completed set found per exercise wins.
 */
export function buildPreviousBests(history: HistoryWorkout[]): Record<string, PreviousBest> {
  const map: Record<string, PreviousBest> = {};
  for (const w of history) {
    for (const b of w.blocks) {
      for (const entry of entriesOf(b)) {
        if (entry.exerciseId in map) continue; // newest already recorded
        const lastCompleted = [...entry.sets]
          .reverse()
          .find((s) => s.completed && s.weight != null && s.reps != null);
        if (lastCompleted) {
          map[entry.exerciseId] = { weight: lastCompleted.weight, reps: lastCompleted.reps };
        }
      }
    }
  }
  return map;
}
