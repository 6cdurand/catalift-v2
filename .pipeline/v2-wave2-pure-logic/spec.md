# .pipeline/v2-wave2-pure-logic/spec.md — Stage 1 (PLAN)

> **Wave 2 = pure-logic bulk copy.** The cheapest port wave: v1 pure-data/pure-logic files
> copied verbatim into v2 `src/lib/`, no data-boundary rewiring needed. Runs in PARALLEL with
> Wave 3 (auth) — zero file overlap (`src/lib/*` vs `src/features/auth/*`).
> Authored by command-center (Opus 4.8) because it pastes v1 source the v2 executor can't read.
> **Place at `catalift-v2/.pipeline/v2-wave2-pure-logic/spec.md`.**

**Class:** **A (pure logic — no auth, no schema, no money, no external comms).**
Per `TRUST_MODEL.md`: a green read-only review + green CI = merge. **No Christo sign-off needed.**
**Executor model:** **GLM 5.2** (adaptation/assembly — this is copy + align, not creation).
**Repo:** catalift-v2 · **Branch:** `wave2-pure-logic` (from main) · open a PR; do NOT push main.

---

## What this wave does

Copy v1's pure-logic / pure-data files into v2 `src/lib/` verbatim. These files have NO data
boundary — they're pure functions, type definitions, and static data (exercise DB, program
templates, medals logic, derived stats). No Supabase calls, no localStorage, no auth deps.

**Why verbatim?** These are v1's proven, tested logic. Redesigning them buys nothing and risks
regression. The reuse map (`plans/v1_to_v2_reuse_map.md` §B) tags all of these PORT VERBATIM.

---

## The file list (copy these v1 → v2 paths)

### Exercise DB + helpers
| v1 path (`catalift-web/apex-fitness/src/lib/`) | v2 path (`catalift-v2/src/lib/`) | Notes |
|---|---|---|
| `exercises.ts` (90KB) | `exercises.ts` | exercise DB — pure data |
| `exerciseAliases.ts` | `exerciseAliases.ts` | exercise helpers |
| `exerciseRelations.ts` | `exerciseRelations.ts` | |
| `exerciseAnimations.ts` | `exerciseAnimations.ts` | |
| `exerciseSearch.ts` | `exerciseSearch.ts` | |
| `exerciseVideos.ts` | `exerciseVideos.ts` | |
| `exerciseImageGen.ts` | `exerciseImageGen.ts` | |

### Program templates + content
| v1 path | v2 path | Notes |
|---|---|---|
| `programTemplates.ts` (62KB) | `programTemplates.ts` | program content — pure data |
| `suggestedPrograms.ts` (50KB) | `suggestedPrograms.ts` | |
| `templates.ts` | `templates.ts` | |
| `trainerTemplates.ts` | `trainerTemplates.ts` | |
| `pgifTemplates.ts` | `pgifTemplates.ts` | |

### Gamification (medals ONLY — strength rating DROPPED)
| v1 path | v2 path | Notes |
|---|---|---|
| `medals.ts` | `medals.ts` | deterministic; **unit test on port** |
| ~~`strengthRating.ts`~~ | ~~DROPPED~~ | **DO NOT COPY.** v1 had 3 divergent `calculate1RM` formulas (BUG-302). NORTH_STAR says we're not a generic gym log. Dropped 2026-06-23 (DECISIONS.md). |

### Derived stats / pure helpers
| v1 path | v2 path | Notes |
|---|---|---|
| `deriveAll.ts` (21KB) | `deriveAll.ts` | **unit test on port** |
| `exerciseStats.ts` | `exerciseStats.ts` | |
| `getLastSetForExercise.ts` | `getLastSetForExercise.ts` | "previous set display" must-have |
| `workoutEstimator.ts` | `workoutEstimator.ts` | |
| `programProgress.ts` | `programProgress.ts` | |
| `programDiff.ts` | `programDiff.ts` | |
| `programStartUtils.ts` | `programStartUtils.ts` | |
| `unitConversion.ts` | `unitConversion.ts` | |
| `utils.ts` | `utils.ts` | check for overlap with existing v2 `utils.ts` — if conflict, rename to `v1-utils.ts` |
| `weeklyStripPills.ts` | `weeklyStripPills.ts` | |
| `calendarScope.ts` | `calendarScope.ts` | |

### Types
| v1 path (`src/types/`) | v2 path | Notes |
|---|---|---|
| `src/types/*` | `src/types/` (merge) | port + align to v2 `database.ts` generated types; do NOT overwrite v2-generated types |

---

## What NOT to copy (DROP list)

- **`strengthRating.ts`** — DROPPED (3 divergent formulas, BUG-302; NORTH_STAR says not a generic gym log).
- **Any file that imports from `@/lib/store` or `@/lib/supabaseSync`** — those are data-boundary files, NOT pure logic. They belong in later waves (REBUILD). If a "pure" file has a hidden Supabase/Zustand import, STOP and note it in `changes.md` — do not copy the import.
- **`seedData.ts`** — not needed (greenfield).
- **`safeStorage.ts`, `capacitorStorage.ts`** — storage abstraction, replaced by v2 `lib/storage.ts`.

---

## Rules for the coder

1. **Copy verbatim** — do not redesign, refactor, or "improve" the logic. These are proven.
2. **Strip v1-specific imports** — if a file imports from `@/lib/store`, `@/lib/supabaseSync`,
   `@/lib/supabase`, or `@/lib/safeStorage`, remove that import and note it in `changes.md`.
   The file should have ZERO data-boundary dependencies after porting.
3. **Align types** — where v1 types overlap with v2 `database.ts` generated types, prefer the
   v2 generated type. If a v1 type is pure (no DB coupling), keep it.
4. **`utils.ts` conflict check** — v2 may already have a `utils.ts`. If so, MERGE (v1's pure
   helpers into v2's) or rename to `v1-utils.ts`. Do NOT blindly overwrite v2's.
5. **Add unit tests** for the files marked "unit test on port" above: `medals.ts`, `deriveAll.ts`.
   These are the highest-risk pure-logic files (deterministic but complex).

---

## Guardrails (paste into proof block — these apply)
```
[ ] G-10 all client-generated ids are valid UUIDs (if any pure-logic file mints ids) ★
[ ] G-19 PORTED v1 logic verbatim; no redesign of proven functions ★
[ ] NO data-boundary imports (no @/lib/store, @/lib/supabaseSync, @/lib/supabase, @/lib/safeStorage)
[ ] NO strengthRating.ts (DROPPED — do not copy)
[ ] tsc + lint + unit + e2e all green ★
```

## Acceptance criteria
- [ ] All listed files copied to `src/lib/` (or `src/types/` for types).
- [ ] `strengthRating.ts` is NOT present in v2.
- [ ] Zero data-boundary imports in any copied file (grep proof: no `@/lib/store`, `@/lib/supabaseSync`, `@/lib/supabase`, `@/lib/safeStorage` in `src/lib/` copied files).
- [ ] `tsc --noEmit` clean (0 errors).
- [ ] `npm run lint` clean (0 errors).
- [ ] Unit tests pass for `medals.ts` + `deriveAll.ts` (at minimum: medal award logic, PB derivation).
- [ ] Existing v2 e2e tests still pass (4/4).
- [ ] PR opened with the proof block filled in `changes.md`.

## Tests the Tester stage must write (→ `tests.md`)
- unit `medals.test.ts`: given a workout + user history, correct medals are awarded (deterministic).
- unit `deriveAll.test.ts`: given a set of workouts, PBs are correctly derived (including edge cases: no workouts, single workout, tie).
- unit `exercise-search.test.ts`: search returns expected results for a query (smoke test of the exercise DB).
- grep-guard: `strengthRating` does not appear anywhere in `src/`.

---

## Stage hand-off checklist (this pipeline run)
- [x] **Stage 1 PLAN** — this file. Christo: paste into `catalift-v2/.pipeline/v2-wave2-pure-logic/spec.md`.
- [ ] **Stage 2 CODE** (GLM 5.2) — copy files, strip bad imports, align types; fill `changes.md`; open PR.
- [ ] **Stage 3 TEST** (GLM 5.2) — write listed tests; run gates; fill `tests.md` with real output.
- [ ] **Stage 4 REVIEW** (fresh Cascade, read-only) — `review-pr` skill vs this spec → `review.md`.
- [ ] **Merge** (Class A — green review + green CI = merge, no sign-off needed).

---

## Christo's paste-ready prompt

> **Set this Cascade to GLM 5.2.**
>
> Read the spec at `.pipeline/v2-wave2-pure-logic/spec.md` (I've pasted it there). This is Wave 2:
> bulk-copy v1 pure-logic files into `src/lib/`. It's Class A (pure logic, no auth/schema/money).
> Copy the files listed in the spec verbatim, strip any data-boundary imports, DROP
> `strengthRating.ts`, add unit tests for `medals.ts` + `deriveAll.ts`. Run all gates
> (`tsc + lint + unit + e2e`). Open a PR. Fill in `.pipeline/v2-wave2-pure-logic/changes.md`.
