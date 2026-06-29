# .pipeline/v2-workout-w2b/changes.md — Wave 2b Changes

## What
Superset + circuit block logging on /workout/active. Generalizes the store's set-actions to find
entries inside straight.exercise, superset.exercises[], AND circuit.stations[] via a mapEntry helper.
Adds SupersetCard + CircuitCard wrappers that reuse ExerciseCard/SetRow per entry.

## Files changed
- `src/features/workout-engine/stores/active-workout-store.ts` — mapEntry + entriesOfBlock helpers, refactored addSet/removeSet/updateSet to use mapEntry, generalized removeExercise, added addSupersetBlock/addCircuitBlock/removeBlock/addRound
- `src/features/workout-engine/components/ExerciseCard.tsx` — added optional hideAddSet prop (default false, preserves w2a)
- `src/features/workout-engine/components/SupersetCard.tsx` — NEW: thin wrapper rendering ExerciseCard per superset entry
- `src/features/workout-engine/components/CircuitCard.tsx` — NEW: thin wrapper rendering ExerciseCard per circuit station + Add Round footer
- `src/app/workout/active/page.tsx` — extended block map for superset/circuit, added AddBlockModal for block-type selection
- `src/features/workout-engine/stores/__tests__/active-workout-store.w2b.test.ts` — NEW: 15 store unit tests
- `tests/e2e/workout-superset-circuit.spec.ts` — NEW: 3 e2e tests

## Proof block
```
[ ] TYPES UNCHANGED: src/features/workout-engine/types.ts not edited (union already supports these kinds)
[ ] REUSE: no fork of ExerciseCard/SetRow — superset/circuit render the SAME components per entry
[ ] w2a UNCHANGED: straight-block logging + all w2a tests still green (mapEntry refactor is transparent)
[ ] G-13 totalVolume = SUM(weight*reps) across ALL entries of ALL blocks — never MAX
[ ] G-10 all new block/entry/set ids are uuid v4 · G-11 finishWorkout still await+retry persist
[ ] G-09 persist/rehydrate MERGES by id (add a superset, hard refresh, block still there)
[ ] fence held: only src/features/workout-engine/** + app/workout/active/page.tsx; programs + exercises.ts untouched
[ ] no apex-/canonical_user_id/password_hash strings (grep → 0)
[ ] tsc --noEmit clean · lint clean · vitest green · e2e green (--workers=1)
```

## Verification commands
- `npx tsc --noEmit` → 0 errors
- `npm run lint` → 0 errors (17 pre-existing warnings)
- `npx vitest run` → 24 files, 232 tests passed
- `npx playwright test --workers=1` → 13 tests passed
