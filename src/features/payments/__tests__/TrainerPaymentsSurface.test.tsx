import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import { TrainerPaymentsSurface } from "../components/TrainerPaymentsSurface";
import { fetchTrainerClientBilling } from "../api/billing";
import {
  adjustPaidOffset,
  fetchTrainerPayments,
  logPayment,
  updateClientRate,
} from "../api/payments";
import { adjustSessionOffset, fetchTrainerSessions } from "../api/sessions";
import type {
  ClientPayment,
  ClientSession,
  TrainerClientBilling,
} from "../types";

vi.mock("../api/billing", () => ({
  fetchTrainerClientBilling: vi.fn(),
}));

vi.mock("../api/payments", () => ({
  fetchTrainerPayments: vi.fn(),
  logPayment: vi.fn(),
  adjustPaidOffset: vi.fn(),
  updateClientRate: vi.fn(),
}));

vi.mock("../api/sessions", () => ({
  fetchTrainerSessions: vi.fn(),
  adjustSessionOffset: vi.fn(),
}));

const TRAINER_ID = "trainer-1";

let billingStore: TrainerClientBilling[];
let sessionsStore: ClientSession[];
let paymentsStore: ClientPayment[];

function session(id: string, clientId: string): ClientSession {
  return {
    id,
    trainerId: TRAINER_ID,
    clientId,
    sessionDate: "2026-07-20",
    source: "pt_completion",
    workoutId: null,
    calendarEventId: null,
    notes: null,
    createdAt: "2026-07-20T00:00:00.000Z",
  };
}

function payment(
  id: string,
  clientId: string,
  overrides: Partial<ClientPayment> = {},
): ClientPayment {
  return {
    id,
    trainerId: TRAINER_ID,
    clientId,
    amount: 200,
    currency: "NZD",
    sessionsIncluded: 4,
    method: "bank_transfer",
    status: "paid",
    description: null,
    paidAt: "2026-07-01T00:00:00.000Z",
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  // Alice: 5 + 3 = 8 completed, 2 + 4 = 6 paid, @$50 → 2 outstanding / $100.
  // Bob: 2 completed, 0 paid, @$100 → 2 outstanding / $200.
  // Cara: 3 completed / 3 paid, square.
  billingStore = [
    {
      clientId: "alice",
      name: "Alice Adams",
      avatarUrl: null,
      status: "active",
      historicalOffsetSessions: 5,
      totalPaidOffset: 2,
      pricePerSession: 50,
    },
    {
      clientId: "bob",
      name: "Bob Brown",
      avatarUrl: null,
      status: "active",
      historicalOffsetSessions: 0,
      totalPaidOffset: 0,
      pricePerSession: 100,
    },
    {
      clientId: "cara",
      name: "Cara Cole",
      avatarUrl: null,
      status: "active",
      historicalOffsetSessions: 3,
      totalPaidOffset: 3,
      pricePerSession: 25,
    },
  ];
  sessionsStore = [
    session("s1", "alice"),
    session("s2", "alice"),
    session("s3", "alice"),
    session("s4", "bob"),
    session("s5", "bob"),
  ];
  paymentsStore = [payment("p1", "alice")];

  vi.mocked(fetchTrainerClientBilling).mockImplementation(async () =>
    billingStore.map((b) => ({ ...b })),
  );
  vi.mocked(fetchTrainerSessions).mockImplementation(async () => [
    ...sessionsStore,
  ]);
  vi.mocked(fetchTrainerPayments).mockImplementation(async () => [
    ...paymentsStore,
  ]);
});

afterEach(() => cleanup());

const onOpenClient = vi.fn();

async function renderSurface() {
  render(<TrainerPaymentsSurface onOpenClient={onOpenClient} />);
  await screen.findByTestId("trainer-payments-surface");
}

/** Radix Tabs selects on mouseDown, not on a synthetic click. */
function openHistoryTab() {
  fireEvent.mouseDown(screen.getByRole("tab", { name: /history/i }));
}

function rowFor(clientId: string): HTMLElement {
  const row = document.querySelector(
    `[data-testid="payment-client-row"][data-client-id="${clientId}"]`,
  );
  if (!row) throw new Error(`no row for ${clientId}`);
  return row as HTMLElement;
}

describe("TrainerPaymentsSurface — summary cards", () => {
  it("renders roster-wide derived totals", async () => {
    await renderSurface();

    // Alice $100 + Bob $200 outstanding.
    expect(screen.getByTestId("summary-outstanding").textContent).toBe("$300.00");
    expect(screen.getByTestId("summary-total-paid").textContent).toBe("$200.00");
    // 8 + 2 + 3 completed sessions.
    expect(screen.getByTestId("summary-sessions").textContent).toBe("13");
    expect(screen.getByText("2 clients")).toBeDefined();
  });

  it("shows outstanding in amber when owed and sky when square", async () => {
    await renderSurface();
    expect(screen.getByTestId("summary-outstanding").className).toContain(
      "text-amber-500",
    );
    cleanup();

    billingStore = billingStore.map((b) => ({
      ...b,
      historicalOffsetSessions: 0,
      totalPaidOffset: 0,
    }));
    sessionsStore = [];
    paymentsStore = [];
    await renderSurface();
    expect(screen.getByTestId("summary-outstanding").textContent).toBe("$0.00");
    expect(screen.getByTestId("summary-outstanding").className).toContain(
      "text-sky-500",
    );
  });

  it("notes excluded currencies instead of summing across them", async () => {
    paymentsStore = [
      payment("p1", "alice", { sessionsIncluded: 0, amount: 10 }),
      payment("p2", "alice", { sessionsIncluded: 0, amount: 10 }),
      payment("p3", "bob", {
        currency: "USD",
        amount: 999,
        sessionsIncluded: 0,
      }),
    ];
    await renderSurface();

    expect(screen.getByTestId("summary-total-paid").textContent).toBe("$20.00");
    expect(screen.getByTestId("mixed-currency-note").textContent).toContain(
      "USD",
    );
  });
});

describe("TrainerPaymentsSurface — client rows", () => {
  it("renders one row per client with derived stats and the rate", async () => {
    await renderSurface();

    const alice = rowFor("alice");
    expect(
      alice.querySelector('[data-testid="row-completed"]')!.textContent,
    ).toBe("8");
    expect(alice.querySelector('[data-testid="row-paid"]')!.textContent).toBe(
      "6",
    );
    expect(
      alice.querySelector('[data-testid="row-outstanding"]')!.textContent,
    ).toBe("$100.00");
    expect(alice.querySelector('[data-testid="row-rate"]')!.textContent).toBe(
      "$50.00/session",
    );
  });

  it("shows the amber left border if and only if the client has outstanding", async () => {
    await renderSurface();

    expect(rowFor("alice").className).toContain("border-l-amber-500");
    expect(rowFor("bob").className).toContain("border-l-amber-500");
    expect(rowFor("cara").className).not.toContain("border-l-amber-500");
    expect(
      rowFor("cara").querySelector('[data-testid="row-outstanding-alert"]'),
    ).toBeNull();
    expect(screen.getByText("All payments up to date")).toBeDefined();
  });

  it("sorts clients with outstanding first, largest first", async () => {
    await renderSurface();

    const ids = [
      ...document.querySelectorAll('[data-testid="payment-client-row"]'),
    ].map((el) => el.getAttribute("data-client-id"));
    expect(ids).toEqual(["bob", "alice", "cara"]);
  });

  it("opens the client file when the name is tapped", async () => {
    await renderSurface();
    fireEvent.click(screen.getByRole("button", { name: "Alice Adams" }));
    expect(onOpenClient).toHaveBeenCalledWith("alice");
  });

  it("shows an empty state when the roster is empty", async () => {
    billingStore = [];
    sessionsStore = [];
    paymentsStore = [];
    await renderSurface();

    expect(screen.getByTestId("payments-clients-empty")).toBeDefined();
    expect(screen.getByText("No clients yet")).toBeDefined();
    expect(screen.getByTestId("summary-outstanding").textContent).toBe("$0.00");
  });
});

describe("TrainerPaymentsSurface — search", () => {
  it("filters the list by name and can be cleared", async () => {
    await renderSurface();
    expect(
      document.querySelectorAll('[data-testid="payment-client-row"]'),
    ).toHaveLength(3);

    fireEvent.change(screen.getByPlaceholderText("Search clients..."), {
      target: { value: "bo" },
    });
    expect(
      document.querySelectorAll('[data-testid="payment-client-row"]'),
    ).toHaveLength(1);
    expect(screen.getByText("Bob Brown")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(
      document.querySelectorAll('[data-testid="payment-client-row"]'),
    ).toHaveLength(3);
  });

  it("shows a no-match empty state", async () => {
    await renderSurface();
    fireEvent.change(screen.getByPlaceholderText("Search clients..."), {
      target: { value: "zzz" },
    });
    expect(screen.getByText("No matching clients")).toBeDefined();
  });
});

describe("TrainerPaymentsSurface — log payment", () => {
  it("logs a payment from an outstanding row and refreshes every figure", async () => {
    vi.mocked(logPayment).mockImplementation(async (params) => {
      const created = payment("p2", params.clientId, {
        amount: params.amount,
        sessionsIncluded: params.sessionsIncluded ?? 1,
      });
      paymentsStore = [created, ...paymentsStore];
      return created;
    });

    await renderSurface();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Log outstanding payment for Alice Adams",
      }),
    );

    // Defaults come from the derived outstanding figures.
    expect((await screen.findByLabelText(/^Amount/)) as HTMLInputElement).toHaveProperty(
      "value",
      "100",
    );
    expect(
      screen.getByLabelText(/sessions included/i) as HTMLInputElement,
    ).toHaveProperty("value", "2");

    fireEvent.click(screen.getByRole("button", { name: /save payment/i }));

    await waitFor(() => {
      expect(logPayment).toHaveBeenCalledTimes(1);
    });
    expect(vi.mocked(logPayment).mock.calls[0][0]).toMatchObject({
      clientId: "alice",
      amount: 100,
      sessionsIncluded: 2,
    });

    // Row, summary and history all move together after the refetch.
    await waitFor(() => {
      expect(
        rowFor("alice").querySelector('[data-testid="row-paid"]')!.textContent,
      ).toBe("8");
    });
    expect(
      rowFor("alice").querySelector('[data-testid="row-outstanding-alert"]'),
    ).toBeNull();
    expect(screen.getByTestId("summary-outstanding").textContent).toBe("$200.00");
    expect(screen.getByTestId("summary-total-paid").textContent).toBe("$300.00");
  });
});

describe("TrainerPaymentsSurface — inline rate edit", () => {
  it("saves a new rate and moves only the money figure", async () => {
    vi.mocked(updateClientRate).mockImplementation(async (clientId, price) => {
      billingStore = billingStore.map((b) =>
        b.clientId === clientId ? { ...b, pricePerSession: price } : b,
      );
    });

    await renderSurface();
    fireEvent.click(
      screen.getByRole("button", { name: "Edit rate for Alice Adams" }),
    );
    fireEvent.change(
      screen.getByLabelText("Per-session rate for Alice Adams"),
      { target: { value: "80" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Save rate for Alice Adams" }),
    );

    await waitFor(() => {
      expect(updateClientRate).toHaveBeenCalledWith("alice", 80);
    });
    await waitFor(() => {
      expect(
        rowFor("alice").querySelector('[data-testid="row-outstanding"]')!
          .textContent,
      ).toBe("$160.00");
    });
    expect(
      rowFor("alice").querySelector('[data-testid="row-completed"]')!.textContent,
    ).toBe("8");
    expect(
      rowFor("alice").querySelector('[data-testid="row-paid"]')!.textContent,
    ).toBe("6");
  });

  it("rejects a negative rate without writing", async () => {
    await renderSurface();
    fireEvent.click(
      screen.getByRole("button", { name: "Edit rate for Alice Adams" }),
    );
    fireEvent.change(
      screen.getByLabelText("Per-session rate for Alice Adams"),
      { target: { value: "-5" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Save rate for Alice Adams" }),
    );

    expect(await screen.findByText("Rate must be 0 or more")).toBeDefined();
    expect(updateClientRate).not.toHaveBeenCalled();
  });
});

describe("TrainerPaymentsSurface — manual ±1 corrections", () => {
  it("adjusts the session offset and the paid offset", async () => {
    vi.mocked(adjustSessionOffset).mockImplementation(async (clientId, delta) => {
      billingStore = billingStore.map((b) =>
        b.clientId === clientId
          ? {
              ...b,
              historicalOffsetSessions: b.historicalOffsetSessions + delta,
            }
          : b,
      );
    });
    vi.mocked(adjustPaidOffset).mockImplementation(async (clientId, delta) => {
      billingStore = billingStore.map((b) =>
        b.clientId === clientId
          ? { ...b, totalPaidOffset: b.totalPaidOffset + delta }
          : b,
      );
    });

    await renderSurface();
    fireEvent.click(
      screen.getByRole("button", { name: "Adjust counts for Alice Adams" }),
    );

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Increase completed count for Alice Adams",
      }),
    );
    await waitFor(() => {
      expect(adjustSessionOffset).toHaveBeenCalledWith("alice", 1);
    });
    await waitFor(() => {
      expect(
        rowFor("alice").querySelector('[data-testid="row-completed"]')!
          .textContent,
      ).toBe("9");
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Increase paid count for Alice Adams",
      }),
    );
    await waitFor(() => {
      expect(adjustPaidOffset).toHaveBeenCalledWith("alice", 1);
    });
    await waitFor(() => {
      expect(
        rowFor("alice").querySelector('[data-testid="row-paid"]')!.textContent,
      ).toBe("7");
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Decrease completed count for Alice Adams",
      }),
    );
    await waitFor(() => {
      expect(adjustSessionOffset).toHaveBeenCalledWith("alice", -1);
    });
  });
});

describe("TrainerPaymentsSurface — payment history", () => {
  it("lists payments across all clients, newest first, with client names", async () => {
    paymentsStore = [
      payment("new", "bob", { amount: 300, paidAt: "2026-07-20T00:00:00.000Z" }),
      payment("old", "alice", { amount: 100, paidAt: "2026-05-01T00:00:00.000Z" }),
    ];
    await renderSurface();

    openHistoryTab();

    const items = await waitFor(() => {
      const found = document.querySelectorAll(
        '[data-testid="payments-history-item"]',
      );
      expect(found).toHaveLength(2);
      return found;
    });

    expect(items[0].textContent).toContain("Bob Brown");
    expect(items[0].textContent).toContain("$300.00");
    expect(items[0].textContent).toContain("4 sessions");
    expect(items[0].textContent).toContain("Bank Transfer");
    expect(items[1].textContent).toContain("Alice Adams");
    expect(items[1].textContent).toContain("$100.00");
  });

  it("shows an empty history state", async () => {
    paymentsStore = [];
    await renderSurface();

    openHistoryTab();
    expect(await screen.findByTestId("payments-history-empty")).toBeDefined();
    expect(screen.getByText("No payment history yet")).toBeDefined();
  });
});
