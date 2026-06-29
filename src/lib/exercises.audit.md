# Exercise Library Dedup Audit — w6b

> **Date:** 2025-01-20
> **Branch:** `exercise-w6b-library-dedup-audit`
> **Verifier:** `npm run audit:exercises` → all invariants PASS

## Cardinal Rule

No existing `exercise_id` was renamed or deleted. All edits are **additive only**:
- New `aliases[]` arrays
- New `alternatives[]` arrays
- New `unilateralVariantId` links
- No IDs changed, no entries removed

---

## 1. Duplicate IDs (Cross-Array Repeats)

The following 16 IDs appear in multiple arrays (`_rawExerciseLibrary` + `warmupExercises` and/or `cardioExercises`). This is **expected behavior** — `allExercises` deduplicates by priority (main library > warmup > cardio). No action needed.

| ID | Arrays |
|---|---|
| `walking-lunges` | main, warmup |
| `mountain-climbers` | main, warmup |
| `battle-ropes` | main, cardio |
| `hip-circles` | main, warmup |
| `leg-swings` | main, warmup |
| `arm-circles` | main, warmup |
| `shoulder-dislocates` | main, warmup |
| `high-knees` | main, warmup |
| `butt-kicks` | main, warmup |
| `jumping-jacks` | main, warmup |
| `hip-flexor-stretch` | main, warmup |
| `ski-erg` | main, cardio |
| `assault-bike` | main, cardio |
| `lat-stretch` | main, warmup |
| `childs-pose` | main, warmup |
| `hamstring-stretch` | main, warmup |

**No intra-array duplicates found.** INV-1 PASS.

---

## 2. Aliases Added

| Exercise ID | Aliases Added |
|---|---|
| `bench-press` | Bench Press, Flat Bench Press |
| `dumbbell-bench-press` | DB Bench Press, Dumbbell Press |
| `pec-deck` | Pec Deck, Butterfly Machine |
| `barbell-row` | Bent Over Row, Barbell Row |
| `dumbbell-row` | DB Row, One Arm Dumbbell Row |
| `cable-row` | Seated Row |
| `lat-pulldown` | Lat Pulldown |
| `pull-ups` | Pull Up, Pullup |
| `overhead-press` | OHP, Military Press, Shoulder Press |
| `dumbbell-shoulder-press` | DB Shoulder Press |
| `lateral-raises` | Side Raises, Lateral Raise |
| `barbell-curl` | BB Curl |
| `ez-bar-curl` | EZ Curl |
| `dumbbell-curl` | DB Curl, Dumbbell Curl |
| `skull-crushers` | Lying Tricep Extension, French Press |
| `overhead-tricep-extension` | Overhead Tricep Ext |
| `back-squat` | Squat, Back Squat |
| `romanian-deadlift` | RDL |
| `dumbbell-rdl` | DB RDL, Dumbbell RDL |
| `leg-curl` | Hamstring Curl |
| `hip-thrust` | Hip Thrust |
| `glute-bridge` | Hip Bridge |
| `cable-kickbacks` | *(none — already had clear name)* |
| `hip-abduction` | Hip Abductor |
| `hip-adduction` | Hip Adductor |
| `shrugs` | Barbell Shrug |

**Total: 25 exercises with aliases.** INV-3 PASS — no alias collides with any existing ID or primary name.

---

## 3. Alternatives Links Added

All links are **symmetric** (A→B implies B→A). INV-4 PASS.

| Exercise A | Exercise B | Rationale |
|---|---|---|
| `bench-press` | `dumbbell-bench-press` | Barbell ↔ DB variant |
| `pec-deck` | `chest-fly-machine` | Machine fly duplicates |
| `barbell-row` | `dumbbell-row` | Barbell ↔ DB row |
| `cable-row` | `single-arm-cable-row` | Bilateral ↔ unilateral |
| `lat-pulldown` | `pull-ups` | Lat pulldown ↔ bodyweight pull |
| `overhead-press` | `dumbbell-shoulder-press` | Barbell ↔ DB press |
| `lateral-raises` | `cable-lateral-raises` | DB ↔ cable lateral raise |
| `barbell-curl` | `ez-bar-curl` | Barbell ↔ EZ bar curl |
| `dumbbell-curl` | `concentration-curl` | Standing ↔ concentration |
| `overhead-tricep-extension` | `kickbacks` | Overhead ↔ kickback tricep |
| `back-squat` | `front-squat` | Back ↔ front squat |
| `romanian-deadlift` | `dumbbell-rdl` | Barbell ↔ DB RDL |
| `leg-curl` | `seated-leg-curl` | Lying ↔ seated leg curl |
| `hip-thrust` | `glute-bridge` | Loaded ↔ bodyweight glute |
| `glute-bridge` | `glute-bridges` | Main library ↔ activation entry |
| `cable-kickbacks` | `glute-kickback-machine` | Cable ↔ machine kickback |
| `hip-abduction` | `outer-thigh-machine` | Machine abduction duplicates |
| `hip-adduction` | `inner-thigh-machine` | Machine adduction duplicates |
| `shrugs` | `dumbbell-shrugs` | Barbell ↔ DB shrug |

**Total: 37 exercises with alternatives links (19 symmetric pairs).**

---

## 4. Unilateral Variant Links Added

| Bilateral Exercise | Unilateral Variant | Rationale |
|---|---|---|
| `barbell-row` | `dumbbell-row` | Two-arm barbell ↔ one-arm DB |
| `cable-row` | `single-arm-cable-row` | Bilateral ↔ single-arm cable |
| `dumbbell-curl` | `concentration-curl` | Alternating DB curl ↔ concentration |
| `overhead-tricep-extension` | `kickbacks` | Bilateral overhead ↔ unilateral kickback |

**Total: 4 unilateralVariantId links.**

---

## 5. Proposed ID Merges (Flagged for Human Sign-Off)

The following pairs are **semantic duplicates** — same movement, different IDs. They are NOT merged in this pass. Merging would require renaming one ID and adding a redirect, which risks orphaning user history. Flagged for review.

| Keep ID | Merge Candidate | Reason | Risk |
|---|---|---|---|
| `pec-deck` | `chest-fly-machine` | Same machine fly movement, different names | Low — both are machine isolation, but users may have PBs on either |
| `glute-bridge` | `glute-bridges` | Singular vs plural — same exercise | Low — activation vs main library entry |
| `hip-abduction` | `outer-thigh-machine` | Same machine, different naming convention | Medium — different muscle tags (glutes vs glutes) |
| `hip-adduction` | `inner-thigh-machine` | Same machine, different naming convention | Medium — same concern as abduction |
| `cable-kickbacks` | `glute-kickback-machine` | Cable vs machine glute kickback | Medium — different equipment, may warrant keeping separate |

**Recommendation:** Keep all pairs separate for now. The `alternatives[]` links provide cross-referencing. Merge only after confirming no user PBs exist on the merge-candidate IDs.

---

## 6. Verifier Results

```
✅ INV-1 PASS: No duplicate ids within any single array
   ℹ️  16 ids appear in multiple arrays (expected — allExercises dedups by priority)
✅ INV-2 PASS: All alternatives/unilateralVariantId resolve to existing ids
✅ INV-3 PASS: No alias↔id/name collisions
✅ INV-4 PASS: All alternatives links are symmetric

📊 INV-5 Summary:
   Total exercises: 242
   With aliases: 25
   With alternatives: 37
   With unilateralVariantId: 4
   Cross-array repeats: 16

🟢 Audit PASSED — all FAIL-level invariants green.
```

---

## 7. Files Changed

| File | Change |
|---|---|
| `src/types/index.ts` | Added `aliases?`, `alternatives?`, `unilateralVariantId?` to `Exercise` interface |
| `src/lib/exercises.ts` | Added aliases, alternatives, unilateralVariantId to ~40 exercises |
| `scripts/audit-exercises.mjs` | New verifier script (INV-1 through INV-5) |
| `package.json` | Added `audit:exercises` npm script |
| `src/lib/exercises.audit.md` | This report |
