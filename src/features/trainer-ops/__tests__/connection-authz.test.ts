/**
 * connection-authz.test.ts — BUG-019 regression guard.
 *
 * The full behavioral proof (attacker blocked / pending leaks nothing /
 * client-accept / trainer-cannot-self-activate / trainer-offset-edit) runs at
 * the DB level in `supabase/tests/00012_harden_trainer_client_authz.proof.sql`
 * (needs a live Postgres, so it is not part of the JS suite).
 *
 * This test statically enforces that migration 00012 keeps the authorization
 * hole closed — if a future edit reverts any of the four invariants, CI fails.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/00012_harden_trainer_client_authz.sql"),
  "utf8",
);

// Collapse whitespace so assertions are insensitive to formatting.
const sql = migration.replace(/\s+/g, " ").toLowerCase();

describe("BUG-019 — trainer_clients authz hardening (migration 00012)", () => {
  it("are_connected() counts ONLY active links", () => {
    expect(sql).toContain("create or replace function public.are_connected");
    expect(sql).toContain("tc.status = 'active'");
  });

  it("a trainer may only insert a PENDING link", () => {
    expect(sql).toContain("drop policy tc_insert_trainer on public.trainer_clients");
    expect(sql).toMatch(
      /create policy tc_insert_trainer.*with check \(trainer_id = auth\.uid\(\) and status = 'pending'\)/,
    );
  });

  it("the client owns accept/decline via its own update policy", () => {
    expect(sql).toMatch(
      /create policy tc_update_client.*using \(client_id = auth\.uid\(\)\).*with check \(client_id = auth\.uid\(\)\)/,
    );
  });

  it("only the client may activate a link — enforced by a before trigger", () => {
    expect(sql).toContain("create or replace function public.tc_guard_activate");
    expect(sql).toContain("new.status = 'active'");
    expect(sql).toContain("old.status is distinct from 'active'");
    expect(sql).toContain("auth.uid() <> new.client_id");
    expect(sql).toMatch(
      /create trigger trainer_clients_guard_activate before insert or update on public\.trainer_clients/,
    );
  });

  it("ships a rollback plan", () => {
    expect(sql).toContain("rollback:");
  });
});
