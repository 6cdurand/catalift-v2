# .pipeline/v2-workout-w2b/spec.md — Stage 1 (PLAN)

> **Workout-Engine Wave 2b = SUPERSET + CIRCUIT block logging.** w2a shipped the straight-set execution
> screen; the canonical `WorkoutBlock` union (w1) already defines `superset` and `circuit`, but the store
> + page only handle `straight`. w2b makes the execution screen log multi-exercise blocks — **reusing the
> existing `ExerciseCard`/`SetRow` per entry** (high reuse, minimal new UI). Authored by command-center,
> grounded in the LIVE v2 w1/w2a code. **Place at `catalift-v2/.pipeline/v2-workout-w2b/spec.md`.**

**Class:** **A (UI + Zustand store, NO migration, NO auth).** `workouts` exists; the jsonb `blocks`
column already round-trips all four kinds (w1 serialize).
**Executor model:** **GLM 5.2** (UI assembly on established patterns). Opus 4.8 acceptable.
**Repo:** catalift-v2 · **Branch:** `workout-w2b-superset-circuit` (from `main`) · open a PR, never merge.
**Fence (write-set):** `src/features/workout-engine/**` + `src/app/workout/active/page.tsx`.
**Disjoint from the calendar lane (`src/features/calendar`) → parallel-safe.** Do NOT touch
`src/features/programs/**` or `src/lib/exercises.ts` (import only).

**OUT OF SCOPE (→ w2c):** `cardio` block (duration/distance UI, no sets), and advanced set variants
(drop-sets, timed sets, unilateral L/R). w2b is straight-style set logging inside superset/circuit only.

---

## STEP 0 — Ground in the EXISTING v2 code (this is an EXTENSION, not a rewrite)

Read these first (already on `main`):
- `src/features/workout-engine/types.ts` — the `WorkoutBlock` union (below). **Do not change the types**;
  they already support superset/circuit.
- `src/features/workout-engine/stores/active-workout-store.ts` — w2a store. Its set-actions currently
  match ONLY `block.kind === 'straight' && block.exercise.id === entryId`. **The core of w2b is
  generalizing entry lookup across all block kinds** (see §1).
- `src/features/workout-engine/components/ExerciseCard.tsx` + `SetRow.tsx` — **REUSE these unchanged**
  for every entry inside a superset/circuit.
- `src/app/workout/active/page.tsx` — currently renders only `block.kind === 'straight'`.

### The canonical union (w1 — already on main, DO NOT edit)
```ts
export type WorkoutBlock =
  | { id: string; kind: "straight"; exercise: ExerciseEntry }
  | { id: string; kind: "superset"; exercises: ExerciseEntry[] }
  | { id: string; kind: "circuit"; rounds: number; stations: ExerciseEntry[]; restSeconds?: number }
  | { id: string; kind: "cardio"; exerciseId: string; exerciseName: string; cardio: CardioPayload };
// ExerciseEntry = { id; exerciseId; exerciseName; sets: LoggedSet[]; notes? }
// LoggedSet already has roundIndex?/stationIndex? for circuit positioning.
```

---

## 1. Store — generalize entry lookup, then add block creators

### 1a. Generalize the set-actions to find an entry in ANY block kind (THE KEY CHANGE)
Add two private helpers and route `addSet`/`removeSet`/`updateSet` through them so they work for entries
inside `straight.exercise`, `superset.exercises[]`, AND `circuit.stations[]`:

```ts
// returns the block + entry that owns entryId, across all kinds
function entriesOfBlock(block: WorkoutBlock): ExerciseEntry[] {
  if (block.kind === 'straight') return [block.exercise];
  if (block.kind === 'superset') return block.exercises;
  if (block.kind === 'circuit') return block.stations;
  return []; // cardio has no entries
}

// immutably map the entry with id === entryId wherever it lives, leaving the block shape intact
function mapEntry(blocks: WorkoutBlock[], entryId: string, fn: (e: ExerciseEntry) => ExerciseEntry): WorkoutBlock[]
```

Refactor `addSet`/`removeSet`/`updateSet` to use `mapEntry` (behaviour for straight is UNCHANGED — verify
w2a tests still pass). `completeSet`/`uncompleteSet` already delegate to `updateSet` → they get this for free.

### 1b. New block-creation + removal actions
```ts
addSupersetBlock: (exercises: { exerciseId: string; exerciseName: string }[]) => void; // ≥2 entries
addCircuitBlock: (params: { stations: { exerciseId: string; exerciseName: string }[]; rounds: number; restSeconds?: number }) => void;
removeBlock: (blockId: string) => void;             // remove a whole superset/circuit block
addRound: (circuitBlockId: string) => void;         // append one set (next roundIndex) to EVERY station
```
- Each created `ExerciseEntry` / block gets a `newId()` (G-10 uuid).
- **`removeExercise(entryId)`** (existing) must now also drop an entry from a superset/circuit; if that
  leaves the block with `<1` entry (superset) or `<1` station (circuit), remove the whole block.
- **`addRound`** appends a `LoggedSet` to each station with `roundIndex = currentMaxRound + 1`,
  `stationIndex` = the station's index, `setNumber` = round number, `completed:false`, weight/reps carried
  from that station's last set (same carry rule as w2a `addSet`).

### Volume (G-13) — already correct
`computeTotalVolume` (w1) sums across blocks; confirm it traverses superset.exercises + circuit.stations
(it should, via the same entry traversal). If it doesn't yet count circuit/superset sets, fix it to SUM
`weight*reps` over ALL completed sets in ALL entries of ALL blocks. NEVER MAX (G-13).

---

## 2. Components — wrap the REUSED ExerciseCard

Two thin wrappers; both render one `<ExerciseCard>` per entry (pass the existing store callbacks straight
through — they now resolve any entry id via §1a).

### `components/SupersetCard.tsx`
```
Header: "Superset" badge + a remove-block (Trash2 → onRemoveBlock(block.id)) button.
Body: block.exercises.map(entry => <ExerciseCard entry={entry} ...sameCallbacks /> )
A subtle left accent/border to visually group the entries as one block.
```

### `components/CircuitCard.tsx`
```
Header: "Circuit" badge + "{rounds} rounds" + remove-block button.
Body: block.stations.map(station => <ExerciseCard entry={station} ...sameCallbacks /> )
Footer: an "Add Round" button → onAddRound(block.id) (adds one set to every station).
(restSeconds is metadata only in w2b — no live rest timer; that's w2d.)
```
> Do NOT fork `ExerciseCard`/`SetRow`. If a tiny prop is needed (e.g. hide the per-entry "Add Set" inside a
> circuit in favour of "Add Round"), add an OPTIONAL prop with a default that preserves w2a behaviour.

---

## 3. Page — render the new kinds + creation entry points

In `src/app/workout/active/page.tsx`:
- Extend the block map: `superset` → `<SupersetCard>`, `circuit` → `<CircuitCard>` (straight stays as-is).
- Wire the new store actions (`addSupersetBlock`, `addCircuitBlock`, `removeBlock`, `addRound`).
- **Add-block UX:** extend the existing `AddExerciseModal` flow so the user can pick a block type —
  "Single exercise" (existing straight path), "Superset" (pick ≥2 exercises), "Circuit" (pick stations +
  set rounds). Keep it minimal; reuse the existing search/create exercise picker for selection.

---

## 4. Tests

### Store — `stores/__tests__/active-workout-store.w2b.test.ts`
```
[ ] addSupersetBlock creates a superset block with ≥2 entries, each a uuid id
[ ] addCircuitBlock creates a circuit with N rounds + the given stations
[ ] addSet/updateSet/completeSet/removeSet now work on an entry INSIDE a superset (mapEntry)
[ ] ...and on an entry INSIDE a circuit station
[ ] straight-block set actions are UNCHANGED (w2a tests still green)
[ ] addRound appends one set to EVERY station with correct roundIndex/stationIndex/setNumber
[ ] removeExercise drops an entry from a superset; empties → block removed
[ ] removeBlock removes the whole superset/circuit
[ ] computeTotalVolume SUMs completed sets across superset.exercises + circuit.stations (G-13, never MAX)
[ ] all created ids are uuid v4 (G-10); finishWorkout still round-trips via toRow/fromRow
```
### Component — SupersetCard + CircuitCard render the right number of ExerciseCards; Add Round calls onAddRound.
### e2e — `tests/e2e/workout-superset-circuit.spec.ts`
```
[ ] start workout → add a Superset of 2 exercises → log a set in each → both persist
[ ] add a Circuit (2 stations, 3 rounds) → Add Round → a set appears in each station → finish saves
[ ] saved workout reads back with superset + circuit blocks intact (fromRow)
```

---

## Guardrails — must-not-regress (paste into `changes.md` proof block)
```
[ ] TYPES UNCHANGED: src/features/workout-engine/types.ts not edited (union already supports these kinds)
[ ] REUSE: no fork of ExerciseCard/SetRow — superset/circuit render the SAME components per entry
[ ] w2a UNCHANGED: straight-block logging + all w2a tests still green (mapEntry refactor is transparent)
[ ] G-13 totalVolume = SUM(weight*reps) across ALL entries of ALL blocks — never MAX
[ ] G-10 all new block/entry/set ids are uuid v4 · G-11 finishWorkout still await+retry persists
[ ] G-09 persist/rehydrate MERGES by id (add a superset, hard refresh, block still there)
[ ] fence held: only src/features/workout-engine/** + app/workout/active/page.tsx; programs + exercises.ts untouched
[ ] no apex-/canonical_user_id/password_hash strings (grep → 0)
[ ] tsc --noEmit clean · lint clean · vitest green · e2e green
```

## Acceptance criteria
- [ ] Can add + log a **superset** (≥2 exercises) and a **circuit** (stations × rounds) on `/workout/active`.
- [ ] Set logging (weight×reps, complete, tap-to-fill, per-set volume) works inside superset/circuit via the reused SetRow.
- [ ] "Add Round" adds a set to every circuit station; "Remove block" removes the whole superset/circuit.
- [ ] `totalVolume` SUMs across all blocks/entries (G-13); workout persists + reads back with blocks intact.
- [ ] Straight-set behaviour + w2a tests unchanged; tsc/lint/vitest/e2e all green; PR opened, not merged.

## Cross-references
- Extends → w2a (`/workout/active`, store, ExerciseCard/SetRow — all on main)
- Canonical types → `src/features/workout-engine/types.ts` (w1; union already has superset/circuit)
- Volume rule → `lib/volume.ts` `computeTotalVolume` (G-13 SUM)
- Deferred → w2c (cardio block + drop/timed/unilateral set variants), w2d (rest timer + floating bar)
- Guardrails → `plans/v2_guardrails.md` (G-09/G-10/G-11/G-13/G-19) · Pipeline → `plans/v2_pipeline_model.md`
