# .pipeline/v2-calendar-w1/spec.md — Stage 1 (PLAN)

> **Calendar Wave 1 = the canonical `ScheduledSession` type + the PURE selectors that Today and the
> Calendar both render.** This is the parity foundation (F-04): one typed shape, one derivation, so
> Today and Calendar can never disagree about a date. **NO migration, NO UI grid** (the grid LOOK is w2).
> Authored by command-center (Opus 4.8). **Place at `catalift-v2/.pipeline/v2-calendar-w1/spec.md`.**

**Class:** **A (pure types + selectors, NO migration, NO auth).**
**Executor model:** **Opus 4.8** (foundational canonical type — the rest of Box 3 hangs off this shape;
get it right). GLM 5.2 acceptable only if Opus is unavailable.
**Repo:** catalift-v2 · **Branch:** `calendar-w1-scheduled-session-type` (from `main`) · open a PR, never merge.
**Fence (write-set):** new folder `src/features/calendar/{types.ts, lib/selectors.ts, lib/__tests__/*}`.
**Do NOT touch `src/features/programs/**`** (a parallel lane owns it) — calendar only *imports* the
programs `getNextProgramWorkout` result; it does not edit programs.

---

## THE ONE LAW OF THIS WAVE (parity — do not break)

Calendar **consumes** Box 2's next-day resolution; it **NEVER recomputes which day is next.** The
"Today says pull / Program says legs" divergence (BUG-010 family) happened because consumers each
re-derived the next day. So: the selector takes the **already-computed** `getNextProgramWorkout` result
as input and maps it to `ScheduledSession`s. There must be **no day-index / next-day arithmetic** inside
`src/features/calendar/`. (A grep-guard enforces this — see Guardrails.)

---

## STEP 0 — Ground in the EXISTING v2 programs API (do not greenfield)

v2 programs (wave w1, merged PR #12) already exports the next-day resolver. **Find it** in
`src/features/programs/` (likely `lib/getNextProgramWorkout.ts` or the programs store) and consume its
**actual exported return type** directly. The v1 shape below is the REFERENCE for which fields exist —
use the v2 equivalents, do not re-invent field names.

### v1 `getNextProgramWorkout` return shape (REFERENCE — `apex-fitness/src/lib/stores/trainerStore.ts:302`)

```ts
getNextProgramWorkout: (userId: string) => {
  program: ClientProgram;
  dayIndex: number;
  day: any;                                  // the resolved program day (blocks/exercises)
  remainingThisWeek: number;
  sessionType: 'pt' | 'personal';
  completedDayIndices: number[];
  lockedDayIndices: number[];
  lockReasons: Record<number, ProgramDayLockReason>;
  isScheduledToday: boolean;
  nextScheduledDay: string | null;           // fixed-day programs: the pinned next date
  nextSuggestedDay: string | null;           // flexible programs: the "next up" suggestion (NOT pinned)
  weekSlots: number;
  slotDayIndices: number[];
  slotScheduledDays: string[];               // the dates/days that carry a session this week
  completedSlotCount: number;
  nextSlotIndex: number;
} | null;
```

> The calendar selector reads **`completedDayIndices`, `lockedDayIndices`, `slotScheduledDays`,
> `sessionType`, `nextScheduledDay`, `nextSuggestedDay`, `isScheduledToday`** — it does NOT touch
> `dayIndex` math itself.

The existing reader `getScheduledSessionsForUser(userId) => CalendarEvent[]` (trainerStore.ts:318) is the
v1 source for `kind:'booking'|'group-event'` rows. **Those kinds are OUT OF SCOPE for w1** (they belong
to w3 group-events / w5 booking). w1 only materializes `kind:'program-day'` rows + leaves the union open
for the others. Exact `CalendarEvent` field reconciliation is deferred to w3/w5.

---

## 1. The canonical type — `src/features/calendar/types.ts`

DQ-1 CONFIRMED shape (Christo approved 2026-06-29):

```ts
export type ScheduledSessionStatus = 'upcoming' | 'done' | 'missed' | 'rest';
export type ScheduledSessionKind = 'program-day' | 'group-event' | 'booking' | 'ad-hoc';

export interface ScheduledSession {
  date: string;                 // ISO YYYY-MM-DD (device-local date, NOT a timestamp)
  programId?: string;
  dayIndex: number;             // the program day index this session maps to (from Box 2 result; -1 if n/a)
  dayRef: string;               // the program's dayLabel (stable ref)
  label: string;                // human label, e.g. "Push Day" / "Upper A"
  status: ScheduledSessionStatus;
  kind: ScheduledSessionKind;   // w1 produces 'program-day' only; others reserved for w3/w5
  sessionType?: 'pt' | 'personal';
}
```

- **`date`:** ISO `YYYY-MM-DD`, **device-local** — store a date, never a timestamp. Must match Box 1/Box 2
  so a session never flips days across a tz boundary.

---

## 2. The pure selectors — `src/features/calendar/lib/selectors.ts`

All selectors are **pure functions** (no store reads, no fetches) — inputs in, `ScheduledSession[]` out.
This is what makes Today + Calendar share one derivation.

```ts
interface BuildScheduledSessionsInput {
  next: NextProgramWorkoutResult | null;   // the v2 programs getNextProgramWorkout result (consumed, not recomputed)
  completedDates: string[];                 // ISO dates that have a `workouts` row (from Box 1) — drives 'done'
  rangeStart: string;                       // ISO — inclusive
  rangeEnd: string;                         // ISO — inclusive
  today: string;                            // ISO device-local "today" (single tz authority, injected)
}

// Build the list of program-day sessions across [rangeStart, rangeEnd].
export function buildScheduledSessions(input: BuildScheduledSessionsInput): ScheduledSession[];

// The Today page is just this list filtered to date === today.
export function getSessionsForDate(sessions: ScheduledSession[], date: string): ScheduledSession[];

// Pure status rule for one date (see derivation below).
export function deriveStatus(args: {
  date: string; today: string; isScheduled: boolean; hasWorkoutRow: boolean;
}): ScheduledSessionStatus;
```

### Status derivation (DQ-1 confirmed — ONE source so the two pages can't disagree)

```
done     = a `workouts` row exists for that date (date ∈ completedDates)
missed   = date < today  AND isScheduled  AND no workout row
upcoming = date >= today AND isScheduled
rest     = no slot scheduled that day (not in slotScheduledDays)
```

### Flexible vs fixed programs

- **Fixed-day:** pin sessions on `slotScheduledDays` / `nextScheduledDay` dates.
- **Flexible:** do NOT pin a date — render a single "next up" entry from `nextSuggestedDay`
  (`nextScheduledDay` if present). This consumes Box 2's BUG-010 handling; calendar must not re-derive it.

### Timezone authority

`today` is **injected** (device-local, computed once by the caller) so the selectors stay pure and
testable. Never call `new Date()` inside a selector. Document that device-local is the single tz rule.

---

## 3. Tests — `src/features/calendar/lib/__tests__/selectors.test.ts`

```
[ ] buildScheduledSessions returns one program-day session per slotScheduledDays date in range
[ ] a date with a workouts row → status 'done'
[ ] a past scheduled date with NO workouts row → status 'missed'
[ ] a future scheduled date → status 'upcoming'
[ ] a non-slot date → status 'rest' (or omitted, per chosen representation — be consistent + documented)
[ ] flexible program (nextScheduledDay null, nextSuggestedDay set) → ONE 'next up' session, not pinned
[ ] getSessionsForDate(sessions, today) === the Today-page slice (parity: same objects, no second query)
[ ] deriveStatus is pure — same inputs always same output; never reads Date.now()
[ ] next === null (no active program) → returns [] (no throw)
[ ] all dates are ISO YYYY-MM-DD (no timestamps)
[ ] selector does NOT import or compute any day-index/next-day logic (consumes `next` as given)
```

---

## Guardrails — must-not-regress checklist (paste into `changes.md` proof block)

```
[ ] PARITY: no next-day/day-index arithmetic inside src/features/calendar/ —
    grep src/features/calendar for day-index recompute patterns → 0 (consume programs result only)
[ ] Today + Calendar derive from the SAME buildScheduledSessions output (one selector, one shape)
[ ] selectors are PURE — no new Date() / Date.now() inside; `today` is injected
[ ] dates are ISO YYYY-MM-DD device-local — never a timestamp
[ ] NO change to src/features/programs/** (fence held — calendar imports, doesn't edit)
[ ] NO migration, NO supabase/ change, NO auth touch (Class A)
[ ] no `apex-` / `canonical_user_id` legacy strings (grep → 0)
[ ] tsc --noEmit clean · lint clean · vitest green
```

## Acceptance criteria

- [ ] `ScheduledSession` type matches the DQ-1 confirmed shape exactly.
- [ ] `buildScheduledSessions` consumes the v2 programs `getNextProgramWorkout` result + `completedDates`
      and returns correct `program-day` sessions with correct `status` across a date range.
- [ ] Flexible programs render a non-pinned "next up" session; fixed programs pin on scheduled dates.
- [ ] `getSessionsForDate` gives the Today-page slice from the SAME list (parity proven by a test).
- [ ] Selectors are pure (tz injected); all dates ISO `YYYY-MM-DD`.
- [ ] `tsc --noEmit` + lint + vitest all green.
- [ ] PR opened against `main`; `.pipeline/v2-calendar-w1/changes.md` + `tests.md` filled.

---

## Cross-references

- Dossier → `domains/03-calendar/DOSSIER.md` DQ-1 (confirmed) + w1 row; parity law (F-04)
- Box 2 dependency (the result calendar consumes) → v2 `src/features/programs/` `getNextProgramWorkout` (PR #12)
- v1 reference shape → `apex-fitness/src/lib/stores/trainerStore.ts:302` (pasted above)
- Parity contract → `ARCHITECTURE_CONTRACTS.md` §2 "Next program day" (one result, many consumers)
- Next wave → calendar w2 (grid LOOK redesign, DQ-2 confirmed) consumes THIS object
- Guardrails → `plans/v2_guardrails.md` (parity law, G-01 self-scope) · Pipeline → `plans/v2_pipeline_model.md`
```
