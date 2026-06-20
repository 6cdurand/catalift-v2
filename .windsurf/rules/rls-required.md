---
glob: "supabase/migrations/**"
description: Enforces strict RLS on every table — no USING(true), no public read access
---

# RLS Required

Every table in Supabase must have Row Level Security enabled with policies that check `auth.uid()`.

## Rules

1. **Every `CREATE TABLE` must include `ENABLE ROW LEVEL SECURITY`.**
2. **Every table must have at minimum SELECT, INSERT, UPDATE, DELETE policies** that check `trainer_id = auth.uid()` or `client_id = auth.uid()`.
3. **No `USING (true)` policies.** This makes the table world-readable. v1 had 11+ tables with this — it caused a SEV-0 PII exposure (BUG-N3).
4. **No `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`.** Ever.
5. **Storage buckets must have RLS policies too.** Not just database tables.

## RLS policy template

See `supabase/migrations/AGENTS.md` for the full template.

## Review

All migrations are Class B (security-critical). Command-center reviews RLS policies before merge. If a migration doesn't have RLS, it doesn't merge.
