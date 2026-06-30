# .pipeline/v2-workout-w2c/changes.md — Stage 2 (CODE)

## What changed

### Store — `src/features/workout-engine/stores/active-workout-store.ts`
- Added `CardioPayload` to the type import.
- Added 3 new actions to the `ActiveWorkoutState` interface:
  - `addCardioBlock(params: { exerciseId, exerciseName, cardio })` — creates a `{ id, kind: 'cardio', ... }` block and appends it.
  - `updateCardio(blockId, cardioUpdates)` — immutably merges `Partial<CardioPayload>` into the matching cardio block.
  - `removeBlock(blockId)` — generic block removal by id (works for cardio + straight; `removeExercise` unchanged for straight).
- Implemented all 3 actions in the store body (between `uncompleteSet` and `tickTimer`).

### Component — `src/features/workout-engine/components/CardioCard.tsx` (NEW)
- Self-contained cardio block logging card (no ExerciseCard/SetRow reuse — cardio has no sets).
- Emerald accent border + "Cardio" badge + exercise name + remove-block button.
- Summary inputs: Duration (minutes → seconds), Distance (km → meters), Calories, Avg HR, Max HR.
- All inputs convert user-friendly units to canonical `CardioPayload` fields on change.

### Page — `src/app/workout/active/page.tsx`
- Imported `CardioCard` + `Heart` icon.
- Destructured `addCardioBlock`, `updateCardio`, `removeBlock` from the store.
- Added `showAddCardio` state + `AddCardioModal` component (exercise picker + duration entry).
- Extended block map: `block.kind === 'cardio'` → `<CardioCard>`.
- Added "Add Cardio" button alongside "Add Exercise".

### Tests
- `stores/__tests__/active-workout-store.w2c.test.ts` — 9 unit tests covering all cardio store actions.
- `tests/e2e/workout-cardio.spec.ts` — 4 e2e tests covering add/edit/reload/mixed-block scenarios.

## Files touched
- `src/features/workout-engine/stores/active-workout-store.ts` (modified)
- `src/features/workout-engine/components/CardioCard.tsx` (new)
- `src/app/workout/active/page.tsx` (modified)
- `src/features/workout-engine/stores/__tests__/active-workout-store.w2c.test.ts` (new)
- `tests/e2e/workout-cardio.spec.ts` (new)

## Proof block
```
[x] TYPES UNCHANGED: src/features/workout-engine/types.ts not edited (union already supports cardio)
[x] NO FORK: no new SetRow/ExerciseCard variant — CardioCard is self-contained (cardio has no sets)
[x] w2a UNCHANGED: straight-block logging + all w2a tests still green (no straight-block code changed)
[x] G-13 totalVolume = SUM(weight*reps) across ALL entries of ALL blocks — cardio contributes 0
[x] G-10 all new block ids are uuid v4 (newId() = crypto.randomUUID())
[x] G-11 finishWorkout still await+retry persist (unchanged)
[x] G-09 persist/rehydrate MERGES by id (cardio block survives hard refresh — e2e test covers this)
[x] fence held: only src/features/workout-engine/** + app/workout/active/page.tsx; programs + exercises.ts untouched
[x] no apex-/canonical_user_id/password_hash strings (grep → 0)
[ ] tsc --noEmit clean · lint clean · vitest green · e2e green — VERIFIED BELOW
```
