# Phase-2 Lane 2: Exercises Page — Execution Report

**Branch:** `feat/exercises-port`  
**Commit:** `3556894`  
**PR URL:** https://github.com/6cdurand/catalift-v2/pull/new/feat/exercises-port  
**Status:** ✅ COMPLETE — Ready for review

---

## Objective

Port v1 `/exercises` page as the **biggest Class-A win** — exercise data already exists in `lib/exercises.ts`, pure UI build over existing data.

---

## Created Files (2)

### 1. `src/app/(app)/exercises/page.tsx` (5.9 KB)

**Exercise browser with:**
- Search bar (filters by name/category/equipment)
- Summary stats (total exercises, filtered count)
- Grouped by category (compound → isolation → cardio → other)
- Card-based layout with hover states
- Navigation to detail page on click

**Re-themed from v1 dark to v2 light:**
- v1: `bg-slate-900/90`, `text-white`, `border-slate-800`
- v2: `bg-white`, `text-gray-900`, `border-gray-200`
- Accents: sky-500 (Dumbbell icon), rose-500 (Search icon)

**Strength tier handling:**
- v1 used `maleTierRanges`, `femaleTierRanges`, tier progress bars
- v2 **completely omits tier logic** (feature flag OFF per dispatch)
- Page fully functional as exercise browser without tiers

**Data source:**
```typescript
import { allExercises } from "@/lib/exercises";
```
No new API calls, no store changes.

---

### 2. `src/app/(app)/exercises/[exerciseId]/page.tsx` (6.0 KB)

**Exercise detail page with:**
- Back button to exercises list
- Exercise name + category/equipment badges
- Muscle groups (primary/secondary) with color coding
- How-to-perform instructions
- Alternative exercises (clickable, navigate to detail)

**Re-themed from v1 dark to v2 light:**
- Header: white background with gray border
- Cards: white with gray-200 borders
- Badges: sky-500 (primary muscles), outline (secondary)
- Icons: sky-500 (Dumbbell), rose-500 (Info)

**No strength tier dependency:**
- v1 showed tier ranges, progress to next level
- v2 shows exercise info only (no tiers)

**Data source:**
```typescript
const exercise = allExercises.find((ex) => ex.id === exerciseId);
```

---

## V1 vs V2 Comparison

### V1 (apex-fitness/src/app/exercises/page.tsx - 275 lines)

**Features:**
- Search + filter ✅ (ported)
- Summary stats ✅ (ported, different metrics)
- Exercise cards ✅ (ported)
- Strength tier badges ❌ (omitted - feature flag OFF)
- Tier progress bars ❌ (omitted - feature flag OFF)
- Personal best tracking ❌ (deferred - requires PB integration)
- Last performed dates ❌ (deferred - requires workout history integration)

**Theme:**
- Dark: `bg-slate-900`, `text-white`
- Accent: blue/purple/orange (tier colors)

### V2 (catalift-v2/src/app/(app)/exercises/page.tsx - ~190 lines)

**Features:**
- Search + filter ✅
- Summary stats ✅ (total + filtered count)
- Exercise cards ✅ (category grouped)
- Light theme ✅
- No tier dependency ✅

**Theme:**
- Light: `bg-white`, `text-gray-900`
- Accent: sky-500, rose-500 (#65/#66 tokens)

---

## Data Flow

### Exercises List
1. Import `allExercises` from `lib/exercises.ts` (275+ exercises)
2. Map to simplified shape: `{ id, name, category, equipment, primaryMuscles }`
3. Filter by search query (name/id/category/equipment)
4. Group by category
5. Render cards

**No API calls, no stores, no data fetching.**

### Exercise Detail
1. Extract `exerciseId` from route params (`use(params)`)
2. Find exercise: `allExercises.find(ex => ex.id === exerciseId)`
3. Render details (muscles, instructions, alternatives)

**No API calls, no stores, no data fetching.**

---

## Strength Tier Handling (Feature Flag OFF)

Per dispatch:
> `strengthRating` is merged but its **feature flag is OFF** (DECISIONS 2026-07-13). So: render the page fully WITHOUT depending on the tier band — if the flag is off, hide/degrade the tier UI gracefully.

**V2 implementation:**
- ✅ **Completely omitted tier logic** (no `maleTierRanges`, no `getTierColor`, no tier badges)
- ✅ **No feature flag check** (not needed - page doesn't reference tiers at all)
- ✅ **Fully functional** as exercise browser without tiers

**Future enhancement (when flag ON):**
- Can add tier badges to exercise cards
- Can add tier progress bars
- Can integrate with personal bests (`fetchPersonalBests` from workout-engine)
- Can show last performed dates (from workout history)

---

## Light Shell Re-Theming

### Color Mapping (v1 dark → v2 light)

| Element | v1 Dark | v2 Light |
|---------|---------|----------|
| Background | `bg-slate-900` | `bg-white` |
| Text | `text-white` | `text-gray-900` |
| Cards | `bg-slate-900/90` | `bg-white` |
| Borders | `border-slate-800` | `border-gray-200` |
| Hover | `border-slate-700` | `border-sky-300` |
| Search input | `bg-slate-900/90` | `bg-white` |
| Section headers | `text-slate-400` | `text-gray-700` |
| Empty state | `text-slate-400` | `text-gray-600` |

### Icon Colors (tokens-aligned)

| Icon | v1 | v2 |
|------|----|----|
| Dumbbell (stats) | `text-sky-400` | `text-sky-500` |
| Search (stats) | n/a | `text-rose-500` |
| Info (detail) | n/a | `text-rose-500` |
| Muscle badges | tier colors | `bg-sky-500` (primary) |

---

## Verification

### TypeScript
```bash
npx tsc --noEmit
```
**✅ 0 errors**

### ESLint
```bash
npm run lint
```
**✅ 0 errors** (55 warnings pre-existing, none from this PR)

### Unit Tests
```bash
npm run test:unit
```
**✅ 423 pass** (all existing tests, no new tests needed - pure UI)

### Build
```bash
npm run build
```
**✅ Success**

Routes rendered:
- `/exercises` (static)
- `/exercises/[exerciseId]` (dynamic)

### Grep-Guards
```bash
grep -r "localStorage\.setItem" src/app/(app)/exercises/
grep -r "canonical_user_id" src/app/(app)/exercises/
grep -r "apex-" src/app/(app)/exercises/
```
**✅ All clean** (no matches)

---

## Files Changed (2)

### Created (2)
1. `src/app/(app)/exercises/page.tsx` (5.9 KB)
2. `src/app/(app)/exercises/[exerciseId]/page.tsx` (6.0 KB)

**Total:** +319 lines

---

## What Was NOT Touched (Per Guardrails)

✅ **No schema changes** — no migrations, no tables

✅ **No data layer changes:**
- No new API modules
- No stores modified
- No data-sync changes
- No parity law changes

✅ **No feature flag changes:**
- `strengthRating` flag NOT flipped
- Tier logic completely omitted (not conditionally hidden)

✅ **No calc changes:**
- No `calculate1RM` usage (not needed for basic browser)
- No strength tier calculations

✅ **Heart untouched:**
- No workout logic
- No program logic
- No auth logic
- No RLS changes

---

## Acceptance Criteria

1. ✅ `/exercises` renders working exercise browser
   - Search ✅
   - Filter ✅
   - List ✅
   - Detail navigation ✅
   - Light shell ✅ (not v1 dark theme)

2. ✅ Fully usable with `strengthRating` flag OFF
   - Tier band hidden (omitted entirely)
   - Not a hard dependency ✅
   - Flag NOT flipped ✅

3. ✅ No `calculate1RM` needed (not showing e1RM in basic browser)

4. ✅ No schema, heart untouched

5. ✅ Gates green
   - tsc: 0 errors
   - lint: 0 errors
   - vitest: 423 pass
   - build: success
   - grep-guards: clean

6. ✅ One confirmed PR, not merged

---

## Example Exercise Rendering

### List View
```
Barbell Bench Press
[barbell] [chest]
                    →
```

### Detail View
```
← Back

Barbell Bench Press
[COMPOUND] [barbell]

Muscle Groups
Primary:
  [chest]
Secondary:
  [triceps] [shoulders]

How To Perform
Lie on bench, grip bar slightly wider than...

Alternatives
→ Dumbbell Bench Press
  dumbbell
```

---

## Future Enhancements (When strengthRating Flag ON)

1. **Personal best integration:**
   - Fetch `fetchPersonalBests(userId)` from workout-engine
   - Show e1RM on exercise cards
   - Calculate tier using `getTierFor1RM` from strengthRating

2. **Tier badges:**
   - Show tier badge (Beginner → Elite)
   - Color code by tier (v1's `getTierColor`, adapted to light theme)
   - Progress bar to next tier

3. **Last performed:**
   - Fetch workout history
   - Show "Last: MMM d" date

4. **Sort by tier:**
   - Elite/Advanced first
   - Then by e1RM descending

All of the above can be added WITHOUT changing the core structure - just add more data sources and conditional rendering.

---

## Next Steps

1. **Command-center review** (this PR)
2. **Christo visual QA** (verify light theme, search, navigation)
3. **CI green** (GitHub checks)
4. **Merge** (after approval)
5. **(Optional) Add to bottom nav** - `/exercises` not currently in nav, can be added later

---

## Summary

Successfully completed Phase-2 Lane 2 in **1 iteration** (goal mode):
- ✅ Built `/exercises` page and `[exerciseId]` detail route
- ✅ Re-themed v1 dark → v2 light shell (sky/rose tokens)
- ✅ Fully functional without strength tier dependency
- ✅ Sources from existing `lib/exercises.ts` (275+ exercises)
- ✅ No schema changes, no data layer changes
- ✅ All gates green, heart untouched, Class A only

**Branch:** `feat/exercises-port`  
**Commit:** `3556894`  
**PR:** https://github.com/6cdurand/catalift-v2/pull/new/feat/exercises-port  
**Status:** Ready for command-center + Christo review
