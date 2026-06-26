# .pipeline/v2-workout-w1/spec.md — Stage 1 (PLAN)

> **Workout-Engine Wave 1 = the canonical logged-session data layer.** Defines the ONE
> `WorkoutBlock` discriminated union (straight / superset / circuit / cardio), the volume
> computation (SUM, G-13), the UUID guard (G-10), and the (de)serialization seam onto the
> EXISTING `public.workouts` table. NO UI, NO execution screen in this wave (that's w2).
> Authored by command-center (Opus 4.8). **Place at `catalift-v2/.pipeline/v2-workout-w1/spec.md`.**

**Class:** **A (types + pure logic, NO migration — `workouts` already exists).** Foundational
canonical shape → review carefully, but no schema/RLS change.
**Executor model:** **Opus 4.8** (canonical type design + core logic + tests).
**Repo:** catalift-v2 · **Branch:** `workout-w1-block-types` (from `main`) · open a PR.

---

## Why there is NO migration in this wave

The live v2 `public.workouts` table ALREADY exists (verified via MCP 2026-06-24):

```
workouts(id uuid pk, user_id uuid fk→users.id, name text, performed_at timestamptz,
         total_volume numeric default 0  -- "SUM(weight*reps) across ALL sets. v1 bug recorded MAX",
         exercises jsonb default '[]', notes text, created_at, updated_at)   RLS enabled
```

So w1 does NOT touch the DB. It defines the **canonical TypeScript shape** that serializes INTO
`workouts.exercises` (the block array) + `workouts.total_volume` (the SUM). Column name `exercises`
is kept as-is (no rename migration); treat it as the `WorkoutBlock[]` payload.

> A later wave (w3 results) MAY add a cardio-PB path / `personal_bests` columns — NOT now.

---

## What this wave does

1. **`src/features/workout-engine/types.ts`** — the canonical `WorkoutBlock` discriminated union +
   `LoggedWorkout`, `ExerciseEntry`, `LoggedSet`, `CardioPayload`.
2. **`src/features/workout-engine/lib/volume.ts`** — `computeSetVolume` / `computeBlockVolume` /
   `computeTotalVolume` — **SUM, never MAX (G-13)**; cardio contributes 0 weight-volume.
3. **`src/features/workout-engine/lib/ids.ts`** — `newId()` (uuid v4) + `assertValidWorkout()` UUID
   guard (G-10) run before any persist.
4. **`src/features/workout-engine/lib/serialize.ts`** — `toRow(workout)` / `fromRow(row)` — the seam
   between `LoggedWorkout` and the `workouts` row (`blocks ↔ exercises`, `totalVolume ↔ total_volume`).
   `fromRow` tolerates legacy/empty `exercises: []` without crashing (G-09 spirit).
5. **Unit tests** for all of the above (see test list).

**NOT in this wave:** the execution UI/screen, rest timers, the active-workout bar, set-logging
interactions, PB detection, strength rating — those are w2/w3/w4.

---

## ⚠️ STEP 0 — GROUND IN v1, do NOT greenfield (maximum-reuse rule)

**Before writing any types, read v1's existing workout/session/set types** (v1 `src/types/index.ts` —
the logged-workout / completed-set shapes; e.g. `ProgramExercise`, `ProgramBlock`, and whatever shape
the v1 active-session / `workouts.exercises` payload uses) **AND the shape the ported workout UI expects**
(v1 `app/workout/*`, set-row components, `ExerciseImage`). Per `v1_to_v2_reuse_map.md` §B
("port `src/types/*`, align to v2 `database.ts`"): **PORT v1's field names/shape verbatim and only EXTEND
for the cardio/circuit `kind`s.** The types below are the TARGET shape — if v1 already names a field
differently (e.g. its own `weight`/`reps`/`completed` keys or nesting), **keep v1's names** so the
verbatim-ported UI plugs in UNCHANGED. The ONLY intended divergences from v1 are: volume = SUM not MAX
(G-13), the cardio/circuit block `kind`s (DQ-1), and uuid ids (G-10). Reconcile any divergence in `changes.md`.

## Canonical types (`src/features/workout-engine/types.ts`) — TARGET shape (align field names to v1)

```ts
// The ONE canonical logged-session shape. Builder (Box 2) prescribes blocks of these kinds;
// the execution screen (w2) logs into this shape; the trainer review reads the SAME shape (parity law).
// NOTE: align these field names to v1's existing set/exercise types so the ported UI consumes them as-is.

export type BlockKind = 'straight' | 'superset' | 'circuit' | 'cardio';

/** A single performed set (resistance or timed). */
export interface LoggedSet {
  id: string;                 // uuid v4 (G-10)
  weight: number | null;      // kg canonical; null = bodyweight / assisted
  reps: number | null;
  completed: boolean;
  durationSeconds?: number;   // for timed sets (e.g. plank, timed circuit station)
  // circuit positioning — present ONLY when this set belongs to a circuit station:
  roundIndex?: number;        // 0-based round
  stationIndex?: number;      // 0-based station within the circuit
}

export interface ExerciseEntry {
  id: string;                 // uuid
  exerciseId: string;         // ref into exercises.ts library
  exerciseName: string;
  sets: LoggedSet[];
  notes?: string;
}

/**
 * Cardio summary payload (summary-tier only — NOT per-second telemetry).
 * Fields map 1:1 to Apple HealthKit HKWorkout + Android Health Connect ExerciseSessionRecord,
 * so future device ingest (Box 6) is a mapping layer with NO schema change. pace is DERIVED.
 */
export interface CardioPayload {
  durationSeconds: number;    // REQUIRED
  distanceMeters?: number;
  calories?: number;
  avgHr?: number;
  maxHr?: number;
}

export type WorkoutBlock =
  | { id: string; kind: 'straight'; exercise: ExerciseEntry }
  | { id: string; kind: 'superset'; exercises: ExerciseEntry[] }
  | { id: string; kind: 'circuit';  rounds: number; stations: ExerciseEntry[]; restSeconds?: number }
  | { id: string; kind: 'cardio';   exerciseId: string; exerciseName: string; cardio: CardioPayload };

export interface LoggedWorkout {
  id: string;                 // uuid → workouts.id
  userId: string;             // → workouts.user_id (= auth.uid(), G-01)
  name: string | null;
  performedAt: string;        // ISO → workouts.performed_at
  blocks: WorkoutBlock[];     // → workouts.exercises (jsonb)
  totalVolume: number;        // → workouts.total_volume  (SUM, G-13)
  notes?: string | null;
}
```

**Circuit = the v1 fix.** A circuit station's `sets[]` holds ONE `LoggedSet` per round
(`roundIndex`/`stationIndex` set), so weight & reps ARE tracked per station per round — the thing
v1 could not do. A timed station uses `durationSeconds` instead of weight/reps.

---

## Volume computation (`src/features/workout-engine/lib/volume.ts`) — G-13

```ts
import { LoggedSet, ExerciseEntry, WorkoutBlock } from '../types';

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
    case 'straight': return sumEntry(block.exercise);
    case 'superset': return block.exercises.reduce((a, e) => a + sumEntry(e), 0);
    case 'circuit':  return block.stations.reduce((a, e) => a + sumEntry(e), 0); // ALL rounds×stations
    case 'cardio':   return 0; // cardio has no weight-volume
  }
}

export function computeTotalVolume(blocks: WorkoutBlock[]): number {
  return blocks.reduce((a, b) => a + computeBlockVolume(b), 0); // SUM across blocks — never MAX
}
```

## ID guard (`src/features/workout-engine/lib/ids.ts`) — G-10

```ts
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function newId(): string { return crypto.randomUUID(); }
export function isValidUuid(id: string): boolean { return UUID_RE.test(id); }

/** Throw before persisting if any id is not a valid uuid (v1 22P02 wipe-on-reload class). */
export function assertValidWorkout(w: { id: string; blocks: unknown }): void {
  if (!isValidUuid(w.id)) throw new Error(`Invalid workout id: ${w.id}`);
  // (executor: also walk blocks/entries/sets and assert each .id — see tests)
}
```

## Serialization seam (`src/features/workout-engine/lib/serialize.ts`)

```ts
import { LoggedWorkout, WorkoutBlock } from '../types';
import { computeTotalVolume } from './volume';

// workouts row shape from generated database.ts
export function toRow(w: LoggedWorkout) {
  return {
    id: w.id,
    user_id: w.userId,
    name: w.name,
    performed_at: w.performedAt,
    exercises: w.blocks as unknown,          // jsonb
    total_volume: computeTotalVolume(w.blocks), // recompute on write — single source of truth
    notes: w.notes ?? null,
  };
}

export function fromRow(row: any): LoggedWorkout {
  const blocks = Array.isArray(row.exercises) ? (row.exercises as WorkoutBlock[]) : []; // tolerate []/legacy
  return {
    id: row.id, userId: row.user_id, name: row.name ?? null,
    performedAt: row.performed_at, blocks,
    totalVolume: typeof row.total_volume === 'number' ? row.total_volume : computeTotalVolume(blocks),
    notes: row.notes ?? null,
  };
}
```

---

## Guardrails (paste into proof block)
```
[ ] G-01 identity: workouts.user_id = auth.uid() (no canonical_user_id) — N/A schema unchanged, assert in serialize
[ ] G-10 all client-generated ids are valid uuid v4 (newId + assertValidWorkout) ★
[ ] G-13 volume = SUM(weight*reps) across ALL sets/blocks, never MAX ★
[ ] G-09 fromRow tolerates empty/legacy exercises:[] — never throws/wipes
[ ] G-19 ported v1 block semantics; cardio/circuit REBUILT per dossier DQ-1 (intended divergence)
[ ] NO localStorage in src/features/workout-engine/ (grep)
[ ] NO canonical_user_id / password_hash / apex- (grep — existing CI guard)
[ ] tsc + lint + unit + e2e all green ★
```

## Acceptance criteria
- [ ] `src/features/workout-engine/types.ts` exports the union + interfaces above.
- [ ] `lib/volume.ts`, `lib/ids.ts`, `lib/serialize.ts` exist and are pure (no store/Supabase import).
- [ ] NO migration in this PR (schema unchanged); `workouts.exercises` is the block payload.
- [ ] NO `localStorage` in `src/features/workout-engine/` (grep proof).
- [ ] `tsc --noEmit` clean · `npm run lint` clean.
- [ ] All listed unit tests pass; existing v2 unit + e2e still green.
- [ ] PR opened with proof block filled in `changes.md`.

## Tests the Tester stage must write (→ `tests.md`)

### `volume.test.ts` — THE critical file (G-13)
- **straight-sum:** one exercise, sets [100×5, 100×5, 90×8] all completed → 1000 + 720 = **1720** (SUM).
- **not-max regression:** sets [100×5=500, 50×5=250] → **750**, NOT 500. [v1 MAX bug]
- **incomplete-excluded:** an uncompleted set contributes 0.
- **bodyweight-null:** weight=null → 0 volume, no NaN.
- **superset-sum:** two exercises in a superset → sum of both.
- **circuit-sum:** 3 rounds × 2 stations, each round a set → all 6 sets summed.
- **cardio-zero:** a cardio block → block volume 0; total ignores it.
- **mixed-total:** straight + cardio + circuit → total = straight + circuit (+0 cardio).

### `circuit.test.ts` — the v1 fix
- **per-station-per-round:** a circuit with rounds=3, 2 stations → each station has 3 LoggedSets
  addressable by (roundIndex 0..2, stationIndex) and each carries weight+reps.
- **timed-station:** a station logged by `durationSeconds` (no weight/reps) → valid, 0 weight-volume.

### `cardio.test.ts`
- **requires-duration:** a cardio payload without `durationSeconds` is a type error / rejected by validator.
- **pace-derived:** helper derives pace = duration/distance (e.g. 1500m in 360s → 4:00/km) — pace NOT stored.
- **optional-fields:** distance/calories/avgHr/maxHr all omittable.

### `ids.test.ts` — G-10
- **valid:** `newId()` passes `isValidUuid`.
- **reject:** `assertValidWorkout` throws on a non-uuid id (e.g. `"local-123"`). [v1 22P02 class]

### `serialize.test.ts`
- **round-trip:** `fromRow(toRow(w))` deep-equals `w` (totalVolume recomputed).
- **legacy-empty:** `fromRow({exercises: []})` → blocks=[], totalVolume=0, no throw (G-09).
- **write-recomputes:** `toRow` sets `total_volume` from the blocks, ignoring any stale input value.

### grep-guards
- `grep -r "localStorage" src/features/workout-engine/` → 0.
- existing `no-legacy-auth.test.ts` still passes (no `canonical_user_id`/`apex-`/`password_hash`).

---

## Stage hand-off checklist
- [x] **Stage 1 PLAN** — this file. Christo: paste into `catalift-v2/.pipeline/v2-workout-w1/spec.md`.
- [ ] **Stage 2 CODE** (Opus 4.8) — build types + lib; fill `changes.md`; open PR.
- [ ] **Stage 3 TEST** (Opus 4.8) — write listed tests; run gates; fill `tests.md`.
- [ ] **Stage 4 REVIEW** (fresh read-only Cascade) — `review-pr` skill vs this spec → `review.md`.
- [ ] **Christo sign-off** (Class A — but it's the canonical shape everything depends on; eyeball it).
- [ ] **Merge.**

---

## Christo's paste-ready prompt

> **Set this Cascade to Opus 4.8.**
>
> Read the spec at `.pipeline/v2-workout-w1/spec.md`. This is Workout-Engine Wave 1: the canonical
> logged-session data layer. **Class A — NO migration** (`public.workouts` already exists; you
> serialize INTO its `exercises` jsonb + `total_volume`). Steps:
> 0. **Ground in v1 FIRST (Step 0 in the spec):** read v1's existing workout/session/set types
>    (`src/types/index.ts`) + the shape the ported workout UI expects. PORT v1's field names verbatim
>    and only EXTEND for the `circuit` + `cardio` kinds — do NOT invent a parallel shape. Keep v1's
>    `weight`/`reps`/`completed` names so the ported UI plugs in unchanged. Note reconciliation in `changes.md`.
> 1. Create `src/features/workout-engine/types.ts` — the `WorkoutBlock` discriminated union
>    (straight/superset/circuit/cardio) + `LoggedWorkout`/`ExerciseEntry`/`LoggedSet`/`CardioPayload`
>    as in the spec, with field names aligned to v1 per Step 0.
> 2. Create `lib/volume.ts` (SUM not MAX — G-13), `lib/ids.ts` (uuid guard — G-10),
>    `lib/serialize.ts` (toRow/fromRow seam onto the workouts row).
> 3. Write ALL listed unit tests (volume incl. the not-MAX regression, circuit per-round/station,
>    cardio duration-required + pace-derived, ids reject non-uuid, serialize round-trip + legacy-empty).
> 4. Run all gates (`tsc + lint + unit + e2e`). Open a PR. Fill in `changes.md`.
> 5. NO migration. NO localStorage. Keep cardio fields HealthKit/Health-Connect aligned (do not add
>    per-second telemetry — summary tier only).
