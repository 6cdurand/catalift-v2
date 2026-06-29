# tests.md — Calendar Wave 1 (selectors test coverage)

## Test file: `src/features/calendar/lib/__tests__/selectors.test.ts`

26 tests, all passing.

### Spec test cases mapped

| Spec test case | Test name | Status |
|---|---|---|
| buildScheduledSessions returns one program-day session per slotScheduledDays date in range | "returns one program-day session per scheduled weekday in range" | ✅ |
| a date with a workouts row → status 'done' | "a date with a workouts row → status 'done'" | ✅ |
| a past scheduled date with NO workouts row → status 'missed' | "a past scheduled date with NO workouts row → status 'missed'" | ✅ |
| a future scheduled date → status 'upcoming' | "a future scheduled date → status 'upcoming'" | ✅ |
| a non-slot date → status 'rest' (or omitted) | "non-slot dates are omitted (rest days)" | ✅ |
| flexible program → ONE 'next up' session, not pinned | "produces ONE 'next up' session, not pinned to a scheduled weekday" | ✅ |
| getSessionsForDate(sessions, today) === Today-page slice (parity) | "returns the SAME objects as buildScheduledSessions (no copy, no second query)" | ✅ |
| deriveStatus is pure — same inputs always same output | "is pure — same inputs always same output" | ✅ |
| next === null (no active program) → returns [] | "next === null (no active program) → returns [] (no throw)" | ✅ |
| all dates are ISO YYYY-MM-DD (no timestamps) | "all dates are ISO YYYY-MM-DD (no timestamps)" | ✅ |
| selector does NOT import or compute day-index/next-day logic | "buildScheduledSessions consumes next.dayIndex as-is" + "fixed mode dayIndex comes from weeklyPlan position" | ✅ |

### Additional tests beyond spec

- "today's scheduled session with no workout row → status 'upcoming'"
- "maps sessionType from program.sessionPTMap"
- "maps dayIndex from weeklyPlan position (not recomputed)"
- "next.day === null → returns []"
- "next.isExpired === true → returns []"
- "dates the next-up session as today (injected)"
- "does NOT create sessions for each weekday in range" (flexible)
- "returns [] when no session on that date" (getSessionsForDate)
- "done takes priority over missed" (deriveStatus edge)
- "returns the SAME objects" parity test checks object reference equality

## Run command

```bash
npx vitest run src/features/calendar
```

## Result

```
 ✓ src/features/calendar/lib/__tests__/selectors.test.ts (26 tests) 4ms
 Test Files  1 passed (1)
      Tests  26 passed (26)
```
