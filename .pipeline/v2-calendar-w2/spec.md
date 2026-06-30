# .pipeline/v2-calendar-w2/spec.md — Stage 1 (PLAN)

> **Calendar Wave 2 = the Calendar grid LOOK redesign + smoothness, plus the ONE shared hook that
> feeds BOTH Today and Calendar the same data.** It CONSUMES the w1 canonical `ScheduledSession`
> object + pure selectors (PR #26, merged) — it does NOT add new derivation, NO migration, NO auth.
> Authored by command-center. **Place at `catalift-v2/.pipeline/v2-calendar-w2/spec.md`.**

**Class:** **A (UI + a presentation hook, NO migration, NO auth, consumes w1 selectors).**
**Executor model:** **GLM 5.2** (assembly on the proven w1 shape — no new canonical work).
**Repo:** catalift-v2 · **Branch:** `calendar-w2-grid-look` (from `main`) · open a PR, never merge.
**Fence (write-set):**
- `src/features/calendar/components/**` (grid + cells — new/edited)
- `src/features/calendar/hooks/useScheduledSessions.ts` (NEW — the single shared hook; see §1)
- the **Today** + **Calendar** route components that render sessions (wire them to the shared hook)
- `src/features/calendar/lib/__tests__/**` (extend parity guard)

**Do NOT touch:**
- `src/features/calendar/types.ts` or `lib/selectors.ts` — w1 froze these. If you believe a selector
  needs a change, STOP and flag it (it's a w1 amendment, not w2 scope).
- `src/features/programs/**` and `src/features/workout-engine/**` (parallel lanes own them) — calendar
  only *imports* the programs `getNextProgramWorkout` result.

---

## THE ONE LAW OF THIS WAVE (parity — do not break)

Today and Calendar **render from ONE hook** (`useScheduledSessions`), which calls the w1
`buildScheduledSessions` selector **once** and injects a single `today` value. Today is just the
`getSessionsForDate(sessions, today)` slice of the SAME list the grid renders. There must be **no
second query, no second `new Date()`, and no day-index/next-day arithmetic** anywhere in
`src/features/calendar/` (grep-guard from w1 stays + is extended to the hook). This closes the w1
review carry-forward: *parity is caller-dependent — so there is exactly one caller.*

---

## STEP 0 — Ground in what w1 already shipped (do not greenfield)

w1 (PR #26, merged) exported, in `src/features/calendar/`:
- `types.ts` → `ScheduledSession`, `ScheduledSessionStatus` (`'upcoming'|'done'|'missed'|'rest'`),
  `ScheduledSessionKind` (`'program-day'|'group-event'|'booking'|'ad-hoc'`).
- `lib/selectors.ts` → `buildScheduledSessions(input)`, `getSessionsForDate(sessions, date)`,
  `deriveStatus(args)` — all PURE, `today` injected.

**Read these files first.** w2 consumes them as-is. Also locate the CURRENT Today page + any existing
calendar route so you wire the new hook in rather than creating a parallel data path.

### v1 calendar primitives — PORT where reusable (REFERENCE, do not blind-copy)
Find the v1 month grid / day-cell components in `apex-fitness/src/` (calendar/schedule screens). Reuse
the visual primitives (month matrix layout, weekday header, status dot/colour legend) but bind them to
the v2 `ScheduledSession` shape — never to a v1 type. Per-file verdict: `plans/v1_to_v2_reuse_map.md`.

---

## 1. The single shared hook — `src/features/calendar/hooks/useScheduledSessions.ts`

This is the carry-forward fix: **one hook, two consumers.**

```ts
interface UseScheduledSessionsArgs {
  rangeStart: string;   // ISO YYYY-MM-DD inclusive
  rangeEnd: string;     // ISO YYYY-MM-DD inclusive
}

interface UseScheduledSessionsResult {
  sessions: ScheduledSession[];     // full range — the Calendar grid renders this
  today: string;                    // the ONE device-local today (computed once here)
  todaySessions: ScheduledSession[]; // === getSessionsForDate(sessions, today) — the Today slice
  isLoading: boolean;
  error: Error | null;
}

export function useScheduledSessions(args: UseScheduledSessionsArgs): UseScheduledSessionsResult;
```

- Computes `today` **once** (device-local ISO), fetches the programs `getNextProgramWorkout` result +
  `completedDates` (Box 1 `workouts` rows), then calls `buildScheduledSessions` **once**.
- `todaySessions` is derived from the SAME `sessions` array via `getSessionsForDate` — NOT a second query.
- **Both** the Today page and the Calendar grid call THIS hook. Neither computes `today` itself.

---

## 2. The grid components — `src/features/calendar/components/`

- `CalendarGrid.tsx` — month matrix (weekday header + day cells). Pure presentation: takes
  `sessions: ScheduledSession[]`, `today`, `month` → renders cells. No data fetching inside.
- `DayCell.tsx` — one day. Renders status from `session.status` ONLY (never recomputes). States:
  - `done` → filled/checked dot
  - `upcoming` → outline/scheduled dot
  - `missed` → muted/alert dot
  - **`rest` → explicit rest-day cell** (carry-forward (b)): a day with NO scheduled slot must render a
    deliberate "rest" / empty-but-styled state, NOT an accidental blank. Document the chosen visual.
  - `today` → ring/highlight on the cell whose date === `today`.
- Tapping a day surfaces that day's session(s) (`getSessionsForDate(sessions, date)`) — reuse the same
  slice function, no new lookup.
- **Smoothness:** month navigation (prev/next) must not refetch per-cell or jank; memoize the grid off
  `sessions`. No layout shift when switching months.

> Keep the LOOK modern + clean (Tailwind, existing v2 design tokens). Do not invent a new colour system —
> reuse the status legend from w1/v2 theme.

---

## 3. Tests — `src/features/calendar/{components,hooks}/__tests__/` + extend `lib/__tests__/`

```
[ ] useScheduledSessions: todaySessions === getSessionsForDate(sessions, today) (same objects — PARITY)
[ ] useScheduledSessions computes `today` exactly once (no second new Date() in calendar/)
[ ] CalendarGrid renders one cell per day in range; status comes straight from session.status
[ ] DayCell renders a distinct 'rest' state for a non-slot day (carry-forward b)
[ ] DayCell highlights the cell where date === today
[ ] month nav prev/next does not re-derive sessions (memoized; selector not re-run per cell)
[ ] PARITY GREP-GUARD (extended): no day-index/next-day arithmetic in src/features/calendar/** incl. hook
[ ] no second data path: Today page imports useScheduledSessions, not a bespoke query
```

---

## Guardrails — must-not-regress checklist (paste into `changes.md` proof block)

```
[ ] PARITY: Today + Calendar both render from useScheduledSessions (ONE hook, ONE today, ONE selector call)
[ ] grep src/features/calendar/** (incl. hooks/) for day-index/next-day recompute → 0 (extends w1 guard)
[ ] only ONE new Date()/device-today computation in calendar/ (inside the hook); selectors stay pure
[ ] DID NOT edit src/features/calendar/types.ts or lib/selectors.ts (w1 frozen)
[ ] 'rest' day cell is an explicit, documented visual state (not accidental blank)
[ ] NO change to src/features/programs/** or workout-engine/** (fences held — calendar imports only)
[ ] NO migration, NO supabase/ change, NO auth touch (Class A)
[ ] no `apex-` / `canonical_user_id` legacy strings (grep → 0)
[ ] tsc --noEmit clean · lint clean · vitest green
```

## Acceptance criteria

- [ ] `useScheduledSessions` is the single data source for BOTH Today and Calendar; `todaySessions` is a
      slice of the same `sessions` list (parity proven by a test).
- [ ] Calendar grid renders correct status per day straight from `ScheduledSession.status` (no recompute).
- [ ] `rest`-day cells render a deliberate, documented state; `today` cell is highlighted.
- [ ] Month navigation is smooth (memoized, no per-cell refetch, no layout shift).
- [ ] Parity grep-guard extended to cover the hook; 0 day-index arithmetic in `src/features/calendar/**`.
- [ ] `tsc --noEmit` + lint + vitest all green.
- [ ] PR opened against `main`; `.pipeline/v2-calendar-w2/changes.md` + `tests.md` filled.

### Review gate (before merge — TIER_ROUTING quality gate)
- [ ] `/find-gaps` sweep run on the grid (empty-program, single-day, all-rest week, missed-streak, month
      boundary, tz edge) — findings logged.
- [ ] Experience-test: walk Today + Calendar as a real user (program active / no program / flexible
      program / all caught-up) — both pages agree on every date.

---

## Cross-references

- Dossier → `domains/03-calendar/DOSSIER.md` w2 row + DQ-2 (confirmed) + parity law (F-04)
- Consumes → w1 `ScheduledSession` + selectors (PR #26) `src/features/calendar/{types.ts,lib/selectors.ts}`
- Box 2 dependency → v2 `src/features/programs/` `getNextProgramWorkout` (PR #12) — imported, not edited
- w1 review carry-forwards (a/b/c) folded in → DOSSIER w2 row
- v1 primitives to port → `apex-fitness/src/` calendar screens · verdict `plans/v1_to_v2_reuse_map.md`
- Guardrails → `plans/v2_guardrails.md` (parity, G-01 self-scope) · Pipeline → `plans/v2_pipeline_model.md`
- Next waves → w3 group events (B/Opus), w4 trainer-books-client fixes (A), w5 self-serve booking (B/Opus)
