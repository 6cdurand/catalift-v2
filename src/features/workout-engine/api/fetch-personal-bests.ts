// Personal-bests read API — reads the user's PBs from the `personal_bests`
// table (RLS-scoped via auth.uid()). The user_id filter is for explicitness.
// Pure read, no writes, no schema change. Feeds the profile PB list + count.

import { getBrowserClient } from "@/lib/supabase";
import type { Database } from "@/types/database";

type PersonalBestRow = Database["public"]["Tables"]["personal_bests"]["Row"];

/** Canonical PB item surfaced to the profile screen. */
export interface PersonalBestItem {
  id: string;
  exerciseId: string;
  exerciseName: string | null;
  userId: string;
  oneRepMax: number;
  bestWeight: number;
  bestReps: number;
  bestVolume: number;
  achievedAt: string;
}

/** Map a raw `personal_bests` row to a PersonalBestItem. Pure — testable. */
export function mapRowToPersonalBest(row: PersonalBestRow): PersonalBestItem {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    exerciseName: row.exercise_name,
    userId: row.user_id,
    oneRepMax: row.one_rm ?? 0,
    bestWeight: row.weight ?? 0,
    bestReps: row.reps ?? 0,
    bestVolume: row.best_volume ?? 0,
    achievedAt: row.achieved_on,
  };
}

/**
 * Fetch the signed-in user's personal bests from `personal_bests`, best 1RM
 * first. RLS governs via auth.uid(); the user_id filter is for explicitness.
 */
export async function fetchPersonalBests(
  userId: string,
  limit = 100,
): Promise<PersonalBestItem[]> {
  const supabase = getBrowserClient();
  const { data, error } = await supabase
    .from("personal_bests")
    .select("id, exercise_id, exercise_name, user_id, one_rm, weight, reps, best_volume, achieved_on")
    .eq("user_id", userId)
    .order("one_rm", { ascending: false })
    .limit(limit);

  if (error) throw error;
  if (!data) return [];

  return (data as PersonalBestRow[]).map(mapRowToPersonalBest);
}
