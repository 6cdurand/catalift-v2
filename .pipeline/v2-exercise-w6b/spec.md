# .pipeline/v2-exercise-w6b/spec.md — Stage 1 (PLAN)

> **Workout-Engine Wave 6b = exercise-library dedup audit + unilateral-variant links.**
> A DATA pass over v2's `src/lib/exercises.ts` (~90KB static library): find duplicates / gaps /
> inconsistent names + aliases, and add curated `alternatives` (incl. unilateral single-arm/leg)
> links where a REAL counterpart already exists. No schema, no migration, no new feature UI.
> Authored by command-center. **Place at `catalift-v2/.pipeline/v2-exercise-w6b/spec.md`.**

**Class:** **A (static data + a verifier script, NO migration, NO auth).**
**Executor model:** **GLM 5.2**, **supervised** (this needs the exercise-specialist lens — judgment
calls on what is a true duplicate vs a legitimate variant; do NOT run fully unattended goal-mode).
**Repo:** catalift-v2 · **Branch:** `exercise-w6b-library-dedup-audit` (from `main`) · open a PR, never merge.
**Fence (write-set):** `src/lib/exercises.ts` + a new verifier `scripts/audit-exercises.mjs` +
a new report `src/lib/exercises.audit.md`. **Do NOT touch `src/features/programs/**`** (that folder is
owned by a parallel lane — collision risk).

---

## ⚠️ STEP 0 — THE ONE RULE THAT MUST NOT BREAK (history integrity)

Results key on the **free-text `exercise_id`**: `personal_bests`, `client_exercise_history`, and
`workouts.exercises` (jsonb) all store that string id. **Therefore:**

- ❌ **NEVER rename or delete an existing `exercise_id`.** Doing so orphans every user's logged history
  and PBs for that exercise. This is the cardinal rule of this wave.
- ✅ Dedup is done by **consolidating metadata onto a canonical entry** (add the duplicate's display
  name as an `alias`, add an `alternatives` link), and **FLAGGING the duplicate id in the report for
  human sign-off** — NOT by deleting it in code.
- ✅ Safe auto-edits: add/extend `aliases`, add `alternatives` / `unilateralVariantId` links, normalize
  display-name casing/whitespace, fix obvious typos in `name`/`aliases` (the `id` stays byte-identical).

If a change would alter or remove any `id`, STOP and put it in the report's **"Proposed (needs sign-off)"**
section instead of applying it.

---

## What this wave does

1. **(b) Dedup + quality audit** — walk every entry in `exercises.ts` and produce
   `src/lib/exercises.audit.md` listing:
   - **Duplicates** — same exercise under two+ ids (e.g. "Barbell Bench Press" vs "Bench Press
     (Barbell)"). Pick a canonical, list the dup id(s), and recommend a merge — but only ADD an alias on
     the canonical; list the dup id under "Proposed (needs sign-off)".
   - **Gaps** — common exercises missing from the library (flag, don't necessarily add unless obvious).
   - **Inconsistent names/aliases** — casing, equipment-prefix style, missing common aliases.
2. **(a) Unilateral-variant `alternatives` links** — where a REAL single-arm/single-leg counterpart
   ALREADY EXISTS as its own entry (e.g. "Dumbbell Shoulder Press" ↔ "Single-Arm Dumbbell Shoulder
   Press"), add a curated link so the picker can offer "swap to single-arm/leg".
   - ❌ NOT a universal auto-generated toggle (no junk like "single-arm back squat").
   - ❌ NOT a new "variant storage" layer — results write under the variant's own id → separate history
     is automatic and FREE.
   - **Audit-library-first:** many unilateral versions likely already exist as separate entries — link
     them, don't create them.
3. **Verifier script `scripts/audit-exercises.mjs`** — runs in CI/local, asserts the invariants below,
   prints a summary, exits non-zero on any failure. This is the goal-mode/PR gate.

**NOT in this wave:**
- Per-side L/R set logging (a deeper, separate feature — FLAG in the report, do not build).
- Create-exercise feature / `custom_exercises` table → w6c (Class B, separate).
- Search/matcher changes → already shipped in w6a.
- Any `id` rename/delete (flag only — see STEP 0).

---

## Verifier script — `scripts/audit-exercises.mjs`

A plain Node ESM script (no new deps) that imports the library and checks:

```
[ ] INV-1  No duplicate `id` values in the library (exact-match collision) → FAIL if any.
[ ] INV-2  Every `alternatives[]` / `unilateralVariantId` value resolves to an EXISTING id → FAIL if dangling.
[ ] INV-3  No alias collides with another exercise's `id` or primary `name` (ambiguous matcher input) → FAIL.
[ ] INV-4  `alternatives` links are symmetric where intended (if A links B as a variant, B links back) → WARN.
[ ] INV-5  Count report: total exercises, #with aliases, #with alternatives, #flagged-duplicate, #gaps.
[ ] Prints a human summary; exits 1 if any FAIL-level invariant breaks (INV-1/2/3).
```

Wire it as an npm script (`"audit:exercises": "node scripts/audit-exercises.mjs"`) so CI and the PR
can run it. (Adding a `package.json` script line is allowed here as a build-tooling convenience; do NOT
touch deps, next.config, netlify.toml, or workflows — those stay Class B.)

---

## Method (how to work it)

1. **Read** `exercises.ts` fully. Build a working map of `{id, name, aliases, muscle, equipment, ...}`.
2. **Cluster** likely-same exercises (normalize name: lowercase, strip equipment prefix/suffix, singularize)
   to surface duplicate candidates. Apply the exercise-specialist judgment — equipment variants
   (barbell vs dumbbell bench) are NOT duplicates; naming variants of the identical movement ARE.
3. **Apply safe edits** (aliases, links, casing) directly. **Record proposed id-merges** to the report.
4. **Add unilateral `alternatives`** only between existing entries.
5. **Run** `node scripts/audit-exercises.mjs` until INV-1/2/3 are green.
6. **Write** `src/lib/exercises.audit.md`: counts, duplicates table (canonical | dup id | action),
   gaps list, unilateral links added, and a "Proposed (needs sign-off)" section for any id changes.

---

## Guardrails — must-not-regress checklist (paste into `changes.md` proof block)

```
[ ] HISTORY: no existing `exercise_id` was renamed or removed (grep the diff — id keys unchanged)
[ ] INV-1 no duplicate ids · INV-2 no dangling alternatives · INV-3 no alias↔id/name collision (verifier green)
[ ] alternatives links only point at EXISTING entries (no invented unilateral exercises)
[ ] NO change to src/features/programs/** (fence held)
[ ] NO new runtime deps; no edits to next.config / netlify.toml / .github/workflows / .env*
[ ] no `apex-` / `canonical_user_id` legacy strings introduced (grep → 0)
[ ] tsc --noEmit clean · lint clean · existing vitest suite still green
[ ] audit report committed at src/lib/exercises.audit.md
```

## Acceptance criteria

- [ ] `node scripts/audit-exercises.mjs` exits 0; prints the INV-5 counts.
- [ ] `src/lib/exercises.audit.md` exists with: duplicates table, gaps, unilateral links added, and a
      "Proposed (needs sign-off)" section for any id-level merges.
- [ ] Unilateral `alternatives` links added between existing entries only; picker can resolve them.
- [ ] No existing `exercise_id` renamed/removed (history-safe).
- [ ] `tsc --noEmit` + lint + existing tests all green.
- [ ] PR opened against `main`; `.pipeline/v2-exercise-w6b/changes.md` + `tests.md` filled.

---

## Cross-references

- Dossier source → `domains/01-workout-engine/DOSSIER.md` DQ-4 (a) + (b), w6b row
- w6a (search fix + create wiring, MERGED) → don't re-touch the matcher
- w6c (`custom_exercises` table, Class B) → out of scope, separate wave
- Guardrails → `plans/v2_guardrails.md` (history-keyed ids, fence discipline)
- Pipeline model → `plans/v2_pipeline_model.md` (Plan→Code→Test→Review)
