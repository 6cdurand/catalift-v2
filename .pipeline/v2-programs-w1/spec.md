# .pipeline/v2-programs-w1/spec.md — Stage 1 (PLAN)

> **Programs Wave 1 = program data layer + next-workout fix.** Creates the program tables,
> ports the program types + saved-program store, and rebuilds `getNextProgramWorkout` as a
> pure tested function that fixes BUG-001 + BUG-010. NO UI in this wave (that's w2/w3).
> Authored by command-center (Opus 4.8) because it pastes v1 source the v2 executor can't read.
> **Place at `catalift-v2/.pipeline/v2-programs-w1/spec.md`.**

**Class:** **B (schema migration + data-layer).** Per `TRUST_MODEL.md`: Christo sign-off
required before merge. No auto-merge.
**Executor model:** **Opus 4.8** (schema + security + new logic).
**Repo:** catalift-v2 · **Branch:** `programs-w1-data-layer` (from main) · open a PR.

---

## What this wave does

1. **Apply migration `00007_programs.sql`** — creates `saved_programs` + `client_programs` 
   tables with RLS (see `domains/02-programs/schema.md` for the full SQL).
2. **Port program types** from v1 `src/types/index.ts` into `src/features/programs/types.ts`.
3. **Rebuild the saved-program store** — `src/features/programs/store.ts` (Zustand, hydrated
   from Supabase, MERGE not REPLACE, no localStorage).
4. **Rebuild `getNextProgramWorkout`** as a pure function — `src/features/programs/lib/get-next-workout.ts` 
   — fixing BUG-001 (fixed-day) + BUG-010 (flexible/expired).
5. **Rebuild program API modules** — `src/features/programs/api/` (save-template, assign,
   fetch, delete, update) — each with await+retry, no fire-and-forget.

**NOT in this wave:** builder UI, client program page, template select, preview dialog.
Those are w2/w3/w4 (UI ports, Class A, GLM 5.2).

---

## Migration SQL (paste into Supabase or apply via `mcp1_apply_migration`)

```sql
-- 00007_programs.sql
CREATE TABLE public.saved_programs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  phase       text CHECK (phase IN ('strength','hypertrophy','endurance','mobility','none')),
  goals       text[] NOT NULL DEFAULT '{}',
  duration_weeks  integer NOT NULL DEFAULT 4,
  days_per_week   integer NOT NULL DEFAULT 3,
  schedule_mode   text CHECK (schedule_mode IN ('fixed','flexible')),
  auto_repeat     boolean NOT NULL DEFAULT false,
  days            jsonb NOT NULL DEFAULT '[]',
  source_template_id text,
  times_assigned   integer NOT NULL DEFAULT 0,
  last_assigned_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.saved_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY saved_programs_owner ON public.saved_programs
  FOR ALL USING (trainer_id = auth.uid()) WITH CHECK (trainer_id = auth.uid());

CREATE TABLE public.client_programs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','paused','archived')),
  start_date  date,
  end_date    date,
  program_data jsonb NOT NULL DEFAULT '{}',
  next_workout_index integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY client_programs_trainer ON public.client_programs
  FOR ALL USING (trainer_id = auth.uid()) WITH CHECK (trainer_id = auth.uid());
CREATE POLICY client_programs_client ON public.client_programs
  FOR SELECT USING (client_id = auth.uid());

CREATE INDEX saved_programs_trainer_idx ON public.saved_programs(trainer_id);
CREATE INDEX client_programs_trainer_idx ON public.client_programs(trainer_id);
CREATE INDEX client_programs_client_idx ON public.client_programs(client_id);
CREATE INDEX client_programs_active_idx ON public.client_programs(client_id) WHERE status = 'active';
```

**Post-apply:** run `get_advisors(security)` — must be clean. Regenerate TS types.

---

## Program types (PORT from v1 `src/types/index.ts`)

Paste these v1 types into `src/features/programs/types.ts`. Align to v2 `database.ts` 
generated types where they overlap (the generated types come from the migration above).

```ts
// v1 source: catalift-web/apex-fitness/src/types/index.ts (program-related subset)

export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type BlockType = 'warmup' | 'work' | 'circuit' | 'cardio' | 'cooldown';
export type TrainingPhase = 'strength' | 'hypertrophy' | 'endurance' | 'mobility' | 'none';
export type TrainingGoal = 'hypertrophy' | 'strength' | 'general_fitness' | 'weight_loss' | 'endurance' | 'mobility';
export type MovementPattern = 'compound' | 'isolation' | 'bodyweight' | 'cardio';
export type ScheduleMode = 'fixed' | 'flexible';

export interface ProgramExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  movementPattern: MovementPattern;
  sets: number;
  reps: string;
  rest: string;
  repType?: string;
  setStyle?: string;
  tempo?: string;
  notes?: string;
}

export interface ProgramBlock {
  id: string;
  type: BlockType;
  name: string;
  exercises: ProgramExercise[];
}

export interface ProgramDay {
  id: string;
  label: string;
  scheduledDay?: Weekday;
  blocks: ProgramBlock[];
}

export interface ClientProgram {
  id: string;
  clientId: string;
  trainerId: string;
  name: string;  // v1: templateName
  status: 'active' | 'completed' | 'paused' | 'archived';
  phase: TrainingPhase;
  goal: TrainingGoal;
  weeklyPlan: ProgramDay[];
  scheduleMode: ScheduleMode;
  trainingDaysPerWeek: number;
  selectedDays: Weekday[];
  cycleAcrossWeeks: boolean;
  sessionPTMap: Record<number, 'pt' | 'personal'>;
  nextWorkoutIndex: number;
  autoRepeat: boolean;
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedProgram {
  id: string;
  trainerId: string;
  name: string;
  description?: string;
  phase: TrainingPhase;
  goals: TrainingGoal[];
  durationWeeks: number;
  daysPerWeek: number;
  scheduleMode?: ScheduleMode;
  autoRepeat: boolean;
  days: ProgramDay[];
  sourceTemplateId?: string;
  timesAssigned: number;
  lastAssignedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## The `getNextProgramWorkout` fix (REBUILD — the core of this wave)

### v1 source (paste reference — the executor needs to see the bug)

The v1 function lives in `trainerStore.ts` ~line 1783-1940. It's ~150 lines. Here's the
critical section that has the bug:

```ts
// v1 trainerStore.ts ~line 1893-1910 — THE BUG
let nextDayIndex = totalCompleted % program.weeklyPlan.length; // fallback
for (let i = 0; i < program.weeklyPlan.length; i++) {
  if (completedDayIndices.includes(i)) continue;
  if (lockedDayIndices.includes(i)) continue;
  nextDayIndex = i;   // ← always 0 if nothing completed this week — WRONG for fixed-day
  break;
}
```

**BUG-001:** For fixed-day programs (Mon=Push idx 0, Sat=Pull idx 1, Sun=Legs idx 2),
on Saturday with nothing done → loop picks index 0 = Push. Should be Pull (Saturday).

**BUG-010:** For flexible programs after a full Push→Pull→Legs cycle, the loop picks
index 1 (Pull) instead of wrapping to index 0 (Push).

### v2 implementation (`src/features/programs/lib/get-next-workout.ts`)

Rebuild as a **pure function** (no store access, takes program + completion state as args).
This makes it unit-testable — v1 had it buried in a 3395-line store file.

```ts
// v2: src/features/programs/lib/get-next-workout.ts

import { ClientProgram, ProgramDay, Weekday } from '../types';

const WEEKDAY_NAMES: Weekday[] = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
];

export interface NextWorkoutResult {
  dayIndex: number;
  day: ProgramDay | null;
  remainingThisWeek: number;
  completedDayIndices: number[];
  lockedDayIndices: number[];
  isScheduledToday: boolean;
  nextScheduledDay?: Weekday;
  isExpired: boolean;
}

export function getNextProgramWorkout(
  program: ClientProgram,
  completedDayIndices: number[],
  lockedDayIndices: number[],
  now: Date = new Date(),
): NextWorkoutResult {
  const plan = program.weeklyPlan;
  if (!plan.length) return emptyResult();

  const todayName = WEEKDAY_NAMES[now.getDay()];
  const isExpired = !!program.endDate && new Date(program.endDate) < now && !program.autoRepeat;

  // --- FIXED mode: anchor to today's scheduledDay ---
  if (program.scheduleMode === 'fixed') {
    const todayPlanIdx = plan.findIndex(d => d.scheduledDay === todayName);
    if (todayPlanIdx !== -1 && !completedDayIndices.includes(todayPlanIdx) && !lockedDayIndices.includes(todayPlanIdx)) {
      return buildResult(todayPlanIdx, program, completedDayIndices, lockedDayIndices, true, todayName, isExpired);
    }
    // Today's workout done/locked or today is a rest day → next upcoming scheduled day
    const upcomingIdx = findNextScheduledDay(plan, todayName, completedDayIndices, lockedDayIndices);
    if (upcomingIdx !== -1) {
      return buildResult(upcomingIdx, program, completedDayIndices, lockedDayIndices, false, plan[upcomingIdx].scheduledDay, isExpired);
    }
  }

  // --- FLEXIBLE mode: next in cycle order after most recently completed ---
  if (program.scheduleMode === 'flexible') {
    // Find the most recently completed day index
    const lastCompleted = completedDayIndices.length > 0
      ? completedDayIndices[completedDayIndices.length - 1]
      : -1;
    // Next = (lastCompleted + 1) % plan.length, skipping completed/locked
    let nextIdx = (lastCompleted + 1) % plan.length;
    for (let i = 0; i < plan.length; i++) {
      const checkIdx = (lastCompleted + 1 + i) % plan.length;
      if (!completedDayIndices.includes(checkIdx) && !lockedDayIndices.includes(checkIdx)) {
        nextIdx = checkIdx;
        break;
      }
    }
    return buildResult(nextIdx, program, completedDayIndices, lockedDayIndices, false, undefined, isExpired);
  }

  // --- Fallback: first uncompleted ---
  for (let i = 0; i < plan.length; i++) {
    if (!completedDayIndices.includes(i) && !lockedDayIndices.includes(i)) {
      return buildResult(i, program, completedDayIndices, lockedDayIndices, false, undefined, isExpired);
    }
  }

  // All completed → return first (cycle wraps)
  return buildResult(0, program, completedDayIndices, lockedDayIndices, false, undefined, isExpired);
}

// Helper: find next upcoming scheduled day (for fixed mode rest days)
function findNextScheduledDay(
  plan: ProgramDay[],
  todayName: Weekday,
  completed: number[],
  locked: number[],
): number {
  const todayIdx = WEEKDAY_NAMES.indexOf(todayName);
  for (let offset = 1; offset <= 7; offset++) {
    const checkDayIdx = (todayIdx + offset) % 7;
    const checkName = WEEKDAY_NAMES[checkDayIdx];
    const planIdx = plan.findIndex(d => d.scheduledDay === checkName);
    if (planIdx !== -1 && !completed.includes(planIdx) && !locked.includes(planIdx)) {
      return planIdx;
    }
  }
  return -1;
}

function buildResult(
  dayIndex: number,
  program: ClientProgram,
  completed: number[],
  locked: number[],
  isScheduledToday: boolean,
  nextScheduledDay: Weekday | undefined,
  isExpired: boolean,
): NextWorkoutResult {
  const remaining = program.weeklyPlan.length - completed.length;
  return {
    dayIndex,
    day: program.weeklyPlan[dayIndex] ?? null,
    remainingThisWeek: Math.max(0, remaining),
    completedDayIndices: completed,
    lockedDayIndices: locked,
    isScheduledToday,
    nextScheduledDay,
    isExpired,
  };
}

function emptyResult(): NextWorkoutResult {
  return {
    dayIndex: 0, day: null, remainingThisWeek: 0,
    completedDayIndices: [], lockedDayIndices: [],
    isScheduledToday: false, isExpired: false,
  };
}
```

### Write-time validation (NEW — v1 didn't have this)

```ts
// When saving a FLEXIBLE program, strip scheduledDay from all days.
// v1 BUG-010: stray scheduledDay='saturday' on a flexible day misled the weekday-anchor branch.
export function sanitizeProgramForSave(program: ClientProgram): ClientProgram {
  if (program.scheduleMode === 'flexible') {
    return {
      ...program,
      weeklyPlan: program.weeklyPlan.map(d => ({ ...d, scheduledDay: undefined })),
      selectedDays: [],
    };
  }
  return program;
}
```

---

## Guardrails (paste into proof block)
```
[ ] G-01 identity: trainer_id = auth.uid() directly — no canonical_user_id layer
[ ] G-05 RLS: no USING(true) policy; saved_programs + client_programs have scoped policies
[ ] G-07 ran get_advisors(security) after migration — clean
[ ] G-09 hydration MERGES by id (empty/partial fetch never wipes local) ★
[ ] G-10 all client-generated ids are valid UUIDs (uuidv4 for new programs)
[ ] G-11 writes await + retry + rollback (no fire-and-forget)
[ ] G-12 every write has a matching read-hydrate; cross-device verified
[ ] G-15 program next-day logic correct — unit tests for fixed + flexible + expired + rest day ★
[ ] G-16 separate store per resource (programs store, not crammed into trainerStore)
[ ] G-19 PORTED v1 types verbatim; only the store wiring changed ★
[ ] NO localStorage for program data (no apex-program-library)
[ ] NO canonical_user_id / resolveCanonicalUserByEmail
[ ] tsc + lint + unit + e2e all green ★
```

## Acceptance criteria
- [ ] Migration `00007_programs.sql` applied; `get_advisors(security)` clean.
- [ ] `src/features/programs/types.ts` exists with all types above.
- [ ] `src/features/programs/lib/get-next-workout.ts` exists, is a pure function, exports `getNextProgramWorkout` + `sanitizeProgramForSave`.
- [ ] `src/features/programs/store.ts` exists (Zustand), hydrates from Supabase via MERGE.
- [ ] `src/features/programs/api/` exists with: `save-template.ts`, `assign.ts`, `fetch.ts`, `delete.ts`, `update.ts`.
- [ ] NO `localStorage` references in `src/features/programs/` (grep proof).
- [ ] NO `canonical_user_id` / `resolveCanonicalUserByEmail` references (grep proof).
- [ ] `tsc --noEmit` clean.
- [ ] `npm run lint` clean.
- [ ] Unit tests pass for `get-next-workout.ts` (see test list below).
- [ ] Existing v2 e2e tests still pass.
- [ ] PR opened with proof block filled in `changes.md`.

## Tests the Tester stage must write (→ `tests.md`)

### `get-next-workout.test.ts` — THE critical test file

- **fixed-today:** Mon/Sat/Sun program, today=Saturday, nothing done → returns Saturday (index 1), NOT Monday (index 0). [BUG-001 regression test]
- **fixed-today-done:** Mon/Sat/Sun program, today=Saturday, Saturday done → returns Sunday (next upcoming). [BUG-001]
- **fixed-rest-day:** Mon/Wed/Fri program, today=Tuesday → returns Wednesday (next upcoming). [BUG-001]
- **fixed-all-done:** all days completed this week → remainingThisWeek=0, wraps to index 0.
- **flexible-clean-cycle:** Push/Pull/Legs, completed [0,1,2] → wraps to index 0 (Push). [BUG-010 regression test]
- **flexible-partial:** Push/Pull/Legs, completed [0] → returns index 1 (Pull). [BUG-010]
- **flexible-stray-weekday:** flexible program with stray scheduledDay on a day → ignores weekday, uses cycle order. [BUG-010]
- **expired-no-autorepeat:** end_date in past, autoRepeat=false → isExpired=true.
- **expired-autorepeat:** end_date in past, autoRepeat=true → isExpired=false, continues cycling.
- **empty-plan:** weeklyPlan=[] → returns empty result, no crash.

### `sanitize-program-for-save.test.ts` 
- **flexible-strips-weekday:** flexible program with scheduledDay on days → all scheduledDay=undefined after sanitize.
- **fixed-keeps-weekday:** fixed program → scheduledDay preserved.

### `programs-store.test.ts` 
- **hydrate-merge:** hydrate with partial server set keeps local-only rows (G-09 regression).
- **hydrate-empty:** hydrate with empty server response does NOT wipe local (G-09).

### grep-guards
- `grep -r "localStorage" src/features/programs/` → 0 results.
- `grep -r "canonical_user_id\|resolveCanonicalUserByEmail" src/features/programs/` → 0 results.

---

## Stage hand-off checklist
- [x] **Stage 1 PLAN** — this file. Christo: paste into `catalift-v2/.pipeline/v2-programs-w1/spec.md`.
- [ ] **Stage 2 CODE** (Opus 4.8) — apply migration, port types, build store + API + get-next-workout; fill `changes.md`; open PR.
- [ ] **Stage 3 TEST** (Opus 4.8) — write listed tests; run gates; fill `tests.md`.
- [ ] **Stage 4 REVIEW** (fresh Cascade, read-only) — `review-pr` skill vs this spec → `review.md`.
- [ ] **Christo sign-off** (Class B — schema + data layer).
- [ ] **Merge.**

---

## Christo's paste-ready prompt

> **Set this Cascade to Opus 4.8.**
>
> Read the spec at `.pipeline/v2-programs-w1/spec.md`. This is Programs Wave 1: the data layer
> + the next-workout bug fix. Class B (schema + data). Steps:
> 1. Apply the migration SQL (create `saved_programs` + `client_programs` with RLS).
> 2. Run `get_advisors(security)` — must be clean.
> 3. Port the program types into `src/features/programs/types.ts`.
> 4. Build `src/features/programs/lib/get-next-workout.ts` — the pure function that fixes
>    BUG-001 (fixed-day) + BUG-010 (flexible/expired). The spec has the full implementation.
> 5. Build `src/features/programs/store.ts` (Zustand, MERGE hydrate, no localStorage).
> 6. Build `src/features/programs/api/` modules (save, assign, fetch, delete, update).
> 7. Write ALL listed unit tests (especially `get-next-workout.test.ts` — 10 cases).
> 8. Run all gates (`tsc + lint + unit + e2e`). Open a PR. Fill in `changes.md`.
> 9. NO localStorage. NO canonical_user_id. These are grep-guarded.
