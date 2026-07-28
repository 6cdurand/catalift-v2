import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ClientPaymentsSection } from "../components/ClientPaymentsSection";
import { fetchClientBilling } from "../api/billing";
import {
  adjustPaidOffset,
  fetchClientPayments,
  logPayment,
  updateClientRate,
} from "../api/payments";
import { addManualSession, fetchClientSessions } from "../api/sessions";
import type { ClientBilling, ClientPayment, ClientSession } from "../types";

vi.mock("../api/billing", () => ({
  fetchClientBilling: vi.fn(),
}));

vi.mock("../api/payments", () => ({
  fetchClientPayments: vi.fn(),
  logPayment: vi.fn(),
  adjustPaidOffset: vi.fn(),
  updateClientRate: vi.fn(),
}));

vi.mock("../api/sessions", () => ({
  fetchClientSessions: vi.fn(),
  addManualSession: vi.fn(),
}));

const CLIENT_ID = "client-1";
const TRAINER_ID = "trainer-1";

let billingStore: ClientBilling;
let sessionsStore: ClientSession[];
let paymentsStore: ClientPayment[];

function makeSession(id: string): ClientSession {
  return {
    id,
    trainerId: TRAINER_ID,
    clientId: CLIENT_ID,
    sessionDate: "2026-07-20",
    source: "pt_completion",
    workoutId: null,
    calendarEventId: `program:p1:0:2026-07-20`,
    notes: null,
    createdAt: "2026-07-20T00:00:00.000Z",
  };
}

function makePayment(overrides: Partial<ClientPayment> = {}): ClientPayment {
  return {
    id: "pay-1",
    trainerId: TRAINER_ID,
    clientId: CLIENT_ID,
    amount: 200,
    currency: "NZD",
    sessionsIncluded: 4,
    method: "bank_transfer",
    status: "paid",
    description: "4-session block",
    paidAt: "2026-07-01T00:00:00.000Z",
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  billingStore = {
    historicalOffsetSessions: 5,
    totalPaidOffset: 2,
    pricePerSession: 50,
  };
  sessionsStore = [makeSession("s1"), makeSession("s2"), makeSession("s3")];
  paymentsStore = [makePayment()];

  vi.mocked(fetchClientBilling).mockImplementation(async () => ({
    ...billingStore,
  }));
  vi.mocked(fetchClientSessions).mockImplementation(async () => [
    ...sessionsStore,
  ]);
  vi.mocked(fetchClientPayments).mockImplementation(async () => [
    ...paymentsStore,
  ]);
});

afterEach(() => cleanup());

async function renderSection() {
  render(<ClientPaymentsSection clientId={CLIENT_ID} />);
  await screen.findByTestId("stat-completed");
}

describe("ClientPaymentsSection — derived summary", () => {
  it("renders sessions completed as offset + client_sessions rows", async () => {
    await renderSection();
    // historical_offset_sessions (5) + 3 session rows
    expect(screen.getByTestId("stat-completed").textContent).toBe("8");
  });

  it("renders paid sessions as paid offset + sessions_included of paid payments", async () => {
    await renderSection();
    // total_paid_offset (2) + one paid payment with sessions_included 4
    expect(screen.getByTestId("stat-paid").textContent).toBe("6");
  });

  it("renders outstanding amount using price_per_session", async () => {
    await renderSection();
    // (8 - 6) outstanding sessions * 50
    expect(screen.getByTestId("stat-outstanding").textContent).toBe("$100.00");
  });

  it("falls back to outstanding session count when no rate is set", async () => {
    billingStore = { ...billingStore, pricePerSession: null };
    await renderSection();
    expect(screen.getByTestId("stat-outstanding").textContent).toBe("2");
  });

  it("counts synthetic program:<id>:<day>:<date> sessions like any other completed session", async () => {
    billingStore = { ...billingStore, historicalOffsetSessions: 0 };
    await renderSection();
    expect(screen.getByTestId("stat-completed").textContent).toBe("3");
  });
});

describe("ClientPaymentsSection — outstanding warning", () => {
  it("shows exactly one amber warning when hasOutstanding is true", async () => {
    await renderSection();
    const warnings = screen.getAllByTestId("outstanding-warning");
    expect(warnings).toHaveLength(1);
    expect(warnings[0].textContent).toContain("2 sessions outstanding");
    expect(warnings[0].textContent).toContain("$100.00");
  });

  it("hides the warning when paid covers completed", async () => {
    billingStore = { ...billingStore, totalPaidOffset: 4 };
    await renderSection();
    expect(screen.getByTestId("stat-completed").textContent).toBe("8");
    expect(screen.getByTestId("stat-paid").textContent).toBe("8");
    expect(screen.queryByTestId("outstanding-warning")).toBeNull();
  });

  it("singularises the warning copy for one outstanding session", async () => {
    billingStore = { ...billingStore, totalPaidOffset: 3 };
    await renderSection();
    expect(screen.getByTestId("outstanding-warning").textContent).toContain(
      "1 session outstanding",
    );
  });
});

describe("ClientPaymentsSection — payment history", () => {
  it("renders an empty state when there are no payments", async () => {
    paymentsStore = [];
    await renderSection();
    expect(screen.getByTestId("payment-history-empty")).toBeDefined();
    expect(screen.getByText("No payments logged yet")).toBeDefined();
  });

  it("renders payment rows with amount, sessions, method and status", async () => {
    await renderSection();
    const items = screen.getAllByTestId("payment-history-item");
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toContain("$200.00");
    expect(items[0].textContent).toContain("4 sessions");
    expect(items[0].textContent).toContain("Bank Transfer");
    expect(items[0].textContent).toContain("paid");
    expect(items[0].textContent).toContain("4-session block");
  });

  it("orders history newest first, following the fetch order", async () => {
    paymentsStore = [
      makePayment({ id: "new", amount: 300, paidAt: "2026-07-20T00:00:00.000Z" }),
      makePayment({ id: "old", amount: 100, paidAt: "2026-05-01T00:00:00.000Z" }),
    ];
    await renderSection();
    const items = screen.getAllByTestId("payment-history-item");
    expect(items[0].textContent).toContain("$300.00");
    expect(items[1].textContent).toContain("$100.00");
  });
});

describe("ClientPaymentsSection — log payment", () => {
  it("calls logPayment and refreshes the summary and history", async () => {
    vi.mocked(logPayment).mockImplementation(async (params) => {
      const created = makePayment({
        id: "pay-2",
        amount: params.amount,
        sessionsIncluded: params.sessionsIncluded ?? 1,
        description: params.description ?? null,
      });
      paymentsStore = [created, ...paymentsStore];
      return created;
    });

    await renderSection();
    expect(screen.getByTestId("stat-paid").textContent).toBe("6");

    fireEvent.click(screen.getByRole("button", { name: /log payment/i }));

    fireEvent.change(await screen.findByLabelText(/^Amount/), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText(/sessions included/i), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cash" }));
    fireEvent.click(screen.getByRole("button", { name: /save payment/i }));

    await waitFor(() => {
      expect(logPayment).toHaveBeenCalledTimes(1);
    });

    expect(vi.mocked(logPayment).mock.calls[0][0]).toMatchObject({
      clientId: CLIENT_ID,
      amount: 100,
      sessionsIncluded: 2,
      method: "cash",
    });

    // 2 (offset) + 4 (existing) + 2 (new) = 8
    await waitFor(() => {
      expect(screen.getByTestId("stat-paid").textContent).toBe("8");
    });
    expect(screen.getAllByTestId("payment-history-item")).toHaveLength(2);
    expect(screen.queryByTestId("outstanding-warning")).toBeNull();
  });

  it("rejects a negative amount without calling logPayment", async () => {
    await renderSection();
    fireEvent.click(screen.getByRole("button", { name: /log payment/i }));

    fireEvent.change(await screen.findByLabelText(/^Amount/), {
      target: { value: "-5" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save payment/i }));

    expect(await screen.findByText("Amount must be 0 or more")).toBeDefined();
    expect(logPayment).not.toHaveBeenCalled();
  });

  it("rejects negative sessionsIncluded without calling logPayment", async () => {
    await renderSection();
    fireEvent.click(screen.getByRole("button", { name: /log payment/i }));

    fireEvent.change(await screen.findByLabelText(/^Amount/), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText(/sessions included/i), {
      target: { value: "-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save payment/i }));

    expect(
      await screen.findByText(
        "Sessions included must be a whole number, 0 or more",
      ),
    ).toBeDefined();
    expect(logPayment).not.toHaveBeenCalled();
  });
});

describe("ClientPaymentsSection — per-session rate", () => {
  it("updates outstandingAmount only, leaving session counts untouched", async () => {
    vi.mocked(updateClientRate).mockImplementation(async (_id, price) => {
      billingStore = { ...billingStore, pricePerSession: price };
    });

    await renderSection();
    expect(screen.getByTestId("stat-outstanding").textContent).toBe("$100.00");

    fireEvent.change(screen.getByLabelText(/per-session rate/i), {
      target: { value: "80" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(updateClientRate).toHaveBeenCalledWith(CLIENT_ID, 80);
    });

    await waitFor(() => {
      expect(screen.getByTestId("stat-outstanding").textContent).toBe("$160.00");
    });

    expect(screen.getByTestId("stat-completed").textContent).toBe("8");
    expect(screen.getByTestId("stat-paid").textContent).toBe("6");
  });

  it("rejects a negative rate", async () => {
    await renderSection();
    fireEvent.change(screen.getByLabelText(/per-session rate/i), {
      target: { value: "-10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Rate must be 0 or more")).toBeDefined();
    expect(updateClientRate).not.toHaveBeenCalled();
  });
});

describe("ClientPaymentsSection — manual adjust", () => {
  it("adds a manual session via addManualSession", async () => {
    vi.mocked(addManualSession).mockImplementation(async () => {
      const created: ClientSession = {
        ...makeSession("s4"),
        source: "manual_plus_one",
        calendarEventId: null,
      };
      sessionsStore = [created, ...sessionsStore];
      return created;
    });

    await renderSection();
    fireEvent.click(screen.getByRole("button", { name: /adjust counts/i }));
    fireEvent.click(
      await screen.findByRole("button", { name: /add one completed session/i }),
    );

    await waitFor(() => {
      expect(addManualSession).toHaveBeenCalledWith(CLIENT_ID);
    });
    await waitFor(() => {
      expect(screen.getByTestId("stat-completed").textContent).toBe("9");
    });
  });

  it("adjusts the paid offset by +1 and -1", async () => {
    vi.mocked(adjustPaidOffset).mockImplementation(async (_id, delta) => {
      billingStore = {
        ...billingStore,
        totalPaidOffset: billingStore.totalPaidOffset + delta,
      };
    });

    await renderSection();
    fireEvent.click(screen.getByRole("button", { name: /adjust counts/i }));

    fireEvent.click(
      await screen.findByRole("button", { name: /increase paid count/i }),
    );
    await waitFor(() => {
      expect(adjustPaidOffset).toHaveBeenCalledWith(CLIENT_ID, 1);
    });
    await waitFor(() => {
      expect(screen.getByTestId("stat-paid").textContent).toBe("7");
    });

    fireEvent.click(screen.getByRole("button", { name: /decrease paid count/i }));
    await waitFor(() => {
      expect(adjustPaidOffset).toHaveBeenCalledWith(CLIENT_ID, -1);
    });
    await waitFor(() => {
      expect(screen.getByTestId("stat-paid").textContent).toBe("6");
    });
  });
});
