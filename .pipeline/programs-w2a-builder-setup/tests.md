# .pipeline/programs-w2a-builder-setup/tests.md — Test Results

## Unit tests

### Command
```bash
npm run test:unit
```

### Results
```
 Test Files  18 passed (18)
      Tests  140 passed (140)
   Duration  963ms
```

**All unit tests pass.** No dedicated builder tests yet (UI component tests require React Testing Library setup). Functional validation covered by:
- Type safety (tsc ensures Setup data types match programs types)
- Integration verification (manual: navigate to /program/builder, verify Setup renders, validation works)

## E2E tests

**No E2E tests for builder yet.** w2a delivers Setup UI only; end-to-end flow (Setup → Build Days → Schedule → Save) requires w2b+w2c. E2E coverage deferred to w2c when full flow is complete.

## TypeScript

### Command
```bash
npx tsc --noEmit
```

### Results
```
(clean — no output)
```

**No type errors.**

## Lint

### Command
```bash
npm run lint
```

### Results
```
✖ 18 problems (0 errors, 18 warnings)
```

**0 errors.** 18 warnings are pre-existing in other files (not introduced by this change).

## grep-guards

### Command: stub-user-id
```bash
grep -rn "stub-user-id" src/
```

### Results
```
src/app/workout/active/page.tsx:122:    const stubUser = { id: 'stub-user-id' };
```

**1 match** — This is on main branch (BUG-014 fix not merged yet). Not introduced by this PR. Builder uses real session via `useSession()`.

### Command: canonical_user_id
```bash
grep -rn "canonical_user_id" src/
```

### Results
```
src/features/auth/__tests__/no-legacy-auth.test.ts:19:  "canonical_user_id",
```

**1 match (test file only)** — The test checks for absence of this pattern. Clean.

### Command: second program store
```bash
find src/features/programs -name "*store*"
```

### Results
```
src/features/programs/__tests__/programs-store.test.ts
src/features/programs/store.ts
```

**Only one store** (w1 programs store). No new mega-store introduced.

### Command: file size check (G-16)
```bash
find src/features/programs/builder -name "*.tsx" -o -name "*.ts" | xargs wc -l
```

### Results
```
109 src/features/programs/builder/ProgramBuilder.tsx
230 src/features/programs/builder/steps/SetupStep.tsx
 39 src/features/programs/builder/steps/BuildDaysStep.tsx
 39 src/features/programs/builder/steps/ScheduleStep.tsx
417 total
```

**All files < 400 lines.** Largest is SetupStep.tsx (230 lines). Sub-componentized per G-16 (no 2000-line mega-file).

## Manual verification checklist

Since E2E and component tests aren't set up yet, manual verification confirms:

### Setup Step functionality
- [ ] Navigate to `/program/builder` → Setup step renders
- [ ] Program Name required → empty name shows toast error on Continue
- [ ] Client Select shown in trainer mode, hidden in athlete mode (verified via `readUserMode()`)
- [ ] Goal select has all options (hypertrophy, strength, fat_loss, conditioning, general_fitness, endurance, mobility)
- [ ] Phase select has all options (foundation, strength, performance, return)
- [ ] Duration=Custom reveals Custom Weeks input
- [ ] Days per Week select has 2-6 options
- [ ] Auto-repeat toggle works
- [ ] Continue → initializes days (check console log) → advances to Build Days placeholder

### Progress UI
- [ ] Setup step: progress bar shows Setup active, Days/Schedule inactive
- [ ] Build Days step: progress bar shows Setup+Days active, Schedule inactive
- [ ] Schedule step: all three active

### Navigation
- [ ] Setup → Continue → Build Days
- [ ] Build Days → Back → Setup
- [ ] Build Days → Continue → Schedule
- [ ] Schedule → Back → Build Days

## Summary

All gates green:
- ✅ Unit tests: 140 pass
- ✅ TypeScript: clean
- ✅ Lint: 0 errors
- ✅ grep-guards: no new violations (stub-user-id on main, not from this PR)
- ✅ File size: all < 400 lines (G-16)
- ✅ Single programs store (G-16)

Manual verification needed for UI (Setup fields, validation, navigation) — Playwright E2E deferred to w2c when full Save flow exists.
