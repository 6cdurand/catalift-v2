import { describe, it, expect } from "vitest";
import { roleFromProfileRow } from "../api/resolve-role";

/**
 * G-20 ROLE AUTHORITY regression.
 *
 * Role MUST be resolved from `public.users.role` — never from
 * `user_metadata.mode`. `roleFromProfileRow` takes ONLY the DB row, so a
 * metadata-only "trainer" cannot grant trainer access. These tests lock that
 * contract: the resolver has no metadata input to trust.
 */
describe("roleFromProfileRow (G-20)", () => {
  it("returns 'trainer' when the profile row's role is 'trainer'", () => {
    expect(roleFromProfileRow({ role: "trainer" })).toBe("trainer");
  });

  it("returns 'client' when the profile row's role is 'client'", () => {
    expect(roleFromProfileRow({ role: "client" })).toBe("client");
  });

  it("defaults to 'client' for a missing/empty profile row", () => {
    expect(roleFromProfileRow(null)).toBe("client");
    expect(roleFromProfileRow(undefined)).toBe("client");
    expect(roleFromProfileRow({})).toBe("client");
    expect(roleFromProfileRow({ role: null })).toBe("client");
  });

  it("defaults to 'client' for an unrecognized role value", () => {
    expect(roleFromProfileRow({ role: "admin" })).toBe("client");
    expect(roleFromProfileRow({ role: "TRAINER" })).toBe("client");
  });

  it("cannot be promoted by metadata — a metadata 'trainer' is not an input", () => {
    // Simulate the self-promotion attempt: the user set user_metadata.mode
    // to 'trainer', but their DB profile row says 'client'. Gating reads the
    // DB row only, so they remain a client.
    const dbRow = { role: "client" };
    // (user_metadata.mode === 'trainer' is intentionally unused here — the
    // resolver has no way to accept it.)
    expect(roleFromProfileRow(dbRow)).toBe("client");
  });
});
