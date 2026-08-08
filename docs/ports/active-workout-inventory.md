# Active workout inventory — `/workout/active` (v1 → v2)

> **What this document is.** A section-by-section enumeration of everything v1's active-workout screen
> renders, with an explicit verdict against each one. It is the same instrument as
> `client-file-inventory.md`, applied to the biggest screen in the product (v1: **6,458 lines**, nearly
> double the client file) and the athlete's core loop.
>
> **Why it exists.** The client file shipped at 11% while STATUS recorded it as "shipped", because
> status was measured by *"does a route exist"*. Enumerating first is what caught that. This screen is
> the one Christo names first in `LAUNCH_SCOPE.md` List A — *"logging workouts like v1 is currently
> doing"* — so it is the one where a silent fractional port costs the most.
>
> **The ratchet.** Every Phase 2 PR that ports one of these sections must flip its row **in the same
> commit**. Coverage can never drift from reality again.
>
> **`TBD` is not a verdict.** A section may only leave scope by someone writing down that it left.

---

## Header

| | |
|---|---|
| **Date** | 2026-08-08 |
| **Lane** | P-10 Phase 1 (inventory only — zero code, zero schema) |
| **Workspace opened** | `/Users/christofit7/Desktop/catalift/catalift-port.code-workspace` (multi-root: v2 = write, v1 = read-only) |
| **v1 source** | `catalift-web/apex-fitness/src/app/workout/active/page.tsx` — **6,458 lines**, single file |
| **v1 commit read** | `4891dd2` (working tree). Last commit touching this file: `748b1a0` *"fix(v19-fix-11b): modal fires on structural change only"* |
| **v2 destination** | `catalift-v2/src/app/workout/active/page.tsx` (**1,293 ln**) · `src/features/workout-engine/**` (components 2,548 ln / store 761 ln / lib 551 ln / api 476 ln / types 107 ln — **4,443 ln non-test**) · `src/components/layouts/MainLayout.tsx` (minimised banner) |
| **v2 commit diffed against** | `5f81417` (`origin/main`, clean tree) |
| **v1 ranges opened** | **1–6458, in full**, in 30–200-line windows: 1–255, 415–804, 786–1295, 1295–1804, 1804–2301, 2302–2691, 2691–2924, 2922–3475, 3476–3794, 3795–4333, 4334–4693, 4694–4803, 4803–5357, 5357–5564, 5834–6229, 6230–6458. Section boundaries independently re-derived by grepping all 122 JSX comments and every `<Dialog`/`<AlertDialog` boundary. **Only 5565–5833 was not opened line-by-line** — it is the compact duplicate of 2445–2910 (see row 96) and is unreachable; its section list was confirmed from the JSX-comment grep. |
| **Live DB checked?** | **Yes** — `supabase` MCP, read-only, project `igagmdkdzjkxrwnyvgqk` (identity confirmed via `get_project_url` before any query). `information_schema.columns`, `pg_policies`, `pg_trigger` for `workouts` / `personal_bests` / `client_sessions` / `client_exercise_history`. |
| **Both screens run side by side?** | **No.** Verdicts are from reading v1 source against v2 source, plus the live DB. Three rows are explicitly flagged as needing a runtime check (rows 94, 96, and blocker **B-11**). |
| **Revisions** | — (Phase 1 original) |

### Coverage

**44 of 154 sections shipped — 29%** (by section count).

| Status | Count | % |
|---|---|---|
| `SHIPPED` | 44 | 29% |
| `PARTIAL` | 39 | 25% |
| `MISSING` | 59 | 38% |
| `STUBBED` | 2 | 1% |
| `INTENTIONALLY DROPPED` | 10 | 6% |
| **Total** | **154** | **100%** |

Excluding the 10 deliberately dropped rows, **44 of 144 in-scope sections are shipped — 31%.**

Counts are mechanically derived from the §1 tables, not asserted — re-derive with:
`grep -oE '^\| *[0-9]+ \|' docs/ports/active-workout-inventory.md | wc -l` and a count of the
`v2 status` column.

#### Coverage by line count, and why the two disagree

Summing the v1 line spans in the §1 tables (5,591 of 6,458 lines attributed; the remainder is imports,
type declarations, closing JSX and the 5565–5833 duplicate):

| Measure | Value | Coverage |
|---|---|---|
| **By section count** | 44 of 154 `SHIPPED` | **29%** |
| **By v1 line count** | 988 of 5,591 attributed lines are in `SHIPPED` sections | **18%** (15% of the whole 6,458-line file) |
| **Naive file-size ratio** (the figure in `PARITY_v1_to_v2.md`) | v2 `page.tsx` 1,293 ln vs 6,458 | 20% |
| **Honest code-volume ratio** | v2 5,736 non-test ln (page + engine) vs 6,458 | 89% |

**The two disagree by 11 points, and the direction is the finding: section coverage (29%) runs well
*ahead* of line coverage (18%).** v2 has shipped a large number of *small* sections — a badge, a chip,
a button, a set input — and missed a small number of *very large* ones. The four biggest unported
regions alone account for ~1,150 v1 lines:

```
save-changes-back-to-program + notify   (1958–2213)  255 ln   MISSING
circuit runtime                         (3380–3614)  234 ln   MISSING (all but 2 rows)
cardio runtime                          (3615–3744)  129 ln   MISSING (all but the v2-original form)
medals + strength rating + AI coach     (2604–2806)  202 ln   MISSING / STUBBED
close-summary side effects              (1786–2286)  ~330 ln  MISSING (all but reset+redirect)
```

Read together with the 89% code-volume ratio, the honest position is: **v2 has written almost as much
code as v1 and delivers under a third of its sections.** That is not waste — v2's lines buy a typed
block model, a serializer, a legacy upgrader, retry-wrapped writes and ~2,000 lines of tests v1 never
had. But it means *"v2 is 20% of v1"* and *"v2 is nearly done"* are **both** wrong. Line ratios measure
effort; the section count measures what an athlete can do. **Schedule Phase 2 off the section count,
and size the lanes off the line count** — L4 and L7 are far larger than their row counts suggest.

#### A note on granularity, so it can be judged rather than trusted

154 rows over 6,458 lines is **one row per 42 lines**. `client-file-inventory.md` ran one row per 60
lines. I am ~40% more granular, deliberately: this screen is control-dense (v1 renders 24 dialogs and
sub-dialogs and well over 100 distinct interactive controls), and a coarser split would have hidden
`STUBBED` controls like row 52 inside a `PARTIAL` parent. **If a reviewer thinks this is padded, the
place to check is §1.12 and §1.15** (set rows), which are the most finely split.

---

## 0. Stale premises found — read this before the table

The brief asked me to list every stale premise I hit. There were more than expected, in the brief
itself and in the v2 docs. **Five of the brief's own claims were wrong or incomplete.**

| # | Premise | Where | Reality |
|---|---|---|---|
| S-1 | Foundation branch `feat/active-workout-v1-parity` still open, "UI port not completed" | `STATUS.md:363-364` | **Stale, as the brief said.** Verified independently: `git merge-base --is-ancestor 6e238fc origin/main` → true. Branch gone. |
| S-2 | `workout/active` is "6,458 → 1,293 lines" (20%) | `PARITY_v1_to_v2.md` §6.2 | **Misleading, as the brief said** — but the brief's own correction ("~3,800 vs 6,458, ~59%") is *also* wrong. v2 non-test workout code is **5,736 ln** (page 1,293 + engine 4,443), i.e. 89%. And neither ratio is the right measure — see the coverage table above. |
| S-3 | Brief §4 anatomy map: "Workout summary dialog (compact) — 5542–6458" | this brief | **Wrong.** 5542–5833 is the compact summary; **5834–6458 contains seven more dialogs** (rest-timer settings, workout notes, exercise notes, superset picker, save-workout, save-circuit, remove-confirm) **plus the entire `SetRow` sub-component** (6204–6458), which is where drop sets and planned drop-set "pots" actually render. ~625 lines the map silently swallowed. |
| S-4 | Brief §4 anatomy map treats 2433–2920 as the whole summary region | this brief | **Incomplete.** It omits the **PT review-gate screen** (2382–2429), a separate full-screen return branch shown when a *client* finishes a PT session and must wait for trainer review. |
| S-5 | Brief §3 item 5: "Block-type selection must match v1's picker (5268–5333). He called v2's *way different*." | this brief | **Conflates two things.** v1 has *both* a block-type picker (5268–5332) *and* per-type config dialogs (circuit 5031–5109, cardio 5111–5266). v2 dropped the picker (correctly — see row 111) but also dropped **all of the config**. Christo's "way different" is about the **config dialogs**, not the picker. Aiming a lane at the picker would rebuild the one thing v2 was right to drop and miss the actual complaint. |
| S-6 | Brief §3 item 17-adjacent / subagent finding: no minimised-workout bar in v2 | my own first-pass search | **False MISSING, caught before it reached this table.** v2 *does* have one: `MainLayout.tsx:43-56`, driven by `useActiveWorkoutBanner()`. It was missed because the search covered `app/workout/active` and `features/workout-engine` only. Exactly the failure mode the brief warned about; recorded here as evidence the three-place rule is load-bearing. |
| S-7 | "medals / strengthRating exist as libraries but are flag-off and not wired" | brief §3 | **True, and understated.** They are not merely unwired — there is **no `medals`, `achievements` or `strength_ratings` table in the live v2 DB** (15 tables total, verified). Wiring them is a schema lane, not a flag flip. |

---

## 0.5 Christo's nine asks — answered one line each

Each verified by reading the v2 code path, not by finding a matching symbol name.
**Six of nine are satisfied.** The two that are not are both in circuit/cardio *configuration*.

| # | The ask | Verdict | Evidence |
|---|---|---|---|
| 1 | Blue photo header — minimize · duration · pause · note · rest · sets-done · Finish | **PRESENT** | `page.tsx:992–1081`. All seven controls real and wired (minimize `:1002`, duration `:1032`, pause `:1041`, note `:1050`, rest `:1059`, sets-done `:1072`, Finish `:1022`). **Two gaps:** no PT/solo theming (row 29), and the rest control is a hard-coded 90 s toggle, not the configurable chip (row 38). |
| 2 | Coloured "Add:" chips — Warm-Up / Strength / Circuit / Cardio | **PRESENT** | `page.tsx:1103–1131`; four chips, correct colours and icons. Gap: v1's chips light up and re-target an existing block on second tap; v2's always create a new one (rows 42–43). |
| 3 | Per-exercise PB / previous / best-volume badges | **PRESENT** | `ExerciseCard.tsx:189–233` — PB `:192`, previous `:198`, volume-vs-best bar `:203`. Gap: no workout-history PB fallback (row 80), which matters because live `personal_bests` has 1 row. |
| 4 | In-block "Add Exercise" must inherit block type — **no type prompt** | **PRESENT — fixed** | `StraightBlockCard.tsx:108–118` → `onAddExerciseToBlock(block.id)` → `page.tsx:888–889` sets the active block then opens the picker; `addExercise` appends into that block. No type prompt exists in v2 at all. Traced the handler chain, not just the comment. |
| 5 | Block-type selection must match v1's picker | **N/A — the premise is wrong** | v2 deliberately has no picker; the always-visible chip bar replaces it (row 111), and that *is* the fix for ask #4. **The real complaint is the config dialogs** — see #6 and S-5. |
| 6 | Cardio blocks must let you pick a cardio exercise | **PRESENT — fixed** | `page.tsx:269–386` (`AddCardioModal`): searchable exercise list `:320–333`, selection stored as `exerciseId`/`exerciseName`, rendered at `CardioCard.tsx:47`. **But** v1's activity-type × mode (Steady/Intervals/Distance) configuration is entirely absent (row 110) — which is what "way different" actually refers to. |
| 7 | Visual drop-set and superset creation in-session | **PRESENT** | Drop set: `ExerciseCard.tsx:153–161` → `addDropSet`, rows render at `SetRow.tsx:209–277`. Superset: `ExerciseCard.tsx:144–152` → picker `page.tsx:548–609` → `createSuperset`. Gaps: no per-drop complete/undo (row 92), no unpair (row 77). |
| 8 | Colour-coded block cards — icon chip, name in type colour, subtitle, 3-dot menu | **PRESENT** | `block-types.tsx:35–98` (warmup yellow / strength blue / circuit orange / cardio green); chip+name+subtitle+menu in all four cards. **Caveat: the 3-dot menu's "Save to Block Library" is a dead control in all four** (row 52). |
| 9 | Cancel / discard an active workout | **PRESENT** | `page.tsx:1261–1286` "Discard Workout?" → `handleCancelWorkout` (`:982–986`) → `cancelWorkout()` + redirect. |

**Net:** the *in-session logging surface* Christo complained about in June/July has largely been fixed.
What remains of his complaints is concentrated in **one place — circuit and cardio configuration and
runtime (lane L4)** — plus the four dead "Save to Block Library" controls.

## 0.6 The brief's hypothesis about the summary region — **CONFIRMED**

> *"v1's post-workout summary/completion surface (2433–2920, ~490 lines) has almost no v2 counterpart."*

**Correct, and the completion *pipeline* behind it is in worse shape than the summary itself.**

Of the 16 sections in v1's full-screen summary (rows 13–28), v2 ships 6 — and those 6 are the
presentational ones (header, stats row, chips, PRs, Done). Every section that *does* something is
missing: medals (20), strength rating (22), session-paid (23), share-with-trainer (24), share-to-feed
(25), private notes (26), shared notes (27), editable session time (15). AI coach (21) is `STUBBED` —
`WorkoutSummary.tsx:172–199` renders v1's *offline fallback strings* under an "AI Coach" heading with
no API behind it.

**The part the brief did not predict:** `handleCloseSummary` (1786–2286, ~500 lines) is where those
checkboxes actually *do* their work — payments, notifications, program write-back, note persistence.
**Of its 11 side effects (rows 144–154), v2 has one** (state reset + redirect). So the gap is not
~490 lines of summary UI, it is closer to **~1,000 lines of summary UI plus completion side effects**,
and almost all of it is Class B — six of the eight blockers B-03…B-09 sit in this region.

The brief was also right that medals and strength rating are unwired — and understated it: there is
**no table for either in the live v2 DB** (S-7).

---

## 1. Section table

**Legend.** `v2 status` ∈ `SHIPPED` / `PARTIAL` / `MISSING` / `STUBBED` / `DROPPED`.
`SHIPPED` means **an athlete can do in v2 everything this section lets them do in v1** — not that a
similarly-named component exists. **A rendered-but-dead control is `STUBBED`, which is a fail.**
`Verdict` ∈ `PORT` / `PORT-ADAPTED` / `DEFER` / `DROP`. `Class`: **A** = app code, **B** = schema / RLS /
auth / payments / data-sync (needs review before merge).

### 1.1 Lifecycle, guards and runtime effects (v1 74–896, 2368)

| # | Section | v1 lines | What it does | Reads | Writes | v2 status | v2 location | Verdict | Class | Lane |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Auth / no-active-workout redirect guard | 74–126, 482–493 | Pure decision fn; gates on `isAuthenticated`, `activeWorkout`, `isFinishing`, `hasHydrated` | store | — | `SHIPPED` | `page.tsx:694–709` | PORT | A | — |
| 2 | Persist flush on tab hide / unload | 495–526 | Forces a Zustand write on `visibilitychange`+`beforeunload` (fixes Chrome tab-discard data loss) | store | IndexedDB/LS | `PARTIAL` | store `717–735` persists per-change to IndexedDB; **no explicit flush hook** | PORT-ADAPTED | A | L1 |
| 3 | PT-session client-history hydration | 128–208, 528–593 | On mount, if `activeWorkout.userId ≠ auth uid`, fetch that client's workouts+PBs and merge by id | `workouts`, `personal_bests` | store | `MISSING` | — | DEFER | B | L6 |
| 4 | Block init from `activeWorkout.blocks` + cardio-field derivation + duration parsing | 595–768 | Maps builder block shape → runtime shape; derives `cardioMode`/`targetDistance`/`targetSeconds` from the first cardio exercise | store | store | `PARTIAL` | `startFromTemplate` (store `168–204`) seeds blocks; **no cardio derivation, no duration parsing** | PORT-ADAPTED | A | L4 |
| 5 | Cross-trainer exercise usage counter fetch | 770–802 | Loads `client_exercise_history.times_used` for the *workout's* user (not the viewer) | `client_exercise_history` | — | `MISSING` | — | DEFER | B | L6 (**B-02**) |
| 6 | Auto-create first block from entry-flow choice | 804–826 | `initialBlockType` from the /workout entry screen auto-opens strength block / circuit dialog / cardio dialog | store | store | `MISSING` | — | PORT-ADAPTED | A | L2 |
| 7 | Workout timer + global rest timer tick | 828–840 | 1 Hz intervals driving both timers | store | store | `SHIPPED` | `page.tsx` timer effects; store `tickTimer`/`tickRestTimer` | PORT | A | — |
| 8 | Timed-set (stretch/hold) timer tick | 842–861 | 1 Hz countdown per timed set, auto-stops at 0 | local | local | `MISSING` | — | PORT | A | L3 |
| 9 | Per-set rest timer tick | 863–884 | 1 Hz countdown keyed by setId; holds at 0 in a red "done" state | local | local | `SHIPPED` | `SetRow.tsx:144–154` + page rest state | PORT | A | — |
| 10 | Custom-exercise hydration for pickers | 886–896 | Loads this user's custom exercises, re-reads after each create | localStorage | — | `SHIPPED` | `page.tsx:123, 285, 410` (`loadCustomExercises`) | PORT | A | — |
| 11 | Null render guard (no workout, no summary) | 2368 | `return null` rather than flashing an empty shell | — | — | `SHIPPED` | `page.tsx` early return | PORT | A | — |

### 1.2 PT review-gate screen (v1 2380–2429) — *omitted from the brief's map*

| # | Section | v1 lines | What it does | Reads | Writes | v2 status | v2 location | Verdict | Class | Lane |
|---|---|---|---|---|---|---|---|---|---|---|
| 12 | "Session Complete — waiting for coach review" full-screen branch | 2382–2429 | When the **client** finishes a PT session on their own device, the whole summary is withheld: shows spinner card, duration + sets only, Done | `completedWorkoutData.awaitingReview` | — | `MISSING` | — | DEFER | B | L6 |

### 1.3 Post-workout summary — full-screen branch (v1 2431–2914)

| # | Section | v1 lines | What it does | Reads | Writes | v2 status | v2 location | Verdict | Class | Lane |
|---|---|---|---|---|---|---|---|---|---|---|
| 13 | Sticky summary header + Done | 2433–2441 | "Workout Complete" bar, Done → `handleCloseSummary` | — | — | `SHIPPED` | `WorkoutSummary.tsx:28–33` | PORT | A | — |
| 14 | Compact header (name + PT badge) | 2445–2459 | Check avatar, workout name, "PT Session" badge | — | — | `PARTIAL` | `WorkoutSummary.tsx:40–47` — **no PT badge** | PORT-ADAPTED | A | L5 |
| 15 | Session Time + **editable** start/end | 2461–2483 | Shows start→end; Edit swaps in two `<input type=time>`; recomputes duration on close | — | workout `startTime`/`endTime`/`duration` | `PARTIAL` | `WorkoutSummary.tsx:50–63` display only — **not editable** | DEFER | B | L7 (**B-03**) |
| 16 | Compact stats row (4 tiles, block-aware 4th) | 2485–2539 | Duration · kg Vol · Exercises · then km-cardio / rounds / min-cardio / sets by priority | `blocksSummary` | — | `SHIPPED` | `WorkoutSummary.tsx:66–112` | PORT | A | — |
| 17 | Block summary chips (cardio/circuit/warmup) | 2541–2567 | Emoji badges: `🏃 Run · 5.02km`, `⚡ AMRAP · 4/5 rds`, `🔥 2 warm-ups` | `blocksSummary` | — | `SHIPPED` | `WorkoutSummary.tsx:115–138` | PORT | A | — |
| 18 | Per-block creative visualisation (`BlockMemoryCard`) | 2569–2587 | Pace/splits chart, round-times bar chart, warmup recap | `blocks[]` snapshot | — | `PARTIAL` | `WorkoutSummary.tsx:141–154` + `BlockMemoryCard.tsx` — renders, but **fed by a cardio model with no splits/rounds data** (rows 51, 55) | PORT-ADAPTED | A | L4 |
| 19 | New PRs panel | 2589–2602 | Amber gradient, trophy, one badge per PR name | `newPBs` | — | `SHIPPED` | `WorkoutSummary.tsx:157–169` | PORT | A | — |
| 20 | Medals earned — rarity sort, top-2 + overflow, "close to evolving" progress bars | 2604–2702 | 99 lines of medal presentation | `medalStore`, `lastDeriveResult` | — | `MISSING` | `lib/medals.ts` exists, unimported; flag `medals:false`; **no DB table** | DEFER | B | L8 (**B-06**) |
| 21 | AI Coach feedback | 2704–2749 | Renders `/api/workout-feedback` result; block-aware static fallback while loading/failed | API | workout `aiSummary` | `STUBBED` | `WorkoutSummary.tsx:172–199` renders **only v1's fallback strings** — no API, nothing persisted | DEFER | B | L8 (**B-07**) |
| 22 | Strength Rating delta (only if a category improved ≥10%) | 2751–2806 | Overall score, tier, tier-change arrow, per-category +% badges | `medalStore.strengthRating` | — | `MISSING` | `lib/strengthRating.ts` exists, unimported; flag off; **no DB table** | DEFER | B | L8 (**B-06**) |
| 23 | **Session Paid** checkbox (PT only) | 2808–2819 | Opt-in; on close creates a payment + increments paid counters | `trainerStore` packages | `client_payments`, package counters | `MISSING` | — | DEFER | B | L6 (**B-04**) |
| 24 | **Share with [trainer]** checkbox | 2821–2860 | Non-PT, non-program workouts only, and only if a trainer link exists | `clientPrograms` | workout `sharedWithTrainerId` + notification | `MISSING` | type `sharedWithTrainerId` exists in `types/index.ts:335`, no UI, **no DB column** | DEFER | B | L7 (**B-05**) |
| 25 | Share to Feed checkbox | 2868–2877 | Creates a `workout_complete` social post on close | — | social store | `DROPPED` | flag `socialFeed:false`; **no posts/feed table** — out of product scope, not a gap | DROP | B | — |
| 26 | Private notes textarea | 2879–2890 | PT-aware placeholder; saved to `privateNotes` (+`trainerNotes` for PT) | — | workout notes | `PARTIAL` | v2 has one generic in-session note panel (`page.tsx:1084–1098`) → `workouts.notes`; **no private/shared split** | PORT-ADAPTED | B | L7 (**B-05**) |
| 27 | Shared notes textarea (trainer↔client) | 2892–2905 | Only when a trainer/client relationship exists; direction-aware labels | — | workout `sharedNotes` | `MISSING` | **no DB column** | DEFER | B | L7 (**B-05**) |
| 28 | Bottom Done button | 2907–2910 | Second Done, full width | — | — | `SHIPPED` | `WorkoutSummary.tsx:31–33` (single Done) | PORT-ADAPTED | A | — |

### 1.4 Live header (v1 2922–3077)

| # | Section | v1 lines | What it does | Reads | Writes | v2 status | v2 location | Verdict | Class | Lane |
|---|---|---|---|---|---|---|---|---|---|---|
| 29 | Photo background + **PT-vs-solo gradient** | 2922–2929 | Two different Unsplash photos; rose gradient for PT, sky for solo | `isPT` | — | `PARTIAL` | `page.tsx:85–86, 994–998` — one photo, sky only | PORT-ADAPTED | A | L6 |
| 30 | Minimize button | 2930–2939 | `X` → `/today`, workout keeps running | — | — | `SHIPPED` | `page.tsx:1002–1009` (+ resume banner `MainLayout.tsx:43–56`) | PORT | A | — |
| 31 | Workout name + "with {client}" | 2940–2945 | Client name resolved via `getClientDisplayInfo` | `trainerStore` | — | `PARTIAL` | `page.tsx:1010–1012` name only | PORT-ADAPTED | A | L6 |
| 32 | **PT vs Solo indicator pill** | 2946–2964 | `Users` "PT Session" / `User` "Solo Workout" | `workout.assignedBy` | — | `MISSING` | — | DEFER | B | L6 |
| 33 | Discard button | 2966–2975 | Opens exit dialog | — | — | `SHIPPED` | `page.tsx:1013–1021` | PORT | A | — |
| 34 | Header **Settings menu** (Save as Template · Rest Timer Settings · Workout Notes) | 2976–3008 | Three-item overflow | — | — | `MISSING` | v2 has inline Note + Rest buttons, no menu, and no Save-as-Template anywhere | PORT-ADAPTED | A | L3 |
| 35 | Finish button | 3009–3016 | Opens the finish confirm dialog | — | — | `PARTIAL` | `page.tsx:1022–1028` — finishes **immediately, no confirm** (row 89) | PORT | A | L1 |
| 36 | Timer bar — duration + pause/play | 3020–3042 | Big mono clock, pause/resume | store | store | `SHIPPED` | `page.tsx:1032–1049` | PORT | A | — |
| 37 | Timer bar — notes button (lit when notes exist) | 3043–3050 | Opens the notes dialog; highlighted when non-empty | — | — | `SHIPPED` | `page.tsx:1050–1058` (inline panel not dialog) | PORT-ADAPTED | A | — |
| 38 | Timer bar — rest chip showing `{n}s` / `Off` | 3051–3059 | Opens rest settings; label reflects current default | local | — | `PARTIAL` | `page.tsx:1059–1068` toggles a hard-coded 90 s timer; **no settings, no `Off` state** | PORT | A | L3 |
| 39 | Sets-done counter | 3062–3067 | `{completed}/{total}` | blocks | — | `SHIPPED` | `page.tsx:1072–1079` | PORT | A | — |
| 40 | Progress bar | 3070–3076 | Completed-set fraction | blocks | — | `MISSING` | — | PORT | A | L1 |

### 1.5 Add-block bar (v1 3079–3169)

| # | Section | v1 lines | What it does | Reads | Writes | v2 status | v2 location | Verdict | Class | Lane |
|---|---|---|---|---|---|---|---|---|---|---|
| 41 | "Add:" label + sticky coloured bar | 3080–3082 | Sticky under the header | — | — | `SHIPPED` | `page.tsx:1103–1105` | PORT | A | — |
| 42 | Warm-Up chip (yellow, Flame) — **lit when block exists, then adds into it** | 3084–3108 | First tap creates the block; later taps open the picker on the existing block | blocks | store | `PARTIAL` | `page.tsx:1106–1111` always creates a **new** block; no lit state | PORT | A | L2 |
| 43 | Strength chip (blue, Dumbbell) — same lit/reuse behaviour | 3110–3134 | as above | blocks | store | `PARTIAL` | `page.tsx:1112–1117` | PORT | A | L2 |
| 44 | Circuit chip (orange, Zap) | 3136–3145 | Opens circuit **config** dialog | — | — | `PARTIAL` | `page.tsx:1118–1123` opens an exercise picker, **not** the config dialog (row 87) | PORT | A | L4 |
| 45 | Cardio chip (rose, Heart) | 3147–3156 | Opens cardio **config** dialog | — | — | `PARTIAL` | `page.tsx:1124–1129` opens exercise+duration picker only (row 88) | PORT | A | L4 |
| 46 | "Quick Add" → block-type picker | 3158–3167 | 5th button, opens the 2×2 type grid | — | — | `DROPPED` | v2's always-visible chips supersede it — see row 111 | DROP | A | — |

### 1.6 Floating banners (v1 3171–3239)

| # | Section | v1 lines | What it does | Reads | Writes | v2 status | v2 location | Verdict | Class | Lane |
|---|---|---|---|---|---|---|---|---|---|---|
| 47 | Rest-timer banner — countdown | 3172–3180 | Fixed blue bar, 2xl mono countdown | store | — | `PARTIAL` | header chip only (`page.tsx:1059–1068`); **no banner** | PORT | A | L3 |
| 48 | Rest-timer banner — **−15s / +15s / Skip** | 3182–3212 | Adjust or skip the running rest | store | store | `MISSING` | no `adjustRestTimer` anywhere in v2 | PORT | A | L3 |
| 49 | Superset pairing-mode banner | 3217–3239 | Purple bar "Tap exercise or add new one below" + Cancel | local | — | `DROPPED` | v2 pairs via a modal list instead (row 119) | DROP | A | — |

### 1.7 Block card chrome (v1 3246–3378)

| # | Section | v1 lines | What it does | Reads | Writes | v2 status | v2 location | Verdict | Class | Lane |
|---|---|---|---|---|---|---|---|---|---|---|
| 50 | Colour-coded block card — border/bg/icon chip/name in type colour | 3246–3272 | warmup yellow · strength blue · circuit orange · cardio green(+rose icon) | blocks | — | `SHIPPED` | `block-types.tsx:35–98`; `StraightBlockCard.tsx:62–83`, `CardioCard.tsx:41–60`, `CircuitCard.tsx:78–92`, `SupersetCard.tsx:55–74` | PORT | A | — |
| 51 | Block subtitle — live, type-specific | 3273–3297 | Cardio: elapsed-vs-target / km-vs-target. Circuit: `N exercises • AMRAP`. Empty-state hints | blocks | — | `PARTIAL` | v2 subtitles are static counts (`StraightBlockCard.tsx:71–75` etc.) — **no live cardio/circuit read-out** | PORT-ADAPTED | A | L4 |
| 52 | Block 3-dot menu — **Save to Block Library** | 3300–3321 | Opens save-circuit dialog → `saved_blocks` | — | `saved_blocks` | `STUBBED` | `BlockMenu.tsx:33–40` renders the item; handler is a TODO in **all four** cards (`StraightBlockCard.tsx:57`, `CircuitCard.tsx:71`, `CardioCard.tsx:34`, `SupersetCard.tsx:48`) | PORT | B | L4 |
| 53 | Block 3-dot menu — Delete Block | 3322–3330 | Deletes block **and cascades** removal of its exercises | blocks | store | `SHIPPED` | `BlockMenu.tsx:42–50` → `removeBlock` | PORT | A | — |
| 54 | Circuit header timer + **BEST time** | 3333–3376 | Inline mono timer, personal-best comparison from `blockPerformances`, play/pause, reset | `blockPerformances` | local | `PARTIAL` | `CircuitCard.tsx:94–126` has timer+BEST, but BEST is **local component state**, never persisted or read back | PORT-ADAPTED | B | L4 (**B-08**) |

### 1.8 Circuit block runtime (v1 3380–3614)

| # | Section | v1 lines | What it does | Reads | Writes | v2 status | v2 location | Verdict | Class | Lane |
|---|---|---|---|---|---|---|---|---|---|---|
| 55 | Circuit active panel — **Round N of M** + progress bar | 3384–3409 | Appears when the timer runs or a round is in progress | blocks | — | `MISSING` | `CircuitCard.tsx:87` shows total rounds only | PORT | A | L4 |
| 56 | Circuit — current-exercise ("Now") highlight, EMOM-aware | 3411–3423 | Picks the current station from elapsed time for EMOM; image + name + target reps | blocks | — | `MISSING` | — | PORT | A | L4 |
| 57 | Circuit — "Next" exercise preview | 3425–3431 | Next station name | blocks | — | `MISSING` | — | PORT | A | L4 |
| 58 | Circuit — in-panel control row | 3433–3468 | Pause/resume, complete-round, finish-circuit | — | store | `MISSING` | — | PORT | A | L4 |
| 59 | Circuit station rows — weight + reps inputs, image, how-to, remove | 3470–3540 | Bodyweight-friendly optional weight; writes through `updateSet` so it survives finish | blocks | store | `PARTIAL` | `CircuitCard.tsx:137–153` renders `ExerciseCard`s (full set rows) — **different interaction**, no compact station row, no how-to | PORT-ADAPTED | A | L4 |
| 60 | Circuit — round checkboxes with per-round durations | 3542–3583 | 12×12 grid, tick + `mm:ss` per completed round, next-round-only enabled | blocks | store | `MISSING` | — | PORT | A | L4 |
| 61 | Circuit — "add extra round" tile | 3584–3591 | Dashed `+` tile bumps `circuitRounds` | blocks | store | `PARTIAL` | `CircuitCard.tsx:156–165` "Add Round" appends a set to every station; no target bump | PORT-ADAPTED | A | L4 |
| 62 | Circuit — Start Round N button / "Circuit Complete!" state | 3593–3612 | Primary CTA when idle | blocks | store | `MISSING` | — | PORT | A | L4 |

### 1.9 Cardio block runtime (v1 3615–3744)

| # | Section | v1 lines | What it does | Reads | Writes | v2 status | v2 location | Verdict | Class | Lane |
|---|---|---|---|---|---|---|---|---|---|---|
| 63 | Cardio — 5xl live timer (counts **down** to target, else up) | 3618–3625 | Central timer | blocks | — | `MISSING` | `CardioCard` is a **summary form**, not a runtime | PORT | A | L4 |
| 64 | Cardio — interval WORK/REST phase badge + Round N of M | 3627–3637 | 💪 WORK / 😮‍💨 REST | blocks | — | `MISSING` | v2 `CardioPayload` has no interval fields | PORT | A | L4 |
| 65 | Cardio — distance progress (km vs target + bar) | 3639–3654 | Live distance | blocks | — | `MISSING` | — | PORT | A | L4 |
| 66 | Cardio — controls (reset · play/pause · **Split** · Done) | 3657–3716 | Split records a lap at current time/distance | blocks | store | `MISSING` | — | PORT | A | L4 |
| 67 | Cardio — splits grid | 3718–3731 | 5-col grid of `km / mm:ss` | blocks | — | `MISSING` | — | PORT | A | L4 |
| 68 | Cardio — completed state card | 3733–3743 | "Complete! 🎉 Total time …" | blocks | — | `MISSING` | — | PORT | A | L4 |
| 69 | Cardio — **summary fields** (duration / distance / calories / avg HR / max HR) | — | *v1 has no equivalent* | — | — | `SHIPPED` | `CardioCard.tsx:63–194` — **v2-original, keep** | DROP (n/a) | A | — |

### 1.10 Warm-up sequence mode (v1 3745–3775)

| # | Section | v1 lines | What it does | Reads | Writes | v2 status | v2 location | Verdict | Class | Lane |
|---|---|---|---|---|---|---|---|---|---|---|
| 70 | `WarmupSequence` — auto-advancing guided warm-up (**default** for warmup blocks) | 3745–3775 | Timer-driven flow with exercise images; marks each set complete with its duration | blocks | store | `MISSING` | no `WarmupSequence` anywhere in v2; warmup renders as a plain strength block | DEFER | A | L3 |

### 1.11 Strength / warm-up exercise cards (v1 3776–3971)

| # | Section | v1 lines | What it does | Reads | Writes | v2 status | v2 location | Verdict | Class | Lane |
|---|---|---|---|---|---|---|---|---|---|---|
| 71 | Exercise header — thumbnail, name, muscles, set counter | 3822–3846 | `ExerciseImage` + primary muscles + `n/m` badge | library | — | `SHIPPED` | `ExerciseCard.tsx:99–128` | PORT | A | — |
| 72 | Exercise header — **`ExerciseHowTo`** popup | 3833 | Inline how-to/instructions launcher | library | — | `MISSING` | no `ExerciseHowTo` in v2 | DEFER | A | L3 |
| 73 | Exercise header — assisted `−KG` badge + assisted name formatting | 3829–3836 | For pull-up/dip machines where weight = assistance | `lib/exercises` | — | `MISSING` | helpers exist (`lib/exercises.ts:2514–2543`) but are **not used** by `ExerciseCard` | PORT | A | L3 |
| 74 | Exercise header — unilateral `L/R` badge | 3837–3839 | Shown when `isUnilateral` | — | — | `MISSING` | field exists in `types/index.ts:149`, absent from workout-engine types | PORT | A | L3 |
| 75 | **Per-exercise notes button** (amber when notes exist) | 3847–3865 | Opens the exercise-notes dialog; merges persistent + per-workout notes | store | store | `MISSING` | `ExerciseEntry.notes` exists in the type; **no UI** | PORT | A | L3 |
| 76 | Exercise 3-dot — Alternating Sides toggle | 3877–3883 | Turns the set list into L/R pairs | — | store | `MISSING` | — | PORT | A | L3 |
| 77 | Exercise 3-dot — Create / **Edit** Superset | 3884–3893 | Opens superset picker | — | store | `PARTIAL` | `ExerciseCard.tsx:144–152` create only, **no edit/unpair** | PORT | A | L3 |
| 78 | Exercise 3-dot — Add Drop Set | 3894–3900 | Adds a drop row to every set of the exercise | — | store | `SHIPPED` | `ExerciseCard.tsx:153–161` → `addDropSet` | PORT | A | — |
| 79 | Exercise 3-dot — Remove Exercise (guarded) | 3902–3908 | Routes through the program-workout confirm | — | store | `PARTIAL` | `ExerciseCard.tsx:163–170` removes with **no guard** (row 122) | PORT-ADAPTED | A | L3 |
| 80 | **PB badge** (authoritative PB, with workout-history fallback) | 3913–3933 | Amber trophy `PB: {w}kg × {r}`; falls back to a history scan when `personal_bests` is sparse | `personal_bests`, history | — | `PARTIAL` | `ExerciseCard.tsx:192–197` — **no history fallback** | PORT | A | L5 |
| 81 | Previous-session badge (+ date) | 3913–3933 | Grey clock badge with last session's numbers | history | — | `SHIPPED` | `ExerciseCard.tsx:198–202` | PORT | A | — |
| 82 | **Volume comparison bar** (all-time best vs today) | 3934–3953 | Prefers `personal_bests.bestVolume`, falls back to history scan | `personal_bests`, history | — | `SHIPPED` | `ExerciseCard.tsx:203–233` | PORT | A | — |
| 83 | Sets header row (`SET / PREVIOUS / KG / REPS`) + `DURATION` swap | 3955–3970 | Column labels; swaps to DURATION for time-based exercises | — | — | `PARTIAL` | v2 has implicit column layout in `SetRow`, **no header row, no DURATION swap** | PORT | A | L3 |

### 1.12 Set rows — in-block (v1 3972–4306)

| # | Section | v1 lines | What it does | Reads | Writes | v2 status | v2 location | Verdict | Class | Lane |
|---|---|---|---|---|---|---|---|---|---|---|
| 84 | Set number / completed tick / **L-R label** for unilateral | 3984–3994 | Index, or `L`/`R` alternating, or ✓ | — | — | `PARTIAL` | `SetRow.tsx:51` index + tick; **no L/R** | PORT | A | L3 |
| 85 | Timed-set duration input | 3996–4010 | Seconds field, replaces weight/reps for stretching/cardio sets | — | store | `MISSING` | `LoggedSet.durationSeconds` exists in the type; **no input** | PORT | A | L3 |
| 86 | Timed-set inline timer + Start/Pause | 4011–4045 | Countdown with orange running state | local | local | `MISSING` | — | PORT | A | L3 |
| 87 | Previous — **tap to fill** (+ date under it) | 4049–4077 | Tapping copies previous weight×reps into the row | history | store | `SHIPPED` | `SetRow.tsx:54–80` (no date line) | PORT | A | — |
| 88 | Weight input (assisted-aware placeholder) | 4078–4100 | `step=any`, select-on-focus, clears to undefined | — | store | `SHIPPED` | `SetRow.tsx:83–112` | PORT | A | — |
| 89 | Reps input | 4101–4124 | Numeric | — | store | `SHIPPED` | `SetRow.tsx:115–139` | PORT | A | — |
| 90 | Complete button + per-set rest countdown + delete | 4125–4198 | Completing auto-starts rest (when enabled); completed rows collapse to an Undo/Delete menu | — | store | `SHIPPED` | `SetRow.tsx:142–206` | PORT | A | — |
| 91 | Per-set volume read-out | 4199–4206 | `vol: {w×r}kg` under completed rows | — | — | `SHIPPED` | `SetRow.tsx:280–287` | PORT | A | — |
| 92 | Drop-set rows — weight/reps + **complete/undo** + delete | 4207–4277 | Purple-bordered sub-rows; each drop can be individually completed | — | store | `PARTIAL` | `SetRow.tsx:209–277` has weight/reps/delete; **no per-drop complete/undo** | PORT | A | L3 |
| 93 | "Add another drop" button | 4278–4290 | Appends a drop step to this set | — | store | `MISSING` | v2's `addDropSet` adds to all sets at once, no per-set add | PORT | A | L3 |
| 94 | Add Set button (program-workout guarded) | 4291–4306 | `handleAddSetWithGuard` | — | store | `SHIPPED` | `ExerciseCard.tsx:264–265` | PORT | A | — |
| 95 | **"Add Exercise to Block" footer** — inherits the block's type | 4307–4329 | The fix for "Add Exercise prompts for block type every time" | blocks | — | `SHIPPED` | `StraightBlockCard.tsx:108–118` → `onAddExerciseToBlock(block.id)` | PORT | A | — |

### 1.13 Unblocked-exercise legacy path (v1 4330–4802)

| # | Section | v1 lines | What it does | Reads | Writes | v2 status | v2 location | Verdict | Class | Lane |
|---|---|---|---|---|---|---|---|---|---|---|
| 96 | Derived block header for exercises with no `blockId` | 4330–4391 | Reconstructs a coloured divider from `blockName`/`blockType`; circuit timing line | workout | — | `DROPPED` | v2's `blocks[]` union makes an unblocked exercise unrepresentable | DROP | A | — |
| 97 | Superset **tap-to-pair** target + "Superset with X" indicator | 4392–4421 | Card-level click completes pairing | local | store | `PARTIAL` | v2 pairs via modal (row 119); indicator exists as `SupersetCard` header | PORT-ADAPTED | A | L3 |
| 98 | Unblocked exercise header + inline `1RM` PB badge | 4423–4541 | Duplicate of row 71 for the legacy path | — | — | `DROPPED` | superseded with row 96 | DROP | A | — |
| 99 | Unblocked sets header + time hint + `SetRow` list + Add Set | 4543–4590 | Duplicate of rows 83–94 | — | — | `DROPPED` | superseded with row 96 | DROP | A | — |
| 100 | Superset group container (A1/A2 order labels) | 4597–4802 | Purple wrapper, per-member `A{n}` chips | workout | — | `PARTIAL` | `SupersetCard.tsx:53–97` renders the group; **no A1/A2 order labels** | PORT | A | L3 |
| 101 | Dead menu items: "Copy Previous", "Set Rest Timer ({n}s)" | 4694–4700 | **Rendered with no `onClick`** — inert in v1 | — | — | `DROPPED` | correctly absent | DROP | A | — |

### 1.14 Dialogs (v1 4803–6199)

| # | Section | v1 lines | What it does | Reads | Writes | v2 status | v2 location | Verdict | Class | Lane |
|---|---|---|---|---|---|---|---|---|---|---|
| 102 | Exercise modal — block-aware header + type hint | 4803–4874 | Coloured block chip, "Showing: barbell, dumbbell…" hint, `n selected` badge | blocks | — | `PARTIAL` | `page.tsx:162` plain "Add Exercise" title, no block context | PORT | A | L2 |
| 103 | Exercise modal — search | 4876–4885 | Fuse-ranked, block-filtered | library | — | `SHIPPED` | `page.tsx:163–168` | PORT | A | — |
| 104 | Exercise modal — empty-state "Create '{x}'" CTA | 4889–4904 | Only when a query matches nothing | — | — | `SHIPPED` | `page.tsx:186–195` | PORT | A | — |
| 105 | Exercise modal — result rows (animation thumb, muscles, equipment) | 4905–4954 | | library | — | `SHIPPED` | `page.tsx:171–184` | PORT | A | — |
| 106 | Exercise modal — **multi-select for circuit *and warm-up*** | 4928–5002 | Checkboxes + coloured selection + "Add N exercises to {block}" | — | store | `PARTIAL` | `page.tsx:418–424` multi-select exists **for circuit only**; warm-up is single-select | PORT | A | L2 |
| 107 | Exercise modal — **cross-trainer usage pill (`N×`)** | 4955–4978 | Times this *client* has done the exercise, across all trainers | `client_exercise_history` | — | `MISSING` | **column `times_used` does not exist** in v2 (**B-02**) | DEFER | B | L6 |
| 108 | Create-custom-exercise dialog (auto-selects the new exercise) | 5006–5029 | Name + category, persists, then adds | localStorage | localStorage | `SHIPPED` | `page.tsx:210–264` | PORT | A | — |
| 109 | **Circuit config dialog** — AMRAP / For Time / EMOM / Rounds + duration-or-rounds | 5031–5109 | 2×2 style grid with icons and descriptions; style drives countdown vs count-up | — | store | `MISSING` | v2's circuit modal (`page.tsx:388–546`) asks only exercises + rounds + rest. **No circuit style at all** | PORT | A | L4 |
| 110 | **Cardio config dialog** — activity (Run/Swim/Bike/Row/Other) × mode (Steady/Intervals/Distance) + mode inputs | 5111–5266 | Swim distance in metres; interval work/rest/rounds with a computed total | — | store | `PARTIAL` | `page.tsx:269–386` picks a cardio **exercise** (Christo's ask ✅) + minutes. **No mode, no intervals, no target distance** | PORT-ADAPTED | A | L4 |
| 111 | Block-type picker dialog (2×2 grid) | 5268–5332 | Warm-Up / Strength / Circuit / Cardio | — | — | `DROPPED` | superseded by the always-visible chip bar (rows 42–45) — **this is the fix for "prompts for block type every time"** | DROP | A | — |
| 112 | **Finish confirm dialog** ("You've completed X of Y sets") | 5334–5379 | Keep Going / Finish, disabled while saving | — | — | `MISSING` | v2 finishes on the first tap | PORT | A | L1 |
| 113 | Exit / discard dialog | 5381–5407 | Continue Workout / Discard | — | store | `SHIPPED` | `page.tsx:1261–1286` | PORT | A | — |
| 114 | **Save-changes-to-program prompt** (+ trainer-override branch + structural diff body) | 5409–5540 | Blocking Yes/No; different copy when the trainer owns the program; "or save as your own template" | `clientPrograms` | program template + notification | `MISSING` | — · **⚠ appears unreachable in v1 — see §5** | DEFER | B | L7 |
| 115 | Compact summary **dialog** (duplicate of §1.3) | 5542–5833 | Same 12 sections in a `<Dialog>` | — | — | `DROPPED` | **⚠ appears unreachable in v1 — see §5.** Do not port | DROP | A | — |
| 116 | **Rest-timer settings dialog** — auto-rest toggle, 15–300 s slider, 30/60/90/120 presets | 5834–5908 | The only place rest length is configurable | local | local | `MISSING` | v2 hard-codes 90 s (`page.tsx:911–914`) | PORT | A | L3 |
| 117 | Workout notes dialog (PT → "Trainer Notes", private framing) | 5910–5943 | Amber styling and different copy in PT mode | — | store | `PARTIAL` | inline panel `page.tsx:1084–1098`, no PT variant | PORT-ADAPTED | A | L3 |
| 118 | Exercise notes dialog (+ read-only trainer notes block) | 5945–6004 | Saves to the workout **and** to a persistent per-exercise store | store | store | `MISSING` | — | PORT | A | L3 |
| 119 | Superset picker dialog | 6006–6053 | Lists ungrouped exercises to pair with | workout | store | `SHIPPED` | `page.tsx:548–609` | PORT | A | — |
| 120 | **Save workout as template** dialog | 6055–6106 | Name + description → workout library | blocks | workout library | `MISSING` | — | DEFER | B | L4 (**B-09**) |
| 121 | **Save circuit as template** dialog | 6108–6162 | Name + description → circuit library | blocks | `saved_blocks` | `MISSING` | the entry point exists but is inert (row 52) | DEFER | B | L4 (**B-09**) |
| 122 | Remove-confirmation AlertDialog (program workouts only) | 6164–6199 | "Remove this set/exercise?" guard so mid-session slips don't dilute a trainer's program | `clientPrograms` | store | `MISSING` | v2 removes silently | DEFER | B | L7 |

### 1.15 `SetRow` sub-component (v1 6204–6458)

| # | Section | v1 lines | What it does | Reads | Writes | v2 status | v2 location | Verdict | Class | Lane |
|---|---|---|---|---|---|---|---|---|---|---|
| 123 | Set number, or `R{n}` for circuit rounds | 6249–6266 | Round-aware label | — | — | `PARTIAL` | `SetRow.tsx:51` — no `R{n}` variant | PORT | A | L4 |
| 124 | **Assisted `+`/`−` per-set toggle** | 6272–6289 | Marks the load as assistance rather than resistance (changes volume + 1RM maths) | — | store | `MISSING` | `isAssisted` handled in `lib/deriveAll.ts` but **no toggle and no field** on `LoggedSet` | PORT | A | L3 |
| 125 | Local-state weight/reps with commit-on-blur | 6290–6329 | Avoids re-render thrash while typing | — | store | `PARTIAL` | `SetRow.tsx:83–139` writes on every change | PORT-ADAPTED | A | — |
| 126 | Complete/delete, and Undo/Delete menu when completed | 6331–6380 | | — | store | `SHIPPED` | `SetRow.tsx:142–206` | PORT | A | — |
| 127 | Drop-set shaded rows (`Drop 1`, `Drop 2` …) | 6383–6433 | Orange-tinted sub-rows | — | store | `SHIPPED` | `SetRow.tsx:209–277` | PORT | A | — |
| 128 | **Planned drop-set steps ("pots")** from the builder | 6435–6455 | Read-only amber prescriptions: `DROP 1 → -20% · notes` | program | — | `MISSING` | no `dropSetSteps` concept in v2 | DEFER | A | L4 |

### 1.16 Completion pipeline (v1 1248–2364) — logic with user-visible outcomes

| # | Section | v1 lines | What it does | Reads | Writes | v2 status | v2 location | Verdict | Class | Lane |
|---|---|---|---|---|---|---|---|---|---|---|
| 129 | Complete-set → auto rest + PB detection toast | 1248–1282 | Clears other rest timers, starts this one, celebrates a genuine PB | `personal_bests` | store | `SHIPPED` | `page.tsx:821–834` (with a de-dupe guard v1 lacks) | PORT | A | — |
| 130 | `addBlock` — naming, numbering, per-type config seeding | 1030–1103 | `Circuit 2`, `Run 1`; seeds circuit/cardio config onto the block | blocks | store | `PARTIAL` | `startTypedBlock` / `addCircuitBlock` / `addCardioBlock`; **no numbering, no config** | PORT-ADAPTED | A | L4 |
| 131 | Circuit round/timer handlers (`toggle`/`reset`/`complete`/`start`/`addRound`/`finish`) | 1105–1233 | Six handlers driving §1.8 | blocks | store | `PARTIAL` | `addRound` only | PORT | A | L4 |
| 132 | Delete block cascades exercise removal | 1235–1244 | Prevents orphaned exercises | blocks | store | `SHIPPED` | `removeBlock` | PORT | A | — |
| 133 | Program-workout remove guards | 994–1028 | Routes removes through the confirm dialog | `clientPrograms` | store | `MISSING` | — | DEFER | B | L7 |
| 134 | Multi-select bulk add (circuit + warm-up) | 973–992 | Adds the whole selection, one toast | — | store | `PARTIAL` | circuit only | PORT | A | L2 |
| 135 | Drop-set + superset creation handlers | 1321–1359 | `handleAddDropSet`, `handleCreateSuperset` | — | store | `SHIPPED` | store `addDropSet` / `createSuperset` | PORT | A | — |
| 136 | Finish — block snapshot + `summarizeBlocks` | 1366–1437 | Freezes cardio/circuit state and aggregates it for the summary + AI payload | blocks | store | `PARTIAL` | `lib/summarize-blocks.ts` aggregates; **snapshot has no rounds/splits to freeze** | PORT-ADAPTED | A | L4 |
| 137 | Finish — `endWorkout` + double-submit lock + failure retry toast | 1460–1477 | Keeps the workout alive if the write fails | — | `workouts` | `SHIPPED` | store `finishWorkout` (`205–233`) + `page.tsx:952–978`; v2 adds retry (v1 had none) | PORT-ADAPTED | A | — |
| 138 | Finish — exercise-history sync (best set by e1RM) | 1485–1517 | Upserts `client_exercise_history` per exercise | — | `client_exercise_history` | `MISSING` | table exists and is **empty (0 rows)**; nothing writes it (**B-02**) | DEFER | B | L6 |
| 139 | Finish — block-performance recording (circuit/cardio) | 1519–1538 | Feeds the "BEST time" comparison | — | `blockPerformances` | `MISSING` | **no table** (**B-08**) | DEFER | B | L4 |
| 140 | Finish — program detection + structural diff | 1540–1621 | Decides whether the save-to-program prompt is warranted | `clientPrograms` | — | `MISSING` | — | DEFER | B | L7 |
| 141 | Finish — PT review status for client-finished PT sessions | 1623–1630 | Sets `reviewStatus: 'pending'` | — | workout | `MISSING` | **no column** | DEFER | B | L6 |
| 142 | Finish — PB persistence | (store) | Writes `personal_bests` | — | `personal_bests` | `PARTIAL` | `api/upsert-personal-bests.ts`; called **fire-and-forget** at `page.tsx:967–973` — violates G-11 (**B-01**) | PORT-ADAPTED | B | L1 |
| 143 | Finish — AI feedback fetch + persist to workout | 1687–1782 | `POST /api/workout-feedback`, stores `aiSummary` | API | workout | `MISSING` | no route, no column (**B-07**) | DEFER | B | L8 |
| 144 | Close — persist edited session times | 1787–1804 | Recomputes duration from edited start/end | — | workout | `MISSING` | **no `duration` column** (**B-03**) | DEFER | B | L7 |
| 145 | Close — private / shared / trainer notes persistence | 1805–1818 | Three distinct note fields | — | workout | `PARTIAL` | one `workouts.notes` column (**B-05**) | PORT-ADAPTED | B | L7 |
| 146 | Close — share-with-trainer persist + notify | 1820–1864 | Sets `sharedWithTrainerId`, notifies the trainer with a deep link | — | workout + notification | `MISSING` | **no column** (**B-05**) | DEFER | B | L7 |
| 147 | Close — share-to-feed post | 1866–1877 | Creates a social post | — | social store | `DROPPED` | **no table**; flag off — same product-scope call as row 25 | DROP | B | — |
| 148 | Close — session paid → package/payment/counter updates + "session counted" toast | 1879–1956 | Increments package usage, records a payment, confirms the lifetime count | `trainerStore` | `client_payments`, counters | `MISSING` | schema supports it (`client_sessions.source='pt_completion'`, `workout_id` FK) but **nothing writes it** (**B-04**) | DEFER | B | L6 |
| 149 | Close — save program changes back to template + trainer notification | 1958–2213 | 255 lines: regroups exercises into blocks, writes localStorage + store, computes diff, notifies | `clientPrograms` | program + notification | `MISSING` | — | DEFER | B | L7 |
| 150 | Close — PT awaiting-review notification | 2215–2227 | Tells the trainer to review and release | — | notification | `MISSING` | — | DEFER | B | L6 |
| 151 | Close — client-workout-complete trainer notification | 2229–2266 | "X completed workout (& edited program)" | `clientPrograms` | notification | `MISSING` | — | DEFER | B | L7 |
| 152 | Close — state reset + redirect to `/workout` | 2268–2286 | Clears every summary flag | — | store | `SHIPPED` | `page.tsx:985` | PORT | A | — |
| 153 | Cancel workout | 2288–2292 | Clears and returns | — | store | `SHIPPED` | `page.tsx:982–986` | PORT | A | — |
| 154 | Save-workout / save-circuit handlers | 2294–2364 | Convert live blocks into template shapes | blocks | libraries | `MISSING` | (**B-09**) | DEFER | B | L4 |

---

## 2. Completeness notes for every `SHIPPED` / `PARTIAL` row

Only the rows where v2 differs from v1 in a way a Phase 2 lane must know about. Rows marked `SHIPPED`
with no note here are believed to be full parity.

**#2 Persist flush — `PARTIAL`.** v2 is arguably *safer* than v1: state lives in IndexedDB
(`active-workout-store.ts:717–735`) rather than localStorage, and `partialize` deliberately excludes
`previousByExerciseId` to avoid cross-account leakage. **MISSING vs v1:** no `visibilitychange` /
`beforeunload` flush. IndexedDB writes are async, so a tab-discard mid-write can still lose the last
mutation — the exact Sev-1 v1 fixed in v17-D1. **Also: the persist key is not user-scoped** — see B-10.

**#4 Block init — `PARTIAL`.** `startFromTemplate` seeds `blocks[]`, but v1's
`deriveCardioBlockFields` + `parseDurationToSeconds` (595–693, ~100 lines) have no v2 counterpart.
Consequence: a cardio block authored in the program builder with `targetTime: "20:00"` arrives in v2
with no target at all. This was a named v1 bug ("none of the timed/distance/interval info translates
to the active workout") that v2 will re-introduce the moment the builder emits cardio.

**#14 Summary compact header — `PARTIAL`.** No PT badge, because v2 has no PT mode (B-11).

**#15 Session Time — `PARTIAL`.** Displays start→end. **MISSING vs v1:** the Edit affordance and the
two time inputs. Blocked on B-03 — there is nowhere to persist a corrected duration.

**#18 BlockMemoryCard — `PARTIAL`.** The component is present and good (it is v2-original work, 360
lines). But `CircuitMemoryCard` wants round times and `CardioMemoryCard` wants splits and pace, and
v2's model records neither (rows 60, 67). Today it renders a near-empty card. **This is the clearest
example of why the line-count ratio misleads: the code exists, the feature does not.**

**#21 AI Coach — `STUBBED`.** `WorkoutSummary.tsx:172–199` reproduces v1's *fallback* strings
(the ones v1 shows when the API call fails) and presents them under an "AI Coach" heading. There is no
`/api/workout-feedback` route in v2 and nothing is persisted. A user sees a canned sentence labelled as
AI. **Rendered-but-not-real, so it fails the SHIPPED bar.**

**#26 Private notes — `PARTIAL`.** v2 has one notes surface (in-session panel → `workouts.notes`).
v1 has three fields with different visibility (`privateNotes`, `sharedNotes`, `trainerNotes`). Porting
the UI without B-05 would give the user a "private" label over a column the trainer can read via
`workouts_select_self_or_trainer` — **worse than not shipping it.**

**#29 / #31 Header PT theming — `PARTIAL`.** v2 renders one sky-gradient photo. v1 switches photo and
gradient to rose for PT sessions, matching the mode-theming rule in `components/AGENTS.md`.

**#35 Finish button — `PARTIAL`.** Wired and correct, but there is no confirmation step (row 112), so a
mis-tap ends the session. v2 does have a double-submit lock and a failure alert, which v1 also has.

**#37 Notes button — `SHIPPED` (adapted).** v2 uses an inline expanding panel instead of a dialog. Fine
— but it loses v1's PT-aware copy ("Trainer Notes … client won't see these").

**#38 Rest chip — `PARTIAL`.** `toggleRestTimer()` starts a hard-coded 90 s timer. v1's chip displays
the configured value or `Off` and opens the settings dialog. **Inert-adjacent:** the chip looks
configurable and is not.

**#51 Block subtitle — `PARTIAL`.** v2's subtitles are static (`"2 exercises • Add exercises below"`).
v1's are live: a running cardio block's subtitle counts down.

**#52 Save to Block Library — `STUBBED`.** The menu item renders in all four block cards and does
nothing; every card carries a literal TODO (`StraightBlockCard.tsx:57`, `CircuitCard.tsx:71`,
`CardioCard.tsx:34`, `SupersetCard.tsx:48`). **Four dead controls on the busiest screen in the app.**
Per the brief's rule this is a fail, not a partial. Either wire it to `saved_blocks` (the table exists,
with the right `block_type` CHECK) or remove the item.

**#54 Circuit BEST time — `PARTIAL`.** `CircuitCard.tsx:102–107` renders a BEST readout from local
component state, so it resets on unmount and can never show a real personal best. Cosmetically present,
functionally impossible (B-08).

**#59 Circuit stations — `PARTIAL`.** v2 renders a full `ExerciseCard` per station. v1 renders a
compact one-line station row (number, image, how-to, weight, reps, remove) because during a circuit you
are not logging sets, you are cycling stations. Different interaction model — a `PORT-ADAPTED`
decision that should be made deliberately, not by default.

**#61 Add Round — `PARTIAL`.** v2 appends a set to every station (correct for the data model). v1 also
bumps the round *target* and clears the complete flag. Both are defensible; note the difference.

**#77 Create Superset — `PARTIAL`.** Create works. v1 also offers Edit/Remove-from-superset from the
same menu (3884–3893, 4514–4530); v2 has no way to unpair once paired.

**#79 Remove Exercise — `PARTIAL`.** Works, but unguarded. On a trainer-assigned program workout v1
confirms first (row 122).

**#80 PB badge — `PARTIAL`.** Present, but without v1's v15-D7 fallback: when `personal_bests` has no
row (sparse or bulk-imported users) v1 derives a PB from workout history so the trophy still shows.
v2 shows nothing. With `personal_bests` at **1 row** in the live v2 DB, this fallback is what makes the
badge visible at all in practice.

**#83 Sets header — `PARTIAL`.** No column header row and no `DURATION` swap for time-based exercises.

**#92 Drop-set rows — `PARTIAL`.** Weight/reps/delete are there; per-drop complete/undo is not, so a
drop set can be entered but never checked off.

**#100 Superset group — `PARTIAL`.** `SupersetCard` groups correctly but omits the `A1`/`A2` ordering
chips that tell the athlete which exercise comes first.

**#106 Multi-select — `PARTIAL`.** Circuit only. v1 deliberately extended multi-select to warm-ups
(2026-05-11, "warmups are also multi-select") because bulk-adding a mobility flow one exercise at a
time is painful. v2 re-introduces that friction.

**#110 Cardio config — `PARTIAL`, and this is the one to read carefully.** v2 **does** let the user
select a cardio exercise from the library — **Christo's ask #6 is satisfied**. What is missing is
everything else v1's dialog does: activity type, and the three **modes** (Steady / Intervals /
Distance) with their inputs. Because mode is absent, rows 63–68 (the entire cardio runtime) have
nothing to drive them.

**#123 `R{n}` set label — `PARTIAL`.** `LoggedSet.roundIndex` exists in the type; `SetRow` never reads
it, so circuit sets show `1, 2, 3…` instead of `R1, R2, R3`.

**#125 Commit-on-blur — `PARTIAL`.** A deliberate v2 simplification. Worth measuring on a real phone
before calling it fine; v1 added local state specifically to stop keystroke lag.

**#130 addBlock — `PARTIAL`.** No `Circuit 2` / `Run 1` auto-numbering, so multiple blocks of a type
are indistinguishable in the list and in history.

**#136 Block snapshot — `PARTIAL`.** `summarize-blocks.ts` is a faithful port of `summarizeBlocks`, but
it can only aggregate what the model holds. No rounds-completed array, no splits → the aggregate is
mostly zeroes for non-strength work.

**#137 Finish pipeline — `SHIPPED`, and better than v1.** v2 routes the workout insert through
`dataSyncPersist` → `withRetry` (3 attempts, exponential backoff) → Sentry → offline queue. v1 had a
single attempt and a toast. **Do not regress this while porting.** The one exception is the PB write —
see B-01.

**#142 PB persistence — `PARTIAL`.** See **B-01**. This is the highest-severity finding in the file.

---

## 3. Blockers

Each verified against `supabase/migrations/**` **and** the live v2 DB (`igagmdkdzjkxrwnyvgqk`,
read-only). `src/types/database.ts` was not trusted as a source — though for the workout tables it
happens to match.

| # | Blocker | Evidence | Blocks rows | Severity |
|---|---|---|---|---|
| **B-01** | **The personal-bests write is fire-and-forget.** `page.tsx:967–973`: `void upsertPersonalBests(...).catch(err => console.error(...))`. The comment says "don't block summary UI". If it fails, the user is told nothing and the PB is lost. | `page.tsx:967–973` | 142, 80 | **HIGH.** Direct violation of the always-on `await-write-pattern` rule and G-11. The brief says *"v1's PB write was fire-and-forget; that is a bug, not a pattern to port"* — **v2 has already ported the bug.** The underlying `upsertPersonalBests` *is* retry-wrapped; only the call site is unawaited. Cheap to fix. |
| **B-02** | **`client_exercise_history` has no `times_used` and no `block_type`.** Live columns: `id, user_id, exercise_id, exercise_name, last_performed_at, last_weight, last_reps, created_at, updated_at`. Table has **0 rows** and no app code reads or writes it. | live DB | 5, 107, 138 | MEDIUM — needs a migration + a write in the finish pipeline. |
| **B-03** | **`workouts` has no `duration` column.** Live columns: `id, user_id, name, performed_at, total_volume, exercises (jsonb), notes, created_at, updated_at`. No `duration`, no `start_time`/`end_time`. | live DB | 15, 144 | MEDIUM — v2 currently derives duration from a runtime snapshot that is discarded on save, so **the summary's Duration tile cannot be reproduced when re-opening a past workout.** |
| **B-04** | **Nothing writes `client_sessions` on workout completion.** The schema *does* support it (`client_sessions.workout_id` FK, `source` CHECK includes `'pt_completion'`, and a partial unique index `client_sessions_dedupe_workout` already exists to prevent double-counting). There is **no trigger** on `workouts` — verified via `pg_trigger` (only `workouts_set_updated_at`). So it must be an explicit app write. | live DB, `00016:23–46` | 23, 148 | MEDIUM — schema-ready, app-missing. Interacts with the single-session-count-authority rule from P-06. |
| **B-05** | **No note-visibility columns.** `workouts.notes` is the only one. No `private_notes`, `shared_notes`, `trainer_notes`, `shared_with_trainer_id`. Note that `workouts_select_self_or_trainer` lets a connected trainer read `notes` — so today's single field is effectively *shared*, and labelling it "private" would be a misstatement to the user. | live DB | 24, 26, 27, 145, 146 | MEDIUM, with a **privacy edge** — see §5. |
| **B-06** | **No `medals`, `achievements` or `strength_ratings` table.** 15 tables total in `public`. `lib/medals.ts` and `lib/strengthRating.ts` are unimported; flags `medals:false`, `strengthRating:false`. | live DB, `feature-flags.ts` | 20, 22 | LOW (deliberately deferred product surface) — but it is a **schema** lane, not a flag flip. |
| **B-07** | **No AI feedback route or column.** No `/api/workout-feedback` in v2; no `ai_summary` column. | repo, live DB | 21, 143 | LOW — but row 21 is currently *stubbed*, which is worse than missing. |
| **B-08** | **No block-performance storage.** No table; `CircuitCard`'s BEST time is local state. | live DB | 54, 139 | LOW. |
| **B-09** | **No workout-template or circuit-template library.** `saved_blocks` exists (with `block_type` CHECK `straight/superset/circuit/cardio`) and is the natural home for row 121; there is no equivalent for whole workouts (row 120) — `saved_programs` is trainer-owned and program-shaped. | live DB, `00009` | 52, 120, 121, 154 | MEDIUM — row 52 is a live dead control today. |
| **B-10** | **The active-workout persist key is not user-scoped.** `active-workout-store.ts:718`: `name: 'catalift-active-workout'`, with a literal TODO at :717 (*"user-scoped via userScopedKey when auth is wired"*). Auth **is** wired. | store `717–718` | 2, all persistence | **HIGH.** Violates the always-on `user-scoped-keys` rule. Two accounts on one device share one in-progress workout — the exact cross-account leak class the rule was written for. Pre-existing, not introduced by this port, but it sits under every row here. |
| **B-11** | **A trainer cannot save a workout for a client — RLS forbids it.** Live policy `workouts_insert_own`: `WITH CHECK (user_id = (SELECT auth.uid()))`. A PT session means `workouts.user_id = clientId` while `auth.uid()` is the trainer → **the insert is rejected**. `personal_bests` is identical (`pb_insert_own`). And `workouts` has no `assigned_by`/`trainer_id` column to record who logged it. | live DB `pg_policies` | 3, 12, 23, 32, 141, 148, 150 + the whole PT half of this screen | **HIGH — this is the gating blocker.** |

### B-11 in full — the finding that reorders the lane plan

Every PT-session row in this inventory (12, 23, 32, 141, 148, 150, plus the PT variants of 14, 29, 31)
is downstream of one fact: **v2's RLS makes trainer-logged workouts impossible.**

```
workouts_insert_own      INSERT   WITH CHECK (user_id = (SELECT auth.uid()))
pb_insert_own            INSERT   WITH CHECK (user_id = (SELECT auth.uid()))
client_sessions_trainer_all  ALL  USING/WITH CHECK (trainer_id = auth.uid())
```

Three consequences, all verified rather than inferred:

1. **Trainer logs for client → blocked.** Needs either an `INSERT` policy extended with
   `public.are_connected(auth.uid(), user_id)` (the same helper the `SELECT` policies already use), or
   a `SECURITY DEFINER` RPC. This is a Class-B decision with real authz weight — a trainer writing rows
   owned by a client is exactly the kind of thing that should not be waved through.
2. **Attribution is unrepresentable.** Even if the insert were allowed, there is no column saying a
   trainer logged it. `client_sessions.workout_id` gives an indirect link, but `workouts` itself cannot
   distinguish a PT session from a solo session — so row 32's PT/Solo pill has no source of truth.
3. **Client-finishes-PT is blocked in the other direction.** Row 12's flow has the *client* insert the
   workout (fine) but then something must create the `client_sessions` row, and
   `client_sessions_trainer_all` requires `trainer_id = auth.uid()`. The client cannot. There is no
   client-side INSERT policy.

**Nothing in the PT half of this screen should be scheduled until B-11 has a designed answer.** Note
this is not a regression: v2 has simply never had PT sessions. But four of Christo's nine asks touch
the PT surface, so it cannot be quietly deferred either.

---

## 4. Proposed lane split

Sequenced so each lane is independently shippable and reviewable. **No lane is "port the rest".** The
largest is ~10 rows.

| Lane | Scope | Rows | Class | Depends on |
|---|---|---|---|---|
| **L0 — correctness gate** ⟵ **gates everything** | B-01 (await the PB write), B-10 (user-scope the persist key). No UI. | 142 | **B** | — |
| **L1 — finish/discard integrity** | Finish confirm dialog, progress bar, persist flush on hide/unload | 35, 40, 112, 2 | A | L0 |
| **L2 — add-block & picker parity** | Chip lit/reuse behaviour, block-aware picker header, warm-up multi-select, entry-flow first block | 6, 42, 43, 102, 106, 134 | A | L1 |
| **L3 — the set-logging surface** | Rest settings + banner + ±15/Skip, timed sets, unilateral, assisted, exercise notes, how-to, drop-set completion, sets header, superset edit/unpair | 8, 34, 38, 47, 48, 70, 72–77, 79, 83–86, 92, 93, 97, 100, 116–118, 123, 124 | A | L1 |
| **L4 — circuit & cardio runtime** ⟵ *the "way different" lane* | Circuit config (styles), cardio config (modes), full circuit + cardio runtimes, block subtitles, save-to-library | 4, 44, 45, 51, 52, 55–68, 109, 110, 120, 121, 128, 130, 131, 136, 139, 154 | A + B | L2, B-08, B-09 |
| **L5 — summary fidelity** | PB history fallback, PT badge, BlockMemoryCard data | 14, 18, 80 | A | L4 |
| **L6 — PT sessions** | Everything trainer-side | 3, 5, 12, 23, 29, 31, 32, 107, 138, 141, 148, 150 | **B** | **B-11 design decision** |
| **L7 — program round-trip & note visibility** | Save-to-program prompt, remove guards, note-visibility schema, session-time editing, share-with-trainer | 15, 24, 26, 27, 114, 122, 133, 140, 144–146, 149, 151 | **B** | B-03, B-05, §5 |
| **L8 — gamification** | Medals, strength rating, real AI coach (or **de-stub** row 21) | 20, 21, 22, 143 | **B** | B-06, B-07 |

**L0 gates the others, and it should be first even though it is the smallest.** Both items are
always-on-rule violations sitting under every other row: the PB write can silently drop an athlete's
personal best, and the persist key can hand one athlete's in-progress workout to the next person who
logs in on the same phone. Any lane that touches this screen without fixing them multiplies the blast
radius. Neither needs a design decision, both are hours not days.

**L4 is the lane that answers Christo's actual complaint** and should be the first *feature* lane.
Items 2, 5 and 6 of his list all point at circuit/cardio, and it is the largest single cluster of
`MISSING` rows.

**L6 must not start before B-11 is decided.** It is the only lane blocked on something that is not
code.

---

## 5. Known-bug check

Checked before proposing `PORT` on any row.

**5.1 — v1's save-to-program prompt (row 114) and compact summary dialog (row 115) appear to be
unreachable. Do not port either without a runtime check.**

Static trace:

```
2368  if (!activeWorkout && !completedWorkoutData) return null;
2380  if (!activeWorkout && completedWorkoutData)  → returns the FULL-SCREEN summary
2920  return ( … main screen … )   ← only reached while activeWorkout is non-null
5421      <Dialog open={showSaveProgramPrompt}>   ← inside the main return
5543      <Dialog open={showSummary}>             ← inside the main return
```

`handleFinishWorkout` awaits `endWorkout` (1467), which nulls `activeWorkout` on success; it then sets
`completedWorkoutData` (1637) and only afterwards sets `showSaveProgramPrompt` (1681) or `showSummary`
(1684). By that point the 2380 branch owns the render, so neither dialog can mount. Note the 2380
branch does **not** test `showSummary` — the full-screen summary shows regardless.

Circumstantial support: the git history on this file is a long chain of attempts to make exactly this
modal appear — D15 Part B, D16 Part A, D17 Parts 3 & 4, v19-fix-11, and the file's last commit
`748b1a0` *"fix(v19-fix-11b): modal fires on structural change only"*. A modal that cannot mount would
produce precisely that pattern of repeated "it still doesn't fire" fixes.

**I could not run v1, so I am not calling this proven.** But two rows depend on it:

- Row 115 (292 lines) is a duplicate of the full-screen summary either way → `DROP` regardless.
- Row 114 is one of Christo's D15/D17 asks. **Christo should confirm on the live v1 app** (finish a
  program workout after adding an exercise; does the prompt appear?) before L7 ports it. If it never
  fired in production, then it is an unshipped design, not proven UX — and porting it is a product
  decision, not a parity task.

**5.2 — Two v1 controls are inert and must not be ported.** `Copy Previous` and
`Set Rest Timer ({n}s)` (4694–4700) are rendered `DropdownMenuItem`s with **no `onClick`**. Row 101.

**5.3 — Do not port v1's PB write pattern.** v1 fires PB persistence without awaiting. v2 already
copied this (**B-01**). Fix rather than propagate.

**5.4 — Do not port v1's localStorage program writes.** Row 149 writes the program template to
`localStorage['apex-program-library-{userId}']` and to a Zustand store, with the Supabase row as an
afterthought. v2's equivalent must go to `client_programs` / `saved_programs` with `await` + retry.

**5.5 — Privacy edge on rows 24/26/27.** Shipping a textarea labelled "🔒 Private notes (only you)"
against `workouts.notes` would be **actively misleading**: `workouts_select_self_or_trainer` grants any
connected trainer read access. Either land B-05 first or do not use the word "private".

**5.6 — G-13 tension, noted not fixed (per the brief).** v2 stores `workouts.total_volume` as a numeric
column (live DB confirms), which sits against `workout-engine/AGENTS.md` rule 1. The *computation* is
correct — `lib/volume.ts:45` sums across blocks and is explicitly commented "SUM across blocks — never
MAX". Recomputed on every write in `serialize.ts:98`. **No row in this inventory proposes changing it.**

**5.7 — Drop sets are correctly excluded from PB/e1RM** in v2 (`types.ts:16–18`;
`history-stats.ts:46–52` maps sets without `drops`). Rows 92/93/127/128 must preserve that.

**5.8 — The legacy upgrader must not be bypassed.** `serialize.ts:37–76` (`upgradeBlock`/`upgradeBlocks`)
converts legacy `{kind:"straight", exercise:E}` into `{blockType, exercises:[E]}`, and is invoked on
rehydrate (`store:751`), on history read (`fetch-history.ts:26, 88, 128`) and in `fromRow`
(`serialize.ts:106`). Any lane touching the block model routes through it.

---

## 6. Do-not-port list

| v1 pattern | Why | v2 replacement |
|---|---|---|
| Flat `exercises[]` with `blockId`/`blockName` string tags (rows 96, 98, 99) | Unblocked exercises and string-matched block headers are unrepresentable and error-prone | v2's `blocks[]` discriminated union (`types.ts:76–97`) — **keep** |
| Compact summary `<Dialog>` (5542–5833) | Duplicate of the full-screen summary; appears unreachable (§5.1) | The single `WorkoutSummary` surface |
| Block-type picker dialog (5268–5332) | Extra tap; the source of "Add Exercise prompts for block type every time" | Always-visible chip bar (rows 41–45) |
| Superset pairing-mode banner + tap-to-pair (3217–3239, 4392–4421) | Whole-screen modal state that is easy to get stuck in | `SupersetPicker` modal (`page.tsx:548–609`) |
| `Copy Previous` / `Set Rest Timer` menu items (4694–4700) | Inert in v1 | Omit, or implement properly |
| Fire-and-forget PB write | G-11 | `await` + `dataSyncPersist` retry (**B-01**) |
| `localStorage['apex-program-library-*']` as program source of truth (2022–2056) | v1's localStorage-first data model | `client_programs` / `saved_programs` with awaited writes |
| `localStorage['apex-users']` lookup for the trainer's display name (2840–2843) | Unscoped global key — the `user-scoped-keys` rule exists because of this key | Query `users`, or a scoped cache |
| Bare `catch {}` around notification dispatch (2226, 2265) | Silent failure | Log to Sentry, surface to the user |
| Toast-only failure handling on finish | v1's single-attempt write | Already replaced by `withRetry` + offline queue — **keep v2's** |

---

## 7. Row → PR ledger

| Lane | PR | Rows flipped | Merged |
|---|---|---|---|
| L0 | — | — | — |
| L1 | — | — | — |
| L2 | — | — | — |
| L3 | — | — | — |
| L4 | — | — | — |
| L5 | — | — | — |
| L6 | — | — | — |
| L7 | — | — | — |
| L8 | — | — | — |

---

## 8. Observations, not acted on

**Out-of-scope findings**

1. **`users` table drift.** `src/types/database.ts:715–728` declares `gender`, `height_cm`, `username`,
   `weight_kg`; no migration creates them. Same class as the `invitations` drift fixed in `00013`.
   Not a workout issue — flagging for whoever owns schema hygiene.
2. **The live v2 DB has 3 workouts and 1 personal best.** This screen has essentially never been used.
   Any "it works" claim about v2's workout flow rests on tests, not usage.
3. **v2's test coverage here is genuinely strong** — ~2,000 lines across 17 files, including
   `active-workout-store.dropset-superset.test.ts` and `active-workout-store.v1-parity.test.ts`. The
   regression risk for L1–L5 is lower than the section count suggests.
4. **`BlockCard.tsx`, `DayBuilder.tsx`, `ExerciseEditDialog.tsx`, `ExerciseRow.tsx`** live in
   `workout-engine/components/` but are program-builder components, not active-workout ones. They
   inflate the "2,524 lines of components" figure for this screen by ~570 lines. Relevant to the
   `program/builder` inventory, not this one.

**Opinions (mine, not findings)**

5. **v2's `CardioCard` may be the better design and should not be discarded reflexively.** v1's cardio
   block is a live stopwatch with splits and interval phases — a competitor to Strava that nobody asked
   this app to be. v2's five summary fields (row 69) capture what a strength coach actually needs.
   The brief says port, don't redesign, so I am **not** proposing a deviation — but L4 should be
   dispatched knowing it is about to build a run tracker, and Christo should confirm he wants one.
   His stated complaint was that cardio blocks *"lack a select-cardio-exercise option"*, which v2 has
   already fixed.
6. **`StraightBlockType` is `warmup | strength | cooldown`** — cooldown exists in the model with no UI
   affordance to create one. Either add a chip or drop the variant.
7. **Row 21 should probably be de-stubbed before it is built.** Presenting canned strings under an
   "AI Coach" heading is the kind of thing that erodes trust when a user notices. Removing the panel
   is a five-minute change; L8 is a long way off.
