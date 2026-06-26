// UUID generation + guard (G-10). Run assertValidWorkout() before any persist so a
// non-uuid id (e.g. v1's "local-123") can never reach Postgres and trigger the 22P02
// "invalid input syntax for type uuid" wipe-on-reload class of bug.

import type { WorkoutBlock, ExerciseEntry } from "../types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function newId(): string {
  return crypto.randomUUID();
}

export function isValidUuid(id: unknown): boolean {
  return typeof id === "string" && UUID_RE.test(id);
}

function assertId(id: string, label: string): void {
  if (!isValidUuid(id)) throw new Error(`Invalid ${label} id: ${String(id)}`);
}

function assertEntry(entry: ExerciseEntry, label: string): void {
  assertId(entry.id, label);
  for (const set of entry.sets) assertId(set.id, `${label} set`);
}

function assertBlock(block: WorkoutBlock): void {
  assertId(block.id, "block");
  switch (block.kind) {
    case "straight":
      assertEntry(block.exercise, "exercise");
      break;
    case "superset":
      for (const e of block.exercises) assertEntry(e, "exercise");
      break;
    case "circuit":
      for (const s of block.stations) assertEntry(s, "station");
      break;
    case "cardio":
      break; // cardio carries no ExerciseEntry/LoggedSet ids
  }
}

/**
 * Throw before persisting if the workout id or ANY nested block/entry/set id is not a
 * valid uuid v4 (v1 22P02 wipe-on-reload class). Walks the whole tree.
 */
export function assertValidWorkout(w: {
  id: string;
  blocks: WorkoutBlock[];
}): void {
  assertId(w.id, "workout");
  for (const block of w.blocks) assertBlock(block);
}
