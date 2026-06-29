# .pipeline/programs-w2c1-schedule-save/spec.md — Stage 1 (PLAN)

**Box:** 02-programs · **Wave:** w2c-1 · **Feature:** Program Builder — Step 3 **Schedule** + **Save/Activate** (the terminal flow that makes the builder functional end-to-end)
**Class:** A — UI + writes to existing w1 tables (`client_programs`) via existing RLS. No schema change, no auth change.
**Executor model:** GLM 5.2 · **Recommended executor:** v2 Cascade (reads v1 directly; not Forge).
**Repo:** catalift-v2 · **Branch:** `programs-w2c1-schedule-save` · ONE PR.
**Depends on:** **w2b-1 merged** (wizard reaches Step 3 with a real `days` array in the store). Can run
after w2b-1 even if w2b-2 isn't done (Save doesn't require the rich edit dialog).

---

## SOURCE — v1 code to port (read directly by absolute path; FALLBACK: ask Christo to paste)
> `/Users/christofit7/Desktop/catalift/catalift-web/apex-fitness/src/app/program/builder/page.tsx`
> - **Schedule step JSX:** **L1257–L1457** (`scheduleMode` 'fixed'|'flexible' toggle L1262–1278;
>   fixed-days weekday picker L1279+; `WEEKDAYS` map L1287; frequency for flexible).
> - **Save/Activate handler:** `handleSaveProgram` **L701–~917** — the guard (L712), `programFields`
>   build (L743–751), `addClientProgram`/`updateClientProgram` write (L754–770), and the
>   **calendar-event generation L799–867** (see ⚠️ DEFER below).
> - **Save/Activate dialog JSX:** **L1535–L1609** (confirm + trainer client picker).
> - **State:** `scheduleMode` L407, `fixedDays` L409, `selectedClientId` L316, `showSaveDialog` L427,
>   `isTrainerMode` L257, `targetUserId`/`targetClientId` L596/L717.

**NOT in scope:** Block Library + folders + Save-Block-to-Library → **w2c-2**. Exercise-Edit dialog → w2b-2.

---

## ⚠️ TWO REQUIRED DEVIATIONS FROM v1 (do NOT port verbatim)

### 1. Trainer-mode detection — DO NOT read `user_metadata.mode` (security: G-20 / BACKLOG #2)
v1 does `const isTrainerMode = user?.mode === 'trainer'` (L257), reading role from client-writable auth
metadata — the self-promote hole. **In v2, read the role from the server-governed source**
(`public.users.role` via the v2 profile/session authority — check how `_shell` / session exposes role).
NEVER gate assign/activate on `user_metadata.mode`. If v2 has no clean role accessor yet, STOP and report
(do not invent one and do not fall back to metadata).

### 2. Calendar-event generation — DEFER to Box 3 (don't build cross-box now)
v1 `handleSaveProgram` writes `calendar_events` (L799–867) to schedule sessions. **Box 3 (Calendar) owns
the canonical "scheduled session" object and isn't built yet.** w2c-1 must:
- **Persist** `scheduleMode` + `selectedDays` (fixed) / `frequency` (flexible) onto the `client_programs`
  row (so Box 3 can generate events later from one source of truth).
- **NOT** write `calendar_events` here. Leave a clearly-commented `// TODO(box-3): generate calendar
  events from scheduleMode/selectedDays` seam where v1 did the write.
- "Up Next" still works via the w1 `getNextProgramWorkout` (reads the program + scheduleMode), so the
  athlete sees the right next day without calendar rows.

---

# ===== FEATURE READINESS GATE (A–F) =====

## A. Placement
Step 3 of `/program/builder`. Renders when `ProgramBuilder` step === `'schedule'`. Terminal "Save/Activate"
opens the confirm dialog; success redirects (self → `/program`; trainer → `/clients/[id]`).

## B. Navigation map
| Element | Leads to | Type | Back |
|---|---|---|---|
| Step 2 "Next" | Step 3 Schedule | inline | "Back" → Step 2 |
| Schedule mode toggle | sets `scheduleMode` (fixed/flexible) | inline | n/a |
| Fixed → weekday chips | toggles `fixedDays` | inline | n/a |
| "Save / Activate" | Save/Activate confirm dialog | popup | Cancel → Step 3 |
| Confirm (self) | activate on self → redirect `/program` | redirect | n/a |
| Confirm (trainer) | client picker REQUIRED → assign → redirect `/clients/[id]` | redirect | n/a |
- **Dead-end check:** Cancel → Step 3; both confirms redirect to a real page.

## C. Two-sided view
- **Self:** no client picker; "Activate" writes own `client_programs` row.
- **Trainer-for-client:** client picker in the Save dialog, REQUIRED before assign; writes the client's
  `client_programs` row (`trainer_id` = self, `client_id` = selected). Picker may be disabled until Box 4
  roster exists (w2a gap c) — if so, keep the self path fully working and guard the trainer path.

## D. Functionality walkthrough
Step 3: pick Fixed (choose weekdays) or Flexible (frequency) → "Save/Activate" → (trainer: pick client) →
confirm → `client_programs` row written with the program JSON + `scheduleMode` + days/frequency → redirect.
Empty/invalid (trainer, no client) = blocked with inline validation (port v1 guard L712). Save failure =
toast + dialog stays open (port v1's throw-keeps-dialog-open behaviour); writes use `await` + retry (G-11).

## E. Data + source-of-truth
- Writes the w1 `client_programs` row via the w1 store/api (`src/features/programs/api/assign.ts` /
  `update.ts`). Uses the canonical w1 `Program` shape built across Steps 1–2. NO second store (G-16).
- Persists `scheduleMode` + `selectedDays`/`frequency` on the row (the single source Box 3 will read).
- Parity: next-day comes from w1 `getNextProgramWorkout`; the builder does NOT compute it.

## F. Acceptance gate
1. Self: activate writes own `client_programs` row with correct program JSON + scheduleMode + days; redirect `/program`.
2. Trainer: assign requires a selected client; row has correct `trainer_id` + `client_id`; redirect `/clients/[id]`.
3. Fixed persists `selectedDays`; flexible persists `frequency`.
4. Save failure keeps the dialog open + shows a precise toast (no false "saved").
5. Role gating uses server-governed role, NOT `user_metadata.mode` (grep-guard).
6. NO `calendar_events` write in this PR (grep-guard); the Box-3 TODO seam is present.
7. grep-guards (§L) = 0; port-fidelity.
- **exercise-specialist lens:** schedule semantics sane (fixed weekday cycling vs flexible frequency).
- **VERDICT:** READY (pending w2b-1 merge).

# ===== END GATE =====

---

## J. v2 implementation (target structure)
```
src/features/programs/builder/steps/ScheduleStep.tsx   # FILL w2a placeholder: mode toggle + fixed-days picker + frequency
src/features/programs/builder/dialogs/SaveActivateDialog.tsx  # NEW: confirm + (trainer) client picker
src/features/programs/store.ts        # ensure scheduleMode/selectedDays/frequency are part of the program state
src/features/programs/api/assign.ts   # assign/activate write (exists from w1; wire it) — persist scheduleMode/days
src/features/programs/types.ts        # ensure client_programs payload carries scheduleMode + selectedDays/frequency
# role accessor: use the v2 server-governed role (NOT user_metadata.mode)
```

## K. Guardrails (PR proof block)
```
[ ] SECURITY G-20 — trainer gating reads server-governed role; grep shows NO user_metadata.mode / .mode === 'trainer' role check
[ ] Box-3 seam — NO calendar_events write here; TODO(box-3) comment present
[ ] G-11 — assign/activate write uses await + retry; failure keeps dialog open + precise toast
[ ] G-16 — no 2nd program store; ScheduleStep/SaveActivateDialog are focused files
[ ] G-10 — real uuids; no stub ids
[ ] parity — no next-day/rotation recompute; reads w1 getNextProgramWorkout
[ ] no localStorage program persistence; no canonical_user_id; no apex-
[ ] tsc + lint + vitest + e2e green (verify the GitHub check-run conclusion)
```

## L. Tests (→ tests.md)
- Unit: assign builds the correct `client_programs` payload (self vs trainer); scheduleMode/days persisted;
  trainer-without-client is rejected.
- grep-guards (0): `grep -rn "user_metadata.mode\|\.mode === 'trainer'\|calendar_events" src/features/programs` → 0;
  `grep -rn "stub-user-id\|canonical_user_id\|apex-" src/features/programs` → 0.
- e2e: build → schedule fixed → activate (self) → redirect; row visible via w3/Up-Next later.

## M. Hand-off checklist
- [x] Stage 1 PLAN — this file.
- [ ] Blocked until w2b-1 merged.
- [ ] Code / Test (v2 Cascade, GLM 5.2) → PR.
- [ ] Review (/review-pr) — MUST verify the G-20 role-source deviation.
- [ ] Then w2c-2 (Block Library) — optional/lower priority.

## N. Christo's paste-ready prompt (after w2b-1 merged)
> Set the v2 Cascade to **GLM 5.2**. Read `.pipeline/programs-w2c1-schedule-save/spec.md` and the v1 source
> it cites (read directly; if blocked, stop and tell me). Port Step 3 Schedule + the Save/Activate flow onto
> the w1 store, writing `client_programs`. TWO REQUIRED DEVIATIONS: (1) gate trainer mode on the v2
> server-governed role, NOT `user_metadata.mode`; (2) do NOT write `calendar_events` — persist
> scheduleMode/selectedDays and leave a `TODO(box-3)` seam. PORT-UI fidelity. Branch
> `programs-w2c1-schedule-save`, ONE PR, fill the proof block, return REPORT-BACK. One objective; GLM 5.2.
