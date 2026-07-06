/**
 * invitations.test.ts — trainer "invite new client" API tests.
 * Focus: createInvitation inserts a token-scoped row for the authed trainer,
 * normalizes email, validates input, and surfaces failures.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createInvitation } from "../api/invitations";
import { getBrowserClient } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  getBrowserClient: vi.fn(),
}));

// Deterministic token so we can assert the insert payload.
vi.mock("uuid", () => ({ v4: () => "tok-fixed-uuid" }));

describe("createInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function buildMock({
    user = { id: "trainer-123" },
    insertError = null as any,
  }: {
    user?: { id: string } | null;
    insertError?: any;
  }) {
    const insert = vi.fn().mockResolvedValue({ error: insertError });
    const from = vi.fn().mockReturnValue({ insert });
    return {
      client: {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
        from,
      },
      insert,
      from,
    };
  }

  it("inserts a token-scoped invite for the authed trainer with normalized email", async () => {
    const mock = buildMock({});
    vi.mocked(getBrowserClient).mockReturnValue(mock.client as any);

    const result = await createInvitation("  New.Client@Example.com  ");

    expect(mock.from).toHaveBeenCalledWith("invitations");
    expect(mock.insert).toHaveBeenCalledWith({
      trainer_id: "trainer-123",
      email: "new.client@example.com",
      token: "tok-fixed-uuid",
    });
    expect(result).toEqual({
      token: "tok-fixed-uuid",
      email: "new.client@example.com",
    });
  });

  it("throws on empty email without touching the database", async () => {
    const mock = buildMock({});
    vi.mocked(getBrowserClient).mockReturnValue(mock.client as any);

    await expect(createInvitation("   ")).rejects.toThrow("Email is required");
    expect(mock.from).not.toHaveBeenCalled();
  });

  it("throws when not authenticated", async () => {
    const mock = buildMock({ user: null });
    vi.mocked(getBrowserClient).mockReturnValue(mock.client as any);

    await expect(createInvitation("a@b.com")).rejects.toThrow(
      "Not authenticated",
    );
    expect(mock.from).not.toHaveBeenCalled();
  });

  it("retries then throws when the insert keeps failing", async () => {
    const mock = buildMock({ insertError: new Error("insert boom") });
    vi.mocked(getBrowserClient).mockReturnValue(mock.client as any);

    await expect(createInvitation("a@b.com")).rejects.toThrow("insert boom");
    // withRetry attempts MAX_RETRIES (3) times.
    expect(mock.insert).toHaveBeenCalledTimes(3);
  });
});
