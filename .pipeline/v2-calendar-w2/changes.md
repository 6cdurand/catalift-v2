# changes.md — Calendar Wave 2 (grid redesign + shared hook)

## What was built

- `src/features/calendar/hooks/useScheduledSessions.ts` — the ONE shared hook feeding both Today and Calendar
  - Computes `today` once (device-local ISO, lazy `useState` — never recomputed)
  - Fetches `workouts.performed_at` rows from Supabase → `completedDates`
  - Derives `completedDayIndices` (fixed: weekday→planIdx mapping; flexible: sequential)
  - Calls `getNextProgramWorkout` + `buildScheduledSessions` ONCE
  - `todaySessions` = `getSessionsForDate(sessions, today)` — a SLICE, not a second query
  - Exports pure helpers: `buildScheduledSessionsResult`, `deriveCompletedDayIndices`, `toISODate`
- `src/features/calendar/components/CalendarGrid.tsx` — month grid with weekday header, day cells, smooth month nav
  - Memoized grid cells (no per-cell refetch)
  - Month navigation via prev/next buttons (state only, no data refetch)
  - Status legend (done/upcoming/missed/rest)
- `src/features/calendar/components/DayCell.tsx` — individual day cell
  - Renders status dots (Check/Circle/AlertCircle/Moon icons)
  - Distinct rest-day cell (gray bg + Moon icon)
  - Highlights today with ring
  - `data-state` + `data-today` attributes for testability
- `src/app/(app)/today/page.tsx` — wired to `useScheduledSessions` (was placeholder)
- `src/app/(app)/calendar/page.tsx` — new Calendar route using `CalendarGrid` + hook
- `src/features/calendar/index.ts` — extended public API with w2 exports
- `vitest.config.ts` — added `.tsx` to test include patterns (for component tests)

## THE ONE LAW (parity — consumed, not recomputed)

Today and Calendar render from the SAME `useScheduledSessions` hook output:
- The hook calls `buildScheduledSessions` ONCE and injects a single `today` value.
- `todaySessions` is `getSessionsForDate(sessions, today)` — a slice of the SAME list.
- No second `new Date()` computation. No day-index/next-day arithmetic in calendar code.
- The grid is memoized — month navigation is pure UI state, no data refetch.

## STEP 0 — w1 consumed as-is (frozen)

- `src/features/calendar/types.ts` — NOT edited (w1 frozen)
- `src/features/calendar/lib/selectors.ts` — NOT edited (w1 frozen)
- `src/features/calendar/index.ts` — extended with w2 exports (w1 exports unchanged)

## Guardrails — must-not-regress checklist

- [x] PARITY: `todaySessions === getSessionsForDate(sessions, today)` — same object references
- [x] Today + Calendar derive from the SAME hook output (one `buildScheduledSessions` call)
- [x] Only ONE `new Date()` for `today` computation (inside the hook, lazy `useState`)
- [x] No day-index/next-day arithmetic in `src/features/calendar/**` (grep-guard test enforces)
- [x] Dates are ISO YYYY-MM-DD device-local — never a timestamp
- [x] NO change to `types.ts` or `selectors.ts` (w1 frozen — grep-guard test verifies exports)
- [x] NO migration, NO supabase/ change, NO auth touch (Class A)
- [x] no `apex-` / `canonical_user_id` legacy strings (grep → 0)
- [x] tsc --noEmit clean · lint clean (0 errors) · vitest green (56/56)

## Gates

- `npx tsc --noEmit` → 0 errors (clean exit)
- `npm run lint` → 0 errors (17 pre-existing warnings, none in calendar/)
- `npx vitest run src/features/calendar` → 56 tests passed (5 files)

## Schema touched?

N — no migration, no supabase change, no auth touch.

## Deviations from spec

None. The hook computes `today` once via lazy `useState` (instead of `useRef` — eslint disallows ref access during render). `CalendarGrid` uses `new Date()` for initial month display only (not `today` computation) — documented and allowlisted in the grep-guard test.
