# .pipeline/programs-w2a-builder-setup/changes.md — Programs w2a Changes

## Objective
Build program builder wizard SHELL + Step 1 (Setup) fully working. Steps 2+3 are placeholders for w2b/w2c.

## Files created

### 1. `src/features/programs/constants.ts` (NEW)
Program builder constants missing from w1:
- `DAY_LABEL_PRESETS`: Default day labels by training frequency (2-6 days/week)
  - 2: ['Upper Body', 'Lower Body']
  - 3: ['Push', 'Pull', 'Legs']
  - 4: ['Upper A', 'Lower A', 'Upper B', 'Lower B']
  - 5: ['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B']
  - 6: ['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B']
- `DEFAULT_SCHEDULE`: Default weekly schedule suggestions (maps daysPerWeek → Weekday[])
- `GOAL_LABELS`: Training goal UI labels (hypertrophy→Muscle Growth, etc.)
- `PHASE_LABELS`: Training phase UI labels (foundation→Foundation, etc.)

### 2. `src/features/programs/builder/ProgramBuilder.tsx` (NEW, 109 lines)
Main builder wizard shell component:
- Three-step progress UI (Setup · Build Days · Schedule)
- State management: `builderStep`, `setupData`
- `initializeDays()`: Creates empty ProgramDay[] from daysPerWeek using DAY_LABEL_PRESETS
- Step routing: renders SetupStep, BuildDaysStep, or ScheduleStep based on current step
- w2a: Setup fully functional; steps 2+3 are placeholders

### 3. `src/features/programs/builder/steps/SetupStep.tsx` (NEW, 230 lines)
Step 1: Setup — fully functional, ported from v1:
- **Fields (match v1 order/options):**
  - Program Name (text input, required)
  - Client Select (trainer mode only, currently disabled with TODO for Box 4 roster)
  - Training Goal (select: hypertrophy, strength, fat_loss, conditioning, general_fitness, endurance, mobility)
  - Training Phase (select: foundation, strength, performance, return)
  - Duration (select: 4/6/8/12 weeks, Custom)
  - Custom Weeks (number input, shown when Duration=Custom)
  - Days per Week (select: 2-6)
  - Auto-repeat (switch: "Restart program after completion")
- **Validation:**
  - Blocks "Continue" if program name empty (toast error)
  - Blocks if Custom duration selected but customWeeks invalid
- **Flow:**
  - "Continue to Build Days" → calls onContinue(setupData) → parent initializes days → advances to step 'days'

### 4. `src/features/programs/builder/steps/BuildDaysStep.tsx` (NEW, 39 lines)
Step 2 placeholder for w2b:
- Displays "Build Days — w2b" message
- "WorkoutDayBuilder, Add-Exercise, Block Library coming in w2b"
- Back/Continue buttons (functional navigation)

### 5. `src/features/programs/builder/steps/ScheduleStep.tsx` (NEW, 39 lines)
Step 3 placeholder for w2c:
- Displays "Schedule — w2c" message
- "Fixed/Flexible scheduling, day assignment coming in w2c"
- Back/Save buttons (functional navigation)

### 6. `src/app/program/builder/page.tsx` (NEW, 38 lines)
Route file for `/program/builder`:
- Suspense wrapper with loading state
- Uses `useSession()` for auth (real session, not stub)
- Derives `isTrainerMode` from `readUserMode(user.user_metadata)`
- Passes mode to `<ProgramBuilder isTrainerMode={...} />`

## Files modified

### 1. `src/features/programs/types.ts`
**Added missing enum values from v1:**
- `TrainingPhase`: Added `foundation`, `performance`, `return` (were: strength, hypertrophy, endurance, mobility, none)
- `TrainingGoal`: Added `fat_loss` (alias for weight_loss), `conditioning` (were: hypertrophy, strength, general_fitness, weight_loss, endurance, mobility)

**Rationale:** v1 Setup uses these values; needed for port-fidelity (G-19). Additive only (no breaking changes to w1 saved programs).

## Proof block — Guardrails

```
[x] G-16 builder uses w1 programs store — NO new mega-store (uses existing store.ts + types.ts)
[x] G-16 NO 2000-line file — largest file is SetupStep.tsx (230 lines), builder/ total 417 lines
[x] G-10 real uuids — initializeDays() uses uuidv4() for ProgramDay.id
[x] G-10 no stub ids — page.tsx uses useSession() (real user from BUG-014 pattern)
[x] no localStorage program persistence — state in React (setupData); w2c will use programs store + persist API
[x] no canonical_user_id — uses user.id from Supabase session
[x] no next-day/rotation recompute — Setup only; scheduling is w2c
[x] PORT-UI fidelity — Setup fields/order/options/validation match v1 (adapted to v2 theme)
[x] tsc + eslint + vitest green
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
✖ 18 problems (0 errors, 18 warnings)
```
(0 errors; 18 warnings pre-existing in other files)

### Unit tests
```
npm run test:unit
 Test Files  18 passed (18)
      Tests  140 passed (140)
   Duration  963ms
```

### grep-guards
```
grep -rn "stub-user-id" src/
src/app/workout/active/page.tsx:122:    const stubUser = { id: 'stub-user-id' };
```
(This is on main branch — BUG-014 fix not merged yet; not introduced by this PR)

```
grep -rn "canonical_user_id" src/
src/features/auth/__tests__/no-legacy-auth.test.ts:19:  "canonical_user_id",
```
(Only in test file checking for absence — clean)

```
find src/features/programs -name "*store*"
src/features/programs/__tests__/programs-store.test.ts
src/features/programs/store.ts
```
(Only one store — w1 programs store)

```
find src/features/programs/builder -name "*.tsx" -o -name "*.ts" | xargs wc -l
109 ProgramBuilder.tsx
230 SetupStep.tsx
 39 BuildDaysStep.tsx
 39 ScheduleStep.tsx
417 total
```
(All files < 400 lines; sub-componentized per G-16)

## Deviations / Risks

### 1. Client list source unavailable (expected)
**Issue:** SetupStep Client Select renders disabled with TODO.
**Root cause:** Box 4 (trainer roster / trainer_clients table) not built yet.
**Mitigation:** Disabled select with explanatory message "Client roster will be available when trainer features are enabled". Do NOT fake client data (per spec: "report it — do NOT fake clients").
**Resolution:** w2d or Box 4 will wire real trainer_clients query.

### 2. Type additions (TrainingPhase + TrainingGoal)
**Added values:**
- `TrainingPhase`: `foundation`, `performance`, `return`
- `TrainingGoal`: `fat_loss`, `conditioning`

**Rationale:** v1 Setup uses these values. Additive only (no removal). Backward-compatible with w1 saved programs.
**Risk:** Low. New values don't break existing data (SavedProgram.phase/goals can hold new values).

### 3. initializeDays() placeholder
**Current:** Logs initialized days to console; does NOT write to programs store.
**Reason:** w1 programs store has no `setDays()` action yet; w2b will add it when building WorkoutDayBuilder.
**Mitigation:** Days array created correctly (verified in console); w2b will wire persistence.

## Summary

Built program builder wizard SHELL with 3-step progress UI + Step 1 (Setup) fully functional. Setup matches v1 fields/order/options/validation (port-fidelity per G-19), adapted to v2 theme + w1 programs types/store. Steps 2+3 are placeholders ("Build Days — w2b" / "Schedule — w2c"). Sub-componentized into 4 files (largest 230 lines). All tests green. No schema changes. No new dependencies.

## Next
Conductor reviews. If approved:
- Merge to main → w2b dispatch (WorkoutDayBuilder + exercise dialogs)
- Box 4 (roster) wires real client list to Setup's Client Select
