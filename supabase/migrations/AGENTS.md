# Supabase Migration Rules

> Applies when working in `supabase/migrations/`.
> This is Class B work — security-critical. Every migration is reviewed by command-center before merge.

## Standing rules

1. **Every table gets RLS.** No exceptions. `ALTER TABLE <name> ENABLE ROW LEVEL SECURITY`. No `USING (true)` policies. Every policy checks `auth.uid()` against a trainer_id or client_id column.

2. **No `NOT VALID` foreign keys.** v1 used `NOT VALID` FKs which caused the identity reconciliation outage (INC-003). All FKs are validated. If adding an FK to an existing table, validate it in the same migration.

3. **Migration naming.** `NNNNN_description.sql` — zero-padded number, snake_case description. Example: `00001_baseline.sql`, `00002_add_message_read_at.sql`.

4. **Every migration has a rollback plan.** Include a comment at the top: `-- ROLLBACK: <SQL to undo this migration>`. If the migration adds a table, the rollback drops it. If it adds a column, the rollback drops it.

5. **No destructive operations without a guard.** `DROP TABLE`, `DROP COLUMN`, `DELETE FROM` must be guarded by a `WHERE` clause or a check. Never run `DROP TABLE` without confirming it's safe.

6. **Test migrations on a branch first.** Use Supabase branching (MCP `create_branch`). Apply the migration to the branch, run advisors (`get_advisors`), verify, then merge to production.

7. **Generate TypeScript types after schema changes.** Run `generate_typescript_types` via MCP after every migration that changes the schema. Update `src/types/database.ts`.

8. **Check advisors after every migration.** Run `get_advisors` with `type: "security"` after every migration. Fix any security advisors before merging.

## RLS policy template

```sql
-- Enable RLS
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

-- Trainers can only see their own rows
CREATE POLICY "<table_name>_trainer_select"
  ON <table_name> FOR SELECT
  USING (trainer_id = auth.uid());

-- Trainers can only insert their own rows
CREATE POLICY "<table_name>_trainer_insert"
  ON <table_name> FOR INSERT
  WITH CHECK (trainer_id = auth.uid());

-- Trainers can only update their own rows
CREATE POLICY "<table_name>_trainer_update"
  ON <table_name> FOR UPDATE
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Trainers can only delete their own rows
CREATE POLICY "<table_name>_trainer_delete"
  ON <table_name> FOR DELETE
  USING (trainer_id = auth.uid());
```
