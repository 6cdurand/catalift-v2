# QA — Wave 4 freshly-merged screens (regression + parity smoke), deployed staging

- **Target:** https://catalift-v2.netlify.app (deployed staging, `main` @ `23cdee7`)
- **Date:** 2026-07-07 (UTC)
- **Role:** verifier-agent / QA (read-observe). No app fixes applied (no Class A defect found).
- **Scope:** Smoke the freshly-merged screens for regressions + v1 parity — Today, Clients,
  Builder, Workout-active, and the auth reload race.
- **Test accounts (self-created, v2 STAGING only, throwaway; no real/prod/v1 creds):**
  - TRAINER — `qa+20260707012000-trainer@catalift.test`
  - CLIENT  — `qa+20260707012000-client@catalift.test`

> **VERIFY-don't-claim:** every verdict below is backed by live evidence — the URL after each
> action, the rendered UI (screenshots), and the DevTools console (checked after every step,
> **empty** throughout). A full screen recording of the run accompanies this report.

> **Parity-rubric caveat:** the brief cites `plans/v1_to_v2_reuse_map.md` as the PORT/REBUILD/DROP
> rubric. That file is **not present** in this repo or its git history (it is a command-center
> artifact — see the Wave-3 report note). Parity calls below are therefore best-effort from
> in-repo `.pipeline/*/spec.md` evidence and are flagged for command-center confirmation, not
> scored against the map.

---

## Results

| # | Area | Verdict | Evidence |
|---|------|---------|----------|
| 1 | Today (`/today`) | **PASS (regression) / GAP (parity)** | Renders, trainer theme (no blue-flash), console clean. But shows only a "Rest Day" empty state — **no week strip / Up Next / quick-start / stats row**. See Finding #1. |
| 2 | Clients (`/clients`) | **PASS** | Roster loads, stats `0/0/0` correct, empty state reads **"No clients found"**, Add-Client dialog opens + steps through. Naming note in Finding #2. |
| 3 | Builder (`/builder`) | **PASS** | Entry cards render, Saved Blocks empty state, Create-Program opens the multi-step builder, trainer-gate works both directions. Active-Programs list correctly hidden when empty. |
| 4 | Workout active (`/workout/active`) | **PASS** | Block cards show exercise thumbnails, **Previous** column populates from history (tap-to-fill), finish flow shows **new-PR badges** (first-time + improvement). |
| 5 | Auth reload race | **PASS** | Signed in as TRAINER, hard-refresh (`Ctrl+Shift+R`) on `/today` **and** role-gated `/clients` — no `/login` bounce, no white screen, nav intact. |

Console was **empty** (no errors/warnings/failed-request logs) on every screen and after every
action. Sentry: **not checked** (no QA access to the Sentry project).

---

## Evidence

**1 — Today: trainer hard-refresh stays authed; only "Rest Day" renders (no week strip / Up Next / quick-start / stats)**

![today rest day](https://app.devin.ai/attachments/2715dad8-ba7f-4b05-bd58-2021c051a13c/ss_3e5f7c8d.png)

**2 — Clients: roster empty state "No clients found", stats 0/0/0**

![clients empty state](https://app.devin.ai/attachments/eaf0e88a-1a72-4231-94bd-bd6f438e7f44/ss_4b4897ce.png)

**2b — Clients: Add-Client dialog (Create New / Link Existing + trainer-invite coming-soon banner)**

![add client dialog](https://app.devin.ai/attachments/9534aac2-77cd-4179-9def-034859bb8790/ss_a6a23381.png)

**3 — Builder: entry cards + Saved Blocks empty state**

![builder landing](https://app.devin.ai/attachments/a52e99a4-a8fb-48e7-972a-75addc07901c/ss_6607f45b.png)

**3b — Trainer-gate: CLIENT visiting `/builder` is redirected to `/program`**

![client gated to program](https://app.devin.ai/attachments/d2312e30-912d-4f6e-bc14-88c50a7b7920/ss_e145accc.png)

**4 — Workout: exercise picker shows thumbnails**

![exercise picker thumbnails](https://app.devin.ai/attachments/b06c962c-5c64-4c16-bfc6-2a72a632a035/ss_1832ca8f.png)

**4b — Workout: Previous column populates from history (`100×10`, tap-to-fill)**

![previous column populated](https://app.devin.ai/attachments/466c681f-1847-4f7d-9202-4a5c36752b18/ss_8869f97f.png)

**4c — Workout: finish flow shows new-PR badge (105kg×10 beats prior 100kg)**

![new PR badge](https://app.devin.ai/attachments/54f91912-7336-45d9-9bfc-97dac92a6386/ss_31e4822c.png)

---

## Findings

### Finding #1 — `/today` has no week strip / Up Next / quick-start / stats row — **parity observation (likely not-yet-ported), NOT a regression**
The brief expects `/today` to render a week strip, an "Up Next", a quick-start, and a stats row.
The shipped `/today` renders only a today-filtered session list (here: the "Rest Day" empty state).

**Assessment:** this appears to be **intended scope as of the merged calendar lane**, not a
regression. `.pipeline/v2-calendar-w1/spec.md` states *"The Today page is just this list filtered
to date === today"* and `.pipeline/v2-calendar-w2/changes.md` shows `today/page.tsx` was wired to
`useScheduledSessions` (previously a placeholder). So the richer Today surface (week strip / Up
Next / quick-start / stats) is a **not-yet-ported v1 feature**, not something that regressed.

**Action:** reported, no fix PR. Please confirm against `v1_to_v2_reuse_map.md` whether the rich
Today screen is an intended future lane (→ no action) or a **missed intended parity** (→ file a
port lane). Source: `src/app/(app)/today/page.tsx`.

### Finding #2 — Clients CTA/dialog is "Add Client", brief says "Invite new client" — **minor naming, needs parity confirmation**
The button and dialog title read **"Add Client"** (dialog subtitle "Does this client already have
an account?"), not "Invite new client". The dialog itself works: Create New / Link Existing
branches render and both submit paths surface a "coming soon — ships with the trainer-invite
update" toast (the `invites` feature flag is OFF, so verify/accept is correctly gated).

**Action:** reported, no fix PR (copy could be an intended v2 divergence). Confirm intended label
against the reuse map. Source: `src/app/(app)/clients/page.tsx`.

### (Informational) No UI logout affordance
Consistent with the Wave-3 report: there is still no logout button in the shell. To switch the
signed-in account during this run I cleared the `@supabase/ssr` auth cookie manually. Expected WIP
(Profile/settings lane not built). Not re-flagged as new.

---

## Classification & PR policy
- **No Class A defect found** → no fix PR opened. All five areas function with a clean console.
- **Findings #1 / #2 are parity/scope questions** for command-center to confirm against the
  reuse map — not autonomous fixes.
- **No auth / schema / money issue found** this run (trainer-gate and the reload race both behaved
  correctly; Stripe/payments surface only appears as a signup connection toggle, not exercised).

## Summary
Wave-4 freshly-merged screens **PASS** the regression smoke with a clean console and no crashes.
Trainer-gate and the auth reload race hold. The one substantive gap is `/today` lacking the
week-strip/Up-Next/quick-start/stats surface described in the brief — evidence points to
not-yet-ported scope rather than a regression; flagged for reuse-map confirmation. No fixes
applied; no prod/v1 touched; both test accounts are throwaways on v2 staging.
