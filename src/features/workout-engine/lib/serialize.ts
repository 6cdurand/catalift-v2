// Serialization seam between the canonical LoggedWorkout and the EXISTING public.workouts row.
// blocks ↔ exercises (jsonb), totalVolume ↔ total_volume. NO migration: the column stays named
// `exercises` and carries the WorkoutBlock[] payload. total_volume is recomputed on every write
// (single source of truth, G-13). fromRow tolerates legacy/empty exercises:[] (G-09 spirit).
// Pure module — no store / Supabase import.

import type { Database, Json } from "@/types/database";
import type { LoggedWorkout, WorkoutBlock } from "../types";
import { computeTotalVolume } from "./volume";

type WorkoutInsert = Database["public"]["Tables"]["workouts"]["Insert"];

/** A workouts row as it may arrive from the DB — fields optional/loose to tolerate legacy rows. */
export interface WorkoutRowInput {
  id?: string;
  user_id?: string;
  name?: string | null;
  performed_at?: string;
  exercises?: unknown;
  total_volume?: unknown;
  notes?: string | null;
}

export function toRow(w: LoggedWorkout): WorkoutInsert {
  return {
    id: w.id,
    user_id: w.userId,
    name: w.name,
    performed_at: w.performedAt,
    exercises: w.blocks as unknown as Json, // jsonb payload
    total_volume: computeTotalVolume(w.blocks), // recompute on write — single source of truth
    notes: w.notes ?? null,
  };
}

export function fromRow(row: WorkoutRowInput): LoggedWorkout {
  const blocks = Array.isArray(row.exercises)
    ? (row.exercises as WorkoutBlock[])
    : []; // tolerate []/legacy/undefined — never throw (G-09)
  return {
    id: row.id ?? "",
    userId: row.user_id ?? "",
    name: row.name ?? null,
    performedAt: row.performed_at ?? "",
    blocks,
    totalVolume:
      typeof row.total_volume === "number"
        ? row.total_volume
        : computeTotalVolume(blocks),
    notes: row.notes ?? null,
  };
}
