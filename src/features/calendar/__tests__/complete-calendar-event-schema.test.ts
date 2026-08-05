/**
 * complete-calendar-event-schema.test.ts — static guard on migration 00018.
 *
 * The behavioural proof (complete sets status + writes ONE booking ledger row
 * / a double call stays at one row / the full complete->uncomplete round-trip
 * / foreign trainer P0002 / unauthenticated 28000) needs a live Postgres and
 * lives in `supabase/tests/00018_complete_calendar_event.proof.sql`.
 *
 * This test enforces the invariants that must never silently regress in the
 * migration text — every one of them is money: the single transaction, the
 * idempotent insert, `source = 'booking'`, trainer scoping, and NOT touching
 * `historical_offset_sessions` (INC-002).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260805000000_00018_complete_calendar_event.sql",
  ),
  "utf8",
);

// Collapse whitespace so assertions are insensitive to formatting.
const sql = migration.replace(/\s+/g, " ").toLowerCase();

// Executable statements only. The header comment quotes 00017 and names the
// things this migration must NOT do, so every "does not contain" assertion
// has to run against the code, not the prose.
const code = migration
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join(" ")
  .replace(/\s+/g, " ")
  .toLowerCase();

describe("migration 00018 — complete_calendar_event (money)", () => {
  it("is a single security-definer transaction with a pinned search_path", () => {
    expect(sql).toContain(
      "create or replace function public.complete_calendar_event(p_event_id text)",
    );
    expect(sql).toContain("language plpgsql");
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = public");
  });

  it("rejects an unauthenticated caller with 28000", () => {
    expect(sql).toContain("v_uid uuid := auth.uid()");
    expect(sql).toContain("raise exception 'not authenticated' using errcode = '28000'");
  });

  it("locks the event scoped to the calling trainer and raises P0002 otherwise", () => {
    expect(sql).toContain(
      "from public.calendar_events where id = p_event_id and trainer_id = v_uid for update",
    );
    expect(sql).toContain("using errcode = 'p0002'");
  });

  it("sets the status the UI actually reads", () => {
    expect(sql).toContain(
      "update public.calendar_events set status = 'completed' where id = p_event_id and trainer_id = v_uid",
    );
  });

  it("writes the ledger row in the SAME transaction, as source 'booking'", () => {
    expect(sql).toContain("insert into public.client_sessions");
    expect(sql).toContain("'booking'");
    expect(code).not.toContain("'pt_completion'");
  });

  it("is idempotent — a second call cannot create a second billable session", () => {
    expect(sql).toContain(
      "on conflict (client_id, calendar_event_id) where calendar_event_id is not null do nothing",
    );
  });

  it("takes no caller-supplied client_id or session_date (they come off the locked row)", () => {
    expect(sql).toContain(
      "create or replace function public.complete_calendar_event(p_event_id text)",
    );
    expect(code).not.toContain("p_client_id");
    expect(code).not.toContain("p_session_date");
    expect(sql).toContain("select client_id, date, status");
  });

  it("never writes historical_offset_sessions (INC-002)", () => {
    expect(code).not.toContain("historical_offset_sessions");
    expect(code).not.toContain("trainer_clients");
  });

  it("keeps anon out and grants only authenticated", () => {
    expect(sql).toContain(
      "revoke execute on function public.complete_calendar_event(text) from anon, public",
    );
    expect(sql).toContain(
      "grant execute on function public.complete_calendar_event(text) to authenticated",
    );
  });

  it("does not touch the reverse RPC it mirrors", () => {
    expect(code).not.toContain("create or replace function public.uncomplete_calendar_event");
    expect(code).not.toContain("set status = 'scheduled'");
    expect(code).not.toContain("delete from public.client_sessions");
  });

  it("ships a rollback plan", () => {
    expect(sql).toContain("rollback:");
    expect(sql).toContain(
      "drop function if exists public.complete_calendar_event(text)",
    );
  });
});
