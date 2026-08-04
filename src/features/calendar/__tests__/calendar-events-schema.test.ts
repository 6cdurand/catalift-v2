/**
 * calendar-events-schema.test.ts — static guard on migration 00017.
 *
 * The behavioural proof (trainer CRUD / client read blocked when the link is
 * not active / client cannot move a session / undo deletes the session row)
 * needs a live Postgres and lives in
 * `supabase/tests/00017_calendar_events.proof.sql`.
 *
 * This test enforces the invariants that must never silently regress in the
 * migration text: RLS on, no anon, no `using (true)`, the client-confirm
 * guard, the money-critical undo, and no trigger writing the session offset.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260729000000_00017_calendar_events.sql",
  ),
  "utf8",
);

// Collapse whitespace so assertions are insensitive to formatting.
const sql = migration.replace(/\s+/g, " ").toLowerCase();

describe("migration 00017 — calendar_events table", () => {
  it("is idempotent", () => {
    expect(sql).toContain("create table if not exists public.calendar_events");
  });

  it("keeps id as text so it joins client_sessions.calendar_event_id", () => {
    expect(sql).toContain("id text primary key");
  });

  it("uses uuid + real FKs for the parties (v1 stored client_id as text)", () => {
    expect(sql).toContain(
      "trainer_id uuid references public.users(id) on delete cascade",
    );
    expect(sql).toContain(
      "client_id uuid references public.users(id) on delete cascade",
    );
  });

  it("has no NOT VALID foreign keys (INC-003)", () => {
    expect(sql).not.toContain("not valid");
  });

  it("ships the load-bearing visibility columns", () => {
    expect(sql).toContain("owner_user_id uuid");
    expect(sql).toContain("event_scope text not null default 'shared_session'");
    expect(sql).toContain(
      "check (event_scope in ('trainer_personal','client_assigned','shared_session'))",
    );
  });

  it("ships every column the v1 app actually writes", () => {
    for (const column of [
      "title",
      "type",
      "date",
      "start_time",
      "end_time",
      "duration",
      "workout_id",
      "program_id",
      "program_day_index",
      "template_slug",
      "status",
      "notes",
      "client_confirmed",
      "client_confirmed_at",
      "recurrence_group",
      "contact_name",
    ]) {
      expect(sql).toContain(column);
    }
  });

  it("keeps workout_id a uuid and puts slugs in their own column", () => {
    expect(sql).toContain("workout_id uuid");
    expect(sql).toContain("template_slug text");
    expect(sql).not.toContain("workout_id text");
  });

  it("lets at most one booking mode be set per row", () => {
    expect(sql).toContain(
      "constraint calendar_events_single_source_ck check (program_id is null or template_slug is null)",
    );
  });

  it("has no color column — v2 derives event colour from type", () => {
    expect(sql).not.toContain("color");
  });

  it("indexes the columns the calendar reads by", () => {
    expect(sql).toContain("idx_calendar_events_trainer");
    expect(sql).toContain("idx_calendar_events_client");
    expect(sql).toContain(
      "idx_calendar_events_owner on public.calendar_events(owner_user_id, event_scope)",
    );
    expect(sql).toContain("idx_calendar_events_program");
    expect(sql).toContain("idx_calendar_events_date");
  });

  it("ships a rollback plan", () => {
    expect(sql).toContain("rollback:");
  });

  it("does not backfill (the table starts empty)", () => {
    expect(sql).not.toContain("update public.calendar_events set owner_user_id");
  });
});

describe("migration 00017 — RLS", () => {
  it("enables row level security in the same migration as the table", () => {
    expect(sql).toContain(
      "alter table public.calendar_events enable row level security",
    );
  });

  it("has no permissive using (true) policy", () => {
    expect(sql).not.toContain("using (true)");
  });

  it("grants the owning trainer full access", () => {
    expect(sql).toMatch(
      /create policy calendar_events_trainer_all on public\.calendar_events for all to authenticated using \(trainer_id = auth\.uid\(\)\) with check \(trainer_id = auth\.uid\(\)\)/,
    );
  });

  it("gates client reads on an ACTIVE connection via are_connected (BUG-019)", () => {
    expect(sql).toMatch(
      /create policy calendar_events_client_read on public\.calendar_events for select to authenticated using \( client_id = auth\.uid\(\) and public\.are_connected\(trainer_id, auth\.uid\(\)\) \)/,
    );
  });

  it("does not define its own connection check", () => {
    expect(sql).not.toContain("from public.trainer_clients");
  });

  it("scopes every policy to authenticated — anon gets nothing", () => {
    const policies = sql.match(/create policy [a-z_]+ on public\.calendar_events/g) ?? [];
    expect(policies.length).toBeGreaterThan(0);
    expect(sql).toContain("revoke all on table public.calendar_events from anon");
    expect(sql).not.toMatch(/to anon/);
  });
});

describe("migration 00017 — client-confirm guard", () => {
  it("restricts a client UPDATE to the confirmation fields only", () => {
    expect(sql).toContain(
      "create or replace function public.ce_guard_client_update()",
    );
    expect(sql).toContain(
      "a client may only change client_confirmed / client_confirmed_at on a calendar event",
    );
    expect(sql).toContain(
      "create trigger calendar_events_guard_client_update before update on public.calendar_events",
    );
  });

  it("guards the fields a client must never move", () => {
    for (const column of ["date", "status", "notes", "start_time", "trainer_id"]) {
      expect(sql).toContain(`new.${column} is distinct from old.${column}`);
    }
  });

  it("stamps client_confirmed_at from the DB clock, not the client's device", () => {
    expect(sql).toContain("new.client_confirmed_at := now()");
    expect(sql).toContain("new.client_confirmed_at := null");
  });

  it("leaves the trainer's own edits alone", () => {
    expect(sql).toContain("auth.uid() = old.trainer_id");
  });

  it("keeps the trigger function uncallable from PostgREST", () => {
    expect(sql).toContain(
      "revoke execute on function public.ce_guard_client_update() from anon, authenticated, public",
    );
  });
});

describe("migration 00017 — uncomplete_calendar_event (money)", () => {
  it("is a single security-definer transaction, not two client writes", () => {
    expect(sql).toContain(
      "create or replace function public.uncomplete_calendar_event(p_event_id text)",
    );
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = public");
  });

  it("sets the event back to scheduled AND deletes the session row", () => {
    expect(sql).toContain("set status = 'scheduled'");
    expect(sql).toContain(
      "delete from public.client_sessions where calendar_event_id = p_event_id and trainer_id = v_uid",
    );
  });

  it("is scoped to the calling trainer only", () => {
    expect(sql).toContain("v_uid uuid := auth.uid()");
    expect(sql).toContain("if v_uid is null then");
    expect(sql).toContain("where id = p_event_id and trainer_id = v_uid");
  });

  it("is not callable by anon", () => {
    expect(sql).toContain(
      "revoke execute on function public.uncomplete_calendar_event(text) from anon, public",
    );
    expect(sql).toContain(
      "grant execute on function public.uncomplete_calendar_event(text) to authenticated",
    );
  });

  it("never writes historical_offset_sessions (INC-002 authority)", () => {
    expect(sql).not.toContain("historical_offset_sessions =");
    expect(sql).not.toContain("update public.trainer_clients");
  });

  it("does not alter client_sessions, client_payments or trainer_clients", () => {
    expect(sql).not.toContain("alter table public.client_sessions");
    expect(sql).not.toContain("alter table public.client_payments");
    expect(sql).not.toContain("alter table public.trainer_clients");
  });
});
