# Wave 2: Pure-Logic Port — Changes Log

## Summary
Bulk-copied v1 pure-logic files (Class A — no auth/schema/money) into `src/lib/`.
Dropped `strengthRating.ts`. Stripped data-boundary imports. Added unit tests for `medals.ts` and `deriveAll.ts`.

## Files Added (24 files in src/lib/)

### Exercise DB + helpers
- `src/lib/exercises.ts` — exercise library, `calculate1RM`, `getSetVolume`, `isAssistedExercise`, `getUserBodyweight`
- `src/lib/exerciseAliases.ts` — exercise name aliases
- `src/lib/exerciseRelations.ts` — exercise relationship mappings
- `src/lib/exerciseAnimations.ts` — animation URL mappings
- `src/lib/exerciseSearch.ts` — fuzzy search via fuse.js
- `src/lib/exerciseVideos.ts` — video URL mappings
- `src/lib/exerciseImageGen.ts` — image generation helpers

### Program templates + content
- `src/lib/programTemplates.ts` — program template definitions
- `src/lib/suggestedPrograms.ts` — suggested program logic
- `src/lib/templates.ts` — workout template builders
- `src/lib/trainerTemplates.ts` — trainer-created templates
- `src/lib/pgifTemplates.ts` — PGIF template system
- `src/lib/templates/foundationTemplates.ts` — foundation template data
- `src/lib/templates/strengthTemplates.ts` — strength/performance/return templates
- `src/lib/templates/userTemplates.ts` — user-mode basic templates

### Gamification
- `src/lib/medals.ts` — medal definitions, evolution glow, tier progression (DROPPED strengthRating.ts)

### Derived stats / pure helpers
- `src/lib/deriveAll.ts` — full derive pipeline (PBs, medals, volume rollups)
- `src/lib/exerciseStats.ts` — exercise stats service (patched: stripped strengthRating import)
- `src/lib/getLastSetForExercise.ts` — previous set/workout lookup
- `src/lib/workoutEstimator.ts` — workout estimation logic
- `src/lib/programProgress.ts` — program progress tracking
- `src/lib/programDiff.ts` — program diff logic
- `src/lib/programStartUtils.ts` — program start conversion utilities
- `src/lib/unitConversion.ts` — weight unit conversion
- `src/lib/weeklyStripPills.ts` — weekly strip pill logic
- `src/lib/calendarScope.ts` — calendar event scoping

### Types
- `src/types/index.ts` — v1 type definitions (Exercise, Workout, PersonalBest, MedalDefinition, etc.)

### Tests
- `src/lib/__tests__/medals.test.ts` — 28 tests covering static data, lookups, evolution glow, tier progression, utilities
- `src/lib/__tests__/deriveAll.test.ts` — 26 tests covering recomputePBs, computeVolumeRollup, checkAllMedals, deriveAll pipeline

## Files Modified
- `package.json` — added `uuid`, `fuse.js` deps; added `@types/uuid` devDep
- `package-lock.json` — lockfile updated
- `src/lib/exerciseStats.ts` — patched: replaced `./strengthRating` import with `./exercises` for `calculate1RM`; stripped tier-related code (`maleTierRanges`, `femaleTierRanges`, `getTierFor1RM`); `currentTier` and `tierProgress` now always `undefined`

## Files Dropped
- `strengthRating.ts` — NOT copied (per spec)

## Data-boundary imports stripped
- No files imported from `@/lib/store`, `@/lib/supabaseSync`, `@/lib/supabase`, or `@/lib/safeStorage` — all copied files were pure logic.
- `exerciseStats.ts` imported from `./strengthRating` (DROPPED) — patched to import `calculate1RM` from `./exercises` instead.

## utils.ts conflict
- v1 `utils.ts` was identical to v2 `utils.ts` (both use `clsx` + `tailwind-merge` `cn` function). No conflict — v2 version retained as-is.

## ESLint disables added
- File-level `/* eslint-disable @typescript-eslint/no-explicit-any */` on 6 files (deriveAll, exercises, exerciseStats, getLastSetForExercise, programStartUtils, programTemplates) — ported v1 code uses `any` in complex logic.
- File-level `/* eslint-disable @typescript-eslint/no-require-imports */` on `templates/userTemplates.ts` — ported v1 code uses `require()` style imports.

## Dependencies installed
- `uuid` + `@types/uuid` — used by exercises.ts, templates.ts, trainerTemplates.ts, deriveAll.ts
- `fuse.js` — used by exerciseSearch.ts
