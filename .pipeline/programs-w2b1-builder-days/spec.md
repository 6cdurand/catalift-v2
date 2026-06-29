# .pipeline/programs-w2b1-builder-days/spec.md — Stage 1 (PLAN)

**Box:** 02-programs · **Wave:** w2b-1 (of the w2 builder series) · **Feature:** Program Builder — Step 2 "Build Days" (day tabs + day/block/exercise CRUD + shared day-builder shell)
**Class:** A — UI port onto the w1 data layer. No schema change (w1 shipped the tables in migration 00007). No auth change.
**Executor model:** GLM 5.2.
**Recommended executor:** a **v2 Cascade** (NOT OpenClaw Forge) — it can read the v1 source directly by absolute path (see §SOURCE), and this slice is too large/nuanced for a clean Forge one-shot.
**Repo:** catalift-v2 · **Branch:** `programs-w2b1-builder-days` · open ONE PR.
**Builds on:** w2a (PR #18, merged) — `src/features/programs/builder/ProgramBuilder.tsx` wizard shell +
`steps/SetupStep.tsx` + `steps/BuildDaysStep.tsx` (currently a placeholder) + w1 store/types/api.

---

## SOURCE — where to get the v1 code to port (PORT-UI fidelity)
> The executor must reproduce v1's actual UI + behaviour, re-seamed onto the w1 store — NOT rebuild
> from scratch (port-fidelity rule; PR #2 lesson). Read these v1 files DIRECTLY by absolute path:
>
> - `/Users/christofit7/Desktop/catalift/catalift-web/apex-fitness/src/app/program/builder/page.tsx`
>   - **Types:** `ProgramExercise` L194, `ProgramBlock` L208, `ProgramDay` L215 (~L193–222)
>   - **Days state + init:** `days` useState L319; `initializeDays()` L435–450
>   - **CRUD handlers (port these onto the w1 store):** `addBlock` L451, `removeBlock` L474,
>     `addExerciseToBlock` L481, `removeExercise` L509, `updateExercise` L522, `copyDay` L538,
>     `removeDay` L552, `addDay` L558
>   - **Days-step JSX (the screen):** L1153–L1457 (incl. `<WorkoutDayBuilder onBlocksChange=…/>` at L1214)
>   - **Bottom bar (days step):** L2422+
> - `/Users/christofit7/Desktop/catalift/catalift-web/apex-fitness/src/components/program/WorkoutDayBuilder.tsx` (**2,251 lines** — the shared day-builder; decompose it, see §J)
>
> **FALLBACK:** if your environment cannot read that absolute path, STOP and tell Christo —
> command-center will paste the exact slices into this spec. Do not invent the UI.

**NOT in w2b-1 (do NOT build here):**
- The rich **Exercise-Edit dialog** (sets/reps/rest/tempo/notes/swap), v1 L1871–2270 → that is **w2b-2**.
- Step 3 Schedule, Save/Activate, Block-Library, Save-to-library → **w2c**.
- The exercise library itself → Box 1 (the builder only CONSUMES `@/lib/exercises`).

---

# ===== FEATURE READINESS GATE (A–F) =====
> (The full builder-feature gate is in command-center `domains/02-programs/pipeline/w2/spec.md`.
> This is the w2b-1 slice of it.)

## A. Placement
Step 2 of the `/program/builder` wizard (athlete self-serve) and `/program/builder?clientId=…`
(trainer mode). Renders when `ProgramBuilder` step state === `'days'`. Fills the w2a placeholder
`src/features/programs/builder/steps/BuildDaysStep.tsx`.

## B. Navigation map
| Element | Leads to | Type | Back |
|---|---|---|---|
| Step 1 "Next" | Step 2 Build Days (this slice) | inline wizard state | "Back" → Step 1 Setup |
| Day tab tap | switches active day | inline | n/a |
| "Add Day" / "Copy Day" / "Remove Day" | mutates `days` | inline | n/a |
| "Add Exercise" (on a block) | opens Add-Exercise picker (port the v1 picker dialog L1459–1534) | popup | Cancel/select → Step 2 |
| Exercise row tap | opens Exercise-Edit dialog | popup | **w2b-2** — in w2b-1, wire the open handler + a TODO stub; full dialog lands in w2b-2 |
| Step 2 "Next" | Step 3 Schedule | inline | "Back" → Step 2 |
- **Dead-end check:** every dialog Cancel/Close → Step 2; both step arrows work.

## C. Two-sided view
Authoring surface, two entry modes (self / trainer-for-client). Build Days is identical in both modes
(the client picker is a w2c concern). No recipient view here.

## D. Functionality walkthrough
Trainer/athlete on Step 2: sees Day 1 by default; taps "Add Exercise" on a block → picks Bench Press
from the library → it appears in the block with default sets/reps; can add/copy/remove days; switches
between day tabs; taps "Next" → Step 3. Empty day shows "no exercises yet, add one". All mutations go
through the w1 store (NO local component state as the source of truth for `days`).

## E. Data + source-of-truth
- **Canonical object:** the w1 `Program` / day / block / exercise types in
  `src/features/programs/types.ts`. The builder MUST use the w1 store — it may NOT keep its own
  parallel `days` store (G-16).
- **w1 store gap to close (BACKLOG #11b):** the w1 programs store currently has **no `setDays()`
  action** (w2a's `initializeDays()` only `console.log`s). **w2b-1 MUST add `setDays(days)` (and the
  granular day/block/exercise mutators below) to `src/features/programs/store.ts`** and wire
  `BuildDaysStep` + the shared day-builder to them. This is the core of this slice.
- **Parity guard:** the builder must NOT compute next-day / rotation / day-index (that's w1
  `getNextProgramWorkout`). grep-guard: no day-index logic in `builder/` or the day-builder components.

## F. Acceptance gate (pass/fail)
1. Add a day, add a block, add an exercise from the library → the w1 store `days` updates and the UI
   re-renders from the store (not local state).
2. Copy day duplicates blocks+exercises; remove day removes it; can't remove the last day (match v1).
3. Switching day tabs shows that day's blocks.
4. `setDays()` + mutators exist on the w1 store and are unit-tested (round-trip a built `days` array).
5. grep-guards (§L) all return 0.
6. Port-fidelity: matches v1's Build-Days screen (day tabs, block cards, add-exercise) — not generic
   shadcn defaults.
- **exercise-specialist lens (Box 2, REQUIRED):** block/exercise grouping + default sets/reps are
  sensible and preserved from v1 (no nonsensical defaults).
- **VERDICT:** READY.

# ===== END GATE =====

---

## J. v2 implementation (target structure) — SHARED day-builder (Christo decision 2026-06-29)
The 2,251-line v1 `WorkoutDayBuilder` is DECOMPOSED into small shared components in **workout-engine**
(used by both the program builder now and the workout builder later — avoids a divergent second
day-builder; matches the parity law). G-16: no file may approach the 2251-line god-component; keep
each component small (target <~250L).

```
src/features/workout-engine/components/
  DayBuilder.tsx        # NEW — shell: renders blocks for one day, emits onBlocksChange (ports WorkoutDayBuilder)
  BlockCard.tsx         # NEW — one block (type styling via getBlockStyles), its exercises, add/remove
  ExerciseRow.tsx       # NEW — one exercise row; tap → opens Exercise-Edit (full dialog = w2b-2)
  (reuse existing SetRow.tsx / ExerciseCard.tsx where they fit)

src/features/programs/builder/steps/BuildDaysStep.tsx   # FILL the w2a placeholder:
  # day tabs + Add/Copy/Remove Day + <DayBuilder/> per active day + Add-Exercise picker + step nav

src/features/programs/store.ts   # ADD: setDays(days), addDay, copyDay(fromIndex), removeDay(index),
                                 #      addBlock(dayIdx,type), removeBlock(blockId),
                                 #      addExerciseToBlock(blockId,ex), removeExercise(blockId,exId),
                                 #      updateExercise(blockId,exId,partial)
                                 # (port the v1 handler bodies L451–568, re-seamed onto store state)
src/features/programs/types.ts   # ensure day/block/exercise types match v1 ProgramDay/Block/Exercise
```
Imports: the app page imports the feature via the existing `no-restricted-imports` eslint-disable
convention; programs `BuildDaysStep` imports the shared components from `@/features/workout-engine`.

## K. Guardrails (paste into the PR proof block)
```
[ ] G-16 — shared day-builder decomposed; NO file near the 2251-line v1 god-component; NO 2nd program/days store
[ ] G-11 — store mutations are synchronous state; any persistence write uses await + retry
[ ] G-10 — real uuids for new day/block/exercise ids (crypto.randomUUID(), no stub ids)
[ ] parity — NO next-day/rotation/day-index recompute in builder/ or the day-builder components
[ ] no localStorage program persistence; no canonical_user_id; no apex- prefixes
[ ] PORT-UI fidelity — matches v1 Build-Days screen, not generic shadcn defaults
[ ] tsc + lint + vitest + e2e all green (verify the GitHub check-run conclusion, not a local run)
```

## L. Tests (Tester stage → tests.md)
- Unit: w1 store `setDays` + the 8 mutators (add/copy/remove day; add/remove block; add/remove/update
  exercise) — round-trip a built `days` array; removing the last day is blocked.
- grep-guards (must be 0):
  - `grep -rn "stub-user-id\|canonical_user_id\|apex-" src/features/programs src/features/workout-engine/components`
  - no second program/days store; no day-index/next-day logic in `builder/` or the new components.
- e2e (extend existing programs/builder spec if present): Step 1 → Next → add day → add exercise from
  library → exercise appears → Next reaches Step 3.

## M. Stage hand-off checklist
- [x] Stage 1 PLAN — this file (gate A–F, VERDICT READY).
- [x] Cross-box ownership decided — SHARED in workout-engine (Christo 2026-06-29).
- [ ] Code / Test (v2 Cascade, GLM 5.2) → PR `programs-w2b1-builder-days`.
- [ ] Review (fresh read-only v2 Cascade, /review-pr) → review.md.
- [ ] Then w2b-2 (Exercise-Edit dialog, v1 L1871–2270), then w2c (Schedule + Save/Activate + Block-Library).

## N. Christo's paste-ready prompt
> Set the v2 Cascade to **GLM 5.2**. Read `.pipeline/programs-w2b1-builder-days/spec.md` and the v1
> source paths it cites (read them directly; if you can't access that path, stop and tell me).
> Port v1's "Build Days" step + decompose `WorkoutDayBuilder` into SHARED components under
> `src/features/workout-engine/components/`, and add the `setDays()` + mutators to the w1 programs
> store. PORT-UI fidelity (match v1, don't rebuild). The rich Exercise-Edit dialog is NOT in scope
> (that's w2b-2) — just wire the open handler with a TODO stub. Branch `programs-w2b1-builder-days`,
> open ONE PR, fill the proof block (§K), return the REPORT-BACK block. One objective; stay on GLM 5.2.
