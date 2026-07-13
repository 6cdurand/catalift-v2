# QA — 2026-07-13 cross-account parity + regression smoke, deployed staging

- **Target:** https://catalift-v2.netlify.app (deployed staging, `main` @ `b8bdb01`)
- **Date:** 2026-07-12 (UTC)
- **Role:** verifier-agent / QA (read-observe only). No app fixes applied.
- **Scope:** A–F cross-account parity smoke per 2026-07-13 dispatch.
- **Test accounts (self-created, v2 STAGING only, throwaway; no real/prod/v1 creds):**
  - TRAINER — `qa+20260713-0015-trainer@catalift.test` (user `9b661466-fc05-405e-9aae-8728e0d161b8`, role `trainer`)
  - CLIENT — `qa+20260713-0015-client@catalift.test` (user `b5bba7e8-39c3-48e5-80b1-b914d8a42c10`, role `client`)
  - `trainer_clients` relationship seeded manually for QA because invite UI is not merged.

> **Method:** Playwright (CDP, single context) driving the deployed staging app; console + network captured for every section; screenshots on FAIL and for A.1–A.2.

---

## Results

| # | Area | Verdict | Evidence |
|---|------|---------|----------|
| A.1 | Trainer builds & assigns program | **PASS** | Built 2-day flexible program (Day 1: Upper Body 4×8 90s 3010; Day 2: Lower Body 3×12 60s 2010), assigned to CLIENT. Screenshot captured. |
| A.2 | Client program parity | **FAIL** | Client `/program` shows identical days, blocks, sets × reps, and rest. **Tempo is not rendered** (missing `3010` / `2010`). Screenshot captured. |
| A.3 | Up Next advances after completion | **PASS** | Before workout: "Upper Body". After logging Day 1: "Lower Body". |
| B.1 | Low-rep set creates new PB badge | **PASS** | 100kg×5 Bench Press produced `1 New PR!` badge `Barbell Bench Press · 100kg × 5`. |
| B.2 | `/pbs` lists the new PB | **FAIL** | `/pbs` shows `0 all-time PBs` / `No personal bests yet`. |
| B.3 | e1RM on summary equals `/pbs` | **FAIL** | Summary does not display e1RM; `/pbs` empty. Expected e1RM for 100kg×5 is `113`. |
| B.4 | >20 rep set does not create phantom PB | **PASS** | 20kg×25 Bench Press summary has no `New PR` or `PB` badge. |
| C | `/profile` client + trainer, no strength tier, hard refresh | **PASS** | Both profiles render; no Pure Strength Rating card; hard refresh stays authed. |
| D | `/clients` roster + Invite New | **PARTIAL** | Assigned client appears in roster. **"Invite New" is a placeholder**: dialog shows "Adding clients is coming soon — it ships with the trainer-invite update" and the `Create client` button only shows a toast; no invitation created. |
| E | `/today` rich surface | **FAIL** | `/today` shows `Rest Day` only; no week strip, Up Next, quick-start, or stats. |
| F | Hard-refresh stability across authed routes | **PASS** | `/profile`, `/pbs`, `/program`, `/clients`, `/today` all reload without bouncing to `/login`. |

---

## Evidence

### A.1 — Trainer program builder: Flexible 2×/wk, 2 days, assigned to CLIENT

![A.1 builder schedule step](https://app.devin.ai/attachments/1a886ec4-9ec4-4f08-8e67-789619962292/A-builder-day1.png)

### A.2 — Client `/program` shows days/blocks/sets/reps/rest but no tempo

![A.2 client program](https://app.devin.ai/attachments/2354eb5a-d259-407d-8d22-df66f2e40ef2/A-client-program.png)

### A.3 — Up Next advanced from "Upper Body" to "Lower Body" after first workout

![A.3 Up Next after first workout](https://app.devin.ai/attachments/45d07220-474b-46e5-b243-c2e7d2c2a68a/A-up-next-after.png)

### B.1 — Workout summary shows `1 New PR!` for 100kg×5 Bench Press

![B.1 workout summary PB badge](https://app.devin.ai/attachments/efcd0018-6087-4060-ab2d-05602a114b56/B-workout-summary-pb.png)

### B.2 — `/pbs` is empty despite the summary PB badge

![B.2 /pbs empty](https://app.devin.ai/attachments/bfe37bcb-2214-43cf-9d33-e6b3a75126ab/B-pbs.png)

### B.4 — 25-rep set summary has no New PR / PB badge

![B.4 25-rep summary](https://app.devin.ai/attachments/f4eee8d5-1464-440d-bd26-4970ae44865b/B-25rep-summary.png)

### D — Trainer roster shows assigned CLIENT

![D.1 clients roster](https://app.devin.ai/attachments/6dc0f9e0-270d-4a9e-acfa-de0597de90fc/D-clients.png)

### D-invite — "Create New" is a coming-soon placeholder; no invitation created

![D.2 invite dialog](https://app.devin.ai/attachments/67b72457-8a44-450a-9b65-3f33eb6348ed/D-invite.png)

### E — `/today` is a single "Rest Day" empty state; no rich surface

![E.1 today page](https://app.devin.ai/attachments/717b5592-bb9d-4946-9d8a-1e5ae8b84e6f/E-today.png)

---

## Findings

### Finding A — Client program view does not render trainer-entered tempo
The trainer `ExerciseEditDialog` captures `tempo` (e.g. `3010`, `2010`) and persists it on `ProgramExercise.tempo`, but `ProgramDayView` (`src/features/programs/client/components/ProgramDayView.tsx`) only displays `sets × reps` and `rest`. The client page therefore cannot visually confirm the tempo the trainer entered.

- **Impact:** Cross-account parity FAIL for A.2.
- **Action:** Add tempo display to `ExerciseRow` in the client program view.

### Finding B — `/pbs` is never populated; e1RM not surfaced in summary
`WorkoutSummary` correctly computes and shows `data.pbs` from `detectNewPRs`, but `/pbs` reads `personal_bests` table via `fetchPersonalBests`. No code path was found that writes `personal_bests` (the `persist` function only inserts `workouts` rows; `recalculateAllPBs` returns `PersonalBest` objects but does not persist them). Consequently `/pbs` remains `0 all-time PBs` and `WorkoutSummary` does not display `e1RM`.

- **Impact:** B.2 and B.3 FAIL.
- **Action:** Wire the completion pipeline to upsert `personal_bests` and expose `e1RM` on `WorkoutSummary` so it matches `/pbs`.

### Finding D — "Invite New" is not wired to create invitations
`/clients` renders the roster correctly, but the "Add Client" dialog is a placeholder. The `Create New` branch shows the `coming soon` banner and the submit button calls `comingSoon("Create client")`, which produces a toast but no actual `trainer_clients` or auth invitation. The trainer-invite update is known not-yet-merged.

- **Impact:** D-invite FAIL.
- **Action:** Wait for / review the trainer-invite PR; do not merge placeholder as functional.

### Finding E — `/today` lacks week strip, Up Next, quick-start, and stats
`/today` is currently a single `useScheduledSessions` list filtered to today; the page renders `Rest Day` when the store is not hydrated. It does not show the week strip, an Up Next card, quick-start, or stats row.

- **Impact:** E FAIL.
- **Action:** Confirm against the v1→v2 reuse map whether the rich Today surface is intended scope or not-yet-ported.

---

## Classification & PR policy

- **Class A defects found:** A.2, B.2, B.3, D-invite, E are parity/functionality gaps in UI, not auth/schema/money. Per instructions, **QA does not fix** — findings are reported with evidence.
- **No auth / schema / money issues found:** sign-in, role gates, trainer/client assignment, and hard-refresh stability all behaved correctly.
- **No prod or v1 touched:** all testing against staging only; test accounts are throwaway.

## Summary

The 2026-07-13 cross-account parity smoke **reveals the newly-merged screens work end-to-end for the happy path** (trainer build → client program → workout → Up Next advance → roster), but the detailed parity surface is incomplete: client program does not show tempo, `/pbs` is not populated, e1RM is not displayed, `/today` is not the rich surface described, and trainer-invite is still a placeholder. Stability and auth reload are solid. This PR contains only the report file.
