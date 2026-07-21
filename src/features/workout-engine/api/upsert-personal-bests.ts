/**
 * upsert-personal-bests.ts — Personal Bests persistence API (F1 fix)
 *
 * Writes computed PBs to `public.personal_bests` after workout completion.
 * Uses data-sync persist wrapper for G-11 await+retry contract.
 * RLS: pb_insert_own / pb_update_own (user_id = auth.uid()).
 */

// eslint-disable-next-line no-restricted-imports -- data-sync is a shared service layer
import { persist as dataSyncPersist } from '@/features/data-sync/lib/write';
import { getBrowserClient } from '@/lib/supabase';
import { recalculateAllPBs, normalizeExerciseId } from '@/lib/exerciseStats';
import type { Database } from '@/types/database';
import type { Workout, WorkoutExercise, Exercise, WorkoutSet } from '@/types';
import type { WorkoutHistoryBlocks } from './fetch-history';
import type { WorkoutBlock } from '../types';

type PersonalBestInsert = Database['public']['Tables']['personal_bests']['Insert'];

interface CompletedWorkout {
  id: string;
  userId: string;
  performedAt: string;
  blocks: WorkoutBlock[];
}

/**
 * Upsert personal bests for exercises in the completed workout.
 * Recomputes all-time best per exercise from full history + completed session,
 * then writes to personal_bests table (upsert on user_id, exercise_id).
 *
 * Correctness: only upserts exercises present in completed session; written
 * value is all-time best from recalculateAllPBs (never regresses existing PB).
 */
export async function upsertPersonalBests(
  completed: CompletedWorkout,
  history: WorkoutHistoryBlocks[],
): Promise<boolean> {
  // Get exercise names from completed session for display
  const exerciseNames = new Map<string, string>();
  for (const block of completed.blocks) {
    if (block.kind === 'straight') {
      for (const ex of block.exercises) {
        const normId = normalizeExerciseId(ex.exerciseId);
        if (!exerciseNames.has(normId)) {
          exerciseNames.set(normId, ex.exerciseName);
        }
      }
    } else if (block.kind === 'superset') {
      for (const ex of block.exercises) {
        const normId = normalizeExerciseId(ex.exerciseId);
        if (!exerciseNames.has(normId)) {
          exerciseNames.set(normId, ex.exerciseName);
        }
      }
    } else if (block.kind === 'circuit') {
      for (const st of block.stations) {
        const normId = normalizeExerciseId(st.exerciseId);
        if (!exerciseNames.has(normId)) {
          exerciseNames.set(normId, st.exerciseName);
        }
      }
    }
  }

  // Get exercises in completed session (normalized ids)
  const completedExerciseIds = new Set(exerciseNames.keys());

  // Convert history + completed to stats format for recalculateAllPBs
  const statsWorkouts: Workout[] = [
    ...history.map(
      (h): Workout => ({
        id: h.id,
        userId: completed.userId,
        name: 'History',
        totalVolume: 0,
        status: 'completed' as const,
        startTime: h.performedAt,
        endTime: h.performedAt,
        exercises: extractExercisesFromBlocks(h.blocks),
      }),
    ),
    {
      id: completed.id,
      userId: completed.userId,
      name: 'Completed',
      totalVolume: 0,
      status: 'completed' as const,
      startTime: completed.performedAt,
      endTime: completed.performedAt,
      exercises: extractExercisesFromBlocks(completed.blocks),
    },
  ];

  // Compute all-time best per exercise
  const allPBs = recalculateAllPBs(statsWorkouts, completed.userId);

  // Filter to exercises in completed session only
  const pbsToUpsert = allPBs.filter((pb) => completedExerciseIds.has(pb.exerciseId));

  if (pbsToUpsert.length === 0) {
    return true; // No PBs to write (e.g., all sets were >20 reps or no completed sets)
  }

  // Map to personal_bests rows
  const rows: PersonalBestInsert[] = pbsToUpsert.map((pb) => ({
    user_id: pb.userId,
    exercise_id: pb.exerciseId,
    exercise_name: exerciseNames.get(pb.exerciseId) || null,
    weight: pb.bestWeight,
    reps: pb.bestReps,
    one_rm: pb.oneRepMax,
    best_volume: pb.bestVolume || null,
    achieved_on: pb.achievedAt,
  }));

  // Upsert via data-sync persist wrapper (G-11 await+retry)
  const result = await dataSyncPersist(
    { name: 'personal-bests:upsert', payload: rows },
    async () => {
      const supabase = getBrowserClient();
      const { error } = await supabase
        .from('personal_bests')
        .upsert(rows, { onConflict: 'user_id,exercise_id' });
      if (error) throw error;
      return rows;
    },
  );

  return result.ok;
}

/**
 * Extract exercises from WorkoutBlock[] in exerciseStats format.
 * Mirrors the structure recalculateAllPBs expects.
 */
function extractExercisesFromBlocks(blocks: WorkoutBlock[]): WorkoutExercise[] {
  const exercises: WorkoutExercise[] = [];
  let exerciseIndex = 0;

  for (const block of blocks) {
    if (block.kind === 'straight') {
      for (const ex of block.exercises) {
        exercises.push({
          id: `ex-${exerciseIndex++}`,
          exerciseId: ex.exerciseId,
          exercise: {
            id: ex.exerciseId,
            name: ex.exerciseName,
          } as Exercise,
          sets: ex.sets.map(
            (s, idx): WorkoutSet => ({
              id: `set-${exerciseIndex}-${idx}`,
              setNumber: idx + 1,
              type: 'normal',
              completed: s.completed,
              weight: s.weight ?? undefined,
              reps: s.reps ?? undefined,
            }),
          ),
          restTimerSeconds: 90,
        });
      }
    } else if (block.kind === 'superset') {
      for (const ex of block.exercises) {
        exercises.push({
          id: `ex-${exerciseIndex++}`,
          exerciseId: ex.exerciseId,
          exercise: {
            id: ex.exerciseId,
            name: ex.exerciseName,
          } as Exercise,
          sets: ex.sets.map(
            (s, idx): WorkoutSet => ({
              id: `set-${exerciseIndex}-${idx}`,
              setNumber: idx + 1,
              type: 'normal',
              completed: s.completed,
              weight: s.weight ?? undefined,
              reps: s.reps ?? undefined,
            }),
          ),
          restTimerSeconds: 90,
        });
      }
    } else if (block.kind === 'circuit') {
      for (const st of block.stations) {
        exercises.push({
          id: `ex-${exerciseIndex++}`,
          exerciseId: st.exerciseId,
          exercise: {
            id: st.exerciseId,
            name: st.exerciseName,
          } as Exercise,
          sets: st.sets.map(
            (s, idx): WorkoutSet => ({
              id: `set-${exerciseIndex}-${idx}`,
              setNumber: idx + 1,
              type: 'normal',
              completed: s.completed,
              weight: s.weight ?? undefined,
              reps: s.reps ?? undefined,
            }),
          ),
          restTimerSeconds: 90,
        });
      }
    }
  }

  return exercises;
}
