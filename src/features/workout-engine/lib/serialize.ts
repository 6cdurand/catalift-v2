// Serialization seam between the canonical LoggedWorkout and the EXISTING public.workouts row.
// blocks ↔ exercises (jsonb), totalVolume ↔ total_volume. NO migration: the column stays named
// `exercises` and carries the WorkoutBlock[] payload. total_volume is recomputed on every write
// (single source of truth, G-13). fromRow tolerates legacy/empty exercises:[] (G-09 spirit).
// Pure module — no store / Supabase import.

import type { Database, Json } from "@/types/database";
import type {
  LoggedWorkout,
  WorkoutBlock,
  ExerciseEntry,
  StraightBlockType,
} from "../types";
import { computeTotalVolume } from "./volume";
import { newId } from "./ids";

const STRAIGHT_BLOCK_TYPES: readonly StraightBlockType[] = [
  "warmup",
  "strength",
  "cooldown",
];

function isStraightBlockType(v: unknown): v is StraightBlockType {
  return typeof v === "string" && (STRAIGHT_BLOCK_TYPES as readonly string[]).includes(v);
}

/**
 * Upgrade ONE persisted block to the current WorkoutBlock shape (v1-parity migration).
 *
 * The only shape change is the straight block: legacy rows were
 * `{ kind:"straight", exercise: E }` (single exercise, no type). They are upgraded to
 * `{ kind:"straight", blockType:"strength", exercises:[E] }`. Blocks already in the new
 * shape pass through (with a defaulted `blockType`). superset / circuit / cardio are
 * returned untouched. MUST NEVER THROW — malformed input yields `null` (dropped by
 * `upgradeBlocks`). No schema change: the jsonb column stays `exercises`.
 */
export function upgradeBlock(raw: unknown): WorkoutBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;

  if (b.kind === "straight") {
    const id = typeof b.id === "string" ? b.id : newId();
    const blockType = isStraightBlockType(b.blockType) ? b.blockType : "strength";

    // Already-new shape: { exercises: E[] }
    if (Array.isArray(b.exercises)) {
      return { id, kind: "straight", blockType, exercises: b.exercises as ExerciseEntry[] };
    }
    // Legacy shape: { exercise: E } → wrap into exercises:[E]
    if (b.exercise && typeof b.exercise === "object") {
      return {
        id,
        kind: "straight",
        blockType,
        exercises: [b.exercise as ExerciseEntry],
      };
    }
    // Malformed straight block → keep it as an empty typed container (never throw).
    return { id, kind: "straight", blockType, exercises: [] };
  }

  // superset / circuit / cardio (and anything else) — passthrough unchanged.
  return raw as WorkoutBlock;
}

/**
 * Upgrade a raw jsonb `exercises` payload (unknown) into a WorkoutBlock[].
 * Tolerates non-arrays / legacy / undefined (returns []). Used by fromRow AND by every
 * history read path (fetch-history) so downstream code only ever sees the new shape.
 */
export function upgradeBlocks(raw: unknown): WorkoutBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((b) => upgradeBlock(b))
    .filter((b): b is WorkoutBlock => b !== null);
}

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
  // Upgrade legacy straight blocks ({exercise} → {blockType,exercises[]}) on read.
  // Tolerates []/legacy/undefined — never throws (G-09).
  const blocks = upgradeBlocks(row.exercises);
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
