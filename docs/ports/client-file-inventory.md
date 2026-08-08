# Client file inventory — `/clients/[id]` (v1 → v2)

> **What this document is.** A section-by-section enumeration of everything v1's trainer client file
> renders, with an explicit verdict against each one. It exists because the July 2026 lane
> deliberately built ~11% of this screen and the deferred 89% was never written down anywhere
> countable — it lived only in a closed brief's DEFER list, and STATUS recorded the lane as
> "shipped". **This file is the tracking artefact whose absence caused that.**
>
> **The ratchet.** Every Phase 2 PR that ports one of these sections must flip its row to `SHIPPED`
> **in the same commit**. Coverage can never drift from reality again.
>
> **`TBD` is not a verdict.** A section may only leave scope by someone writing down that it left.

---

## Header

| | |
|---|---|
| **Date** | 2026-08-08 |
| **Lane** | P-06 Phase 1 (inventory only — zero code, zero schema) |
| **Workspace opened** | `/Users/christofit7/Desktop/catalift/catalift-port.code-workspace` (multi-root: v2 = write, v1 = read-only) |
| **v1 source** | `catalift-web/apex-fitness/src/app/clients/[id]/page.tsx` — **3,415 lines**, single file |
| **v1 commit read** | `4891dd2` (branch `fix/payments-paid-derive-from-history`); this file is **identical to v1 `main`** — verified `git diff main HEAD -- src/app/clients/[id]/page.tsx` returns empty |
| **v2 destination** | `catalift-v2/src/app/(app)/clients/[id]/page.tsx` — **376 lines** |
| **v2 commit diffed against** | `cd38cff320cd08555b9c3ad21845be79afdd7e53` (`main`, clean tree) |
| **v1 ranges opened** | 1–3415, in full, in 150-line windows; section boundaries then re-verified by grepping every JSX comment, `TabsContent`, `Dialog open=`, `ConfirmDialog`, `EditHistoricalOffsetModal` and `WorkoutStatsCharts` (103 anchors) |

### Coverage

**6 of 57 sections shipped — 11%** (by section count, not line count).

| Status | Count |
|---|---|
| `SHIPPED` | 6 |
| `PARTIAL` | 15 |
| `MISSING` | 36 |
| `STUBBED` | 0 |
| `INTENTIONALLY DROPPED` | 0 |
| **Total** | **57** |

Section-count coverage (11%) and line-count coverage (376/3415 = 11%) agree. That is a coincidence
worth noting rather than trusting — two 200-line dialogs and two 12-line badges are four sections
either way, and the line-count number would have flattered a lane that shipped one big card.

### Correction to the dispatch brief

The brief's §3 anatomy table is labelled unverified. Reading the file confirms the five tab
boundaries but the map **omits nine sections**, all now enumerated below: *Client-not-found state*
(609–621), *Workout Categories Summary* (2154–2187), *Full Workout History* (2189–2292), *Circuit
Performance History* (2294–2368), *WorkoutStatsCharts* (2370–2373), *Program Schedule Info*
(2548–2573), *Client's Calendar Overview / mini calendar / upcoming* (2643–2763), *Session Balance
Card* (2768–2810), *Payment Summary* (2812–2828).

---

## 1. Section table

`Class` — **A** = app code only · **B** = schema, RLS, auth, payments or data-sync (needs Christo's
review before the lane runs). `Lane` = the proposed Phase 2 lane from §4.

### 1.1 Page shell and header

| # | Section (v1's label) | v1 lines | What it does | Reads | Writes | v2 status | v2 location | Verdict | Class | Lane |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Trainer-only route guard | 250–256 | Redirects a non-trainer to `/workout`; gated on persist hydration | `useAuthStore.user.mode` | — | `SHIPPED` | `page.tsx:59-63,104-113` | `PORT-ADAPTED` — v2 uses Supabase Auth + `useUserRole`, redirect target `/today` | A | — |
| 2 | Client-not-found state | 609–621 | Full-page "Client not found" + Go Back when relation or user missing | — | — | `SHIPPED` | `page.tsx:124-135` | `PORT-ADAPTED` — v2 uses shared `ErrorState` | A | — |
| 3 | Header identity block | 625–641 | Sticky rose→red gradient bar: back, avatar (opens profile card), displayName, `@username` | `users`, `trainer_clients` | — | `PARTIAL` | `page.tsx:142-157,160-206` | `PORT` | A | L1 |
| 4 | Header → Message button | 642–650 | Routes `/messages?with={clientId}` and v1's messages page **honours** `?with=` (`messages/page.tsx:168`) | — | — | `PARTIAL` | `page.tsx:147-156` | `PORT` — v2 must honour `?with=` | A | L1 |
| 5 | Header → "Pending Signup" badge | 651–656 | Amber badge when a `trainer_clients` row has no matching user record | `trainer_clients` | — | `MISSING` | — | `PORT-ADAPTED` — map to `trainer_clients.status='pending'` + `invitations` | A | L1 |
| 6 | Header → status toggle badge | 657–669 | Click flips client `active ⇄ paused`; optimistic toast | `trainer_clients.status` | `trainer_clients.status` | `MISSING` | `page.tsx:176-184` renders the badge **read-only** | `PORT-ADAPTED` — v2 `status` check allows `active/inactive/pending/archived`, **not `paused`** | B | L1 |
| 7 | Header → remove client | 671–678 | Trash icon opens the remove-client confirm | — | — | `MISSING` | — | `PORT` | A | L1 |
| 8 | Tab bar (5 tabs) | 683–693 (+190) | `overview / program / progress / messages / payments`; initial tab seeded from `?tab=` | — | — | `MISSING` | — | `PORT` — v2 is a single scroll, **no tabs at all** | A | L1 |

### 1.2 Overview tab (697–2150)

| # | Section (v1's label) | v1 lines | What it does | Reads | Writes | v2 status | v2 location | Verdict | Class | Lane |
|---|---|---|---|---|---|---|---|---|---|---|
| 9 | Session Package Summary — active package | 699–844 | The package card: completed banner + Reset/New, edit pencil, continuous vs fixed layouts, 3 counters, progress bar, unpaid-sessions warning | `session_packages` | `session_packages` (reset, 718–723) | `MISSING` | — | `DEFER` — **no packages table in v2** | B | L6 |
| 10 | No active package hint | 845–863 | Compact "No session package" strip + Create Package | `session_packages` | — | `MISSING` | — | `DEFER` — same blocker as #9 | B | L6 |
| 11 | Create Package Dialog | 865–989 | Fixed vs Continuous toggle, total sessions, price/session, computed total, create | — | `session_packages` insert | `MISSING` | — | `DEFER` — same blocker as #9 | B | L6 |
| 12 | Edit Package Dialog | 991–1130 | Edit total/used/paid/price, switch fixed⇄continuous, earned/paid/outstanding summary, save | `session_packages` | `session_packages` update | `MISSING` | — | `DEFER` — same blocker as #9 | B | L6 |
| 13 | Import History button | 1132–1140 | Dashed full-width button opening modal #52 | — | — | `MISSING` | — | `PORT-ADAPTED` — target the v2 offset columns | B | L6 |
| 14 | Session tracking card (3 counters) | 1146–1217 | Lifetime (`offset + logged`) with **Edit historical** link; active-package usage; workouts-logged with **View history →** | `trainer_clients.historical_offset_sessions`, sessions, packages, workouts | — | `PARTIAL` | `ClientPaymentsSection.tsx:92-96` (lifetime only) | `PORT-ADAPTED` — package counter blocked by #9 | B | L2 |
| 15 | Quick Stats grid (4 cards) | 1219–1280 | Workouts Done · Upcoming · Sessions Left · Total Paid (flips to red "Unpaid Sessions" when >0) | workouts, calendar events, packages, payments | — | `PARTIAL` | `page.tsx:191-202` (sessions + last-seen only) | `PORT-ADAPTED` — "Sessions Left" blocked by #9 | A | L2 |
| 16 | Program Compliance / adherence ring | 1282–1335 | SVG donut of `adherencePercent` + Assigned/Completed/Personal, colour-coded badge | workouts, calendar events, program | — | `MISSING` | — | `PORT` — v1 `@/lib/compliance` has **no v2 equivalent** | A | L2 |
| 17 | Unpaid Sessions Alert | 1337–1358 | Red card "N unpaid sessions" + View → payments tab | sessions | — | `PARTIAL` | `ClientPaymentsSection.tsx:116-131` | `PORT-ADAPTED` — v2 derives outstanding from ledger − paid, not per-session `paid` flags | A | L2 |
| 18 | Client Info card | 1360–1433 | Member since · Gender · Height · Weight · Email + edit pencil · **Send App Invitation** · **Sync Account to Cloud** | `users`, `trainer_clients.startDate` | — | `PARTIAL` | `page.tsx:187-189` (email only) | `PORT-ADAPTED` — **drop** "Sync Account to Cloud" (see §6) | A | L2 |
| 19 | Onboarding & Program card | 1435–1638 | Three states: onboarding-incomplete + Start Onboarding · active program + delete + **Quick Start** per day + Edit/Change/View + Past Programs · onboarding-complete + Select/Create | `client_programs`, `trainer_clients.onboardingComplete` | `client_programs` delete, `calendar_events` insert, workout start | `PARTIAL` | `page.tsx:208-298` | `PORT-ADAPTED` — v2 has no `/clients/[id]/onboarding` route (it has `/onboarding/client`) and no `program/preview` | A | L4 |
| 20 | Goals card | 1640–1673 | Goal badges or "No goals set yet"; edit pencil | `trainer_clients.goals` | — | `MISSING` | — | `DEFER` — **no `goals` column in v2** | B | L3 |
| 21 | Edit Goals Dialog | 1675–1735 | Add goal (Enter or +), click badge to remove, Save | — | `trainer_clients.goals` | `MISSING` | — | `DEFER` — same blocker as #20 | B | L3 |
| 22 | Client Profile — onboarding answers | 1737–1829 | Experience · Training pref · Sessions/week × length · Available Days + schedule notes · Trains Alone · Injuries + notes · Movement Confidence (5-grid) · Current Phase | client profile record | — | `MISSING` | — | `DEFER` — **no onboarding-answers table in v2** | B | L3 |
| 23 | Notes card | 1831–1858 | Free-text trainer notes or empty hint; edit pencil | `trainer_clients.notes` | — | `MISSING` | — | `DEFER` — **no `notes` column in v2** | B | L3 |
| 24 | Edit Notes Dialog | 1860–1885 | Textarea + Save Notes | — | `trainer_clients.notes` | `MISSING` | — | `DEFER` — same blocker as #23 | B | L3 |
| 25 | Pending Payments Alert | 1887–1904 | Amber card: N pending payments, $X outstanding | payments (`status='pending'`) | — | `MISSING` | — | `PORT` | A | L2 |
| 26 | Recent Workouts card | 1906–2149 | Last 3 workouts: name/date/volume/duration, **Repeat**, **Save as Template**, **Edit**, block-performance chips, top-3 exercises w/ best set, 🔒 trainer notes, 📝 client notes, **Sync to Cloud**, **View All** | workouts, block performances | workout template save | `PARTIAL` | `page.tsx:300-351` | `PORT-ADAPTED` — **drop** "Sync to Cloud" (see §6); chips blocked (no `block_performances`) | A | L5 |

### 1.3 Progress tab (2153–2374)

| # | Section (v1's label) | v1 lines | What it does | Reads | Writes | v2 status | v2 location | Verdict | Class | Lane |
|---|---|---|---|---|---|---|---|---|---|---|
| 27 | Workout Categories Summary | 2154–2187 | Two cards: Solo Training vs PT Sessions, split on `assignedBy` | workouts | — | `MISSING` | — | `PORT-ADAPTED` — v2 `workouts` has no `assigned_by`; derive from `calendar_events`/`client_sessions` | A | L5 |
| 28 | Full Workout History | 2189–2292 | Scrollable "All Workouts (n)": date, exercise count, PT-session tag, has-notes tag, volume, duration, Repeat / Save-as-Template / Edit, 🔒 trainer notes | workouts | workout template save | `MISSING` | — | `PORT` | A | L5 |
| 29 | Circuit Performance History | 2294–2368 | Per-circuit cards: block name, date, difficulty badge, completion time, per-round badges, rounds + volume | block performances | — | `MISSING` | — | `DEFER` — **no `block_performances` table in v2** | B | L5 |
| 30 | WorkoutStatsCharts | 2370–2373 | Volume/PB charts for this client | workouts, personal bests | — | `MISSING` | Component exists at `src/app/(app)/profile/_components/WorkoutStatsCharts.tsx:41` but is route-private | `PORT-ADAPTED` — promote component to `src/components/` first | A | L5 |

### 1.4 Messages tab (2377–2430)

| # | Section (v1's label) | v1 lines | What it does | Reads | Writes | v2 status | v2 location | Verdict | Class | Lane |
|---|---|---|---|---|---|---|---|---|---|---|
| 31 | Messages List | 2380–2411 | 400px scroll of bubbles, self right / client left, HH:mm, empty state | conversations, messages | — | `MISSING` | — | `PORT` — reuse `@/features/messaging` | A | L1 |
| 32 | Message Input | 2413–2427 | Input + Enter-to-send + Send button | — | messages insert | `MISSING` | — | `PORT` | A | L1 |
| 33 | Mark-as-read on tab open | 310–314 | Flips inbound messages to read when the Messages tab is active | conversation | messages `seen_at` | `MISSING` | — | `PORT` | A | L1 |

### 1.5 Program tab (2433–2764)

| # | Section (v1's label) | v1 lines | What it does | Reads | Writes | v2 status | v2 location | Verdict | Class | Lane |
|---|---|---|---|---|---|---|---|---|---|---|
| 34 | Active Program card | 2437–2465 | Rose card: name, `n×/week`, workouts count, Flexible/Fixed, phase badge, delete | `client_programs` | `client_programs` delete | `PARTIAL` | `page.tsx:214-265` | `PORT` — v2 shows name/phase/days/mode but **no delete** | A | L4 |
| 35 | Quick Start Session buttons | 2467–2516 | Per program day: start a tagged workout; "Client edited <ago>" badge when the client changed the day | `client_programs` | workout start (tagged `programId` + `dayIndex`) | `MISSING` | `page.tsx:244-263` lists the days but they are **not clickable** | `PORT` | A | L4 |
| 36 | Program Actions | 2520–2546 | Edit (builder) / Change (select) / View (preview) | — | — | `MISSING` | — | `PORT-ADAPTED` — v2 has `/program/builder` + `/program/select`, **no preview route** | A | L4 |
| 37 | Program Schedule Info | 2548–2573 | `n×/wk` badge, Flexible-cycling vs Fixed-days, selected days, PT-vs-personal split per week | `client_programs` | — | `PARTIAL` | `page.tsx:236-241` (schedule mode only) | `PORT` | A | L4 |
| 38 | Past Programs (Program tab) | 2575–2607 | Card listing past programs with status + days/week + delete | `client_programs` | `client_programs` delete | `PARTIAL` | `page.tsx:280-297` | `PORT` — v2 lists them but has **no delete** | A | L4 |
| 39 | No Active Program empty state | 2610–2640 | Icon + Select Template / Build Custom | — | — | `SHIPPED` | `page.tsx:266-278` | `PORT-ADAPTED` — v2 shows the empty card without the two CTAs; CTAs tracked under #36 | A | — |
| 40 | Schedule card → Book PT | 2645–2655 | Book PT button in the schedule card header | — | — | `SHIPPED` | `page.tsx:357-363` | `PORT` | A | — |
| 41 | Mini calendar | 2658–2715 | Month grid, today ring, rose dot = PT session, blue dot = workout, legend | sessions, calendar events, workouts | — | `MISSING` | — | `PORT` | A | L4 |
| 42 | Upcoming sessions list | 2717–2761 | Next 5 future/today events, PT vs workout styling, Today badge, hides days already completed | sessions, calendar events, workouts | — | `MISSING` | — | `PORT` | A | L4 |

### 1.6 Payments tab (2767–2903)

| # | Section (v1's label) | v1 lines | What it does | Reads | Writes | v2 status | v2 location | Verdict | Class | Lane |
|---|---|---|---|---|---|---|---|---|---|---|
| 43 | Session Balance card | 2768–2810 | Covered / Used / Remaining across all packages + avg per-session cost | `session_packages` | — | `MISSING` | — | `DEFER` — blocked by #9 | B | L6 |
| 44 | Payment Summary | 2812–2828 | Total Paid and Outstanding tiles | payments | — | `PARTIAL` | `ClientPaymentsSection.tsx:91-112` | `PORT-ADAPTED` — v2 shows sessions-done / paid-sessions / outstanding, not $ paid vs $ outstanding | B | L6 |
| 45 | Record Payment button | 2830–2834 | Opens the add-payment dialog | — | — | `SHIPPED` | `ClientPaymentsSection.tsx:70-78` | `PORT` | A | — |
| 46 | Payment History list | 2836–2902 | Per-payment card: status icon, description, date, method, amount, **Mark Paid** when pending, gear → edit | payments | `markPaymentPaid` | `PARTIAL` | `PaymentHistoryList.tsx` | `PORT` — v2 has **no Mark Paid and no edit affordance** | B | L6 |

### 1.7 Quick Actions bar (2907–2951)

| # | Section (v1's label) | v1 lines | What it does | Reads | Writes | v2 status | v2 location | Verdict | Class | Lane |
|---|---|---|---|---|---|---|---|---|---|---|
| 47 | Quick action → Message | 2910–2916 | Fixed bottom bar; switches to the Messages tab | — | — | `PARTIAL` | `page.tsx:147-156` navigates away instead | `PORT` | A | L1 |
| 48 | Quick action → Start Workout | 2917–2941 | Creates a `session` calendar event for today, then starts an ad-hoc workout for the client | — | `calendar_events` insert, workout start | `MISSING` | — | `PORT` | A | L1 |
| 49 | Quick action → Book | 2942–2949 | Routes to `/clients/[id]/book` | — | — | `SHIPPED` | `page.tsx:357-363` | `PORT` | A | — |

### 1.8 Modals (2953–3412)

| # | Section (v1's label) | v1 lines | What it does | Reads | Writes | v2 status | v2 location | Verdict | Class | Lane |
|---|---|---|---|---|---|---|---|---|---|---|
| 50 | Add Payment Dialog | 2953–3055 | Amount, date, sessions covered, live per-session cost, description, cash/card/transfer; creates payment **and** a package when sessions > 0 | — | payment insert + package insert | `PARTIAL` | `LogPaymentDialog.tsx` | `PORT-ADAPTED` — the package side-effect is blocked by #9 | B | L6 |
| 51 | Edit Payment Dialog | 3057–3126 | Edit amount, date, method; forces `status='paid'` on save | payments | payment update | `MISSING` | — | `PORT-ADAPTED` — **do not** force `status='paid'` (see §5, V19-6) | B | L6 |
| 52 | Import Client History Dialog | 3128–3181 | Sessions already completed · Sessions remaining (prepaid) · Total paid → `setInitialClientStats` | — | client stats write | `MISSING` | — | `PORT-ADAPTED` — maps to `historical_offset_sessions` + `total_paid_offset`; "sessions remaining" has no v2 home | B | L6 |
| 53 | Edit Workout Dialog | 3183–3255 | Per-completed-set weight/reps inputs with a VOL column; save recomputes total volume, PBs and syncs | workouts | workout update | `MISSING` | — | `PORT-ADAPTED` — fix the v1 VOL display bug (see §5, G-13) | A | L5 |
| 54 | Edit Email Dialog | 3257–3301 | Update client email then send the invitation to the new address | `users.email` | `users.email` + invite send | `MISSING` | Invite API exists at `features/auth/api/invite.ts` but is not on this screen | `PORT-ADAPTED` — **never** pass a default password (see §6) | B | L3 |
| 55 | Remove Client ConfirmDialog | 3303–3312 | Destructive confirm; removes from the trainer's list only, never deletes the account | — | `trainer_clients` delete | `MISSING` | — | `PORT` | B | L1 |
| 56 | EditHistoricalOffsetModal | 3314–3350 | Set the pre-Catalift session count; writes `historicalOffsetSessions`, mirrors the legacy column, recomputes `totalSessions` | `trainer_clients` | `trainer_clients` offset columns | `MISSING` | `adjustSessionOffset()` exists (`payments/api/sessions.ts:155`) but is wired **only** to the roster-wide `/payments` surface | `PORT-ADAPTED` — v2 has one clean column, so drop the legacy mirror (see §5, G-14) | B | L6 |
| 57 | Client Profile Card popup | 3352–3412 | Avatar, name, `@username`, gym, Workouts / Medals / PBs tiles, strength rating, bio | workouts, PBs, medals | — | `MISSING` | — | `PORT-ADAPTED` — Medals and Strength Rating are behind **disabled** v2 feature flags | A | L1 |

---

## 2. Completeness notes for every `SHIPPED` / `PARTIAL` row

> `SHIPPED` here means **"a trainer can do in v2 everything this section lets them do in v1"** — not
> "a card with a similar heading exists". A rendered-but-dead control is a **FAIL**, not a partial.

### #1 Trainer-only route guard — `SHIPPED`
- v1: `apex-fitness/src/app/clients/[id]/page.tsx:250-256`
- v2: `catalift-v2/src/app/(app)/clients/[id]/page.tsx:59-63`, `104-113`
- v1 renders: redirect to `/workout` when `user.mode !== 'trainer'`, gated on Zustand-persist hydration.
- v2 renders: redirect to `/today` when `role !== 'trainer'`, gated on `sessionLoading`/`roleLoading`; renders `null` for non-trainers.
- MISSING vs v1: nothing.
- Inert controls in v2: none.

### #2 Client-not-found state — `SHIPPED`
- v1: `:609-621` · v2: `:124-135`
- v1 renders: user icon, "Client not found", Go Back (`router.back()`).
- v2 renders: `ErrorState` with title, "This client may not be in your roster.", retry → `/clients`.
- MISSING vs v1: nothing (retry target differs deliberately; v2's is better — `back()` can re-enter a broken route).
- Inert controls in v2: none.

### #3 Header identity block — `PARTIAL`
- v1: `:625-641` · v2: `:142-157` (PageHeader) + `:160-206` (profile summary card)
- v1 renders: sticky rose→red gradient bar · back · 12×12 avatar that is a **button opening the profile card** · displayName · `@username`.
- v2 renders: `PageHeader` with title = name, subtitle = "Active client"/"Inactive", back; separately a white profile card with a 16×16 avatar, name, status badge, email, session count, last-seen.
- **MISSING vs v1:** `@username` is never shown; the avatar is **not** clickable (no profile-card entry point — see #57); the header is not the rose trainer-theme sticky bar.
- Inert controls in v2: none.

### #4 Header → Message button — `PARTIAL`
- v1: `:642-650` · v2: `:147-156`
- v1 renders: "Message" → `/messages?with={id}`, and v1's messages page reads that param (`apex-fitness/src/app/messages/page.tsx:168`) and opens that conversation.
- v2 renders: the same button and the same URL.
- **MISSING vs v1:** v2's `/messages` page **never reads `?with=`** — verified, no `searchParams` usage in `src/app/(app)/messages/page.tsx`. The trainer lands on the conversation list, not the client's thread.
- **Inert controls in v2: the deep-link half of this button.** It navigates, so it is not fully dead, but the parameter it passes is silently ignored. Treat as a defect, not a partial.

### #5 "Pending Signup" badge — `MISSING` (listed for contrast)
- v1: `:651-656`. v2 renders an `Active`/`Inactive` badge (`:176-184`) from `trainer_clients.status`. v2's status check constraint permits `active/inactive/pending/archived`, so `pending` can be rendered — nothing does.

### #6 Header status toggle — `MISSING` (badge present, action absent)
- v1: `:657-669` (click writes `trainer_clients.status`) · v2: `:176-184`
- **Inert controls in v2: none** — the v2 badge is presentationally read-only and has no click handler, so it is honestly inert-free. But the *capability* is gone.
- Blocker: v1 toggles to `'paused'`; the v2 check constraint (`00002_trainer_client_spine.sql:11`) allows `active/inactive/pending/archived` — **no `paused`**. The port must pick `inactive` or migrate the constraint.

### #14 Session tracking card — `PARTIAL`
- v1: `:1146-1217` · v2: `ClientPaymentsSection.tsx:92-96` + `useClientPayments.ts:165-168`
- v1 renders: **(a)** Lifetime = `offset + logged`, with the split shown as "N pre-Catalift + M logged" and an **Edit historical** link; **(b)** Active package usage `used/total` (∞ for continuous) + Active/Completed/No-active-package; **(c)** Workouts logged (in Catalift) + **View history →** link to `/workout/history?clientId=`.
- v2 renders: one "Sessions done" stat = `historical_offset_sessions + client_sessions.length` (`derive.ts:3-8`).
- **MISSING vs v1:** the pre-Catalift ÷ logged **split** is never surfaced; **Edit historical** has no client-file equivalent — `adjustSessionOffset()` exists but is wired only to `useTrainerPayments` (the roster-wide `/payments` screen), so from the client file the offset is read-only; the package-usage counter is absent (blocked by #9); the workouts-logged counter and its **View history →** drill-in are absent, and v2 has no `/workout/history` route.
- Inert controls in v2: none.
- **Also:** the "Adjust → Completed" control (`RateAndAdjustRow.tsx:101-112`) can only **+1**; v1's modal sets an absolute value, so a mistyped count cannot be corrected downward from this screen.

### #15 Quick Stats grid — `PARTIAL`
- v1: `:1219-1280` · v2: `:191-202`
- v1 renders: four cards — Workouts Done, Upcoming, Sessions Left, and a fourth that flips between red "Unpaid Sessions" (count) and "Total Paid" (`$`).
- v2 renders: an inline row with "N sessions" and "Last: <date>".
- **MISSING vs v1:** Upcoming; Sessions Left (blocked by #9); the unpaid/total-paid flip card; the whole card grid treatment.
- Inert controls in v2: none.
- **Conflict — two counting authorities on one screen.** v2's `{client.sessions}` (`:194`) counts rows in `workouts` (`trainer-ops/api/roster.ts:102-119`), while `ClientPaymentsSection`'s "Sessions done" counts `historical_offset_sessions + client_sessions` (`derive.ts:3-8`). These are different numbers from different tables, rendered ~150px apart. This is the v1 dual-authority bug reproduced in v2 and it violates `src/features/trainer-ops/AGENTS.md` rule 2 ("Client count authority … v2 has ONE"). **Must be resolved inside lane L2; it is not a new feature, it is a correctness fix.**

### #17 Unpaid Sessions Alert — `PARTIAL`
- v1: `:1337-1358` · v2: `ClientPaymentsSection.tsx:116-131`
- v1 renders: red card, "N unpaid session(s)", explanatory line, **View** button that switches to the payments tab. Source: `sessions.filter(status==='completed' && !paid)`.
- v2 renders: amber banner, "N sessions outstanding · $X owed". Source: `completed − paid` (`derive.ts:20-31`).
- **MISSING vs v1:** the **View** navigation (v2 has no tabs to navigate to); red severity styling; the per-session `paid` notion.
- Inert controls in v2: none.

### #18 Client Info card — `PARTIAL`
- v1: `:1360-1433` · v2: `:187-189`
- v1 renders: Member since (`trainer_clients.startDate`), Gender, Height (cm), Weight (kg), Email + edit pencil, **Send App Invitation** button with helper text, **Sync Account to Cloud** button.
- v2 renders: the email string only.
- **MISSING vs v1:** Member since (**blocked** — `trainer_clients` has no `start_date`; `created_at` is the nearest proxy); Gender / Height / Weight (columns exist on v2 `users` as `gender`, `height_cm`, `weight_kg` but are not read here); email edit pencil; Send App Invitation.
- Inert controls in v2: none.
- **Deliberate drop:** "Sync Account to Cloud" — see §6.

### #19 Onboarding & Program card — `PARTIAL`
- v1: `:1435-1638` · v2: `:208-298`
- v1 renders: **(a)** onboarding-incomplete → warning + Start Onboarding → `/clients/[id]/onboarding`; **(b)** active program → name + phase badge + `n` workouts/week + delete, **Quick Start** button per day (creates a `session` calendar event tagged with `programId`+`programDayIndex`, then starts the workout), Edit / Change / View, Past Programs with delete; **(c)** onboarding-complete but no program → Select / Create.
- v2 renders: "Programs" heading, active program name + phase + days-per-week + schedule mode, a **non-interactive** list of day labels with exercise counts, an empty state, and a past-programs list.
- **MISSING vs v1:** the entire onboarding branch; program delete; Quick Start (and with it the `programDayIndex` tagging that v1 fixed in v15-D8); Edit / Change / View actions; past-program delete.
- Inert controls in v2: **the weekly-plan day rows (`:245-262`) look like the v1 Quick Start list but have no `onClick`.** Visually implies an action that does not exist — fix in L4.

### #26 Recent Workouts card — `PARTIAL`
- v1: `:1906-2149` · v2: `:300-351`
- v1 renders: last 3 by start time; name, date, exercise count, volume (kg), duration; **Repeat**, **Save as Template**, **Edit** buttons; block-performance chips (circuit time / volume / rounds); top-3 exercises with the heaviest set; 🔒 trainer-private notes; 📝 client notes; **Sync to Cloud**; **View All** → progress tab.
- v2 renders: last 10 (`fetchWorkoutHistory(clientId, 10)`); name, date, volume, set count; the row links to `/workout/{id}` (route exists at `src/app/workout/[id]/page.tsx` — **not** inert).
- **MISSING vs v1:** Repeat; Save as Template; Edit (#53); block chips (**blocked** — no `block_performances` table); top-3 exercises; trainer-private notes; client notes; View All; duration; exercise count.
- Inert controls in v2: none.
- **Deliberate drop:** "Sync to Cloud" — see §6.

### #34 Active Program card — `PARTIAL`
- v1: `:2437-2465` · v2: `:214-265`
- v1 renders: rose gradient card, program name, `n×/week`, workouts count, Flexible/Fixed suffix, phase badge, delete (native `confirm()`).
- v2 renders: white card, name, phase badge, days-per-week, schedule mode.
- **MISSING vs v1:** delete; the `trainingDaysPerWeek` vs `weeklyPlan.length` distinction; the rose treatment.
- Inert controls in v2: none.

### #37 Program Schedule Info — `PARTIAL`
- v1: `:2548-2573` · v2: `:236-241`
- v1 renders: `n×/wk` badge, "Flexible — cycling" vs "Fixed days", the selected day names, the PT-vs-personal weekly split, and a hint that scheduling is owned by the builder.
- v2 renders: a "Schedule mode" field.
- **MISSING vs v1:** the `n×/wk` badge, selected days, PT/personal split, the builder hint.
- Inert controls in v2: none.

### #38 Past Programs — `PARTIAL`
- v1: `:2575-2607` (and a duplicate at `:1583-1611` in the Overview tab) · v2: `:280-297`
- v1 renders: name, `status • n days/week`, delete per row.
- v2 renders: name, `status • n days/week`.
- **MISSING vs v1:** delete.
- Inert controls in v2: none.

### #39 No Active Program empty state — `SHIPPED`
- v1: `:2610-2640` · v2: `:266-278`
- v1 renders: icon, "No Program Assigned", personalised line, Select Template + Build Custom.
- v2 renders: icon, "No active program", "Assign a program from the Builder".
- MISSING vs v1: the two CTA buttons — **tracked separately as #36**, so this row is genuinely complete as an empty state.
- Inert controls in v2: none.

### #40 / #49 Book PT / Book — `SHIPPED`
- v1: `:2645-2655` and `:2942-2949` · v2: `:357-363`
- v1 renders: two entry points to `/clients/[id]/book`.
- v2 renders: one full-width "Book Session" button to the same route.
- MISSING vs v1: nothing functional (v1's two entry points collapse to one).
- Inert controls in v2: **none — verified.** `FEATURE_FLAGS.booking` is `false`, but nothing reads it (`isFeatureEnabled` is only consulted for `invites`; `medals`/`strengthRating` are read directly in the profile page). The route `src/app/(app)/clients/[id]/book/page.tsx` exists, so the button works.

### #44 Payment Summary — `PARTIAL`
- v1: `:2812-2828` · v2: `ClientPaymentsSection.tsx:91-112`
- v1 renders: two tiles — Total Paid (`$`, sum of `status='paid'` amounts) and Outstanding (`$`, sum of pending amounts).
- v2 renders: three tiles — Sessions done, Paid (sessions), Outstanding (`$` when a rate is set, else a session count).
- **MISSING vs v1:** money-denominated Total Paid; the pending-payment notion of Outstanding (v2's Outstanding means unpaid *sessions*, a different quantity).
- Inert controls in v2: none.

### #45 Record Payment button — `SHIPPED`
- v1: `:2830-2834` · v2: `ClientPaymentsSection.tsx:70-78`
- v1 renders: full-width outline "Record Payment" opening #50.
- v2 renders: a "Log Payment" secondary button opening `LogPaymentDialog`, disabled while loading.
- MISSING vs v1: nothing (label differs).
- Inert controls in v2: none.

### #46 Payment History list — `PARTIAL`
- v1: `:2836-2902` · v2: `PaymentHistoryList.tsx`
- v1 renders: per payment — status-coloured icon, description, date (`paidAt ?? createdAt`), method, amount, **Mark Paid** when pending, gear → Edit Payment; sorted by `createdAt` desc; "No payments recorded" empty state.
- v2 renders: amount, date, sessions, method, status badge.
- **MISSING vs v1:** Mark Paid (v2 can create a payment but can never transition a `pending` one to `paid` from this screen); the edit affordance (#51).
- Inert controls in v2: none.

### #47 Quick action → Message — `PARTIAL`
- v1: `:2910-2916` · v2: `:147-156`
- v1 renders: a fixed bottom action bar; this button switches to the in-page Messages tab (stays on the client file).
- v2 renders: a header button that navigates away to `/messages`.
- **MISSING vs v1:** the fixed bottom bar; staying in context; and see #4 — the `?with=` deep link is ignored.
- Inert controls in v2: none.

### #50 Add Payment Dialog — `PARTIAL`
- v1: `:2953-3055` · v2: `LogPaymentDialog.tsx`
- v1 renders: amount, payment date, sessions covered, a live per-session cost panel, description, cash/card/transfer toggles; on save creates the payment **and**, when sessions > 0, a matching session package.
- v2 renders: amount, sessions, method, date, description.
- **MISSING vs v1:** the live per-session cost readout; the package side-effect (**blocked** by #9 — arguably a good thing to leave behind, see §5 V19-6).
- Inert controls in v2: none.

---

## 3. Blockers

Each blocker names the precise missing thing. Everything here is verified against
`catalift-v2/supabase/migrations/` (read in filename order) — not assumed.

| # | Blocked rows | Missing thing | Detail |
|---|---|---|---|
| B1 | 9, 10, 11, 12, 43, 50 | **No session-packages table** | v2 has no packages concept at all. `client_payments.sessions_included` (`00016_payments_sessions.sql:73`) is the nearest primitive. Needs a product decision before a schema decision: *does v2 have packages, or is "package" just a payment with `sessions_included > 1`?* |
| B2 | 20, 21 | `trainer_clients.goals` | Column does not exist (`00002_trainer_client_spine.sql:7-18`). |
| B3 | 23, 24 | `trainer_clients.notes` | Column does not exist. |
| B4 | 22 | **No onboarding-answers table** | Nothing stores experience level, training preference, days/week, session length, available days, schedule notes, trains-alone, injury flags, injury notes, movement confidence or current phase. `src/app/onboarding/client/page.tsx` exists but performs **no** `supabase.from(...)` write. |
| B5 | 18, 19 | `trainer_clients.start_date`, `trainer_clients.onboarding_complete` | Neither exists. `created_at` can proxy "member since"; onboarding completion has no representation. |
| B6 | 6 | `trainer_clients.status` has no `'paused'` | Check constraint permits `active/inactive/pending/archived` only. |
| B7 | 29, 26 | **No `block_performances` table** | Circuit history and the per-workout block chips have no data source; no `blockPerformances` symbol anywhere in v2. |
| B8 | 16 | **No compliance module** | `calculateCompliance`, `getAdherenceColor/BgColor/Label` have no v2 equivalent; must be ported from v1 `@/lib/compliance`. |
| B9 | 27 | `workouts` has no `assigned_by` | The Solo-vs-PT split needs another source — `client_sessions.workout_id` or `calendar_events.workout_id`. |
| B10 | 30 | `WorkoutStatsCharts` is route-private | Lives at `src/app/(app)/profile/_components/WorkoutStatsCharts.tsx`. Must be promoted to `src/components/` before a second route consumes it. `profile/_lib/adapt-workout.ts` moves with it. |
| B11 | 14, 26 | **No `/workout/history` route** | v1's "View history →" (`:1209`) targets `/workout/history?clientId=`. v2's nearest is `/workouts`, which is not client-scoped. |
| B12 | 19, 36 | **Missing routes** | v2 has no `/clients/[id]/onboarding` (it has `/onboarding/client`) and no `/clients/[id]/program/preview`. |
| B13 | 57 | Feature flags OFF | `medals: false` and `strengthRating: false` (`src/config/feature-flags.ts:2-3`). Two of the profile card's four data points cannot ship yet. |
| B14 | 4 | `/messages` ignores `?with=` | v2's messages page has no `searchParams` handling. |
| B15 | 26, 28 | `workouts` has no `deleted_at`, `trainer_notes`, `duration`, `blocks` | v1 filters `!w.deletedAt`, renders 🔒 `trainerNotes`, duration and block chips. v2's `workouts` row is `id, user_id, name, performed_at, total_volume, exercises, notes` only. |

---

## 4. Proposed lane split

Six lanes, each independently shippable and reviewable. **L1 is a hard dependency for L2–L6**: the
tab shell has to exist before tab content can be filled, and merging six lanes into one untabbed
page would collide on every hunk.

| Lane | Title | Class | Sections | Depends on | Rows |
|---|---|---|---|---|---|
| **L1** | Page shell — 5-tab layout, header parity, quick-actions bar, messages tab, remove-client, profile-card modal | **A** (except #6, #55 → B) | 13 | — | 3, 4, 5, 6, 7, 8, 31, 32, 33, 47, 48, 55, 57 |
| **L2** | Overview core — session tracking, quick stats, compliance ring, alerts, client info **and the single-count-authority fix** | **A** | 6 | L1 | 14, 15, 16, 17, 18, 25 |
| **L3** | Client profile data — goals, notes, onboarding answers, email/invite | **B** (migration + RLS) | 6 | L1 | 20, 21, 22, 23, 24, 54 |
| **L4** | Program tab — active program, quick-start, program actions, schedule, past programs, mini calendar, upcoming | **A** | 8 | L1 | 19, 34, 35, 36, 37, 38, 41, 42 |
| **L5** | Progress tab — categories, full history, charts, edit-workout modal | **A** | 6 | L1, B10 | 26, 27, 28, 29, 30, 53 |
| **L6** | Payments & packages — package model decision, session balance, mark-paid, edit payment, import history, historical offset | **B** (schema + money) | 12 | L1, B1 decision | 9, 10, 11, 12, 13, 43, 44, 46, 50, 51, 52, 56 |

6 `SHIPPED` rows (1, 2, 39, 40, 45, 49) carry no lane. 13 + 6 + 6 + 8 + 6 + 12 + 6 = **57**.

**Sequencing recommendation.** L1 → then L2 and L4 in parallel (both Class A, disjoint files) →
L5 → L3 and L6 last, because both are Class B and L6 needs a product decision (B1) that no
executor can make alone.

**Do not** collapse these into one "port the rest" lane. A 3,000-line PR cannot be reviewed, and an
unreviewable PR is exactly how the first 89% went missing.

---

## 5. Known-bug check

Checked before proposing `PORT` on any row. **One brief assumption turned out to be stale** — see G-17.

### G-17 / BUG-005c — stale `useMemo`s keyed only on `clientId`
**The brief's premise is out of date and `BACKLOG.md:290` should be corrected.** The brief states
that `sessions`, `packages` and `calendarEvents` (v1 `~:278-281`) "all still share the broken
pattern — payments was the only one fixed". Reading the file shows **all four were fixed**:

```
v1 :289  const sessions        = useMemo(() => getSessionsForClient(clientId), [clientId, storeSessions]);
v1 :290  const payments        = useMemo(() => getPaymentsForClient(clientId), [clientId, allPayments]);
v1 :291  const packages        = useMemo(() => getPackagesForClient(clientId), [clientId, storeSessionPackages]);
v1 :292  const calendarEvents  = useMemo(() => getEventsForClient(clientId),   [clientId, storeCalendarEvents]);
v1 :293  const activeProgram   = useMemo(() => getActiveProgram(clientId),     [clientId, storeClientPrograms]);
```

The raw collections are subscribed at `v1:92-99` with the comment "BACKLOG #10 / BUG-007: subscribe
to the raw collections so the memos below recompute … without a remount". Landed in v1 commit
`a87ce26` ("refetch-on-resume + hardened cold-start session gate (BUG-007 + BUG-008)"), which is on
v1 `main`.

**Consequence for the port:** v2 does not use Zustand for this screen at all — it fetches into
`useState` in a `useEffect` (`page.tsx:65-102`) and `useClientPayments` does the same
(`useClientPayments.ts:81-104`). The v1 memo bug is structurally impossible to reproduce. **But v2
has the same *symptom* from a different cause:** the load effect is keyed on `[..., clientId]` and
there is no refetch-on-resume, so a backgrounded tab shows stale data until remount. Every lane that
adds a write must call the existing `reload()` (`useClientPayments.ts:71-79`) or an equivalent, and
**L1 should add refetch-on-resume once, at the page level**, rather than each lane inventing it.

### G-13 — volume is `SUM(set_volume)`, never `MAX`
- v1's save path is already correct: `v1:590-595` sums `getSetVolume(weight, reps, isAssisted, bodyweight)` over completed sets.
- **v1 has a display bug in the same dialog:** the VOL column renders `(set.weight||0) * (set.reps||0)` (`v1:3222`), which disagrees with the saved total for assisted/bodyweight exercises. **Do not port that line.** Row #53 must use the same `getSetVolume` helper for display and for save.
- v2 stores `workouts.total_volume` as a numeric column and `fetch-history.ts:49` reads it straight through. That is in tension with `src/features/workout-engine/AGENTS.md` rule 1 ("Volume = SUM of set_volumes. Never store volume as a single number on the workout"). Not this lane's to fix — logged in §8.

### G-14 — one ledger + one offset, no offset-mutating triggers
- v2 is already correct and is the model to preserve: `client_sessions` is an append-only completed-session ledger and `trainer_clients.historical_offset_sessions` is the single writable offset; `getDisplayedSessionCount` is `offset + ledger.length` (`derive.ts:3-8`). No trigger touches the offset.
- **v1's three-counter block (`:1142-1218`) and the offset modal (`:3314-3350`) are directly in the blast radius.** v1's `onSave` writes the offset **three times** — `historicalOffsetSessions`, the legacy `historicalSessionsOffset` mirror, and a recomputed `totalSessions` (`v1:3341-3347`). **Port one write, not three.** v2 has exactly one column; the legacy mirror and the denormalised total must not come across.
- Row #14's package counter is blocked by B1 and must not be reintroduced as a second session authority.

### V19-6 — "paid" has three diverging representations in v1
v1 genuinely carries three: (a) `ClientSession.paid`, a boolean per session toggled by
`toggleSessionPaid` (`v1:361-364`); (b) `ClientPayment.status === 'paid'` summed into `totalPaid`
(`v1:325`); (c) `SessionPackage.paidSessions`, a hand-editable integer (`v1:1046-1054`).
The Overview card reads (c), the Quick Stats card reads (a) and (b), and the Payments tab reads (b)
and (c) — which is why the numbers disagree on screen.

**v2's single source of truth is (b), expressed in sessions:**

```
derive.ts:10-18   paidSessions = total_paid_offset + Σ(payments where status='paid').sessions_included
derive.ts:20-31   outstanding  = completedSessions − paidSessions
```

There is no per-session `paid` flag and no packages table in v2, so (a) and (c) simply do not exist.
**Every payments row must state that it reads (b) and must not reintroduce (a) or (c).** Two
concrete consequences: row #51 must **not** force `status='paid'` on edit the way `v1:561` does —
that silently rewrites history and is the exact mechanism that made v1's three representations
diverge; and row #50's package side-effect (`v1:502-514`) must not come across.

### G-11 — every ported write is `await` + retry + rollback
**Every write on this v1 screen is fire-and-forget.** They are synchronous Zustand store calls with
the success toast fired on the next line, before anything is known to have persisted. Verified
call sites: `v1:664` (status toggle), `:718` (package reset), `:946`/`:966` (create package),
`:1110` (edit package), `:1471`/`:1600`/`:2457`/`:2595` (delete program), `:1512` (add calendar
event), `:1726` (save goals), `:1876` (save notes), `:2924` (quick-action calendar event),
`:352`/`:357`/`:362`/`:367` (session + payment mutations), `:488`/`:503` (add payment + package),
`:538` (initial stats), `:557` (update payment), `:599` (update workout), `:346` (send message).

v2's pattern to follow is already in the repo: `payments/api/sessions.ts:13-34` (`withRetry`, 3
attempts, exponential backoff, error surfaced) and `useClientPayments.ts:106-121` (`runMutation`
sets `isMutating`, surfaces `error`, reloads on success). **Every ported write uses that shape.**

---

## 6. Do-not-port list

Each entry names the v1 pattern **and** the v2 replacement, so the next lane doesn't rediscover it.

| v1 pattern | v1 lines | Why not | v2 replacement |
|---|---|---|---|
| `fetchAllUsersFromSupabase()` | `:56`, `:110-116` | Fetches the entire users table to find one client. PII disclosure; named in `port-v1-code/SKILL.md` and `trainer-ops/AGENTS.md` rule 6 | `fetchClients()` scoped to `trainer_id` (`trainer-ops/api/roster.ts:71-144`) |
| `localStorage.getItem/setItem('apex-users')` | `:106`, `:457`, `:461` | Unscoped global cache key — leaks across accounts on a shared device | Read from Supabase; if a cache is needed use `userScopedKey()` per `.windsurf/rules/user-scoped-keys.md` |
| Hard-coded default password in the invite call | `:433` — `(clientUser as any)?.password \|\| 'client123'` | Ships a guessable credential into an email path. Never port | `features/auth/api/invite.ts` + the `invitations` table / `accept_invitation` RPC; no password ever leaves the client |
| "Sync Account to Cloud" → `registerUserToSupabase` | `:383-415`, `:1422-1430` | localStorage-first artefact: creates a user row from client-side data. v2's only credential source is Supabase Auth | Invitation flow (`FEATURE_FLAGS.invites: true`) |
| "Sync to Cloud" workouts button → `syncClientWorkoutsToSupabase` | `:1916-1940` | Reconciles a local workout cache to the server. v2 writes workouts directly | Nothing — v2 has no local-first workout cache to reconcile |
| Trainer writing into the client's global workout store | `:144-154` | Mutates `useWorkoutStore` with another user's workouts, cross-contaminating the signed-in trainer's own history and PBs | Keep client data in page-local state (`page.tsx:51-55` already does this) |
| Fire-and-forget writes + premature success toast | 19 call sites, see §5 G-11 | Silently drops writes on network failure | `withRetry` + `runMutation` |
| Native `confirm()` for destructive actions | `:1470`, `:1599`, `:2456`, `:2594` | Unstyled, untestable, blocks the main thread | `ConfirmDialog` (v1 already uses it at `:3303` — port *that* one) |
| `useTrainerStore.getState()` read during render | `:1154`, `:3324`, `:3336`, `:3356`, `:3358` | Non-reactive snapshot read inside render; the value never updates without a remount | Subscribe via hook, or pass the value in as a prop |
| `as any` on domain objects | 15 sites incl. `:273-282`, `:1526`, `:2932` | Defeats the type system on exactly the fields (`historicalOffsetSessions`, calendar-event shape) that have caused counting bugs | Typed rows from `src/types/database.ts` |
| Legacy offset mirror + denormalised `totalSessions` | `:3341-3347` | Three writes for one fact — the mechanism behind the counting drift | One write to `trainer_clients.historical_offset_sessions` |
| Forcing `status:'paid'` when editing a payment | `:561` | Silently rewrites payment history; a root cause of V19-6 | Edit the fields the trainer changed; leave `status` alone |
| Per-set VOL shown as `weight × reps` | `:3222` | Disagrees with the saved total for assisted/bodyweight lifts | `getSetVolume(...)` for both display and save |

**Not present in this file** (checked, so no one re-greps for it): `canonical_user_id`, and any
`password_hash` login path. The only password reference is `:433`, listed above.

---

## 7. Row → PR ledger

Phase 2 PRs update this table in the **same commit** as the code.

| Lane | Rows | PR | Merged | Rows flipped to `SHIPPED` |
|---|---|---|---|---|
| L1 | 3,4,5,6,7,8,31,32,33,47,48,55,57 | — | — | — |
| L2 | 14,15,16,17,18,25 | — | — | — |
| L3 | 20,21,22,23,24,54 | — | — | — |
| L4 | 19,34,35,36,37,38,41,42 | — | — | — |
| L5 | 26,27,28,29,30,53 | — | — | — |
| L6 | 9,10,11,12,13,43,44,46,50,51,52,56 | — | — | — |

---

## 8. Observations — not acted on

Opinions and out-of-scope findings, separated deliberately. **Nothing here was changed.**

1. **Two session-counting authorities render on the same v2 screen today.** `{client.sessions}`
   (`page.tsx:194`, counts `workouts` rows) and "Sessions done"
   (`ClientPaymentsSection.tsx:92-96`, counts `historical_offset_sessions + client_sessions`) are
   different numbers ~150px apart. This is a live correctness bug, not a parity gap, and it
   contradicts `trainer-ops/AGENTS.md` rule 2. Folded into L2; flagging it here because it may
   deserve its own bug ticket ahead of the port.
2. **`BACKLOG.md:290` is stale** — see §5 G-17. v1 fixed all four memos in `a87ce26`, not just
   payments. Worth correcting so the next brief doesn't inherit the wrong premise.
3. **`workouts.total_volume` is a stored scalar**, which reads against `workout-engine/AGENTS.md`
   rule 1. Probably a deliberate denormalisation, but the rule and the schema should be reconciled
   so future executors aren't told two different things.
4. **`adjustSessionOffset()` is implemented and tested but unreachable from the client file** — it
   is wired only to `useTrainerPayments`. Cheap win: wire it into `useClientPayments` (row #56).
5. **`FEATURE_FLAGS.booking` is `false` but nothing reads it.** The flag is inert; the booking route
   ships regardless. Either delete the flag or honour it.
6. **v1's Past Programs block is duplicated** at `:1583-1611` (Overview) and `:2575-2607` (Program
   tab). v2 should render it once — the Program tab is the right home.
7. **v1's client file is one 3,415-line component.** The v2 port should be a page shell plus
   per-tab components in `src/features/trainer-ops/components/` (currently an empty `.gitkeep`),
   which is also what keeps each lane's PR reviewable.
8. **v2's client page imports `fetchClients` from `@/lib/roster`**, which is a one-line re-export of
   `@/features/trainer-ops/api/roster`. Harmless today, but it is an indirection that hides the
   feature boundary; app pages could import the feature directly.
