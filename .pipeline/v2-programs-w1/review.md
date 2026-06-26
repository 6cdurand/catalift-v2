# v2-programs-w1 — Stage 4 (REVIEW)

> Reviewer: command-center Cascade (read-only diff review via GitHub MCP).
> Date: 2026-06-26. Verdict: **APPROVE** — ready for Christo's sign-off to apply migration + merge.

## Verdict: APPROVE

The code is clean, well-structured, and matches the spec. All guardrails met except
G-07 (migration application — deferred to sign-off per Option A) and G-10 (uuidv4
minting — deferred to w2 UI, correct boundary). No blocking issues found.

**This is a Class B PR (schema migration + data layer). It needs Christo's yes before
the migration is applied and the PR is merged.** A green review is the first gate, not
the last.

---

## What was reviewed

All 17 files in the PR diff:
- `supabase/migrations/20260626194600_00007_programs.sql` — migration SQL
- `src/types/database.ts` — hand-written generated types (2 new tables)
- `src/features/programs/types.ts` — ported v1 domain types
- `src/features/programs/lib/get-next-workout.ts` — pure next-workout resolver + sanitize
- `src/features/programs/lib/serialize.ts` — row ↔ domain mapping
- `src/features/programs/store.ts` — Zustand store (MERGE hydrate, no persist)
- `src/features/programs/api/{assign,save-template,fetch,delete,update}.ts` — write/read modules
- `src/features/programs/index.ts` — public API barrel
- `src/features/programs/__tests__/{get-next-workout,programs-store,sanitize-program-for-save}.test.ts` — 14 tests
- `.pipeline/v2-programs-w1/{spec.md,changes.md}` — pipeline artifacts

---

## Findings

### Migration SQL — clean
- `saved_programs` + `client_programs` with proper RLS: `trainer_id = auth.uid()` for
  trainer (FOR ALL), `client_id = auth.uid()` for client (FOR SELECT only). ✓ G-01, G-05
- `updated_at` triggers added (beyond spec — good, matches repo convention).
- Rollback header included. Indexes on trainer_id, client_id, active status.
- No `USING(true)` policies. No `auth.role() = 'authenticated'` shortcuts.

### get-next-workout.ts — correct
- Pure function, no store access. Takes program + completion state as args. ✓
- BUG-001 fix (fixed-day): anchors to `todayName` via `scheduledDay`, not "first uncompleted". ✓
- BUG-010 fix (flexible): advances from `lastCompleted + 1` with modulo wrap, skips
  completed/locked. ✓
- `sanitizeProgramForSave` strips `scheduledDay` from flexible programs at write time. ✓
- `isExpired` logic: `endDate < now && !autoRepeat`. ✓
- Fallback: first uncompleted → wraps to 0 if all done. ✓

### serialize.ts — clean
- `rowToClientProgram` correctly uses scalar columns (id, status, dates,
  next_workout_index) as authoritative on read, falls back to `program_data` snapshot
  for structural fields (weeklyPlan, phase, goal, etc.). This is the right design —
  assignments are snapshots, not live links to the template.
- `clientProgramToRow` stores the full ClientProgram in `program_data` + maps scalars
  to columns. ✓

### store.ts — clean
- Plain Zustand `create`, no persist middleware. ✓ G-16
- `hydrateSavedPrograms` / `hydrateClientPrograms` use `mergeById` (MERGE, not REPLACE). ✓ G-09
- `reset()` for logout. ✓

### API modules — clean
- All writes (`save-template`, `assign`, `delete`, `update`) routed through `persist`
  (await + retry + rollback). ✓ G-11
- Reads (`fetch`) are user-scoped (`eq("trainer_id", trainerId)` / `eq("client_id", clientId)`). ✓ G-12
- `assignProgramToClient` calls `sanitizeProgramForSave` before writing. ✓
- `updateClientProgramProgress` updates only scalar columns (next_workout_index, status,
  end_date) — not `program_data`. To update structural fields, re-assign via
  `assignProgramToClient` (upsert). Acceptable for w1.

### Tests — complete coverage
- `get-next-workout.test.ts`: 10 cases matching spec exactly (fixed-today, fixed-today-done,
  fixed-rest-day, fixed-all-done, flexible-clean-cycle, flexible-partial, flexible-stray-weekday,
  expired-no-autorepeat, expired-autorepeat, empty-plan). ✓
- `sanitize-program-for-save.test.ts`: 2 cases (flexible-strips-weekday, fixed-keeps-weekday). ✓
- `programs-store.test.ts`: 2 cases (hydrate-merge keeps local-only, hydrate-empty doesn't
  wipe). ✓ G-09 regression tests.

### Guardrails checklist
```
[x] G-01 identity: trainer_id = auth.uid() directly — no canonical_user_id
[x] G-05 RLS: scoped policies, no USING(true)
[ ] G-07 get_advisors(security) — DEFERRED to sign-off (Option A) ★
[x] G-09 hydration MERGES by id — tested
[~] G-10 uuidv4 minting — deferred to w2 UI (API accepts caller-provided ids) — acceptable
[x] G-11 writes await + retry via persist()
[x] G-12 reads user-scoped + matching hydrate
[x] G-15 next-day logic correct — 10 unit tests
[x] G-16 separate store per resource
[x] G-19 types ported verbatim
[x] NO localStorage (grep clean)
[x] NO canonical_user_id (grep clean)
[x] CI green (tsc + lint + unit + e2e)
```

---

## Notes for Christo (sign-off)

1. **To merge this PR you need to:**
   - Apply the migration `00007_programs.sql` to the v2 database (I can do this via
     the Supabase MCP `apply_migration` tool — just say yes).
   - Run `get_advisors(security)` to confirm RLS is clean (I'll do this right after).
   - Regenerate `database.ts` from the live schema (should be a no-op vs the hand-written
     types — I'll verify).
   - Then merge.

2. **Design decision to be aware of:** `client_programs` stores the full program
   snapshot in `program_data` (jsonb). If a trainer updates a saved_program template
   after assigning it, the assigned client keeps the original snapshot — assignments
   are NOT live-linked to the template. This matches v1 behavior.

3. **G-10 (uuidv4):** The API layer accepts caller-provided ids. The w2 UI layer will
   mint uuidv4 ids when creating new programs. This is the right boundary — no change
   needed.
