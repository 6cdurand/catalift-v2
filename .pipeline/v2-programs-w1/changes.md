# v2-programs-w1 — Stage 2 (CODE) changes

> Programs Wave 1: program data layer + next-workout fix. Class B (schema + data layer).
> Branch: `programs-w1-data-layer` (from `main`). Executor: Opus 4.8.

## Migration handling (READ THIS)

Per the migration rules, this should be tested branch-first. The available Supabase
MCP toolset **cannot create a dev branch** (`create_branch` requires a `confirm_cost_id`
and no `confirm_cost` tool is exposed). Christo chose **Option A**: build everything,
do **not** touch the production DB, and apply the migration at sign-off.

**Therefore the following are intentionally DEFERRED to Christo's sign-off:**
- Applying `00007_programs.sql` to the database.
- `get_advisors(security)` run (must be clean before merge).
- Regenerating `src/types/database.ts` from the live schema.

`src/types/database.ts` was **hand-written** to match the migration exactly so `tsc`
and the test suite are green now. At sign-off, the regenerated types should be a no-op
diff against the hand-written additions.

## What changed

| File | Change |
|---|---|
| `supabase/migrations/20260626194600_00007_programs.sql` | NEW — `saved_programs` + `client_programs` with RLS, indexes, `updated_at` triggers, rollback header |
| `src/types/database.ts` | Added `client_programs` + `saved_programs` table types (hand-written; regenerate at sign-off) |
| `src/features/programs/types.ts` | NEW — ported program domain types from v1 (verbatim shapes) |
| `src/features/programs/lib/get-next-workout.ts` | NEW — pure `getNextProgramWorkout` (BUG-001 + BUG-010) + `sanitizeProgramForSave` |
| `src/features/programs/lib/serialize.ts` | NEW — row ↔ domain mapping |
| `src/features/programs/store.ts` | NEW — Zustand store, MERGE hydrate via `mergeById`, no persist middleware |
| `src/features/programs/api/{save-template,assign,fetch,delete,update}.ts` | NEW — writes via data-sync `persist` (await+retry); reads user-scoped |
| `src/features/programs/index.ts` | NEW — feature public API barrel |
| `src/features/programs/__tests__/*` | NEW — 14 unit tests (10 next-workout, 2 sanitize, 2 store) |

## Design notes

- **Reuses `@/features/data-sync`** (`persist`, `withRetry`, `mergeById`, `SyncResult`)
  via its single-segment barrel — allowed by the ESLint `no-restricted-imports`
  pattern (`@/features/*/*` only blocks deep imports).
- **`client_programs`** stores the full `ClientProgram` snapshot in `program_data`
  (jsonb); scalar columns (`status`, `start_date`, `end_date`, `next_workout_index`)
  are authoritative on read.
- **`sanitizeProgramForSave`** is wired into `assignProgramToClient`, so flexible
  programs are stripped of stray `scheduledDay` at write time (the BUG-010 trigger).
- Migration adds `updated_at` triggers + a rollback header to satisfy the repo's
  migration AGENTS rules (additive vs. the raw spec SQL).

## Proof block

```
[x] G-01 identity: trainer_id = auth.uid() directly — no canonical_user_id layer
[x] G-05 RLS: no USING(true) policy; saved_programs + client_programs have scoped policies
[ ] G-07 ran get_advisors(security) after migration — clean   → DEFERRED to sign-off (Option A)
[x] G-09 hydration MERGES by id (empty/partial fetch never wipes local) ★ — programs-store.test.ts
[~] G-10 all client-generated ids are valid UUIDs — store/api accept caller-provided ids; uuidv4 minting lands with the w2 UI layer (uuid dep present)
[x] G-11 writes await + retry + rollback (no fire-and-forget) — all writes routed through data-sync persist()
[x] G-12 every write has a matching read-hydrate — api/fetch.ts + store hydrate*
[x] G-15 program next-day logic correct — fixed + flexible + expired + rest day ★ — get-next-workout.test.ts (10 cases)
[x] G-16 separate store per resource (programs store, not crammed into trainerStore)
[x] G-19 PORTED v1 types verbatim; only the store wiring changed ★
[x] NO localStorage for program data (grep CLEAN)
[x] NO canonical_user_id / resolveCanonicalUserByEmail (grep CLEAN)
[x] tsc + lint + unit + e2e all green ★  (apply+advisors pending sign-off)
```

## Gate results

- `npx tsc --noEmit` → 0 errors
- `npm run lint` → 0 errors (11 pre-existing warnings in `src/lib`, none in `programs`)
- `npx vitest run src/features/programs` → 14 passed (3 files)
- `npx playwright test` → 8 passed
- `grep -rn "localStorage" src/features/programs/` → 0 results
- `grep -rn "canonical_user_id\|resolveCanonicalUserByEmail" src/features/programs/` → 0 results

## Remaining at sign-off (Christo)

1. Apply `00007_programs.sql` to the database.
2. Run `get_advisors(security)` — confirm clean.
3. Regenerate `src/types/database.ts` — confirm no-op diff vs hand-written.
4. Merge PR.
