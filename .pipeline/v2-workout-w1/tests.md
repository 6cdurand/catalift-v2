# v2-workout-w1 — tests.md (Stage 3 TEST)

All tests live in `src/features/workout-engine/__tests__/` and run under vitest.
Run: `npm run test:unit` → **126 passed (16 files)**; workout-engine subset = **26 passed**.

## `volume.test.ts` — THE critical file (G-13) — 12 cases
- **straight-sum:** [100×5, 100×5, 90×8] all completed → **1720** (SUM).
- **not-max regression:** [100×5=500, 50×5=250] → **750**, asserted `not 500`. [v1 MAX bug]
- **incomplete-excluded:** uncompleted set contributes 0.
- **bodyweight-null:** `weight=null` → 0 volume, `Number.isNaN` false.
- **null-reps:** `reps=null` → 0.
- **superset-sum:** two exercises → sum of both (900).
- **circuit-sum:** 3 rounds × 2 stations, one set/round → all 6 summed (1500).
- **cardio-zero:** cardio block → 0.
- **mixed-total:** straight + cardio + circuit → straight + circuit (+0 cardio) = 900.
- (+ `computeSetVolume` unit cases: completed mult, incomplete, null weight, null reps.)

## `circuit.test.ts` — the v1 fix — 2 cases
- **per-station-per-round:** rounds=3, 2 stations → each station has 3 `LoggedSet`s addressable by (`roundIndex` 0..2, `stationIndex`), each carrying numeric weight+reps.
- **timed-station:** station logged by `durationSeconds` (weight/reps null) → valid, block volume 0.

## `cardio.test.ts` — 4 cases
- **requires-duration:** `@ts-expect-error` proves a `CardioPayload` without `durationSeconds` fails to type-check.
- **pace-derived:** 1500m in 360s → `derivePace` = 240 s/km, `formatPace` = "4:00/km"; payload has no `pace` field (DERIVED, not stored).
- **pace-null:** no distance → `derivePace` returns null.
- **optional-fields:** distance/calories/avgHr/maxHr all omittable.

## `ids.test.ts` — G-10 — 4 cases
- **valid:** `newId()` passes `isValidUuid`.
- **reject (workout):** `assertValidWorkout({ id: "local-123" })` throws. [v1 22P02 class]
- **reject (nested set):** non-uuid set id deep in a block → throws.
- **pass (full tree):** all-uuid circuit workout → does not throw.

## `serialize.test.ts` — 4 cases
- **round-trip:** `fromRow(toRow(w))` deep-equals `w` (totalVolume recomputed).
- **legacy-empty:** `fromRow({ exercises: [] })` → blocks=[], totalVolume=0, no throw (G-09).
- **legacy-missing:** `fromRow({})` → no throw, blocks=[].
- **write-recomputes:** `toRow` sets `total_volume` from blocks (1400), ignoring a stale 999999 input.

## grep-guards
- `grep -r "localStorage" src/features/workout-engine/` → **0**.
- `no-legacy-auth.test.ts` still green (no `canonical_user_id` / `apex-` / `password_hash`).
