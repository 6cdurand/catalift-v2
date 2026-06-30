# .pipeline/v2-programs-w2c-2-migration/spec.md — Stage 1 (PLAN) — UNBLOCKS w2c-2

> **The `saved_blocks` table + RLS that w2c-2 (Block Library) needs.** Forge ran the §H schema check on
> 2026-06-29 and correctly STOPPED: v2 has no table to store reusable blocks (it must NOT be jammed into
> `saved_programs` — that dual-store mistake was v1 BUG-003). This spec adds the table, mirroring the
> existing `saved_programs` ownership + RLS pattern. Authored by command-center, grounded in the LIVE v2
> schema (Supabase MCP, project `igagmdkdzjkxrwnyvgqk`, 2026-06-29).

**Class:** **B (schema migration + RLS).** Applying it needs **Christo's explicit sign-off**. Apply via a
**Supabase dev branch first**, verify advisors clean, THEN merge — never straight to production main
(repo rule `supabase/migrations/AGENTS.md`). Forge/executors may NOT apply this.
**Migration file:** `catalift-v2/supabase/migrations/00009_saved_blocks.sql` (next after 00008).

---

## GROUNDING — live v2 schema (verified 2026-06-29)

- **No `saved_blocks` table** exists. Tables present: users, trainer_clients, workouts, personal_bests,
  client_exercise_history, conversations, messages, notifications, invitations, **saved_programs**,
  **client_programs**.
- **Mirror this analog** — `saved_programs` (trainer's reusable PROGRAM templates):
  `id uuid pk default gen_random_uuid()`, `trainer_id uuid → users.id`, `name text`, jsonb payload
  (`days`), `created_at/updated_at timestamptz default now()`.
- **RLS pattern to mirror** — `saved_programs_owner`: `FOR ALL USING (trainer_id = auth.uid()) WITH CHECK
  (trainer_id = auth.uid())`. (A saved block is a trainer-owned library item, same as a saved program.)

---

## The migration — `00009_saved_blocks.sql`

```sql
-- 00009_saved_blocks.sql
-- Block Library: trainer-owned reusable workout blocks (superset/circuit/etc.) with optional folders.
-- Mirrors saved_programs ownership + RLS. Distinct from saved_programs (whole programs) — do NOT conflate.

create table if not exists public.saved_blocks (
  id          uuid primary key default gen_random_uuid(),
  trainer_id  uuid not null references public.users(id) on delete cascade,
  name        text not null,
  block_type  text not null check (block_type = any (array['straight','superset','circuit','cardio'])),
  folder      text,                                  -- free-text folder name (nullable = unfiled)
  block_data  jsonb not null default '{}'::jsonb,    -- the canonical WorkoutBlock structure (typed in app)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists saved_blocks_trainer_id_idx on public.saved_blocks (trainer_id);
create index if not exists saved_blocks_trainer_folder_idx on public.saved_blocks (trainer_id, folder);

alter table public.saved_blocks enable row level security;

-- Owner-only: a trainer can do everything with their own blocks; nobody else sees them.
create policy saved_blocks_owner on public.saved_blocks
  for all
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());
```

### Decisions baked in (and why)
- **Trainer-owned, owner-only RLS** — a block library is the trainer's, exactly like `saved_programs`.
  No client read path in w2c-2 (sharing-to-friends is the deferred DQ-5 feature — different access model,
  do NOT pre-build it here).
- **`block_type` check** — matches the v2 `WorkoutBlock` discriminated union (`straight|superset|circuit
  |cardio`, workout-engine w1 types). Keeps junk out of the column.
- **`folder` as a nullable text column** — the v1 grouping concept, minimal form. The v1 "empty-folder
  ordering" nicety (`block_folder_order` on the user row) is DEFERRED — flag in w2c-2, don't build now.
- **`block_data jsonb`** — stores the block structure; the app types it via the w1 `WorkoutBlock` union.
- **`on delete cascade`** — if a trainer is deleted, their blocks go too (same lifecycle as their programs).
- **No triggers** — app sets `updated_at` on write (matches `saved_programs`; avoids trigger footguns).

---

## Apply procedure (Class B — Christo sign-off required)

1. **Sign-off:** Christo approves applying schema to the v2 project.
2. **Dev branch first:** create a Supabase dev branch, apply `00009_saved_blocks.sql` there.
3. **Verify:** run `get_advisors(security)` — expect NO new "RLS disabled" / "policy missing" findings on
   `saved_blocks`. Confirm the table + policy exist; confirm an authed trainer can CRUD only their own rows.
4. **Merge:** merge the dev branch to production. Re-run advisors on production — clean.
5. **Regenerate types:** update `catalift-v2/src/types/database.ts` (the `Database` type) to include
   `saved_blocks` so the §H schema check passes and the app compiles.

## Rollback
```sql
drop policy if exists saved_blocks_owner on public.saved_blocks;
drop table if exists public.saved_blocks;
```

---

## After this lands → w2c-2 unblocks

Re-dispatch Forge to **w2c-2**. Its §H check will now find `saved_blocks` and proceed as **Class A**
(UI + store + api/* against the new table). The w2c-2 spec's api layer writes/read blocks via
`trainer_id = auth.uid()`; folders use the `folder` column. (DQ-5 "share block to friends" stays a future
wave — this table is owner-only by design.)

## Acceptance criteria
- [ ] `00009_saved_blocks.sql` matches the SQL above (table + 2 indexes + RLS enabled + owner policy).
- [ ] Applied via dev branch; `get_advisors(security)` clean (no RLS/policy findings on `saved_blocks`).
- [ ] An authed trainer can CRUD only their own `saved_blocks` rows (RLS proven).
- [ ] `src/types/database.ts` regenerated to include `saved_blocks`.
- [ ] w2c-2 re-dispatched and its §H schema check passes.

## Cross-references
- Blocker source → Forge run 2026-06-29 (w2c-2 §H schema check: "no saved_blocks table")
- Live schema grounding → Supabase MCP, v2 project `igagmdkdzjkxrwnyvgqk` (saved_programs analog + RLS)
- v1 dual-store footgun this avoids → BUG-003 (saved templates lost across two stores)
- Block type union → workout-engine w1 `WorkoutBlock` (straight|superset|circuit|cardio)
- Sharing (owner-only here by design) → workout-engine DOSSIER DQ-5 (future, different access model)
- Repo apply rule → `catalift-v2/supabase/migrations/AGENTS.md` (dev branch, never straight to main)
```
