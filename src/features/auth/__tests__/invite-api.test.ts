/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  verifyInviteToken,
  acceptInvite,
  createInvitation,
} from "../api/invite";
import { getBrowserClient } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  getBrowserClient: vi.fn(),
}));

const TOKEN = "test-token-123";
const TRAINER_ID = "trainer-uuid-1";
const EMAIL = "client@example.com";

function makeRpcClient(rpcResult: any, authUser?: any) {
  return {
    rpc: vi.fn(() => Promise.resolve(rpcResult)),
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: authUser ?? null },
        }),
      ),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() =>
        Promise.resolve({ error: null }),
      ),
    })),
  };
}

describe("verifyInviteToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns {status:'valid'} when RPC returns valid=true", async () => {
    (getBrowserClient as any).mockReturnValue(
      makeRpcClient({
        data: { email: EMAIL, trainer_name: "Coach Bob", valid: true },
        error: null,
      }),
    );

    const result = await verifyInviteToken(TOKEN);
    expect(result).toEqual({ status: "valid", email: EMAIL });
  });

  it("returns {status:'invalid'} when RPC returns valid=false", async () => {
    (getBrowserClient as any).mockReturnValue(
      makeRpcClient({
        data: { email: EMAIL, trainer_name: "Coach Bob", valid: false },
        error: null,
      }),
    );

    const result = await verifyInviteToken(TOKEN);
    expect(result).toEqual({ status: "invalid" });
  });

  it("returns {status:'invalid'} when RPC returns no data", async () => {
    (getBrowserClient as any).mockReturnValue(
      makeRpcClient({ data: null, error: null }),
    );

    const result = await verifyInviteToken(TOKEN);
    expect(result).toEqual({ status: "invalid" });
  });

  it("returns {status:'invalid'} when RPC returns an error", async () => {
    (getBrowserClient as any).mockReturnValue(
      makeRpcClient({ data: null, error: { message: "RPC failed" } }),
    );

    const result = await verifyInviteToken(TOKEN);
    expect(result).toEqual({ status: "invalid" });
  });
});

describe("acceptInvite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves when accept_invitation RPC returns no error", async () => {
    (getBrowserClient as any).mockReturnValue(
      makeRpcClient({ data: TRAINER_ID, error: null }),
    );

    await expect(acceptInvite(TOKEN, "client-uuid")).resolves.toBeUndefined();
  });

  it("throws when accept_invitation RPC returns an error", async () => {
    (getBrowserClient as any).mockReturnValue(
      makeRpcClient({ data: null, error: { message: "Already accepted" } }),
    );

    await expect(acceptInvite(TOKEN, "client-uuid")).rejects.toEqual({
      message: "Already accepted",
    });
  });
});

describe("createInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if user is not authenticated", async () => {
    (getBrowserClient as any).mockReturnValue(
      makeRpcClient({ data: null, error: null }, null),
    );

    await expect(createInvitation(EMAIL)).rejects.toThrow("Not authenticated");
  });

  it("inserts an invitation row and returns an invite link", async () => {
    const insertMock = vi.fn(() =>
      Promise.resolve({ error: null }),
    );
    const client = {
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({
            data: { user: { id: TRAINER_ID } },
          }),
        ),
      },
      from: vi.fn(() => ({
        insert: insertMock,
      })),
    };
    (getBrowserClient as any).mockReturnValue(client);

    // Mock crypto.randomUUID
    const cryptoSpy = vi
      .spyOn(globalThis, "crypto", "get")
      .mockReturnValue({
        ...globalThis.crypto,
        randomUUID: () => "mock-uuid-123",
      } as any);

    const link = await createInvitation(EMAIL);

    expect(insertMock).toHaveBeenCalledWith({
      trainer_id: TRAINER_ID,
      email: EMAIL,
      token: "mock-uuid-123",
      role: "client",
      status: "pending",
    });
    expect(link).toContain("/invite?token=mock-uuid-123");

    cryptoSpy.mockRestore();
  });

  it("throws when insert returns an error", async () => {
    const insertMock = vi.fn(() =>
      Promise.resolve({ error: { message: "RLS denied" } }),
    );
    const client = {
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({
            data: { user: { id: TRAINER_ID } },
          }),
        ),
      },
      from: vi.fn(() => ({
        insert: insertMock,
      })),
    };
    (getBrowserClient as any).mockReturnValue(client);

    await expect(createInvitation(EMAIL)).rejects.toEqual({
      message: "RLS denied",
    });
  });
});
