# .pipeline/v2-workout-w2a/review.md — Stage 4 (REVIEW)

**Reviewer:** command-center Cascade (conductor) · **Date:** 2026-06-26
**PR:** #13 `workout-w2a-straight-set-execution` · **Commit:** `78fde01`
**Verdict:** **REQUEST CHANGES** (core loop is solid; 2 must-fix Class-A items + 1 tracked Class-B deferral)

---

## Summary

The core set-logging loop is **well-built and a faithful v1 port** (G-19). The store's set
actions, the SUM-volume + serialize seam, the await/retry persist, and the SetRow/ExerciseCard
JSX all match the spec. tsc/lint/126-tests green. The findings below are mostly the consequence
of Forge **correctly refusing to touch Class B (`auth/**`)** — but they must be tracked, and two
non-Class-B items should be fixed before merge.

---

## What's correct (verified)

- **G-10** — `newId()` (uuid v4) for workout/block/entry/set ids throughout the store. ✓
- **G-13** — `finishWorkout` calls `computeTotalVolume(blocks)` (SUM) before persist. ✓
- **G-11** — `api/persist.ts` routes through `data-sync` `persist()` (await + retry + offline enqueue); `finishWorkout` keeps `activeWorkout` on failure for retry. ✓
- **G-19** — `SetRow.tsx` + `ExerciseCard.tsx` are verbatim ports of v1 `active/page.tsx` JSX; only the data source changed (props/store). ✓
- **Block adaptation** — flat v1 `exercises[]` → v2 single `straight` block per exercise, per spec. ✓
- **Tests** — 12 new store unit tests + e2e; w1 tests updated for the backward-compatible `setNumber` add. ✓

---

## Findings

### [MUST-FIX · Class A] F1 — Exercise picker hardcodes `'stub-exercise-id'`
`page.tsx:30` — `onAdd({ exerciseId: 'stub-exercise-id', exerciseName: search.trim() })`.
Every added exercise gets the **same** `exerciseId`. This silently breaks per-exercise volume,
PB, and history downstream (they key on `exerciseId`). The spec asked for "a simple text input +
search against `src/lib/exercises.ts`". **Fix:** wire the picker to the real exercise library so
each exercise carries its true id. (Not Class B — the exercise library is plain content.)

### [MUST-FIX · Class A] F2 — Persist uses raw `localStorage` + an unscoped key (G-03)
`active-workout-store.ts:255-256` — `name: 'catalift-active-workout'` + `createJSONStorage(() => localStorage)`.
Two problems:
1. **G-03 violation:** the in-progress workout payload competes with the Supabase auth token for
   the localStorage quota — this is the exact INC-003 failure mode (cache eviction → anon role →
   42501). `src/lib/storage.ts` ALREADY exports `getIdbItem`/`setIdbItem` for exactly this.
2. **Unscoped key:** `storage.ts` explicitly mandates `userScopedKey(resource, userId)` "to avoid
   unscoped global caches." A shared-device second user could collide with the first's workout.
**Fix:** back the persist store with the IndexedDB helpers from `lib/storage.ts`, keyed via
`userScopedKey('active-workout', userId)`. The `// TODO` in the code already acknowledges this.

### [TRACKED DEFERRAL · Class B — do NOT fix here] F3 — Auth is stubbed; `userId` is fake
`page.tsx:92` — `stubUser = { id: 'stub-user-id' }`; the page never calls `startWorkout({ userId })`
with a real id. Consequence: **G-01 is NOT satisfied end-to-end** and `finishWorkout` would fail
RLS on the real DB (good — fake user_id can't write). Forge was **right** not to touch `auth/**`
(Class B). This is an accepted deferral: the screen cannot go live until the auth-integration wave
wires `useSession` → `startWorkout({ userId: session.user.id })`. **Action:** tracked as a
follow-up; NOT a fix for this PR. Verify G-01 at that wave.

### [MINOR · Class A] F4 — Workout timer never advances
`tickTimer` exists in the store but no `setInterval` in `page.tsx` calls it, so the header timer
stays `0:00`. **Fix:** add a `useEffect` interval calling `tickTimer()` while `timerRunning`, or
remove the dead display until a later wave.

### [MINOR · acceptable] F5 — `alert()` for save failure
`page.tsx:123` uses `alert()` where v1/spec used a toast. Acceptable w2a stub; upgrade when the
toast system lands.

---

## Required before merge

```
[ ] F1 — wire exercise picker to src/lib/exercises.ts (no more shared stub-exercise-id)
[ ] F2 — persist via lib/storage.ts IndexedDB + userScopedKey (G-03; drop raw localStorage)
[ ] F4 — tick the timer (or remove the dead display)
[ ] F3 — (no code) record the auth-wiring deferral as a follow-up task; G-01 verified at auth wave
```

F1/F2/F4 are Class A → re-dispatch to Forge. F3 is a tracked note only. Once F1/F2/F4 land and
gates stay green, this is an **APPROVE** (Class A → Christo merges, no sign-off needed).

## Cross-references
- Spec → `.pipeline/v2-workout-w2a/spec.md`
- Build → `.pipeline/v2-workout-w2a/changes.md`
- Guardrails → `plans/v2_guardrails.md` (G-01, G-03, G-10, G-11, G-13, G-19)
