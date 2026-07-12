# .pipeline/pbs-screen-port/changes.md — PBs Screen Port

## Objective
Port v1's Personal Bests screen (`/pbs`) to v2 as a **verbatim UI port**, rewiring only the data seam to v2 stores. Self-only view (trainer per-client deep-dive deferred per spec).

## Files Created

### 1. `src/app/(app)/pbs/page.tsx` (NEW, 407 lines)
Main PBs screen component — verbatim port of v1 layout + behavior:

**UI (v1 preserved):**
- PageHeader: "Personal Bests" with total PB count subtitle
- Search bar (Search icon, placeholder "Search exercise…")
- Sort dropdown: e1RM (high → low) / Recent / A → Z
- PB card list: exercise name, bestWeight×reps, date, e1RM badge (amber)
- Tap-to-expand: inline recharts LineChart (e1RM progression over time)
- Empty states:
  - No PBs: Trophy icon, "No personal bests yet" + helper text
  - No matches: Search icon, "No PBs match your search"
  - Expanded row: "Only one logged session" / "No history found"

**Theme (v1 light theme preserved):**
- text-gray-900, bg-white, border-gray-200
- Amber e1RM accent (#f59e0b)
- Gray muted text (text-gray-500/400)
- Hover: bg-gray-50

**Data seam (v1 → v2):**
- `useAuthStore` → v2 `useSession()` (real Supabase session, not stub)
- `useWorkoutStore.personalBests` → `fetchPersonalBests(userId)` from v2 workout-engine API
- `useWorkoutStore.workoutHistory` → `fetchWorkoutHistoryWithBlocks(userId)` from v2 workout-engine API
- `exerciseLibraryMap` → v2 `src/lib/exercises.ts` (direct import)
- `calcE1RM` (local duplicate) → v2 canonical `calculate1RM` wrapped with PB rule guards

**BUG-302 FIX (critical):**
v1 defined a local `calcE1RM` duplicate that admitted it copied `exercises.ts:calculate1RM`.
v2 port eliminates this divergence:
- Imports v2's ONE canonical `calculate1RM(weight, reps)` from `src/lib/exercises.ts`
- Wraps it in a local `calcE1RM` that adds PB rule guards:
  - Exclude reps ≤ 0, weight ≤ 0
  - Exclude reps > 20 (per v1 PB rule)
  - Delegates to canonical function for Brzycki (≤6) / Epley (7+)
- No second formula — single source of truth

**Progression chart logic:**
- Derives one point per workout that contained the selected exercise
- Best set e1RM from that workout (loops WorkoutBlock[] — straight/superset/circuit)
- Sorted chronologically (oldest → newest)
- Empty handling:
  - ≥ 2 points: recharts LineChart (amber line, dots, CartesianGrid)
  - 1 point: "Only one logged session for this exercise — log more to see a progression chart."
  - 0 points: "No history found for this exercise."
- Footer badge: "{N} session(s) logged" + "First: {e1rm}kg → Latest: {e1rm}kg"

**Loading state:**
- Derives `loading` from useSession (v2 #44 pattern: no premature redirect)
- Shows "Loading your personal bests…" while fetching data

**Sort + filter:**
- Search: case-insensitive, matches exerciseName or exerciseId
- Sort e1rm: descending by oneRepMax
- Sort recent: descending by achievedAt
- Sort alphabetical: ascending by display name (catalog name or fallback)

### 2. `src/app/(app)/pbs/__tests__/pbs-sort-filter.test.ts` (NEW, 168 lines)
Unit tests for sort + filter selector logic (pure functions, no component rendering):

**8 tests (all pass):**
1. sorts by e1RM descending (default)
2. sorts by recent (achievedAt descending)
3. sorts alphabetically by display name
4. filters by search term (exercise name)
5. filters by search term (exercise ID)
6. returns empty array when no matches
7. search is case-insensitive
8. combines search + sort correctly

**Test data:**
- 3 mock PBs (bench-press: 100kg, squat: 140kg, deadlift: 160kg)
- Extended to 4 PBs for combo test (overhead-press: 70kg)

**Extracted logic:**
`filterAndSortPBs(pbs, searchTerm, sortBy, getDisplayName)` — pure function that replicates the useMemo logic from the component for testability.

## Files Modified
None. This is a greenfield route — no existing v2 /pbs page.

## Data Flow (v1 → v2)

### Personal Bests
**v1:** `useWorkoutStore.personalBests` (Zustand store, pre-loaded)
**v2:** `fetchPersonalBests(userId)` from `@/features/workout-engine/api/fetch-personal-bests`
- Reads `personal_bests` table (RLS-scoped via auth.uid())
- Returns `PersonalBestItem[]`: id, exerciseId, exerciseName, userId, oneRepMax, bestWeight, bestReps, bestVolume, achievedAt
- Sorted by oneRepMax descending (fetched pre-sorted, re-sorted client-side per UI)

### Workout History (for progression chart)
**v1:** `useWorkoutStore.workoutHistory` (Zustand store, pre-loaded)
**v2:** `fetchWorkoutHistoryWithBlocks(userId)` from `@/features/workout-engine/api/fetch-history`
- Reads `workouts` table (RLS-scoped via auth.uid())
- Returns `WorkoutHistoryBlocks[]`: id, performedAt, blocks: WorkoutBlock[]
- Parses blocks (straight/superset/circuit) to extract exercise sets
- No status filter (completed-only per RLS/table design)

### Exercise Library
**v1:** `exerciseLibraryMap` from `@/lib/exercises` (Map<string, ExerciseMetadata>)
**v2:** Same — `exerciseLibraryMap` from `src/lib/exercises.ts` (direct import)
- No change needed; v2 lib/exercises.ts already copied from v1 (audit 2026-07-12)

### e1RM Calculation
**v1:** Local `calcE1RM` duplicate (Brzycki ≤6, Epley 7–20, >20 excluded)
**v2:** Wraps canonical `calculate1RM` from `src/lib/exercises.ts`:
```typescript
function calcE1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps > 20) return 0; // v1 PB rule: exclude high-rep sets
  return calculate1RM(weight, reps); // canonical Brzycki/Epley
}
```
**Benefit:** Single source of truth (BUG-302 fix). If the canonical formula changes, the PBs page inherits it automatically.

### Auth
**v1:** `useAuthStore` → `user, isAuthenticated` (Zustand, custom hash auth)
**v2:** `useSession()` → `user, loading` (Supabase SSR session)
- Derives loading state during render (v2 #44 pattern: no premature redirect)
- user.id flows into fetchPersonalBests + fetchWorkoutHistoryWithBlocks

## Deviations from v1

### 1. Loading state pattern
**v1:** `useRequireAuth` (custom hook, immediate redirect if not authenticated)
**v2:** Derives `loading` from `useSession()`, shows loading UI, then renders (v2 #44 pattern)
**Rationale:** v2 auth pattern avoids reload races. Same UX, different implementation.

### 2. Data fetching
**v1:** Pre-loaded Zustand store (`useWorkoutStore` populates on mount)
**v2:** Explicit useEffect with `fetchPersonalBests` + `fetchWorkoutHistoryWithBlocks`
**Rationale:** v2 doesn't have a global workout store. Per-route fetching is the v2 pattern (see Profile, Workouts routes).

### 3. e1RM source
**v1:** Local `calcE1RM` duplicate (admitted in comments)
**v2:** Wraps canonical `calculate1RM` (BUG-302 fix)
**Rationale:** Eliminates formula divergence. Single source = single behavior.

### 4. WorkoutBlock parsing
**v1:** Assumed `workoutHistory` had `exercises: Array<{ exerciseId, sets }>` (flat structure)
**v2:** Parses `WorkoutBlock[]` union (straight/superset/circuit) to extract exercises
**Rationale:** v2 workout-engine uses a richer block model. Parsing logic matches the serialized structure.

## Proof Block — Acceptance Criteria

```
[x] /pbs renders v1's layout verbatim: PageHeader w/ count, search + sort, PB cards, inline chart, empty states
[x] All data from v2 stores (fetchPersonalBests + fetchWorkoutHistoryWithBlocks)
[x] PBs filtered to signed-in user (userId passed to fetch functions, RLS enforces)
[x] e1RM uses v2's SINGLE canonical helper (wrapped calculate1RM, no duplicate formula)
[x] tsc: 0 errors
[x] lint: 0 errors (49 warnings pre-existing)
[x] vitest: 351 pass (343 existing + 8 new sort/filter tests)
[x] grep-guards: 0 matches (stub-user-id | canonical_user_id | apex- | localStorage)
[x] e2e smoke (manual): sign in → /pbs → search + change sort → expand a row → chart or fallback copy renders, no console errors
```

## Verification

### TypeScript
```
npx tsc --noEmit
(clean — no output)
```

### Lint
```
npm run lint
✖ 49 problems (0 errors, 49 warnings)
```
(0 errors; 49 warnings pre-existing)

### Unit tests
```
npm run test:unit
 Test Files  39 passed (39)
      Tests  351 passed (351)
   Duration  2.31s
```
**New tests:** 8 tests in `pbs-sort-filter.test.ts` (sort e1rm, recent, alphabetical; filter by name/id; case-insensitive; combo)

### grep-guards
```
grep -rn "stub-user-id" src/app/\(app\)/pbs/
(no output — 0 matches)

grep -rn "canonical_user_id" src/app/\(app\)/pbs/
(no output — 0 matches)

grep -rn "apex-" src/app/\(app\)/pbs/
(no output — 0 matches)

grep -rn "localStorage" src/app/\(app\)/pbs/
(no output — 0 matches)
```

## Out of Scope (per spec)
- Trainer per-client PB deep-dive (v1 §7 out-of-scope)
- strengthRating tiers (BUG-302, separate task)
- `/exercises` route (separate lane)
- `/reports` route (separate lane)

## Summary
Ported v1's Personal Bests screen to v2 as a verbatim UI port (light theme, layout, behavior all preserved). Rewired data seam to v2 workout-engine API (fetchPersonalBests + fetchWorkoutHistoryWithBlocks). Fixed BUG-302 by eliminating local e1RM duplicate — wraps v2 canonical calculate1RM with PB rule guards (single source of truth). All tests green. Grep-guards pass. Route `/pbs` now functional in v2.

## Next
After PR merges, update reuse-map `PBs` row → ✅ with PR #.
