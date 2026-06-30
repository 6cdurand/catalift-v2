# .pipeline/v2-workout-w2c/spec.md — Stage 1 (PLAN)

> **Workout-Engine Wave 2c = CARDIO block logging.** w2a shipped the straight-set execution screen;
> the canonical `WorkoutBlock` union (w1) already defines `cardio` with a `CardioPayload`, but the
> store + page only handle `straight`. w2c makes the execution screen log cardio blocks —
> duration/distance/calories summary inputs, NO sets (cardio is a summary-tier payload, not per-set
> logging). Authored by command-center, grounded in the LIVE v2 w2a code. **Place at
> `catalift-v2/.pipeline/v2-workout-w2c/spec.md`.**

**Class:** **A (UI + Zustand store, NO migration, NO auth).** `workouts` exists; the jsonb `blocks`
column already round-trips all four kinds (w1 serialize). Cardio contributes 0 weight-volume (G-13).
**Executor model:** **GLM 5.2** (UI assembly on established patterns). Opus 4.8 acceptable.
**Repo:** catalift-v2 · **Branch:** `workout-w2c-cardio-logging` (from `main`) · open a PR, never merge.
**Fence (write-set):** `src/features/workout-engine/**` + `src/app/workout/active/page.tsx`.
**Disjoint from the calendar lane (`src/features/calendar`) → parallel-safe.** Do NOT touch
`src/features/programs/**` or `src/lib/exercises.ts` (import only).

**OUT OF SCOPE (→ separate Opus wave):** drop-sets, timed sets, unilateral L/R toggle, assisted-exercise
logic. w2c is cardio block logging ONLY — duration/distance/calories/HR summary inputs.

---

## STEP 0 — Ground in the EXISTING v2 code (this is an EXTENSION, not a rewrite)

Read these first (already on `main`):
- `src/features/workout-engine/types.ts` — the `WorkoutBlock` union (below). **Do not change the types**;
  they already support cardio.
- `src/features/workout-engine/stores/active-workout-store.ts` — w2a store. Its actions currently
  match ONLY `block.kind === 'straight'`. **The core of w2c is adding cardio block creation + editing.**
- `src/features/workout-engine/components/ExerciseCard.tsx` — **DO NOT reuse for cardio**; cardio has
  no sets. A new `CardioCard` component is needed (thin, self-contained).
- `src/app/workout/active/page.tsx` — currently renders only `block.kind === 'straight'`.

### The canonical union (w1 — already on main, DO NOT edit)
```ts
export interface CardioPayload {
  durationSeconds: number;    // REQUIRED
  distanceMeters?: number;
  calories?: number;
  avgHr?: number;
  maxHr?: number;
}

export type WorkoutBlock =
  | { id: string; kind: "straight"; exercise: ExerciseEntry }
  | { id: string; kind: "superset"; exercises: ExerciseEntry[] }
  | { id: string; kind: "circuit"; rounds: number; stations: ExerciseEntry[]; restSeconds?: number }
  | { id: string; kind: "cardio"; exerciseId: string; exerciseName: string; cardio: CardioPayload };
```

### Volume (G-13) — already correct
`computeBlockVolume` (w1) returns `0` for cardio blocks. `computeTotalVolume` SUMs across all blocks.
Cardio contributes 0 weight-volume. No change needed.

---

## 1. Store — add cardio block creation + editing + block removal

### 1a. New actions
```ts
addCardioBlock: (params: { exerciseId: string; exerciseName: string; cardio: CardioPayload }) => void;
updateCardio: (blockId: string, cardio: Partial<CardioPayload>) => void;
removeBlock: (blockId: string) => void;  // remove ANY block by id (straight, cardio, future kinds)
```
- Each created block gets a `newId()` (G-10 uuid).
- **`addCardioBlock`** creates a `{ id, kind: 'cardio', exerciseId, exerciseName, cardio }` block and
  appends it to `activeWorkout.blocks`.
- **`updateCardio`** patches the `cardio` payload on the matching cardio block (immutable merge).
  `durationSeconds` is the only required field — if the user clears it, default to `0` (never undefined).
- **`removeBlock`** filters `activeWorkout.blocks` by `block.id !== blockId`. This generalizes
  `removeExercise` (which only handles straight blocks) to work for cardio blocks too. For straight
  blocks, `removeExercise` still works (it calls no `removeBlock` — it filters by `block.exercise.id`).
  `removeBlock` is the generic escape hatch for non-straight blocks.

### 1b. removeExercise — unchanged for w2c
`removeExercise` still only handles straight blocks (filters by `block.exercise.id`). Cardio blocks
are removed via `removeBlock(blockId)`. Do NOT change `removeExercise` behavior.

---

## 2. Component — `CardioCard.tsx`

A self-contained component (no ExerciseCard/SetRow reuse — cardio has no sets).

### `components/CardioCard.tsx`
```
Header: exercise name + "Cardio" badge + remove-block (Trash2 → onRemoveBlock(block.id)) button.
Body: a grid of summary inputs:
  - Duration (minutes) — cardio.durationSeconds / 60, input in minutes for UX, store as seconds
  - Distance (km) — cardio.distanceMeters / 1000, input in km for UX, store as meters
  - Calories — cardio.calories
  - Avg HR — cardio.avgHr (optional)
  - Max HR — cardio.maxHr (optional)
A subtle left accent/border (emerald/teal) to visually distinguish cardio from straight/superset/circuit.
```

### Props interface
```ts
interface CardioCardProps {
  block: Extract<WorkoutBlock, { kind: 'cardio' }>;
  onUpdateCardio: (blockId: string, cardio: Partial<CardioPayload>) => void;
  onRemoveBlock: (blockId: string) => void;
}
```

### Input UX
- Duration: input in **minutes** (e.g. "30" for 30 min). Store as `durationSeconds = minutes * 60`.
  Display existing `durationSeconds / 60` rounded to 1 decimal. Empty → 0 seconds.
- Distance: input in **km** (e.g. "5" for 5 km). Store as `distanceMeters = km * 1000`.
  Display existing `distanceMeters / 1000` rounded to 2 decimals. Empty → undefined (omit from payload).
- Calories: direct integer. Empty → undefined.
- Avg HR / Max HR: direct integers. Empty → undefined.
- All inputs are disabled when `durationSeconds > 0` AND the workout is being finished (no "completed"
  toggle for cardio — the summary IS the log). A "Done" button marks the cardio block as logged by
  disabling inputs (visual cue: opacity-50). Actually, keep it simple: inputs are always editable until
  workout is finished. No complete/incomplete toggle for cardio.

---

## 3. Page — render cardio blocks + creation entry point

In `src/app/workout/active/page.tsx`:
- Extend the block map: `cardio` → `<CardioCard>`.
- Wire the new store actions (`addCardioBlock`, `updateCardio`, `removeBlock`).
- **Add-cardio UX:** a new "Add Cardio" button alongside "Add Exercise". Opens a `AddCardioModal` that
  lets the user pick an exercise (reuse the existing search/create picker) + enter initial duration.
  On confirm, calls `addCardioBlock({ exerciseId, exerciseName, cardio: { durationSeconds } })`.
  Keep it minimal — reuse the existing search/create exercise picker for exercise selection.

---

## 4. Tests

### Store — `stores/__tests__/active-workout-store.w2c.test.ts`
```
[ ] addCardioBlock creates a cardio block with uuid id, correct exerciseId/exerciseName/cardio
[ ] updateCardio patches the cardio payload on the matching block (immutable merge)
[ ] updateCardio does not affect other blocks
[ ] removeBlock removes a cardio block by id
[ ] removeBlock removes a straight block by id (generic)
[ ] removeBlock does not remove other blocks
[ ] addCardioBlock + finishWorkout: totalVolume = 0 from cardio (G-13, cardio contributes 0)
[ ] addCardioBlock + straight set + finishWorkout: totalVolume = SUM from straight only (cardio = 0)
[ ] all ids are uuid v4 (G-10); finishWorkout still round-trips via toRow/fromRow
```

### Component — CardioCard renders exercise name, Cardio badge, duration/distance/calories inputs;
remove button calls onRemoveBlock.

### e2e — `tests/e2e/workout-cardio.spec.ts`
```
[ ] start workout → add cardio (Treadmill, 30 min, 5 km, 300 cal) → cardio card appears with values
[ ] edit duration → value updates → finish saves
[ ] reload → cardio block rehydrates (G-09 persist)
[ ] cardio + straight set in same workout → finish saves → totalVolume = straight only (cardio = 0)
```

---

## Guardrails — must-not-regress (paste into `changes.md` proof block)
```
[ ] TYPES UNCHANGED: src/features/workout-engine/types.ts not edited (union already supports cardio)
[ ] NO FORK: no new SetRow/ExerciseCard variant — CardioCard is self-contained (cardio has no sets)
[ ] w2a UNCHANGED: straight-block logging + all w2a tests still green
[ ] G-13 totalVolume = SUM(weight*reps) across ALL entries of ALL blocks — cardio contributes 0
[ ] G-10 all new block ids are uuid v4 · G-11 finishWorkout still await+retry persist
[ ] G-09 persist/rehydrate MERGES by id (add a cardio block, hard refresh, block still there)
[ ] fence held: only src/features/workout-engine/** + app/workout/active/page.tsx; programs + exercises.ts untouched
[ ] no apex-/canonical_user_id/password_hash strings (grep → 0)
[ ] tsc --noEmit clean · lint clean · vitest green · e2e green
```

## Acceptance criteria
- [ ] Can add a cardio block (pick exercise + enter duration/distance/calories) on `/workout/active`.
- [ ] Cardio summary inputs (duration in minutes, distance in km, calories, HR) work and persist to store.
- [ ] "Remove block" removes the cardio block.
- [ ] `totalVolume` SUMs across all blocks; cardio contributes 0 (G-13).
- [ ] Cardio block persists + rehydrates on hard refresh (G-09).
- [ ] Straight-set behaviour + w2a tests unchanged; tsc/lint/vitest/e2e all green; PR opened, not merged.

## Cross-references
- Extends → w2a (`/workout/active`, store, ExerciseCard/SetRow — all on main)
- Canonical types → `src/features/workout-engine/types.ts` (w1; union already has cardio)
- Volume rule → `lib/volume.ts` `computeTotalVolume` (G-13 SUM, cardio = 0)
- Deferred → separate Opus wave (drop/timed/unilateral set variants), w2d (rest timer + floating bar)
- Guardrails → `plans/v2_guardrails.md` (G-09/G-10/G-11/G-13/G-19) · Pipeline → `plans/v2_pipeline_model.md`
