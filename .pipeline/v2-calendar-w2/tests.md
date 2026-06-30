# tests.md — Calendar Wave 2 (hook + grid + parity guard)

## Test files

### 1. `src/features/calendar/hooks/__tests__/useScheduledSessions.test.ts`

10 tests — pure function tests (no React rendering needed).

| Spec test case | Test name | Status |
|---|---|---|
| todaySessions === getSessionsForDate(sessions, today) — same objects | "todaySessions === getSessionsForDate(sessions, today) — same objects" | ✅ |
| todaySessions is a SLICE of sessions — not a second query | "todaySessions is a SLICE of sessions — not a second query" | ✅ |
| returns empty when program is null | "returns empty sessions + todaySessions when program is null" | ✅ |
| deriveCompletedDayIndices maps dates to plan indices (fixed) | "maps completed dates to weeklyPlan indices (fixed mode)" | ✅ |
| deduplicates when multiple dates map to same index | "deduplicates when multiple dates map to the same plan index" | ✅ |
| empty completedDates → [] | "returns [] for empty completedDates" | ✅ |
| flexible mode returns sequential [0..count-1] | "flexible mode returns sequential [0, 1, ..., count-1]" | ✅ |
| flexible mode clamps to plan length | "flexible mode clamps to plan length" | ✅ |
| toISODate formats correctly | "formats a Date as ISO YYYY-MM-DD using local time" | ✅ |
| toISODate pads single digits | "pads single-digit months and days" | ✅ |

### 2. `src/features/calendar/components/__tests__/DayCell.test.tsx`

8 tests — component render tests using @testing-library/react.

| Spec test case | Test name | Status |
|---|---|---|
| renders the day number | "renders the day number" | ✅ |
| distinct rest-day cell (carry-forward b) | "renders a distinct 'rest' state for a non-slot day" | ✅ |
| done status dot | "renders 'done' state when session.status === 'done'" | ✅ |
| upcoming status dot | "renders 'upcoming' state when session.status === 'upcoming'" | ✅ |
| missed status dot | "renders 'missed' state when session.status === 'missed'" | ✅ |
| today highlight (ring) | "highlights the cell where date === today (ring)" | ✅ |
| non-today not highlighted | "does NOT highlight non-today cells" | ✅ |
| onSelect callback | "calls onSelect with the day's sessions when tapped" | ✅ |

### 3. `src/features/calendar/components/__tests__/CalendarGrid.test.tsx`

8 tests — component render tests.

| Spec test case | Test name | Status |
|---|---|---|
| weekday headers | "renders weekday headers" | ✅ |
| grid cell count (35-42) | "renders one cell per day in the month grid" | ✅ |
| month label | "renders the month label" | ✅ |
| status from session.status (no recompute) | "status comes straight from session.status" | ✅ |
| rest state for no-session days | "renders 'rest' state for days with no session" | ✅ |
| today cell highlighted | "highlights the today cell" | ✅ |
| smooth month nav (no refetch) | "month nav prev/next changes the month label" | ✅ |
| onSelectDay callback | "calls onSelectDay when a day is tapped" | ✅ |

### 4. `src/features/calendar/lib/__tests__/parity-guard.test.ts`

4 tests — static analysis grep-guard (extended from w1).

| Spec test case | Test name | Status |
|---|---|---|
| no day-index/next-day arithmetic | "no day-index / next-day arithmetic (excl. w1 frozen)" | ✅ |
| only allowed files use new Date() | "only allowed files use new Date() in calendar/" | ✅ |
| no legacy strings | "no `apex-` or `canonical_user_id` legacy strings" | ✅ |
| w1 frozen files unchanged | "DID NOT edit types.ts or selectors.ts" | ✅ |

### 5. `src/features/calendar/lib/__tests__/selectors.test.ts` (w1 — unchanged)

26 tests — all still passing (w1 frozen, not edited).

## Run command

```bash
npx vitest run src/features/calendar
```

## Result

```
 ✓ src/features/calendar/lib/__tests__/parity-guard.test.ts (4 tests) 2ms
 ✓ src/features/calendar/lib/__tests__/selectors.test.ts (26 tests) 3ms
 ✓ src/features/calendar/components/__tests__/DayCell.test.tsx (8 tests) 24ms
 ✓ src/features/calendar/hooks/__tests__/useScheduledSessions.test.ts (10 tests) 2ms
 ✓ src/features/calendar/components/__tests__/CalendarGrid.test.tsx (8 tests) 115ms

 Test Files  5 passed (5)
      Tests  56 passed (56)
```

## Dependencies added

- `@testing-library/react` + `@testing-library/dom` (devDependencies — for component render tests)
- `vitest.config.ts` updated: `include` now matches `*.test.tsx` in addition to `*.test.ts`
