// Workout persist API \u2014 wraps data-sync persist for workout writes (w2a).
// Provides a simple boolean return for the active-workout-store finishWorkout flow.

// eslint-disable-next-line no-restricted-imports -- data-sync is a shared service layer
import { persist as dataSyncPersist } from '@/features/data-sync/lib/write';
import { getBrowserClient } from '@/lib/supabase';
import type { Database } from '@/types/database';

type WorkoutInsert = Database['public']['Tables']['workouts']['Insert'];

/**
 * Persist a LoggedWorkout row to the workouts table (G-11 await+retry).
 * Returns true on success, false on terminal failure (enqueued for offline replay).
 */
export async function persist(row: WorkoutInsert): Promise<boolean> {
  const result = await dataSyncPersist(
    { name: 'workout:create', payload: row },
    async () => {
      const supabase = getBrowserClient();
      const { error } = await supabase.from('workouts').insert(row);
      if (error) throw error;
      return row;
    }
  );

  return result.ok;
}
