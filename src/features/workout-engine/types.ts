// The ONE canonical logged-session shape (Workout-Engine Wave 1).
// Builder (Box 2) prescribes blocks of these kinds; the execution screen (w2) logs into this
// shape; the trainer review reads the SAME shape (parity law). Field names are aligned to v1's
// existing set/exercise types (`weight`/`reps`/`completed`) so the verbatim-ported UI consumes
// them unchanged. Intended divergences from v1: volume = SUM not MAX (G-13), the cardio/circuit
// block kinds (DQ-1), and uuid ids (G-10). See .pipeline/v2-workout-w1/changes.md.

export type BlockKind = "straight" | "superset" | "circuit" | "cardio";

/**
 * A drop-set sub-row (faithful port of v1 active/page.tsx set.drops[], :6383).
 * Lighter sub-work performed immediately after the parent working set (reduce load,
 * keep repping). DQ-1 §5 additive jsonb field — no SQL migration; legacy rows without
 * `drops` parse fine.
 *
 * Volume: each drop's weight×reps DOES count toward total volume (G-13, real tonnage).
 * PB/e1RM: drops NEVER feed calculate1RM / PB detection — only the parent working set
 * can set a PB. See history-stats.toStatsWorkout (drops deliberately not mapped).
 */
export interface DropSet {
  id: string; // uuid v4 (G-10)
  weight: number; // kg
  reps: number;
}

/** A single performed set (resistance or timed). */
export interface LoggedSet {
  id: string; // uuid v4 (G-10)
  weight: number | null; // kg canonical; null = bodyweight / assisted
  reps: number | null;
  completed: boolean;
  durationSeconds?: number; // for timed sets (e.g. plank, timed circuit station)
  // circuit positioning — present ONLY when this set belongs to a circuit station:
  roundIndex?: number; // 0-based round
  stationIndex?: number; // 0-based station within the circuit
  // w2a additions — tap-to-fill UX:
  previousWeight?: number | null; // drives placeholder in set row
  previousReps?: number | null; // drives placeholder in set row
  setNumber: number; // 1-based display index
  // Drop-set sub-rows (v1 :1322 handleAddDropSet). Additive (DQ-1 §5). Counts toward
  // volume (G-13); excluded from PB/e1RM.
  drops?: DropSet[];
}

export interface ExerciseEntry {
  id: string; // uuid
  exerciseId: string; // ref into exercises.ts library
  exerciseName: string;
  sets: LoggedSet[];
  notes?: string;
}

/**
 * Cardio summary payload (summary-tier only — NOT per-second telemetry).
 * Fields map 1:1 to Apple HealthKit HKWorkout + Android Health Connect
 * ExerciseSessionRecord, so future device ingest (Box 6) is a mapping layer with
 * NO schema change. pace is DERIVED (see lib/volume — derivePace), never stored.
 */
export interface CardioPayload {
  durationSeconds: number; // REQUIRED
  distanceMeters?: number;
  calories?: number;
  avgHr?: number;
  maxHr?: number;
}

export type WorkoutBlock =
  | { id: string; kind: "straight"; exercise: ExerciseEntry }
  | { id: string; kind: "superset"; exercises: ExerciseEntry[] }
  | {
      id: string;
      kind: "circuit";
      rounds: number;
      stations: ExerciseEntry[];
      restSeconds?: number;
    }
  | {
      id: string;
      kind: "cardio";
      exerciseId: string;
      exerciseName: string;
      cardio: CardioPayload;
    };

export interface LoggedWorkout {
  id: string; // uuid → workouts.id
  userId: string; // → workouts.user_id (= auth.uid(), G-01)
  name: string | null;
  performedAt: string; // ISO → workouts.performed_at
  blocks: WorkoutBlock[]; // → workouts.exercises (jsonb)
  totalVolume: number; // → workouts.total_volume  (SUM, G-13)
  notes?: string | null;
}
