// Workout history read API — fetches recent completed workouts from the SAME
// `workouts` table that persist.ts writes to. Pure read, no schema change.
// RLS governs via auth.uid() — the query filters by user_id for explicitness.

import { getBrowserClient } from "@/lib/supabase";
import type { Database } from "@/types/database";
import type { WorkoutBlock } from "../types";

type WorkoutRow = Database["public"]["Tables"]["workouts"]["Row"];

export interface WorkoutHistoryItem {
  id: string;
  name: string | null;
  performedAt: string;
  totalVolume: number;
  totalSets: number;
}

/**
 * Map a raw `workouts` row to a WorkoutHistoryItem.
 * Counts completed sets by parsing the `exercises` jsonb (WorkoutBlock[]).
 * Pure function — no Supabase import, testable in isolation.
 */
export function mapRowToHistoryItem(row: WorkoutRow): WorkoutHistoryItem {
  const blocks = Array.isArray(row.exercises)
    ? (row.exercises as unknown as WorkoutBlock[])
    : [];

  let totalSets = 0;
  for (const block of blocks) {
    if (block.kind === "straight") {
      totalSets += block.exercise.sets.filter((s) => s.completed).length;
    } else if (block.kind === "superset") {
      for (const ex of block.exercises) {
        totalSets += ex.sets.filter((s) => s.completed).length;
      }
    } else if (block.kind === "circuit") {
      for (const st of block.stations) {
        totalSets += st.sets.filter((s) => s.completed).length;
      }
    }
  }

  return {
    id: row.id,
    name: row.name,
    performedAt: row.performed_at,
    totalVolume: row.total_volume,
    totalSets,
  };
}

/**
 * Fetch the signed-in user's recent completed workouts from `workouts`.
 * RLS already governs via auth.uid(); the user_id filter is for explicitness.
 */
export async function fetchWorkoutHistory(
  userId: string,
  limit = 20,
): Promise<WorkoutHistoryItem[]> {
  const supabase = getBrowserClient();
  const { data, error } = await supabase
    .from("workouts")
    .select("id, name, performed_at, exercises, total_volume")
    .eq("user_id", userId)
    .order("performed_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  if (!data) return [];

  return (data as WorkoutRow[]).map(mapRowToHistoryItem);
}

/** A history workout with its raw blocks preserved (for PB + previous-set derivation). */
export interface WorkoutHistoryBlocks {
  id: string;
  performedAt: string;
  blocks: WorkoutBlock[];
}

/** Map a raw `workouts` row to a WorkoutHistoryBlocks. Pure — testable in isolation. */
export function mapRowToHistoryBlocks(row: WorkoutRow): WorkoutHistoryBlocks {
  return {
    id: row.id,
    performedAt: row.performed_at,
    blocks: Array.isArray(row.exercises)
      ? (row.exercises as unknown as WorkoutBlock[])
      : [],
  };
}

/**
 * Fetch the signed-in user's recent completed workouts WITH their raw blocks.
 * Feeds PB detection + the Previous column. RLS governs via auth.uid(); the
 * user_id filter is for explicitness. Read-only — no writes, no schema change.
 */
export async function fetchWorkoutHistoryWithBlocks(
  userId: string,
  limit = 50,
): Promise<WorkoutHistoryBlocks[]> {
  const supabase = getBrowserClient();
  const { data, error } = await supabase
    .from("workouts")
    .select("id, performed_at, exercises")
    .eq("user_id", userId)
    .order("performed_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  if (!data) return [];

  return (data as WorkoutRow[]).map(mapRowToHistoryBlocks);
}

/** A complete workout detail with all fields for the workout detail page. */
export interface WorkoutDetail {
  id: string;
  name: string | null;
  performedAt: string;
  totalVolume: number;
  totalSets: number;
  blocks: WorkoutBlock[];
  notes: string | null;
}

/** Map a raw `workouts` row to a WorkoutDetail. Pure — testable in isolation. */
export function mapRowToWorkoutDetail(row: WorkoutRow): WorkoutDetail {
  const blocks = Array.isArray(row.exercises)
    ? (row.exercises as unknown as WorkoutBlock[])
    : [];

  let totalSets = 0;
  for (const block of blocks) {
    if (block.kind === "straight") {
      totalSets += block.exercise.sets.filter((s) => s.completed).length;
    } else if (block.kind === "superset") {
      for (const ex of block.exercises) {
        totalSets += ex.sets.filter((s) => s.completed).length;
      }
    } else if (block.kind === "circuit") {
      for (const st of block.stations) {
        totalSets += st.sets.filter((s) => s.completed).length;
      }
    }
  }

  return {
    id: row.id,
    name: row.name,
    performedAt: row.performed_at,
    totalVolume: row.total_volume,
    totalSets,
    blocks,
    notes: row.notes,
  };
}

/**
 * Fetch a single workout by ID for the workout detail page.
 * RLS governs access via auth.uid(). Read-only — no writes, no schema change.
 */
export async function fetchWorkoutById(
  workoutId: string,
): Promise<WorkoutDetail | null> {
  const supabase = getBrowserClient();
  const { data, error } = await supabase
    .from("workouts")
    .select("id, name, performed_at, exercises, total_volume, notes, user_id")
    .eq("id", workoutId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }
  if (!data) return null;

  return mapRowToWorkoutDetail(data as WorkoutRow);
}
