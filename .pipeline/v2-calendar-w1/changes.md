# changes.md — Calendar Wave 1 (ScheduledSession type + pure selectors)

## What was built

- `src/features/calendar/types.ts` — canonical `ScheduledSession` type (DQ-1 confirmed shape)
- `src/features/calendar/lib/selectors.ts` — pure selectors: `buildScheduledSessions`, `getSessionsForDate`, `deriveStatus`
- `src/features/calendar/lib/__tests__/selectors.test.ts` — 26 tests covering all spec cases
- `src/features/calendar/index.ts` — public API barrel

## THE ONE LAW (parity — consumed, not recomputed)

Calendar **consumes** the v2 programs `getNextProgramWorkout` result (`NextWorkoutResult`) as input — it **never recomputes which day is next.** The selector maps the already-computed result + schedule configuration to `ScheduledSession` rows.

- Flexible mode: uses `next.dayIndex` and `next.day` directly — no day-index arithmetic.
- Fixed mode: uses `weeklyPlan[i].scheduledDay` (schedule configuration) to place sessions on weekdays — this is NOT next-day logic, it's reading the program's static schedule config.

## STEP 0 — v2 programs API located

- Export: `getNextProgramWorkout` + `type NextWorkoutResult` from `@/features/programs` (barrel: `src/features/programs/index.ts:17-21`)
- Source: `src/features/programs/lib/get-next-workout.ts`
- Return type `NextWorkoutResult`: `{ dayIndex, day, remainingThisWeek, completedDayIndices, lockedDayIndices, isScheduledToday, nextScheduledDay?, isExpired }`
- Calendar imports `ClientProgram`, `NextWorkoutResult`, `Weekday` from `@/features/programs` (type-only imports)

## Guardrails — must-not-regress checklist

- [x] PARITY: no next-day/day-index arithmetic inside src/features/calendar/ — selectors consume `next` as given
- [x] Today + Calendar derive from the SAME buildScheduledSessions output (one selector, one shape)
- [x] selectors are PURE — no `new Date()` / `Date.now()` inside; `today` is injected
- [x] dates are ISO YYYY-MM-DD device-local — never a timestamp
- [x] NO change to src/features/programs/** (fence held — calendar imports, doesn't edit)
- [x] NO migration, NO supabase/ change, NO auth touch (Class A)
- [x] no `apex-` / `canonical_user_id` legacy strings (grep → 0)
- [x] tsc --noEmit clean · lint clean (0 errors) · vitest green (26/26)

## Gates

- `npx tsc --noEmit` → 0 errors (clean exit)
- `npm run lint` → 0 errors (17 pre-existing warnings, none in calendar/)
- `npx vitest run src/features/calendar` → 26 tests passed (1 file)

## Schema touched?

N — no migration, no supabase change, no auth touch.

## Deviations from spec

None. The `ScheduledSession` type matches the DQ-1 confirmed shape exactly. Selectors are pure with injected `today`. The v2 `NextWorkoutResult` has fewer fields than the v1 reference shape (no `slotScheduledDays`, `sessionType`, `nextSuggestedDay`, `weekSlots`, etc.) — calendar w1 works with the actual v2 type, not the v1 reference. The `sessionType` is read from `program.sessionPTMap[dayIndex]` instead of the `NextWorkoutResult` (v2 doesn't carry it on the result).
