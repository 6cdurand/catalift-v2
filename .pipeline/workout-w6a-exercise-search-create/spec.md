# .pipeline/workout-w6a-exercise-search-create/spec.md — Stage 1 (PLAN)

**Box:** 01-workout-engine · **Wave:** w6a (first slice of F-12 / DOSSIER DQ-4)
**Feature:** Fix the exercise picker search bug + wire the "create custom exercise" flow.
**Class:** A — bug fix + UI wiring of an existing function. **NO schema, NO migration.**
**Executor model:** GLM 5.2 · **Recommended:** a 2nd v2 Cascade (Exec-2) OR OpenClaw Forge.
**Repo:** catalift-v2 · **Branch:** `workout-w6a-exercise-search-create` · ONE PR.

> ⚠️ **PARALLEL-LANE FENCE (critical — Lane 1 = w2b-2 is running in `features/programs`).**
> This wave WRITES ONLY:
> - `src/lib/exerciseSearch.ts`
> - `src/lib/exercises.ts` (ONLY `createCustomExercise` wiring + custom-exercise helpers — NOT a dedup/data rewrite, that's w6b)
> - `src/app/workout/active/page.tsx` (+ any NEW component file under `src/features/workout-engine/` that THIS picker uses and Lane 1 does not)
> **DO NOT TOUCH** `src/features/programs/**` or the shared `src/features/workout-engine/components/{DayBuilder,BlockCard,ExerciseRow}.tsx` — Lane 1 owns those. **Keep the `searchExercises`/`searchExercisesLite` function signatures stable** (the programs builder imports them — changing internals/threshold is fine, changing the signature breaks Lane 1).

---

## SOURCE — files to read first (read directly by absolute path; FALLBACK: ask Christo to paste)
**v2 (the files you'll change):**
- `/Users/christofit7/Desktop/catalift/catalift-v2/src/lib/exerciseSearch.ts` — Fuse.js matcher. `FUSE_OPTIONS`, `getBaseFuse()`, `searchExercises(query, opts)` L122, `searchExercisesLite()` L157.
- `/Users/christofit7/Desktop/catalift/catalift-v2/src/lib/exercises.ts` — `searchExercises` L2089, **`createCustomExercise` L2158 (ALREADY EXISTS)**, `filterExercisesBySearch` L2326, `Exercise` type.
- `/Users/christofit7/Desktop/catalift/catalift-v2/src/app/workout/active/page.tsx` — the active-workout exercise picker. **L21 `TODO: ... custom exercise creation ...`**, **L74 "No exercises found"** (the only place "create" could surface today).

**v1 (for PORT-UI fidelity of the create affordance):**
- Locate v1's exercise picker / "create custom exercise" modal in `/Users/christofit7/Desktop/catalift/catalift-web/apex-fitness/src` (search `createCustomExercise` / "Create" / custom exercise). Port its create affordance look/flow. If you cannot find it, STOP and tell Christo — do NOT invent a modal.

---

## The two problems (Christo, 2026-06-29)

**P1 — Search is unreliable.** "Sometimes exercises show up even when I type something new." Root: the Fuse.js
threshold/distance is too loose, so fuzzy matches surface for queries that shouldn't match. **Fix:** tighten
`FUSE_OPTIONS` so results are predictable — exact + prefix + alias/substring matches rank first; fuzzy only as
a fallback with a tight threshold. Add a deterministic fast-path: a case-insensitive substring match on
name/aliases should always be included and ranked above fuzzy-only hits.

**P2 — "Create exercise" is hidden + not wired.** The create option only appears when a search returns ZERO
results, and the active-workout picker is a stub (the create UI is TODO'd). **Fix:** (a) **always** offer a
"**Create '<query>'**" affordance in the picker whenever the user has typed a non-empty query (not only on zero
results); (b) **wire it to the existing `createCustomExercise()`** so the new exercise is immediately selectable
and usable in the active session; (c) the created exercise's results save + display in the active workout like
any other (it gets its own `exercise_id`, so PBs/history flow through the existing `personal_bests` /
`client_exercise_history` / `workouts.exercises` paths automatically — no new storage).

**Persistence scope (this wave):** persist custom exercises via the **existing client/IDB store pattern** already
used in the workout-engine (match how the picker holds session/library state today). **Do NOT add a Postgres
table** in this wave — cross-device sync via a `custom_exercises` table is the deferred Class-B slice (w6c,
needs Christo sign-off + Opus). Leave a `TODO(w6c: custom_exercises table for cross-device sync)` seam.

**NOT in scope:** the dedup audit + unilateral-variant links (that's **w6b**, a separate data pass with the
exercise-specialist lens); the programs-builder picker's create-UI (Lane 1 territory — follow-up after w2b-2).

---

## Acceptance gate
1. **P1:** typing a query returns only sensible matches; a clearly-unrelated query returns few/no false hits;
   exact/prefix/alias matches always appear and rank first. (Add unit tests on `exerciseSearch`.)
2. **P2:** a non-empty query always shows "Create '<query>'"; tapping it creates the exercise via
   `createCustomExercise`, selects it, and it's loggable in the active session.
3. A logged set on a custom exercise saves and shows "previous set" on the next set (uses the normal
   `exercise_id` paths — confirm in a test or manual note).
4. PORT-UI fidelity to v1's create affordance.
5. Signatures of `searchExercises`/`searchExercisesLite` unchanged (Lane 1 still compiles).
6. **Fence respected:** `git diff --name-only` touches ONLY the allowed files (no `features/programs/**`, no
   shared `workout-engine/components`).

## Guardrails (PR proof block)
```
[ ] FENCE — git diff --name-only shows ONLY: src/lib/exerciseSearch.ts, src/lib/exercises.ts, src/app/workout/active/page.tsx (+ optional new picker file). NO features/programs/**, NO workout-engine/components/**
[ ] searchExercises / searchExercisesLite signatures unchanged
[ ] P1 fixed — search unit tests added (exact/prefix/alias rank first; tight fuzzy fallback)
[ ] P2 fixed — "Create '<query>'" always offered; wired to existing createCustomExercise; created exercise is loggable
[ ] custom exercise persists via existing IDB/client store; TODO(w6c) seam left; NO new Postgres table
[ ] no canonical_user_id / no apex- / no stub-user-id
[ ] tsc + lint + vitest + e2e green (verify the GitHub CI check-run conclusion, not just local)
```

## Tests (→ tests.md)
- Unit (`exerciseSearch`): exact match ranks #1; alias/substring match included; an unrelated nonsense query
  returns 0 (or only tightly-scored) results (the P1 regression test); `__resetSearchCacheForTests()` between cases.
- Unit/component: non-empty query renders "Create '<query>'"; invoking it calls `createCustomExercise` and the
  result is selectable.
- e2e (active workout): search a non-existent name → Create → add → log a set → it persists.

## Hand-off checklist
- [x] Stage 1 PLAN — this file.
- [ ] Code/Test (Exec-2 or Forge, GLM 5.2) → PR → Review (exercise-specialist lens on search ranking).
- [ ] Follow-ups: **w6b** (dedup audit + unilateral variant links, data pass) · **w6c** (`custom_exercises` table, Class B, Opus + sign-off).

## N. Christo's paste-ready prompt
> Set yourself to **GLM 5.2**. `git pull` main first. Read `.pipeline/workout-w6a-exercise-search-create/spec.md`
> and the v2 + v1 source it cites (read directly by absolute path; if blocked, stop and tell me). Do TWO things:
> (P1) fix the unreliable exercise search in `src/lib/exerciseSearch.ts` — tighten the Fuse matching so
> exact/prefix/alias rank first and unrelated queries don't false-match; (P2) in the active-workout picker
> (`src/app/workout/active/page.tsx`) always offer "Create '<query>'" for any non-empty query and wire it to the
> existing `createCustomExercise()` in `exercises.ts` so the custom exercise is immediately loggable (persist via
> the existing IDB/client store; leave a `TODO(w6c)` for the DB table — do NOT add a table). **STRICT FENCE: write
> ONLY `src/lib/exerciseSearch.ts`, `src/lib/exercises.ts`, `src/app/workout/active/page.tsx` (+ an optional new
> picker file). DO NOT touch `src/features/programs/**` or `workout-engine/components/**` — another lane owns
> those. Keep `searchExercises`/`searchExercisesLite` signatures unchanged.** PORT-UI fidelity to v1's create
> modal. Branch `workout-w6a-exercise-search-create`, ONE PR, run tsc+lint+vitest+e2e (verify the GitHub CI
> check-run), fill the proof block, return REPORT-BACK. One objective; GLM 5.2.
