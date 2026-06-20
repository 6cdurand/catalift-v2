---
name: create-migration
description: Creates a Supabase migration with RLS policies, rollback plan, and advisor check. Use when modifying the database schema.
---

# Create Migration

When asked to create a database migration, follow this procedure:

## Steps

1. **Determine the migration number.** Check `supabase/migrations/` for the highest number. Next is `NNNNN` (zero-padded, 5 digits).

2. **Create the migration file:** `supabase/migrations/NNNNN_description.sql`

3. **Write the migration.** Follow `supabase/migrations/AGENTS.md` rules:
   - Every `CREATE TABLE` includes `ENABLE ROW LEVEL SECURITY`
   - Every table has SELECT, INSERT, UPDATE, DELETE policies checking `auth.uid()`
   - No `USING (true)` policies
   - No `NOT VALID` foreign keys
   - Include rollback comment at top: `-- ROLLBACK: <SQL to undo>`

4. **Migration template:**
   ```sql
   -- Migration: NNNNN_description
   -- ROLLBACK: DROP TABLE IF EXISTS <table_name>; DROP POLICY IF EXISTS ...

   CREATE TABLE <table_name> (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     trainer_id UUID REFERENCES auth.users(id) NOT NULL,
     -- ... columns
     created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
     updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
   );

   ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "<table_name>_trainer_select"
     ON <table_name> FOR SELECT
     USING (trainer_id = auth.uid());

   CREATE POLICY "<table_name>_trainer_insert"
     ON <table_name> FOR INSERT
     WITH CHECK (trainer_id = auth.uid());

   CREATE POLICY "<table_name>_trainer_update"
     ON <table_name> FOR UPDATE
     USING (trainer_id = auth.uid())
     WITH CHECK (trainer_id = auth.uid());

   CREATE POLICY "<table_name>_trainer_delete"
     ON <table_name> FOR DELETE
     USING (trainer_id = auth.uid());
   ```

5. **Test on a branch (if available).** Use Supabase MCP `create_branch`, apply migration, run `get_advisors` with `type: "security"`.

6. **Generate TypeScript types.** Run `generate_typescript_types` via MCP. Update `src/types/database.ts`.

7. **Verify:** `npx tsc --noEmit` passes with updated types.

## Class B

All migrations are Class B (security-critical). Command-center reviews before merge.
