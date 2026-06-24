// Volume computation (G-13): volume = SUM(weight*reps) across ALL sets/blocks, NEVER MAX.
// This fixes the v1 bug where total_volume recorded MAX. Cardio contributes 0 weight-volume.
// Pure module — no store / Supabase import.

import type {
  LoggedSet,
  ExerciseEntry,
  WorkoutBlock,
  CardioPayload,
} from "../types";

export function computeSetVolume(set: LoggedSet): number {
  if (!set.completed) return 0;
  if (set.weight == null || set.reps == null) return 0; // bodyweight/timed → 0 weight-volume
  return set.weight * set.reps;
}

function sumEntry(e: ExerciseEntry): number {
  return e.sets.reduce((acc, s) => acc + computeSetVolume(s), 0);
}

export function computeBlockVolume(block: WorkoutBlock): number {
  switch (block.kind) {
    case "straight":
      return sumEntry(block.exercise);
    case "superset":
      return block.exercises.reduce((a, e) => a + sumEntry(e), 0);
    case "circuit":
      return block.stations.reduce((a, e) => a + sumEntry(e), 0); // ALL rounds×stations
    case "cardio":
      return 0; // cardio has no weight-volume
  }
}

export function computeTotalVolume(blocks: WorkoutBlock[]): number {
  return blocks.reduce((a, b) => a + computeBlockVolume(b), 0); // SUM across blocks — never MAX
}

/**
 * Derive pace in seconds-per-kilometre from a cardio summary. Pace is DERIVED, never
 * stored (summary-tier law). Returns null when distance is missing/zero.
 * e.g. 1500m in 360s → 240 s/km (4:00/km).
 */
export function derivePace(cardio: CardioPayload): number | null {
  if (!cardio.distanceMeters || cardio.distanceMeters <= 0) return null;
  return cardio.durationSeconds / (cardio.distanceMeters / 1000);
}

/** Format seconds-per-km as "m:ss/km" (e.g. 240 → "4:00/km"). */
export function formatPace(secondsPerKm: number): string {
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}/km`;
}
