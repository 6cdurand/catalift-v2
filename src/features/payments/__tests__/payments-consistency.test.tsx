// CONSISTENCY LAW — the numbers for a client on the all-clients tracker
// (/payments) MUST equal the numbers on that client's file (/clients/[id]).
//
// Both surfaces are rendered from the SAME fixture rows: the per-client fetches
// are just filtered views of the roster-wide fetches. If either side ever grows
// its own derivation, these assertions break.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { ClientPaymentsSection } from "../components/ClientPaymentsSection";
import { TrainerPaymentsSurface } from "../components/TrainerPaymentsSurface";
import { fetchClientBilling, fetchTrainerClientBilling } from "../api/billing";
import { fetchClientPayments, fetchTrainerPayments } from "../api/payments";
import { fetchClientSessions, fetchTrainerSessions } from "../api/sessions";
import { buildTrainerPaymentRows } from "../lib/aggregate";
import {
  getDisplayedPaidCount,
  getDisplayedSessionCount,
  getOutstanding,
} from "../lib/derive";
import type {
  ClientPayment,
  ClientSession,
  TrainerClientBilling,
} from "../types";

vi.mock("../api/billing", () => ({
  fetchClientBilling: vi.fn(),
  fetchTrainerClientBilling: vi.fn(),
}));

vi.mock("../api/payments", () => ({
  fetchClientPayments: vi.fn(),
  fetchTrainerPayments: vi.fn(),
  logPayment: vi.fn(),
  adjustPaidOffset: vi.fn(),
  updateClientRate: vi.fn(),
}));

vi.mock("../api/sessions", () => ({
  fetchClientSessions: vi.fn(),
  fetchTrainerSessions: vi.fn(),
  addManualSession: vi.fn(),
  adjustSessionOffset: vi.fn(),
}));

const TRAINER_ID = "trainer-1";
const FIXTURE_CLIENT = "alice";

const ROSTER_BILLING: TrainerClientBilling[] = [
  {
    clientId: FIXTURE_CLIENT,
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
    historicalOffsetSessions: 1,
    totalPaidOffset: 0,
    pricePerSession: 100,
  },
];

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

const ROSTER_SESSIONS: ClientSession[] = [
  session("s1", FIXTURE_CLIENT),
  session("s2", FIXTURE_CLIENT),
  session("s3", FIXTURE_CLIENT),
  session("s4", "bob"),
];

const ROSTER_PAYMENTS: ClientPayment[] = [
  {
    id: "p1",
    trainerId: TRAINER_ID,
    clientId: FIXTURE_CLIENT,
    amount: 200,
    currency: "NZD",
    sessionsIncluded: 4,
    method: "bank_transfer",
    status: "paid",
    description: null,
    paidAt: "2026-07-01T00:00:00.000Z",
    createdAt: "2026-07-01T00:00:00.000Z",
  },
  {
    id: "p2",
    trainerId: TRAINER_ID,
    clientId: "bob",
    amount: 100,
    currency: "NZD",
    sessionsIncluded: 1,
    method: "cash",
    status: "paid",
    description: null,
    paidAt: "2026-06-01T00:00:00.000Z",
    createdAt: "2026-06-01T00:00:00.000Z",
  },
];

beforeEach(() => {
  // Roster-wide reads.
  vi.mocked(fetchTrainerClientBilling).mockImplementation(async () =>
    ROSTER_BILLING.map((b) => ({ ...b })),
  );
  vi.mocked(fetchTrainerSessions).mockImplementation(async () => [
    ...ROSTER_SESSIONS,
  ]);
  vi.mocked(fetchTrainerPayments).mockImplementation(async () => [
    ...ROSTER_PAYMENTS,
  ]);

  // Per-client reads = filtered views of exactly the same rows.
  vi.mocked(fetchClientBilling).mockImplementation(async (clientId) => {
    const row = ROSTER_BILLING.find((b) => b.clientId === clientId)!;
    return {
      historicalOffsetSessions: row.historicalOffsetSessions,
      totalPaidOffset: row.totalPaidOffset,
      pricePerSession: row.pricePerSession,
    };
  });
  vi.mocked(fetchClientSessions).mockImplementation(async (clientId) =>
    ROSTER_SESSIONS.filter((s) => s.clientId === clientId),
  );
  vi.mocked(fetchClientPayments).mockImplementation(async (clientId) =>
    ROSTER_PAYMENTS.filter((p) => p.clientId === clientId),
  );
});

afterEach(() => cleanup());

describe("consistency law — /payments row === /clients/[id] values", () => {
  it("shows identical completed / paid / outstanding for the fixture client", async () => {
    // 1) The client file (UI-A).
    render(<ClientPaymentsSection clientId={FIXTURE_CLIENT} />);
    await screen.findByTestId("stat-completed");
    const clientFile = {
      completed: screen.getByTestId("stat-completed").textContent,
      paid: screen.getByTestId("stat-paid").textContent,
      outstanding: screen.getByTestId("stat-outstanding").textContent,
    };
    cleanup();

    // 2) The all-clients tracker.
    render(<TrainerPaymentsSurface onOpenClient={() => {}} />);
    await screen.findByTestId("trainer-payments-surface");
    const row = document.querySelector(
      `[data-testid="payment-client-row"][data-client-id="${FIXTURE_CLIENT}"]`,
    )!;
    const tracker = {
      completed: row.querySelector('[data-testid="row-completed"]')!.textContent,
      paid: row.querySelector('[data-testid="row-paid"]')!.textContent,
      outstanding: row.querySelector('[data-testid="row-outstanding"]')!
        .textContent,
    };

    expect(tracker).toEqual(clientFile);
    // Sanity: the shared numbers are the expected derived ones, not two zeros.
    expect(tracker).toEqual({
      completed: "8",
      paid: "6",
      outstanding: "$100.00",
    });
  });

  it("derives the row with the same primitives the client hook uses", () => {
    const billing = ROSTER_BILLING[0];
    const sessionsForClient = ROSTER_SESSIONS.filter(
      (s) => s.clientId === FIXTURE_CLIENT,
    );
    const paymentsForClient = ROSTER_PAYMENTS.filter(
      (p) => p.clientId === FIXTURE_CLIENT,
    );

    const completed = getDisplayedSessionCount(
      billing.historicalOffsetSessions,
      sessionsForClient,
    );
    const paid = getDisplayedPaidCount(
      billing.totalPaidOffset,
      paymentsForClient,
    );
    const outstanding = getOutstanding(
      completed,
      paid,
      billing.pricePerSession ?? undefined,
    );

    const row = buildTrainerPaymentRows(
      ROSTER_BILLING,
      ROSTER_SESSIONS,
      ROSTER_PAYMENTS,
    ).rows.find((r) => r.clientId === FIXTURE_CLIENT)!;

    expect(row.completedSessions).toBe(completed);
    expect(row.paidSessions).toBe(paid);
    expect(row.outstandingSessions).toBe(outstanding.outstandingSessions);
    expect(row.outstandingAmount).toBe(outstanding.outstandingAmount);
    expect(row.hasOutstanding).toBe(outstanding.hasOutstanding);
  });
});
