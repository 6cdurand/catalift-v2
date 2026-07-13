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
import { calculate1RM } from '@/lib/exercises';
import type { Database } from '@/types/database';
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
      const normId = normalizeExerciseId(block.exercise.exerciseId);
      if (!exerciseNames.has(normId)) {
        exerciseNames.set(normId, block.exercise.exerciseName);
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
  const statsWorkouts = [
    ...history.map((h) => ({
      id: h.id,
      userId: completed.userId,
      name: 'History',
      totalVolume: 0,
      status: 'completed' as const,
      startTime: h.performedAt,
      endTime: h.performedAt,
      exercises: extractExercisesFromBlocks(h.blocks),
    })),
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
  const allPBs = recalculateAllPBs(statsWorkouts as any, completed.userId);

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
function extractExercisesFromBlocks(blocks: WorkoutBlock[]): Array<{
  exerciseId: string;
  exercise?: { name?: string };
  sets: Array<{ completed: boolean; weight: number | null; reps: number | null }>;
}> {
  const exercises: Array<{
    exerciseId: string;
    exercise?: { name?: string };
    sets: Array<{ completed: boolean; weight: number | null; reps: number | null }>;
  }> = [];

  for (const block of blocks) {
    if (block.kind === 'straight') {
      exercises.push({
        exerciseId: block.exercise.exerciseId,
        exercise: { name: block.exercise.exerciseName },
        sets: block.exercise.sets.map((s) => ({
          completed: s.completed,
          weight: s.weight,
          reps: s.reps,
        })),
      });
    } else if (block.kind === 'superset') {
      for (const ex of block.exercises) {
        exercises.push({
          exerciseId: ex.exerciseId,
          exercise: { name: ex.exerciseName },
          sets: ex.sets.map((s) => ({
            completed: s.completed,
            weight: s.weight,
            reps: s.reps,
          })),
        });
      }
    } else if (block.kind === 'circuit') {
      for (const st of block.stations) {
        exercises.push({
          exerciseId: st.exerciseId,
          exercise: { name: st.exerciseName },
          sets: st.sets.map((s) => ({
            completed: s.completed,
            weight: s.weight,
            reps: s.reps,
          })),
        });
      }
    }
  }

  return exercises;
}
