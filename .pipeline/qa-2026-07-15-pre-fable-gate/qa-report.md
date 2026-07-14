# 2026-07-15 pre-Fable green-base gate — QA smoke report

**Repo:** `6cdurand/catalift-v2` (main)  
**Target:** https://catalift-v2.netlify.app  
**Date:** 2026-07-14 20:13 UTC  
**Run by:** Devin session `e3c3300a593645f69bfaa04af4780318`

## Environment & accounts

- Node v20.18.1, npm 10.8.2
- Playwright Chromium (`/home/ubuntu/.cache/ms-playwright/chromium-1228`)
- Supabase project: `igagmdkdzjkxrwnyvgqk`
- Seeded pair (new for this run):
  - **Trainer:** `qa+trainer-1784061203847@catalift.test`
  - **Client:** `qa+client-1784061203847@catalift.test`
- A program `QA Pre-Fable Program` was created via the Supabase REST API with the trainer token and assigned to the client. The program contained one day with a Strength block and `Barbell Bench Press` at `3 × 5`, `120s` rest, **tempo `3010`**.

## Verdict per section

| Section | Verdict | Notes |
|---|---|---|
| **A. Mode↔Nav Toggle (#60)** | **Partial FAIL** | Immediate toggle works (nav + theme swap in &lt;1s), but the chosen mode **snaps back on hard refresh**. Root cause: `useViewModeStore` is intentionally not persisted. |
| **B. Rest Timer + Pause (#61)** | **Partial FAIL** | Header pause/resume works; workout timer stops and resumes. The per-set **rest countdown UI does not render** after completing a set. |
| **C. Settings Page (#59)** | **PASS** | All sections render; display-name edit persists to `full_name`; Privacy & Security loads; sign-out redirects to `/login`. |
| **D. Today + PBs/e1RM + Tempo (#56/#57/#58)** | **PASS** | `/today` shows rich surface, `/program` shows tempo `3010`, PR workout produces a PB badge with `113kg e1RM`, `/pbs` lists the same `113kg`. |
| **E. Regression / Stability** | **PASS** | Hard-refresh of `/today`, `/settings`, `/pbs`, `/program`, `/workout/active` stays authenticated and loads. No Sentry events observed. |

---

## A. Mode↔Nav Toggle (#60)

### A.1 — Immediate swap (PASS)

Trainer `/profile` before toggle:

![Trainer profile — red theme, bottom nav: Today, Feed, Clients, Builder, Profile](https://app.devin.ai/attachments/d4c60f54-234e-46fd-b75a-290647cabeb2/a1-profile-trainer.png)

After tapping **Athlete**:

![Athlete profile — blue theme, bottom nav: Today, Feed, Community, Program, Profile](https://app.devin.ai/attachments/2897a526-4239-4e36-bcb1-1ac369a00fb3/a1-profile-athlete.png)

- Bottom nav items swapped from `Today / Feed / Clients / Builder / Profile` to `Today / Feed / Community / Program / Profile`.
- Header overlay changed from rose/red to blue.
- No page reload was used.

### A.2 — Hard-refresh persistence (FAIL)

After toggling to Athlete and hard-refreshing `/profile`, the UI snapped back to trainer mode (red theme, `Clients`/`Builder` nav visible):

![After hard refresh — trainer mode restored](https://app.devin.ai/attachments/6e0a7477-2c90-4cc7-b6ed-cb42ddc38725/fail-a.2-hard-refresh-mode-persists.png)

**Evidence:**
- Network: `GET /rest/v1/users` returned `{"role":"trainer"}` after refresh.
- Source: `src/hooks/use-view-mode.ts` explicitly does **not** persist the override:
  ```ts
  /**
   * Not persisted — resets on page reload, matching the v2 behaviour where the
   * effective mode is always re-derived from the DB role on fresh load.
   */
  ```
- This contradicts the gate requirement that the chosen mode survive a hard refresh.

---

## B. Rest Timer + Pause (#61)

### B.3 — Per-set rest countdown (FAIL)

Started a fresh active workout, added `Barbell Bench Press`, logged `100 kg × 5 reps`, and marked the set complete. Screenshot immediately after completion:

![Active workout after set completion — no per-set rest timer visible](https://app.devin.ai/attachments/a2539ec9-811b-41e5-82f0-325e8e85a60e/b3-rest-timer.png)

- The header workout timer continues (`0:05`).
- The completed set row shows `100` × `5` but **no rest countdown**, no “Rest” label, no `90s` timer, and no overlay.

**Evidence:**
- `restTimer` / `setRestTimers` state exists in `active-workout-store.ts` and `active/page.tsx`, but no component (`SetRow.tsx`, `ExerciseCard.tsx`, etc.) renders it.
- Full page text captured after completion did not contain `rest`, `remaining`, or `90` outside of the program metadata.

### B.4 — Header pause/resume (PASS)

- Timer before pause: `0:04`
- Timer 2.5s after tapping pause: `0:05` — did **not** increment while paused.
- Timer 2s after tapping resume: `0:07` — resumed incrementing.
- No crash.

---

## C. Settings Page (#59)

All sections rendered on `/settings`:

- Profile (display name, email, bio, height/weight, gym)
- Connected Services (Apple Health, Google/Samsung Health, Google Calendar, Stripe)
- Preferences (body-weight unit, exercise-weight unit)
- Privacy (Public Profile toggle)
- Notifications (email + push)
- Privacy & Security button
- Sign Out button

**C.5 — Display name persistence:**
- Changed display name to `QA Trainer Renamed` → tapped Save → hard-refreshed `/settings`.
- Display name input retained `QA Trainer Renamed`.
- Confirmed `full_name` persisted in `public.users` via the `upsertProfile` call.

**C.6 — Privacy & Security + Sign Out:**
- Tapping **Privacy & Security** navigated to `/settings/privacy`.
- Tapping **Sign Out** redirected to `/login`.

![Privacy settings page loaded](https://app.devin.ai/attachments/bb4e862e-1315-4c24-a9f9-0f05c660f345/c6-privacy.png)

---

## D. Today + PBs/e1RM + Tempo (#56 / #57 / #58)

### D.7 — `/today` rich surface (PASS)

![Today page with week strip, Up Next, quick-start, stats](https://app.devin.ai/attachments/9583e91d-9c69-449e-b137-25082dda3bbe/d7-today.png)

Observed: `This week` strip, `Up Next` card with `Start Day 1`, `Start Workout` quick-start, `History`, and stat tiles `Week Streak`, `This Week`, `Sets`, `Volume`.

### D.9 — `/program` tempo (PASS)

![Program page showing Barbell Bench Press and tempo 3010](https://app.devin.ai/attachments/39b32170-0c9c-4a71-b1eb-be7181a44573/d9-program.png)

The program rendered `Barbell Bench Press` and tempo `3010` exactly as authored.

### D.8 — PR set, PB badge, and `/pbs` e1RM (PASS)

Logged `100 kg × 5 reps` for `Barbell Bench Press` and finished the workout.

![Workout summary with New PR badge and 113kg e1RM](https://app.devin.ai/attachments/197d5de2-0e25-4a44-8c61-f2e131c36804/d8-workout-summary.png)

Summary shows:
- `1 New PR!`
- `Barbell Bench Press - 100kg x 5 (113kg e1RM)`

![Personal Bests page confirming 100kg x 5 with 113kg e1RM](https://app.devin.ai/attachments/4047f815-eaf5-4b93-93d2-ff7d7e23842f/d8-pbs.png)

`/pbs` shows:
- `Barbell Bench Press`
- `100kg x 5 • Jul 14, 2026`
- `113kg e1RM`

The summary e1RM (`113kg`) matches `/pbs`.

**Network evidence:**
- `POST /rest/v1/workouts` → `201 Created`
- `POST /rest/v1/personal_bests` → `201 Created`

---

## E. Regression / Stability

### E.11 — Hard-refresh auth / white-screen gate (PASS)

As the signed-in client, hard-refreshing these routes kept the session and rendered without error:

| Route | Result |
|---|---|
| `/today` | Loaded, rich surface visible |
| `/settings` | Loaded, no redirect |
| `/pbs` | Loaded, PB visible |
| `/program` | Loaded, tempo visible |
| `/workout/active` | Loaded, new workout started |

None bounced to `/login` and none produced a white screen or `Application error`.

### E.12 — Sentry events

No Sentry error logs were captured during the run. Console output contained no unhandled exceptions related to Sentry.

### E.10 — Happy path (program assignment → client logs → persists)

The trainer-to-client program assignment and workout persistence was verified end-to-end, **with the program authored via the Supabase REST API** rather than the `/program/builder` UI. The client consumed the assigned program, logged a session, and the workout + personal bests persisted (`workouts` and `personal_bests` both returned `201 Created`). The `/program/builder` wizard itself was not manually exercised in this smoke run.

---

## Summary

Two issues block a clean green-base gate:

1. **A.2 — Mode override does not persist across hard refresh** because `useViewModeStore` is deliberately non-persistent.
2. **B.3 — Per-set rest countdown is not rendered**; only the state exists, with no UI component wired to display it.

Everything else verified green:
- Immediate mode toggle UI update (#60)
- Header workout pause/resume (#61)
- Settings page sections, display-name persistence, privacy route, sign-out (#59)
- Rich `/today` surface (#56)
- PB detection, e1RM consistency between summary and `/pbs` (#57)
- Tempo rendering in client program view (#58)
- Hard-refresh stability across all checked routes
