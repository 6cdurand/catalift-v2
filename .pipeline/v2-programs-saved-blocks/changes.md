# .pipeline/v2-programs-saved-blocks/changes.md — saved_blocks migration (repo sync)

## Objective
Sync the repo to the live v2 DB which already has `saved_blocks` (migrations 00009 + 00010 applied live, advisors clean). This PR adds the migration files + regenerated types to the repo. **No DB apply — schema is already live.**

## Files created

### 1. `supabase/migrations/20260630000000_00009_saved_blocks.sql` (NEW)
- Creates `public.saved_blocks` table: trainer-owned reusable workout blocks (superset/circuit/etc.) with optional folders
- Columns: `id`, `trainer_id` (FK → users, cascade delete), `name`, `block_type` (check: straight|superset|circuit|cardio), `folder` (nullable text), `block_data` (jsonb), `created_at`, `updated_at`
- Indexes: `saved_blocks_trainer_id_idx`, `saved_blocks_trainer_folder_idx`
- RLS enabled + `saved_blocks_owner` policy (FOR ALL, `trainer_id = (select auth.uid())`)
- Mirrors `saved_programs` ownership + RLS pattern (00007)

### 2. `supabase/migrations/20260630000001_00010_saved_blocks_rls_initplan_opt.sql` (NEW)
- Performance optimization: re-creates `saved_blocks_owner` policy using `(select auth.uid())` scalar subselect form
- Satisfies Supabase `auth_rls_initplan` advisor (avoids InitPlan re-evaluation per row)
- Semantics identical to 00009's policy

### 3. `.pipeline/v2-programs-saved-blocks/spec.md` (NEW)
- Copied from command-center `domains/02-programs/pipeline/w2c-2-saved-blocks-migration/spec.md`

## Files modified
None. `src/types/database.ts` already includes `saved_blocks` (verified via `generate_typescript_types` MCP — output matches current file). No `src/features/**` app code touched (schema + types only).

## Proof block — Guardrails
```
[x] RLS enabled on saved_blocks (ALTER TABLE ... ENABLE ROW LEVEL SECURITY)
[x] No USING (true) policies — saved_blocks_owner checks trainer_id = auth.uid()
[x] No NOT VALID foreign keys — trainer_id FK validated
[x] Migration has rollback comment at top
[x] No destructive operations without guard
[x] src/types/database.ts includes saved_blocks (MCP generate_typescript_types verified)
[x] No src/features/** app code touched — schema + types only
[x] tsc + lint clean (0 errors)
[x] Migration already applied live to v2 DB + advisors clean (confirmed by user)
```

## Verification
- `npx tsc --noEmit` — clean (exit 0)
- `npm run lint` — 0 errors (17 pre-existing warnings in other files)
- `mcp1_generate_typescript_types` — output matches current `src/types/database.ts` (saved_blocks already present)

## Deviations
None. Migration SQL matches spec exactly. User edited 00009 to use `(select auth.uid())` form (InitPlan optimization) — 00010 formalizes this as a separate migration step matching the live DB state.
