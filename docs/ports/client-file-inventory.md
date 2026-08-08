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
| **Revisions** | **2026-08-08 — lane L1** (`feat/p06-l1-client-file-shell`): rows 3, 4, 5, 7, 8, 31, 32, 33, 47, 55 → `SHIPPED`; 28, 57 → `PARTIAL`; 6, 48 stay `MISSING` behind new blockers **B16** / **B17**; **B14 cleared**. Coverage 11% → **28%**. v1 ranges re-opened for this lane: `189-190`, `297-314`, `344-349`, `375-381`, `623-693`, `2380-2427`, `2907-2951`, `3303-3312`, `3352-3412`. |

### Coverage

**16 of 57 sections shipped — 28%** (by section count, not line count).
*Was 6 of 57 — 11% — at the end of Phase 1. Moved by lane L1 (§7).*

| Status | Count | At Phase 1 |
|---|---|---|
| `SHIPPED` | 16 | 6 |
| `PARTIAL` | 14 | 15 |
| `MISSING` | 27 | 36 |
| `STUBBED` | 0 | 0 |
| `INTENTIONALLY DROPPED` | 0 | 0 |
| **Total** | **57** | **57** |

L1's arithmetic, so it can be audited rather than trusted:

```
SHIPPED  6  + 10 (rows 3,4,5,7,8,31,32,33,47,55)                      = 16
PARTIAL  15 -  3 (rows 3,4,47 left PARTIAL) + 2 (rows 28,57 arrived)  = 14
MISSING  36 -  7 (rows 5,7,8,31,32,33,55 → SHIPPED) - 2 (28,57 → PARTIAL) = 27
TOTAL    16 + 14 + 27 = 57 ✓        Coverage 16/57 = 28%
```

> **Note on the L1 dispatch brief's predicted split (PARTIAL 13 / MISSING 28).** It assumed row 5
> ("Pending Signup" badge) started as `PARTIAL`. This inventory recorded it as `MISSING` — see the §1.1
> table and §2's "#5 … `MISSING` (listed for contrast)". So one row moved from `MISSING` rather than
> from `PARTIAL`, which shifts the split by one in each column. **Scope did not change:** the same 10
> rows reached `SHIPPED`, the same 2 reached `PARTIAL`, rows 6 and 48 stayed `MISSING`, and the total
> and the 28% headline are exactly as the brief predicted.

Section-count coverage and line-count coverage no longer track each other, and should not be expected
to: L1 shipped thirteen small sections (badges, tabs, a confirm dialog) and deliberately shipped no
large ones. Judge this table, not the file size.

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
| 3 | Header identity block | 625–641 | Sticky rose→red gradient bar: back, avatar (opens profile card), displayName, `@username` | `users`, `trainer_clients` | — | `SHIPPED` (L1) | `page.tsx:250-268`, avatar button `:254-268`; `roster.ts:88,132` (username) | `PORT-ADAPTED` — v2's `PageHeader` already **is** the sticky themed gradient and goes rose in trainer mode, so it gained one optional `avatar` prop (`MainLayout.tsx:81-85,103`) rather than a rebuilt header | A | L1 |
| 4 | Header → Message button | 642–650 | Routes `/messages?with={clientId}` and v1's messages page **honours** `?with=` (`messages/page.tsx:168`) | — | — | `SHIPPED` (L1) | `page.tsx:270-278` + `messages/page.tsx:71-104` | `PORT` — v2 now honours `?with=` (creates the conversation if needed, then opens that thread) | A | L1 |
| 5 | Header → "Pending Signup" badge | 651–656 | Amber badge when a `trainer_clients` row has no matching user record | `trainer_clients` | — | `SHIPPED` (L1) | `_components/ClientStatusBadges.tsx:17-25`, `_lib/client-status.ts:38-44` | `PORT-ADAPTED` — v2 has no placeholder rows, so the equivalent state is `trainer_clients.status='pending'` | A | L1 |
| 6 | Header → status toggle badge | 657–669 | Click flips client `active ⇄ paused`; optimistic toast | `trainer_clients.status` | `trainer_clients.status` | `MISSING` | `_components/ClientStatusBadges.tsx:26-37` renders the badge **read-only** (now showing all four real values — row 5) | `DEFER` — **blocked, B16.** Not built in L1 on purpose | B | **B16** |
| 7 | Header → remove client | 671–678 | Trash icon opens the remove-client confirm | — | — | `SHIPPED` (L1) | `page.tsx:281-291` | `PORT` | A | L1 |
| 8 | Tab bar (5 tabs) | 683–693 (+190) | `overview / program / progress / messages / payments`; initial tab seeded from `?tab=` | — | — | `SHIPPED` (L1) | `page.tsx:295-309`, `_lib/client-tabs.ts` | `PORT-ADAPTED` — v1 never validates `?tab=`, so a typo renders an empty screen; v2 resolves unknown values to `overview` and keeps the URL in sync both ways | A | L1 |

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
| 28 | Full Workout History | 2189–2292 | Scrollable "All Workouts (n)": date, exercise count, PT-session tag, has-notes tag, volume, duration, Repeat / Save-as-Template / Edit, 🔒 trainer notes | workouts | workout template save | `PARTIAL` (L1) | `_components/ProgressPanel.tsx:42-70` | `PORT` — L1 shipped a plain dated list (name/date/volume) so the Progress tab is not a "coming soon" card; **L5 replaces it wholesale** | A | L5 |
| 29 | Circuit Performance History | 2294–2368 | Per-circuit cards: block name, date, difficulty badge, completion time, per-round badges, rounds + volume | block performances | — | `MISSING` | — | `DEFER` — **no `block_performances` table in v2** | B | L5 |
| 30 | WorkoutStatsCharts | 2370–2373 | Volume/PB charts for this client | workouts, personal bests | — | `MISSING` | Component exists at `src/app/(app)/profile/_components/WorkoutStatsCharts.tsx:41` but is route-private | `PORT-ADAPTED` — promote component to `src/components/` first | A | L5 |

### 1.4 Messages tab (2377–2430)

| # | Section (v1's label) | v1 lines | What it does | Reads | Writes | v2 status | v2 location | Verdict | Class | Lane |
|---|---|---|---|---|---|---|---|---|---|---|
| 31 | Messages List | 2380–2411 | 400px scroll of bubbles, self right / client left, HH:mm, empty state | conversations, messages | — | `SHIPPED` (L1) | `features/messaging/components/ConversationThread.tsx:156-212`, mounted by `_components/MessagesPanel.tsx:58-63` at `h-[400px]` | `PORT-ADAPTED` — **extracted, not re-ported.** v2 already had this thread inline in `/messages`; L1 moved it into one shared component so the two surfaces cannot drift | A | L1 |
| 32 | Message Input | 2413–2427 | Input + Enter-to-send + Send button | — | messages insert | `SHIPPED` (L1) | `ConversationThread.tsx:214-247`, handler `:135-155` | `PORT-ADAPTED` — Enter sends, as v1. v1 cleared the input and toasted success **before** the write resolved; v2 awaits, keeps the draft on failure and surfaces the error (G-11) | A | L1 |
| 33 | Mark-as-read on tab open | 310–314 | Flips inbound messages to read when the Messages tab is active | conversation | messages `seen_at` | `SHIPPED` (L1) | `ConversationThread.tsx:69-92` (load + `markConversationSeen`), `:118-126` (inbound realtime) | `PORT-ADAPTED` — the panel is only rendered while the Messages tab is active, so mounting the thread IS v1's `activeTab === 'messages'` gate | A | L1 |

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
| 47 | Quick action → Message | 2910–2916 | Fixed bottom bar; switches to the Messages tab | — | — | `SHIPPED` (L1) | `_components/ClientQuickActions.tsx:44-52`, wired `page.tsx:344-348` | `PORT` — stays in context (switches tab) and is a **different** control from the header Message button (row 4), exactly as v1 has both. Bar lifts to `bottom-[136px]` when the active-workout banner is up, so it never overlaps `MainLayout`'s fixed chrome | A | L1 |
| 48 | Quick action → Start Workout | 2917–2941 | Creates a `session` calendar event for today, then starts an ad-hoc workout for the client | — | `calendar_events` insert, workout start | `MISSING` | — | `DEFER` — **blocked, B17.** Deliberately not rendered: the only thing that would work is logging into the trainer's own history | A | **B17** |
| 49 | Quick action → Book | 2942–2949 | Routes to `/clients/[id]/book` | — | — | `SHIPPED` | `_components/ClientQuickActions.tsx:53-61` (moved into the L1 bar, not duplicated) | `PORT` | A | — |

### 1.8 Modals (2953–3412)

| # | Section (v1's label) | v1 lines | What it does | Reads | Writes | v2 status | v2 location | Verdict | Class | Lane |
|---|---|---|---|---|---|---|---|---|---|---|
| 50 | Add Payment Dialog | 2953–3055 | Amount, date, sessions covered, live per-session cost, description, cash/card/transfer; creates payment **and** a package when sessions > 0 | — | payment insert + package insert | `PARTIAL` | `LogPaymentDialog.tsx` | `PORT-ADAPTED` — the package side-effect is blocked by #9 | B | L6 |
| 51 | Edit Payment Dialog | 3057–3126 | Edit amount, date, method; forces `status='paid'` on save | payments | payment update | `MISSING` | — | `PORT-ADAPTED` — **do not** force `status='paid'` (see §5, V19-6) | B | L6 |
| 52 | Import Client History Dialog | 3128–3181 | Sessions already completed · Sessions remaining (prepaid) · Total paid → `setInitialClientStats` | — | client stats write | `MISSING` | — | `PORT-ADAPTED` — maps to `historical_offset_sessions` + `total_paid_offset`; "sessions remaining" has no v2 home | B | L6 |
| 53 | Edit Workout Dialog | 3183–3255 | Per-completed-set weight/reps inputs with a VOL column; save recomputes total volume, PBs and syncs | workouts | workout update | `MISSING` | — | `PORT-ADAPTED` — fix the v1 VOL display bug (see §5, G-13) | A | L5 |
| 54 | Edit Email Dialog | 3257–3301 | Update client email then send the invitation to the new address | `users.email` | `users.email` + invite send | `MISSING` | Invite API exists at `features/auth/api/invite.ts` but is not on this screen | `PORT-ADAPTED` — **never** pass a default password (see §6) | B | L3 |
| 55 | Remove Client ConfirmDialog | 3303–3312 | Destructive confirm; removes from the trainer's list only, never deletes the account | — | `trainer_clients` delete | `SHIPPED` (L1) | `page.tsx:360-369`, API `features/trainer-ops/api/clients.ts:54-74` | `PORT` — needed **no migration**: `tc_delete_trainer` already permits it. Delete is scoped by `trainer_id` AND `client_id`, awaited with retry, and a zero-row delete raises instead of toasting success | B | L1 |
| 56 | EditHistoricalOffsetModal | 3314–3350 | Set the pre-Catalift session count; writes `historicalOffsetSessions`, mirrors the legacy column, recomputes `totalSessions` | `trainer_clients` | `trainer_clients` offset columns | `MISSING` | `adjustSessionOffset()` exists (`payments/api/sessions.ts:155`) but is wired **only** to the roster-wide `/payments` surface | `PORT-ADAPTED` — v2 has one clean column, so drop the legacy mirror (see §5, G-14) | B | L6 |
| 57 | Client Profile Card popup | 3352–3412 | Avatar, name, `@username`, gym, Workouts / Medals / PBs tiles, strength rating, bio | workouts, PBs, medals | — | `PARTIAL` (L1) | `_components/ClientProfileCard.tsx`, opened by the header avatar `page.tsx:254-268` | `PORT-ADAPTED` — avatar/name/`@username`/Workouts/PBs ship; **gym and bio have no column** in v2's `users`, and Medals/Strength are flag- **and** data-gated (B13). See §2 | A | L1 (+B13) |

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

### #3 Header identity block — `SHIPPED` (L1)
- v1: `:625-641` · v2: `page.tsx:250-268` + `MainLayout.tsx:81-113`
- v1 renders: sticky rose→red gradient bar · back · 12×12 avatar that is a **button opening the profile card** · displayName · `@username`.
- v2 renders: `PageHeader` with back, a 12×12 avatar button (`aria-label="View <name>'s profile"`) that opens #57, title = `full_name`, subtitle = `@username` — omitted entirely when `users.username` is null, so never a bare `@`.
- MISSING vs v1: nothing.
- **Deliberate difference:** the header chrome was **not** rebuilt. v2's `PageHeader` is already the sticky, mode-themed gradient bar and turns rose in trainer mode (`MainLayout.tsx:90-93`), so it gained exactly one optional `avatar` prop. No other page changed.
- `users.username` exists in the live DB but was not in `fetchClients()`'s select; L1 added it (`roster.ts:88,132`) plus `RosterClientDetail.username` (`types/roster.ts:10`).
- Inert controls in v2: none.

### #4 Header → Message button — `SHIPPED` (L1)
- v1: `:642-650` · v2: `page.tsx:270-278` (button) + `messages/page.tsx:71-104` (the `?with=` handler)
- v1 renders: "Message" → `/messages?with={id}`, and v1's messages page reads that param (`v1: src/app/messages/page.tsx:168`) and opens that conversation.
- v2 renders: the same button and the same URL, and `/messages` now honours the param — `getOrCreateConversation(me, with)`, then it opens that thread. It refetches the conversation list rather than searching the loaded one, so a brand-new conversation still has `otherParticipant` for the chat header.
- MISSING vs v1: nothing. The defect noted at Phase 1 ("the deep-link half of this button is inert") is fixed.
- **Guard:** `tests/e2e/client-file-shell.spec.ts` → "lands on /messages with that client thread already open". Confirmed red before the fix (thread never rendered) and green after.
- A ref keyed on the `with` value stops the thread re-opening when the trainer taps back to the list while the param is still in the URL.
- Inert controls in v2: none.

### #5 "Pending Signup" badge — `SHIPPED` (L1)
- v1: `:651-656` · v2: `_components/ClientStatusBadges.tsx:17-25`
- v1 renders: an amber badge when a `trainer_clients` row has no matching user record (`isPlaceholder`).
- v2 renders: the same amber badge when the link is `status='pending'`. v2 has no placeholder rows, so an invited-but-not-yet-accepted link is the equivalent state; `fetchClients()` already returns every status (`roster.ts:91`, no status filter), so no new read was needed.
- **Also fixed here:** the neighbouring badge was a binary Active/Inactive, so `pending` and `archived` both read as "Inactive" — a trainer could not tell an invited client from a dropped one. It now renders all four values the CHECK constraint permits, and an unrecognised value verbatim rather than mislabelling it.
- MISSING vs v1: nothing.
- Inert controls in v2: none.

### #6 Header status toggle — `MISSING` (badge present, action deliberately absent — B16)
- v1: `:657-669` (click writes `trainer_clients.status`) · v2: `_components/ClientStatusBadges.tsx:26-37`
- **Inert controls in v2: none** — the badge is presentationally read-only with no click handler. The *capability* is still gone, on purpose.
- **Not built in L1. Two independent walls (B16):**
  1. v1 toggles to `'paused'`, which the live CHECK constraint does not permit (`active/inactive/pending/archived` only).
  2. The decisive one: trigger `trainer_clients_guard_activate` (`00012_harden_trainer_client_authz.sql:91-121`) raises *"Only the client may activate a trainer_clients link"* for any transition **into** `'active'` where `auth.uid() <> client_id`. A trainer could deactivate a client and then never undo it — only the client could. **A one-way "pause" button is a trap, not a port.**
- A unit test pins the badge as non-interactive, so a later lane cannot quietly add a handler without meeting B16.

### #14 Session tracking card — `PARTIAL`
- v1: `:1146-1217` · v2: `ClientPaymentsSection.tsx:92-96` + `useClientPayments.ts:165-168`
- v1 renders: **(a)** Lifetime = `offset + logged`, with the split shown as "N pre-Catalift + M logged" and an **Edit historical** link; **(b)** Active package usage `used/total` (∞ for continuous) + Active/Completed/No-active-package; **(c)** Workouts logged (in Catalift) + **View history →** link to `/workout/history?clientId=`.
- v2 renders: one "Sessions done" stat = `historical_offset_sessions + client_sessions.length` (`derive.ts:3-8`).
- **MISSING vs v1:** the pre-Catalift ÷ logged **split** is never surfaced; **Edit historical** has no client-file equivalent — `adjustSessionOffset()` exists but is wired only to `useTrainerPayments` (the roster-wide `/payments` screen), so from the client file the offset is read-only; the package-usage counter is absent (blocked by #9); the workouts-logged counter and its **View history →** drill-in are absent, and v2 has no `/workout/history` route.
- Inert controls in v2: none.
- **Also:** the "Adjust → Completed" control (`RateAndAdjustRow.tsx:101-112`) can only **+1**; v1's modal sets an absolute value, so a mistyped count cannot be corrected downward from this screen.

### #15 Quick Stats grid — `PARTIAL`
- v1: `:1219-1280` · v2: `_components/OverviewPanel.tsx:41-58`
- v1 renders: four cards — Workouts Done, Upcoming, Sessions Left, and a fourth that flips between red "Unpaid Sessions" (count) and "Total Paid" (`$`).
- v2 renders: an inline row with "N workouts logged" and "Last: <date>".
- **MISSING vs v1:** Upcoming; Sessions Left (blocked by #9); the unpaid/total-paid flip card; the whole card grid treatment.
- Inert controls in v2: none.
- **~~Conflict — two counting authorities on one screen.~~ RESOLVED IN L1 (not L2 — this note previously said L2).** v2 rendered `{client.sessions} sessions` (old `page.tsx:194`), a count of rows in `workouts` (`trainer-ops/api/roster.ts:102-119`), about 150px above `ClientPaymentsSection`'s "Sessions done" = `historical_offset_sessions + client_sessions` (`derive.ts:3-8`) — two different numbers from two different tables, both called sessions. It reproduced v1's dual-authority bug and violated `src/features/trainer-ops/AGENTS.md` rule 2.
  **Fix, landed in L1:** the chip is relabelled `N workouts logged` (`OverviewPanel.tsx:47-50`) — porting v1's header correctly removes it from the header anyway, since v1 keeps counters in the Overview cards. The word "sessions" now belongs to ONE authority, the ledger, which renders once in the Payments tab. `RosterClientDetail.sessions` keeps its name and semantics (the `/clients` roster still consumes it) but is documented as a workout count (`src/types/roster.ts:11-16`); renaming that field across surfaces is a follow-up, not L1's.
  **Regression guards:** `src/app/(app)/clients/[id]/__tests__/client-detail-page.test.tsx` renders with `client.sessions = 7` against a ledger of `3` and asserts nothing matching `/7 sessions?/i` exists, plus `tests/e2e/client-file-shell.spec.ts` asserts the same in a real browser on both the Overview and Payments tabs.
  **L2 must not re-introduce a second authority** when it builds the quick-stats grid: "Workouts Done" reads the workout count, "Sessions" may only ever read the ledger.

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

### #47 Quick action → Message — `SHIPPED` (L1)
- v1: `:2910-2916` · v2: `_components/ClientQuickActions.tsx:44-52`, wired at `page.tsx:344-348`
- v1 renders: a fixed bottom action bar; this button switches to the in-page Messages tab (stays on the client file).
- v2 renders: the same fixed bottom bar and the same in-context tab switch (which also updates `?tab=messages`). This is a **separate** control from the header Message button (#4), which navigates away — v1 has both, so v2 has both.
- MISSING vs v1: nothing for this row. v1's middle button in the same bar is #48, deliberately not shipped (B17), so the bar has two buttons rather than three.
- **Layout note:** `MainLayout` already owns `fixed bottom-0` (nav, `:60`) and `fixed bottom-[72px]` (active-workout banner, `:44`). v1's `bottom-20` clears the nav but would sit on top of the banner, so the bar lifts to `bottom-[136px]` while a workout is in progress (`ClientQuickActions.tsx:38-41`). Both states verified by eye; page content carries `pb-48` to clear the bar in either position.
- Inert controls in v2: none.

### #7 Header → remove client — `SHIPPED` (L1)
- v1: `:671-678` · v2: `page.tsx:281-291`
- v1 renders: a trash icon button that opens the remove-client confirm.
- v2 renders: the same, with `aria-label="Remove client"` (`src/components/AGENTS.md` rule 4).
- MISSING vs v1: nothing. Wired to #55.
- Inert controls in v2: none.

### #8 Tab bar (5 tabs) — `SHIPPED` (L1)
- v1: `:683-693`, seeded at `:190` · v2: `page.tsx:295-309` + `_lib/client-tabs.ts`
- v1 renders: five triggers in the order `overview · program · progress · messages · payments`, initial tab from `?tab=`, content inside a `ScrollArea`.
- v2 renders: the same five in the same order via `@/components/ui/tabs`, initial tab from `?tab=`.
- MISSING vs v1: nothing.
- **Deliberate differences (both improvements over v1, disclosed rather than silent):** (a) v1 never validates `?tab=`, so `?tab=paymnets` renders a blank screen — v2 resolves anything unknown to `overview`; (b) v1 only *reads* the param, so the URL goes stale as soon as you switch tab — v2 keeps it in sync with `history.replaceState` (a URL update, not a navigation), which makes a copied link reopen what the trainer is actually looking at.
- **Deliberate omission:** v1 wraps tab content in `ScrollArea` (`:695`). v2 does not — `MainLayout`'s `<main>` is already the scroll container (`MainLayout.tsx:41`), and a nested Radix `ScrollArea` needs a bounded height to work at all, so adding one would have broken scrolling to imitate a wrapper v1 needed for a different layout.
- Inert controls in v2: none.

### #28 Full Workout History — `PARTIAL` (L1; **L5 replaces it wholesale**)
- v1: `:2189-2292` · v2: `_components/ProgressPanel.tsx:42-70`
- v1 renders: a scrollable "All Workouts (n)" list — date, exercise count, PT-session tag, has-notes tag, volume, duration, and Repeat / Save-as-Template / Edit per row, plus 🔒 trainer notes.
- v2 renders: a plain dated list — name, date, volume — of the history the page already fetches (`fetchWorkoutHistory(clientId, 10)`), with a real `EmptyState` when there are genuinely no workouts.
- **Why L1 touched an L5 row at all:** the alternative was shipping the Progress tab as a "coming soon" card, which is the stub pattern this whole programme exists to kill, when the data was already in hand.
- **MISSING vs v1:** the "(n)" total and the 10-row cap; PT-session and has-notes tags (#27/B9, B15); duration (B15); exercise count; Repeat / Save-as-Template / Edit (#53); trainer notes (B15). **No chart, no fake data.**
- Inert controls in v2: none — every row opens that workout.
- Rows 27, 29 and 30 remain `MISSING` and untouched.

### #31 Messages list — `SHIPPED` (L1)
- v1: `:2380-2411` · v2: `features/messaging/components/ConversationThread.tsx:156-212`, mounted by `_components/MessagesPanel.tsx:58-63`
- v1 renders: a 400px scroll of bubbles, own messages right / client's left, `HH:mm` under each, and an empty state.
- v2 renders: the same, at the same `h-[400px]`, with realtime inserts and auto-scroll.
- **Extracted, not re-ported.** v2 already had this thread inline in `/messages` (old `page.tsx:225-273`); re-typing it into the client file would have produced two copies that drift. L1 moved it into one shared component and refitted `/messages` onto it. `src/features/messaging/index.ts` is a new barrel (the feature had none).
- MISSING vs v1: nothing.
- Inert controls in v2: none.

### #32 Message input — `SHIPPED` (L1)
- v1: `:2413-2427`, handler `:344-349` · v2: `ConversationThread.tsx:214-247`, handler `:135-155`
- v1 renders: an input with Enter-to-send plus a Send button.
- v2 renders: the same, with the send button disabled while a send is in flight.
- **Deliberate difference:** v1 calls `sendMessage(...)`, clears the input and toasts "Message sent" on the next three lines — before the write resolves. v2 awaits it, and on failure keeps the draft in the box and shows an inline `role="alert"` instead of a false success (G-11, and messaging rule 5).
- MISSING vs v1: nothing.
- Inert controls in v2: none.

### #33 Mark-as-read on tab open — `SHIPPED` (L1)
- v1: `:307-314` (effect keyed on `activeTab === 'messages'`) · v2: `ConversationThread.tsx:69-92`, plus `:118-126` for messages that arrive while the tab is open
- v1 renders: nothing; it flips inbound messages to read whenever the Messages tab is active.
- v2 behaviour: `MessagesPanel` is only rendered while the Messages tab is active, so mounting the thread **is** v1's gate; the load effect calls `markConversationSeen(conversationId, me)`. Leaving and returning unmounts and remounts it, so it fires again — and inbound realtime messages are marked seen while the tab stays open.
- MISSING vs v1: nothing.
- Inert controls in v2: none.

### #55 Remove Client ConfirmDialog — `SHIPPED` (L1)
- v1: `:3303-3312`, handler `:375-381` · v2: `page.tsx:360-369`, API `features/trainer-ops/api/clients.ts:54-74`
- v1 renders: a destructive `ConfirmDialog` whose copy states the account will NOT be deleted, then removes the client from the trainer's list and routes to `/clients`.
- v2 renders: the same, via the existing shared `ConfirmDialog` (its props already match v1's shape one-for-one).
- **No migration was needed:** `tc_delete_trainer` is `DELETE using (trainer_id = auth.uid())` on the live DB.
- **Removing a client does not delete money history** — `client_sessions` and `client_payments` FK to `public.users(id)`, not to `trainer_clients` (`00016_payments_sessions.sql:25-26,69-70`), so nothing cascades. It *does* end read access to that client's workouts/PBs/profile, because `are_connected()` counts only `status='active'` links (`00012:47-60`).
- **Deliberate difference:** the confirm copy adds one sentence v1 lacks — that the trainer loses access to the client's workouts and progress, and that payment history is kept — because that consequence is real and was undisclosed.
- **Write discipline:** delete scoped by `trainer_id` AND `client_id`, `await`ed with retry, success toast only after it resolves, failure surfaced via `toast.error`. A delete matching zero rows (what an RLS refusal looks like over PostgREST: no error, no rows) raises instead of reporting success.
- MISSING vs v1: nothing.
- Inert controls in v2: none.

### #57 Client profile card — `PARTIAL` (L1)
- v1: `:3352-3412` · v2: `_components/ClientProfileCard.tsx`, opened by the header avatar (`page.tsx:254-268`)
- v1 renders: avatar · name · `@username` · gym name · Workouts / Medals / PBs tiles · strength rating · bio.
- v2 renders: avatar · name · `@username` · Workouts · PBs.
- **MISSING vs v1, and exactly why:**
  - **gym name** and **bio** — no such columns. Live `public.users` is `id, email, full_name, role, avatar_url, date_of_birth, created_at, updated_at, username, gender, height_cm, weight_kg`.
  - **Medals** and **Strength Rating** — `FEATURE_FLAGS.medals` and `.strengthRating` are `false` (B13) and neither module exists in v2 (`profile/page.tsx:78` hard-codes `strengthRating = null`). They are gated on the flag **and** on a count being supplied, so flipping a flag alone cannot produce an empty or inert tile. Unit-tested in both directions.
- **Counts:** Workouts is the `workouts` row count from `fetchClients()` — correctly labelled *Workouts*, which is where that number belongs (see #15). PBs is `personal_bests` via `fetchPersonalBests(clientId)`, readable by a connected trainer under `pb_select_self_or_trainer` (`00003_workout_core.sql:61`); the read is best-effort and the tile is omitted rather than showing `0` if it fails.
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
| B6 | 6 | `trainer_clients.status` has no `'paused'` | Check constraint permits `active/inactive/pending/archived` only. **Superseded by B16** — the constraint is the lesser of the two walls. |
| B7 | 29, 26 | **No `block_performances` table** | Circuit history and the per-workout block chips have no data source; no `blockPerformances` symbol anywhere in v2. |
| B8 | 16 | **No compliance module** | `calculateCompliance`, `getAdherenceColor/BgColor/Label` have no v2 equivalent; must be ported from v1 `@/lib/compliance`. |
| B9 | 27 | `workouts` has no `assigned_by` | The Solo-vs-PT split needs another source — `client_sessions.workout_id` or `calendar_events.workout_id`. |
| B10 | 30 | `WorkoutStatsCharts` is route-private | Lives at `src/app/(app)/profile/_components/WorkoutStatsCharts.tsx`. Must be promoted to `src/components/` before a second route consumes it. `profile/_lib/adapt-workout.ts` moves with it. |
| B11 | 14, 26 | **No `/workout/history` route** | v1's "View history →" (`:1209`) targets `/workout/history?clientId=`. v2's nearest is `/workouts`, which is not client-scoped. |
| B12 | 19, 36 | **Missing routes** | v2 has no `/clients/[id]/onboarding` (it has `/onboarding/client`) and no `/clients/[id]/program/preview`. |
| B13 | 57 | Feature flags OFF **and no module** | `medals: false` and `strengthRating: false` (`src/config/feature-flags.ts:2-3`), and neither module exists — `profile/page.tsx:78` hard-codes `strengthRating = null`. L1 shipped #57 flag- **and** data-gated, so a flag flip alone cannot render an empty tile. Still open. |
| ~~B14~~ | ~~4~~ | ~~`/messages` ignores `?with=`~~ | **CLEARED by L1.** `src/app/(app)/messages/page.tsx:71-104` now resolves the param through `getOrCreateConversation` and opens that thread. E2E-guarded. |
| B15 | 26, 28 | `workouts` has no `deleted_at`, `trainer_notes`, `duration`, `blocks` | v1 filters `!w.deletedAt`, renders 🔒 `trainerNotes`, duration and block chips. v2's `workouts` row is `id, user_id, name, performed_at, total_volume, exercises, notes` only. |
| **B16** | **6** | **A trainer cannot re-activate a link** | Trigger `trainer_clients_guard_activate` (`00012_harden_trainer_client_authz.sql:91-121`) raises *"Only the client may activate a trainer_clients link"* for any transition **into** `'active'` where `auth.uid() <> client_id`. So a trainer can deactivate a client and then never undo it — a one-way "pause" is a trap, not a port. Needs a **designed migration**: an `inactive → active` re-activation path that cannot bypass client consent. Note the sharp edge: a trainer may set a *pending* link to `inactive`, so a naive "allow inactive→active" rule would let a trainer self-connect to a victim who never accepted. Class B; not designed in L1 by instruction. |
| **B17** | **48** | **A trainer cannot log a workout for a client** | `workouts_insert_own` is `with check (user_id = auth.uid())` (`00003_workout_core.sql:33`, recreated `00005_harden_advisors.sql:59`), and `useActiveWorkoutStore.startWorkout({ userId, name })` (`active-workout-store.ts:78`) takes a single `userId` — there is no trainer-proxy logging path in v2. The only shippable button would log the session into the **trainer's own** history, which is v1's contamination bug (§6). Needs a designed proxy-logging path (schema + RLS + store), not a UI tweak. Class B. |

---

## 4. Proposed lane split

Six lanes, each independently shippable and reviewable. **L1 is a hard dependency for L2–L6**: the
tab shell has to exist before tab content can be filled, and merging six lanes into one untabbed
page would collide on every hunk.

| Lane | Title | Class | Sections | Depends on | Rows |
|---|---|---|---|---|---|
| **L1** ✅ | Page shell — 5-tab layout, header parity, quick-actions bar, messages tab, remove-client, profile-card modal | **B** overall (writes the `trainer_clients` spine, resolves a counting authority) | 13 | — | 3, 4, 5, ~~6~~, 7, 8, 31, 32, 33, 47, ~~48~~, 55, 57 — **done, §7**; 6 and 48 deferred to B16/B17 |
| **L2** | Overview core — session tracking, quick stats, compliance ring, alerts, client info. ~~**and the single-count-authority fix**~~ — **that landed in L1**; L2 must not re-introduce a second authority | **A** | 6 | L1 | 14, 15, 16, 17, 18, 25 |
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
| L1 | 3,4,5,6,7,8,31,32,33,47,48,55,57 | `feat/p06-l1-client-file-shell` | pending review | **3, 4, 5, 7, 8, 31, 32, 33, 47, 55** (10). Also **28 → `PARTIAL`** (Progress tab; L5 replaces) and **57 → `PARTIAL`**. **6 and 48 stay `MISSING`** — blocked, B16 / B17. Cleared B14. |
| L2 | 14,15,16,17,18,25 | — | — | — |
| L3 | 20,21,22,23,24,54 | — | — | — |
| L4 | 19,34,35,36,37,38,41,42 | — | — | — |
| L5 | 26,27,28,29,30,53 | — | — | — |
| L6 | 9,10,11,12,13,43,44,46,50,51,52,56 | — | — | — |

---

## 8. Observations — not acted on

Opinions and out-of-scope findings, separated deliberately. **Nothing here was changed.**

1. ~~**Two session-counting authorities render on the same v2 screen today.**~~ **FIXED IN L1, not L2**
   (this entry originally said "Folded into L2"). `{client.sessions}` (old `page.tsx:194`, counting
   `workouts` rows) and "Sessions done" (`ClientPaymentsSection.tsx:92-96`, counting
   `historical_offset_sessions + client_sessions`) were different numbers ~150px apart. The chip is
   now labelled `N workouts logged`; "sessions" belongs to the ledger alone and renders once, in the
   Payments tab. Guarded by a unit test and an e2e assertion — see #15. **Follow-up still open:**
   `RosterClientDetail.sessions` still *reads* as a session count by name even though it is a workout
   count; renaming it touches `/clients` and `useTrainerWeekSchedule` too, so it was left out of L1
   and is documented in place (`src/types/roster.ts:11-16`).
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
7. **v1's client file is one 3,415-line component.** L1 did decompose the port into a page shell plus
   per-tab panels, but put them in **`src/app/(app)/clients/[id]/_components/`** rather than
   `src/features/trainer-ops/components/`: they are route-private and consume nothing a second route
   would want, and `src/app/(app)/profile/_components/` is the existing v2 precedent. The one piece a
   second route *does* want — the message thread — went into `src/features/messaging/components/`
   instead. Rule of thumb for L2–L6: panel → `_components/`, reusable → the owning feature. After L1
   `page.tsx` is 372 lines (down from 376) and no touched file exceeds 263.
8. **v2's client page imports `fetchClients` from `@/lib/roster`**, which is a one-line re-export of
   `@/features/trainer-ops/api/roster`. Harmless today, but it is an indirection that hides the
   feature boundary; app pages could import the feature directly. **Still true after L1** — left
   alone deliberately (changing it is a cross-surface edit with no behaviour gain), though L1's own
   new API is imported directly as `@/features/trainer-ops/api/clients`, so the page now shows both
   styles side by side. Worth settling before L2.
