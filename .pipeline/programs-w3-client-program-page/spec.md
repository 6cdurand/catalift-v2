# .pipeline/programs-w3-client-program-page/spec.md — Stage 1 (PLAN)

**Box:** 02-programs · **Wave:** w3 · **Feature:** Client Program Page (the athlete's view of their assigned/active program — "Up Next", weekly progress, start workout)
**Class:** A — UI port reading the w1 data layer. No schema change, no auth change.
**Executor model:** GLM 5.2 · **Recommended executor:** v2 Cascade (reads v1 directly).
**Repo:** catalift-v2 · **Branch:** `programs-w3-client-program-page` · ONE PR.
**Depends on:** **w2c-1 merged** (so `client_programs` rows exist to display) AND lives in
`src/features/programs` → **build AFTER the whole w2 builder series merges** (shared folder; sequential).

> ⚠️ **This is the OTHER half of the parity law.** The builder (w2) WRITES the canonical `Program`;
> w3 READS it. w3 MUST get "next day" from the w1 `getNextProgramWorkout` selector — it may NOT compute
> its own next-day/rotation (that's the exact "Today says pull / Program says legs" divergence bug,
> BUG-001/010, DOSSIER parity guard, ARCHITECTURE_CONTRACTS §2). grep-guard: no day-index logic in w3.

---

## SOURCE — v1 code to port (read directly by absolute path; FALLBACK: ask Christo to paste)
> `/Users/christofit7/Desktop/catalift/catalift-web/apex-fitness/src/app/program/page.tsx` (2358 L)
> - **Component:** `ProgramPage` L127–end; render starts L495.
> - **Active program:** `activeProgram = clientPrograms.find(status==='active' && clientId===user.id)` L177.
> - **Next workout (CANONICAL):** `nextWorkout = getNextProgramWorkout(user.id)` L178 — use the w1 selector.
> - **Program summary card:** L502–566 (name, trainer, ×/week, unique workouts, scheduleMode/selectedDays).
> - **"Up Next" card:** L567–625 (next day label, sessionType badge, "X left this week", Start button,
>   Preview eye, Swap button).
> - **Weekly progress:** `<WeeklyProgressStrip>` L627–640 — port the component
>   `/catalift-web/apex-fitness/src/components/program/WeeklyProgressStrip.tsx` (check size; if large,
>   decompose). Uses `completedDayIndices` / `lockedDayIndices` / `lockReasons` from `getNextProgramWorkout`.
> - **Start a day:** `startProgramDay(dayIndex)` L182+ → navigates into the workout (Box 1 active workout).
> - **Trainer name + message button:** L203–219, L554–566.
> - **Dialogs:** Swap (`showSwapDialog` L136), Preview (`previewDay`).

## ⚠️ DROP (v1 cruft — do NOT port)
- `AIBlock`/`AIWorkout`/`AIProgram` interfaces L52–89 — AI-program feature, out of scope (separate future feature).
- `loadSavedPrograms`/`saveProgramsList`/`loadProgramData` L105–125 — **localStorage program persistence**
  (the v1 footgun class). v2 reads from the w1 store ONLY. NO localStorage program data.
- `useWorkoutStore`/`useSocialStore` imports if not needed for this view.
- Any `canonical_user_id` / `apex-` references.

**NOT in scope:** the builder (w2), template select/preview (w4), the calendar grid (Box 3). w3 only
renders the client's already-assigned active program.

---

# ===== FEATURE READINESS GATE (A–F) =====

## A. Placement
`/program` route (athlete). Reads the signed-in user's active `client_programs` row. If none → empty state
("no active program" + CTA to build/select one). Thin route → `<ClientProgramPage/>` feature component.

## B. Navigation map
| Element | Leads to | Type | Back |
|---|---|---|---|
| "Start {day}" (Up Next) | active workout for that program day (Box 1) | redirect | back → `/program` |
| Preview eye | Preview-day dialog (read-only day contents) | popup | close → `/program` |
| Swap | Swap-day dialog (pick a different day this week) | popup | close → `/program` |
| "Create / Edit Program" (if none / owner) | `/program/builder` (w2) | redirect | back → `/program` |
| Message trainer (if trainer-assigned) | `/messages?with={trainerId}` | redirect | back → `/program` |
- **Dead-end check:** empty state has a CTA; every dialog closes back; Start goes to a real workout screen.

## C. Two-sided view
- **Client (recipient) face:** sees the assigned program read-only + Up Next + progress + Start. This is
  the RECIPIENT side of the builder's authoring — the parity pair to w2.
- **Self-authored:** same page; if `activeProgram.trainerId === user.id` (self), show edit affordance
  instead of "message trainer".
- **Parity law:** renders the SAME canonical w1 `Program` the builder wrote; next-day from the SAME
  `getNextProgramWorkout`. No second computation anywhere.

## D. Functionality walkthrough
Athlete opens `/program` → sees active program summary → "Up Next" shows the correct next day (from
`getNextProgramWorkout`) with "X left this week" → taps Start → enters the workout → returns, progress
strip reflects completion. If trainer-assigned, can message the trainer. If no active program → empty
state with CTA. Offline/empty/loading states handled (no white screen, G-18).

## E. Data + source-of-truth
- Reads `clientPrograms` + `getNextProgramWorkout` from the w1 programs store/selectors ONLY. No
  localStorage program data (G-02). No second program shape (G-16).
- Cross-surface consistency: this page, the Today "Up Next", and the calendar strip ALL read the SAME
  `getNextProgramWorkout` result. w3 introduces NO independent next-day logic.

## F. Acceptance gate
1. Active program renders with correct name/trainer/×-week/unique-workouts/schedule.
2. "Up Next" matches `getNextProgramWorkout` exactly (the divergence-bug guard) — label, sessionType,
   remaining-this-week, completed/locked days.
3. Start navigates into the correct program day's workout.
4. Empty state when no active program; trainer-message button only when trainer-assigned & not self.
5. Preview + Swap dialogs work.
6. grep-guards (§L) = 0 — NO day-index logic, NO localStorage program data, NO dropped-cruft.
7. Port-fidelity: matches v1 client program page.
- **exercise-specialist lens:** the displayed program structure + next-day are correct/sensible.
- **VERDICT:** READY (pending w2 builder series merged).

# ===== END GATE =====

---

## J. v2 implementation (target structure)
```
src/features/programs/client/ClientProgramPage.tsx   # NEW — the page (summary + Up Next + progress + dialogs)
src/features/programs/client/components/UpNextCard.tsx
src/features/programs/client/components/ProgramSummaryCard.tsx
src/features/programs/components/WeeklyProgressStrip.tsx   # port v1 component (decompose if large)
src/features/programs/client/dialogs/{PreviewDay,SwapDay}Dialog.tsx
src/app/program/page.tsx        # thin route → <ClientProgramPage/>
```
Consumes w1 `store.ts` + `getNextProgramWorkout` + `types.ts`. If w2c-1 reconciled the local Builder
types onto the canonical `Program`, w3 reads that same canonical shape (no drift).

## K. Guardrails (PR proof block)
```
[ ] parity — "Up Next" comes ONLY from w1 getNextProgramWorkout; grep shows NO day-index/rotation logic in w3
[ ] G-02 — NO localStorage program data (dropped v1 loadSavedPrograms/loadProgramData)
[ ] G-16 — reads w1 store; no 2nd program store/shape; page decomposed (no god-file)
[ ] G-18 — empty/loading/offline render without white screen
[ ] no canonical_user_id; no apex-; AI-program interfaces NOT ported
[ ] PORT-UI fidelity — matches v1 client program page
[ ] tsc + lint + vitest + e2e green (verify the GitHub check-run conclusion)
```

## L. Tests (→ tests.md)
- Unit: Up Next renders from a mocked `getNextProgramWorkout`; empty state when no active program;
  trainer-message button visibility logic (assigned & not self).
- grep-guards (0): `grep -rn "loadSavedPrograms\|loadProgramData\|apex-\|canonical_user_id" src/features/programs/client` → 0;
  no day-index/next-day logic in `client/`.
- e2e: with a seeded active program, `/program` shows Up Next + Start navigates into the workout.

## M. Hand-off checklist
- [x] Stage 1 PLAN — this file.
- [ ] **Blocked until the w2 builder series merges** (shared `programs` folder + needs `client_programs` written by w2c-1).
- [ ] Code / Test (v2 Cascade, GLM 5.2) → PR → Review (parity + no-localStorage are the must-checks).
- [ ] Then w4 (template select/preview + SaveProgramDialog).

## N. Christo's paste-ready prompt (use after the w2 builder series merges)
> Set the v2 Cascade to **GLM 5.2**. `git pull` main first. Read `.pipeline/programs-w3-client-program-page/spec.md`
> and the v1 source it cites (read directly; if blocked, stop and tell me). Port v1's client program page
> (`/program`) onto the w1 store. **"Up Next" MUST come from the w1 `getNextProgramWorkout` selector — do
> NOT compute next-day yourself.** DROP the v1 localStorage program loaders and the AI-program interfaces
> (see spec). Port `WeeklyProgressStrip` (decompose if large). PORT-UI fidelity. Branch
> `programs-w3-client-program-page`, ONE PR, fill the proof block, return REPORT-BACK. One objective; GLM 5.2.
