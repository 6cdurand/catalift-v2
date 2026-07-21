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
import { calculate1RM } from '@/lib/exercises';

export interface HistoryWorkout {
  id: string;
  performedAt: string;
  blocks: WorkoutBlock[];
}

export interface PreviousBest {
  weight: number | null;
  reps: number | null;
  /** performedAt (ISO) of the session this previous-best came from (Target: PB badges). */
  date?: string;
  /** All completed weight×reps sets from that most-recent session (for the 🕐 previous badge). */
  lastSets?: { weight: number | null; reps: number | null }[];
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
      // F1: Include e1RM in badge (matches /pbs display)
      const e1rm = pb.oneRepMax ? ` (${Math.round(pb.oneRepMax)}kg e1RM)` : '';
      return `${name} · ${pb.bestWeight}kg × ${pb.bestReps}${e1rm}`;
    });
}

/**
 * PB predicate for the active-screen toast (v1 fidelity). Returns the set's e1RM when
 * it STRICTLY beats the prior all-time best for the exercise (`priorBestOneRm`, 0 if
 * none), else null. Uses the canonical calculate1RM (Brzycki/Epley, >20 reps → null).
 * Drops never reach here — only a parent working set can set a PB (types.ts).
 * Pure — the "once per exercise" de-dupe is the caller's responsibility.
 */
export function newPersonalBestOneRm(
  weight: number | null,
  reps: number | null,
  priorBestOneRm: number,
): number | null {
  if (weight == null || reps == null) return null;
  const e1rm = calculate1RM(weight, reps);
  if (e1rm == null) return null;
  return e1rm > priorBestOneRm ? e1rm : null;
}

/**
 * Map of exerciseId → last logged weight×reps (+ date + last sets) from workout `history`.
 * Drives the "Previous" column + tap-to-fill in set rows and the 🕐 previous badge.
 * `history` MUST be ordered newest-first (as fetch-history returns it); the
 * first completed set found per exercise wins.
 */
export function buildPreviousBests(history: HistoryWorkout[]): Record<string, PreviousBest> {
  const map: Record<string, PreviousBest> = {};
  for (const w of history) {
    for (const b of w.blocks) {
      for (const entry of entriesOf(b)) {
        if (entry.exerciseId in map) continue; // newest already recorded
        const completed = entry.sets.filter(
          (s) => s.completed && s.weight != null && s.reps != null,
        );
        if (completed.length === 0) continue;
        const lastCompleted = completed[completed.length - 1];
        map[entry.exerciseId] = {
          weight: lastCompleted.weight,
          reps: lastCompleted.reps,
          // Extra context for the PB / previous badges (additive; tap-to-fill only reads weight/reps).
          date: w.performedAt,
          lastSets: completed.map((s) => ({ weight: s.weight, reps: s.reps })),
        };
      }
    }
  }
  return map;
}
