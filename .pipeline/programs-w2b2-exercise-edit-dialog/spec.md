# .pipeline/programs-w2b2-exercise-edit-dialog/spec.md — Stage 1 (PLAN)

**Box:** 02-programs · **Wave:** w2b-2 (of the w2 builder series) · **Feature:** Program Builder — the rich **Exercise-Edit dialog** (sets/reps/rest/tempo/notes/set-style/measurement-type/swap)
**Class:** A — UI port onto the w1 data layer. No schema change, no auth change.
**Executor model:** GLM 5.2.
**Recommended executor:** a **v2 Cascade** (reads v1 source directly; not Forge).
**Repo:** catalift-v2 · **Branch:** `programs-w2b2-exercise-edit-dialog` · open ONE PR.
**Depends on:** **w2b-1 merged first** (`programs-w2b1-builder-days`). w2b-1 ships `ExerciseRow` with a
TODO-stub open handler + the w1 store `updateExercise` mutator; w2b-2 replaces the stub with the real dialog.

> ⚠️ **Sequence:** do NOT start w2b-2 until w2b-1 is merged — they both touch
> `src/features/workout-engine/components/` (`ExerciseRow` + the new dialog) and the programs store.
> Running them concurrently = collision. (STATUS.md lane board.)

---

## SOURCE — v1 code to port (PORT-UI fidelity; read directly by absolute path)
> `/Users/christofit7/Desktop/catalift/catalift-web/apex-fitness/src/app/program/builder/page.tsx`
> - **Exercise-Edit dialog JSX:** **L1871–L2270** (the whole `<Dialog open={!!editingExercise}…>`)
> - **Local state shape:** `editingExercise = { blockId: string; exercise: ProgramExercise }` (L413)
> - **Commit on Save:** calls `updateExercise(blockId, exerciseId, {...fields})` then
>   `setEditingExercise(null)` (L2248–2260) — port to the w1 store `updateExercise` mutator (w2b-1).
> - **Constants used by the dialog** (set-style list, rest presets, tempo presets, rep-type): defined in
>   the builder constants region ~L74–192 — port the ones the dialog reads.
> - **Swap data:** `getDirectSwaps(exerciseId)` + `exerciseLibraryMap` come from the Box 1 exercise
>   library. **Confirm v2 has an equivalent** (`@/lib/exercises`); if v2 has no swap-suggestion source,
>   port `getDirectSwaps` too OR ship the dialog with the Swap panel behind a `// TODO swap-source` guard
>   and note it (do NOT fake swap data).
>
> **FALLBACK:** if you cannot read that absolute path, STOP and tell Christo — command-center pastes the slice.

**The dialog's sections (port all, match v1):**
1. **Header** — exercise name + category/movement-pattern.
2. **Swap Exercise** — toggle panel; direct swaps + search-all; selecting swaps `exerciseId`/`exerciseName`/`movementPattern`.
3. **Set Style** — fixed / 5x5 / pyramid / reverse-pyramid / drop-set / amrap (each preset sets `sets`+`reps`, e.g. 5x5 → 5 sets "5"; drop-set → 3 "10→10→10"; amrap → reps "AMRAP").
4. **Measurement type** — Reps vs Time toggle (`repType`), flips Reps↔Duration semantics (reps "8-12" ↔ "30s").
5. **Sets / Reps(or Duration) / Rest** — number input for sets; text for reps/duration; rest presets (`${value}s`).
6. **Tempo** — presets (joined tempo array) + "none" + custom input; shows human-readable "Xs down, Xs pause, Xs up, Xs top".
7. **Coaching Notes** — optional textarea.
8. **Save** — commit all fields via the w1 store `updateExercise`, close dialog.

**NOT in scope:** anything else in the builder (days CRUD = w2b-1; Schedule/Save/Activate/Block-Library = w2c).

---

# ===== FEATURE READINESS GATE (A–F) =====
> (Full builder gate: command-center `domains/02-programs/pipeline/w2/spec.md`. This is the w2b-2 slice.)

## A. Placement
Modal layered over Step 2 "Build Days". Opens when an `ExerciseRow` (w2b-1) is tapped. Lives as a
SHARED component in `src/features/workout-engine/components/` (Christo decision 2026-06-29 — both the
program builder and the future workout builder use the same exercise editor).

## B. Navigation map
| Element | Leads to | Type | Back |
|---|---|---|---|
| Exercise row tap (w2b-1) | Exercise-Edit dialog | popup | Close/Save → Step 2 |
| "Swap Exercise" | inline swap panel within dialog | inline | "Hide Swaps" → dialog |
| Swap pick | updates the edited exercise identity, closes swap panel | inline | n/a |
| "Save" | commit via w1 `updateExercise`, close | inline | n/a |
- **Dead-end check:** Close (X / overlay) and Save both return to Step 2; swap panel toggles back.

## C. Two-sided view
Authoring-only; identical in self + trainer-for-client modes. No recipient view.

## D. Functionality walkthrough
User taps an exercise in a block → dialog opens prefilled from the exercise → changes set-style to 5x5
(sets/reps auto-fill) → sets rest 90s → picks a tempo preset → adds a coaching note → optionally swaps
the exercise → Save → the block's exercise updates in the w1 store and the row re-renders. Editing a
local copy until Save (match v1); Close without Save discards.

## E. Data + source-of-truth
- Edits a **local copy** (`editingExercise`) and commits on Save via the w1 store `updateExercise`
  mutator (added in w2b-1). NO direct `days` mutation outside the store; NO second store (G-16).
- `ProgramExercise` fields touched: `exerciseId, exerciseName, movementPattern, sets, reps, rest,
  repType, setStyle, tempo, notes`. Ensure all exist on the w1 `ProgramExercise` type; if any are
  missing, ADD them to `src/features/programs/types.ts` (type-only, no migration — these live in the
  JSON program shape, not a column).
- **Parity guard:** no next-day/rotation/day-index logic here.

## F. Acceptance gate (pass/fail)
1. Open dialog on an exercise → fields prefill from the exercise.
2. Each control updates local state; Save commits via `updateExercise`; reopening shows persisted values.
3. Set-style presets set the documented sets/reps (5x5, pyramid, reverse-pyramid, drop-set, amrap).
4. Reps↔Time toggle flips Reps/Duration correctly.
5. Tempo preset + custom both work; human-readable description renders.
6. Swap (if v2 has a swap source) changes exercise identity; otherwise the panel is guarded with a TODO
   and that is called out in the report.
7. Close-without-Save discards edits.
8. grep-guards (§L) = 0; port-fidelity (matches v1, not generic shadcn).
- **exercise-specialist lens (REQUIRED):** set-style presets + tempo semantics are correct and sensible.
- **VERDICT:** READY (pending w2b-1 merged).

# ===== END GATE =====

---

## J. v2 implementation (target structure)
```
src/features/workout-engine/components/
  ExerciseEditDialog.tsx     # NEW — the ported dialog (props: { blockId, exercise, onClose })
                             #       commits via the programs store updateExercise on Save
  ExerciseRow.tsx            # EDIT (from w2b-1) — replace the TODO-stub open handler: render
                             #       <ExerciseEditDialog/> when this row is the active edit target
  (optional) lib/set-styles.ts / rest-presets.ts / tempo-presets.ts  # port the constants if shared
src/features/programs/types.ts   # ensure ProgramExercise has setStyle/repType/tempo/rest/notes (type-only)
```
The dialog is presentational + emits the committed exercise; the programs store owns persistence.
If v2 has no swap-suggestion source, port `getDirectSwaps` from v1 `@/lib` or guard the Swap panel.

## K. Guardrails (paste into the PR proof block)
```
[ ] G-16 — dialog is a single focused component (<~350L); NO 2nd store; reuses w2b-1 store mutators
[ ] G-11 — Save commits through the store; any persistence write uses await + retry
[ ] G-10 — no stub ids; swap keeps real exerciseIds
[ ] parity — no next-day/rotation/day-index logic
[ ] no localStorage program persistence; no canonical_user_id; no apex- prefixes
[ ] PORT-UI fidelity — matches v1 Exercise-Edit dialog (set-style, tempo, swap), not generic shadcn
[ ] swap source: real (Box 1) OR explicitly TODO-guarded + reported (no faked swap data)
[ ] tsc + lint + vitest + e2e green (verify the GitHub check-run conclusion)
```

## L. Tests (Tester stage → tests.md)
- Unit: set-style preset → expected sets/reps map; repType toggle; tempo join/parse; Save calls the
  store `updateExercise` with the full field set; Close discards.
- grep-guards (0): `grep -rn "stub-user-id\|canonical_user_id\|apex-" src/features/workout-engine/components`;
  no second store; no day-index logic.
- e2e (extend the builder spec): open exercise → change set-style + rest + tempo + note → Save → values persist.

## M. Stage hand-off checklist
- [x] Stage 1 PLAN — this file (gate A–F, VERDICT READY pending w2b-1 merge).
- [x] Shared-component placement (workout-engine) — Christo 2026-06-29.
- [ ] **Blocked until w2b-1 merged** (shared files + store mutators).
- [ ] Code / Test (v2 Cascade, GLM 5.2) → PR `programs-w2b2-exercise-edit-dialog`.
- [ ] Review (/review-pr) → then **w2c** (Schedule + Save/Activate + Block-Library + Save-to-library).

## N. Christo's paste-ready prompt (use ONLY after w2b-1 is merged)
> Set the v2 Cascade to **GLM 5.2**. Read `.pipeline/programs-w2b2-exercise-edit-dialog/spec.md` and the
> v1 source it cites (read directly; if you can't access the path, stop and tell me). Port v1's rich
> Exercise-Edit dialog (L1871–2270) as a SHARED `ExerciseEditDialog` in
> `src/features/workout-engine/components/`, wired into the w2b-1 `ExerciseRow` and committing via the
> programs store `updateExercise`. PORT-UI fidelity. If v2 has no exercise-swap source, guard the Swap
> panel with a TODO and report it (don't fake data). Branch `programs-w2b2-exercise-edit-dialog`, ONE PR,
> fill the proof block, return the REPORT-BACK block. One objective; stay on GLM 5.2.
