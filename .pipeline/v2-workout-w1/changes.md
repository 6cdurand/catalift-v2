# v2-workout-w1 — changes.md (Stage 2 CODE)

**Wave:** Workout-Engine Wave 1 — canonical logged-session data layer.
**Class:** A (types + pure logic, **NO migration** — `public.workouts` already exists).
**Branch:** `workout-w1-block-types` (from `main`).

## What was built

| File | Purpose |
|---|---|
| `src/features/workout-engine/types.ts` | Canonical `WorkoutBlock` discriminated union (straight/superset/circuit/cardio) + `LoggedWorkout` / `ExerciseEntry` / `LoggedSet` / `CardioPayload`. |
| `src/features/workout-engine/lib/volume.ts` | `computeSetVolume` / `computeBlockVolume` / `computeTotalVolume` — **SUM, never MAX (G-13)**; cardio = 0 weight-volume. Plus derived `derivePace` / `formatPace` (pace is DERIVED, never stored). |
| `src/features/workout-engine/lib/ids.ts` | `newId()` (uuid v4) + `isValidUuid()` + `assertValidWorkout()` walking the whole block/entry/set tree (G-10). |
| `src/features/workout-engine/lib/serialize.ts` | `toRow()` / `fromRow()` seam between `LoggedWorkout` and the `workouts` row (`blocks ↔ exercises`, `totalVolume ↔ total_volume`). `total_volume` recomputed on write; `fromRow` tolerates empty/legacy/missing `exercises` (G-09). |
| `src/features/workout-engine/__tests__/*.test.ts` | volume / circuit / cardio / ids / serialize unit tests (26 cases). |

## Step 0 — v1 grounding & reconciliation (maximum-reuse rule)

Grounded in v1 `src/types/index.ts`:
- `WorkoutSet` (v1): `weight?: number`, `reps?: number`, `completed: boolean`, `duration?: number`, `roundIndex?: number`.
- `WorkoutExercise` (v1): `sets: WorkoutSet[]`, `exerciseId`, `notes?`.

**Ported verbatim:** the critical field names `weight` / `reps` / `completed` are kept exactly so the verbatim-ported execution UI (w2) plugs in unchanged. `roundIndex` kept for circuit positioning.

**Intended divergences (only these), reconciled:**
1. **Volume = SUM not MAX (G-13).** v1's `Workout.totalVolume` recorded MAX; v2 always sums.
2. **cardio / circuit `kind`s (DQ-1).** v1 had no per-station-per-round circuit set model and no summary-tier cardio payload — REBUILT (`CardioPayload`, circuit `stations[].sets[]` addressed by `roundIndex`/`stationIndex`).
3. **uuid ids (G-10).** All ids are uuid v4; non-uuid ids (v1 `local-…`) are rejected before persist.

**Naming reconciliations (noted, not behavioural divergences):**
- v1 `WorkoutSet.duration` → canonical `LoggedSet.durationSeconds` (explicit unit; per spec TARGET shape).
- v1 `weight?/reps?` (`number | undefined`) → canonical `weight/reps: number | null` (per spec TARGET; `null` = bodyweight/assisted/timed).
- Column `workouts.exercises` is kept (NO rename migration) and treated as the `WorkoutBlock[]` payload.

## Schema touched?
**N.** No migration. `public.workouts` unchanged; serialize maps INTO existing `exercises` (jsonb) + `total_volume` (numeric).

## Proof block

```
[x] G-01 identity: workouts.user_id = auth.uid() (no canonical_user_id) — N/A schema unchanged; toRow maps userId → user_id
[x] G-10 all client-generated ids are valid uuid v4 (newId + assertValidWorkout walks blocks/entries/sets) ★
[x] G-13 volume = SUM(weight*reps) across ALL sets/blocks, never MAX ★
[x] G-09 fromRow tolerates empty/legacy/missing exercises:[] — never throws/wipes
[x] G-19 ported v1 block semantics; cardio/circuit REBUILT per dossier DQ-1 (intended divergence)
[x] NO localStorage in src/features/workout-engine/ (grep → 0)
[x] NO canonical_user_id / password_hash / apex- (grep → 0; no-legacy-auth.test.ts green)
[x] tsc + lint + unit + e2e all green ★
```

### Gate output (tails)
- `npx tsc --noEmit` → exit 0, no output.
- `npm run lint` → 0 errors (11 pre-existing warnings, none in workout-engine).
- `npm run test:unit` (vitest) → **126 passed (16 files)**; workout-engine = 26.
- `npm run test:e2e` (playwright) → **10 passed**.
- `grep -r "localStorage|canonical_user_id|password_hash|apex-" src/features/workout-engine/` → 0.

## Deviations from spec
- Added `derivePace` / `formatPace` helpers to `lib/volume.ts` to satisfy the spec's `cardio.test.ts` **pace-derived** case (pace stays DERIVED, never stored). No new files beyond the four listed.
- `assertValidWorkout` signature widened to `{ id: string; blocks: WorkoutBlock[] }` (spec had `blocks: unknown`) and implemented the full tree walk the spec's executor note + `ids.test.ts` require.
