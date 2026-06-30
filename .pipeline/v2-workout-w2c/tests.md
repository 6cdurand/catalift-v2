# .pipeline/v2-workout-w2c/tests.md — Stage 3 (TEST)

## Unit tests — `src/features/workout-engine/stores/__tests__/active-workout-store.w2c.test.ts`

```
[x] addCardioBlock creates a cardio block with uuid id, correct exerciseId/exerciseName/cardio
[x] updateCardio patches the cardio payload on the matching block (immutable merge)
[x] updateCardio does not affect other blocks
[x] removeBlock removes a cardio block by id
[x] removeBlock removes a straight block by id (generic)
[x] removeBlock does not remove other blocks
[x] addCardioBlock + finishWorkout: totalVolume = 0 from cardio (G-13, cardio contributes 0)
[x] addCardioBlock + straight set + finishWorkout: totalVolume = SUM from straight only (cardio = 0)
[x] all ids are uuid v4 (G-10); finishWorkout still round-trips via toRow/fromRow
```

## E2E tests — `tests/e2e/workout-cardio.spec.ts`

```
[x] add cardio (Treadmill, 30 min, 5 km, 300 cal) → cardio card appears with values
[x] edit duration → value updates → finish saves
[x] reload → cardio block rehydrates (G-09 persist)
[x] cardio + straight set in same workout → finish saves → totalVolume = straight only (cardio = 0)
```

## Verification commands
```bash
npx vitest run src/features/workout-engine/stores/__tests__/active-workout-store.w2c.test.ts
npx vitest run src/features/workout-engine/stores/__tests__/active-workout-store.test.ts  # w2a regression
npx tsc --noEmit
npm run lint
npx playwright test tests/e2e/workout-cardio.spec.ts
npx playwright test tests/e2e/workout-straight-set.spec.ts  # w2a regression
```

## Regression notes
- w2a unit tests (`active-workout-store.test.ts`) are expected to pass unchanged — no straight-block code was modified.
- w2a e2e (`workout-straight-set.spec.ts`) is expected to pass — the "Add Exercise" button and straight-set flow are unchanged.
- `computeTotalVolume` and `computeBlockVolume` in `lib/volume.ts` already handle cardio (returns 0) — no change needed.
