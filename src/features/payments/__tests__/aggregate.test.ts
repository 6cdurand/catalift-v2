import { describe, expect, it } from "vitest";

import {
  buildTrainerEarnings,
  buildTrainerPaymentRows,
  dominantCurrency,
  FALLBACK_CURRENCY,
} from "../lib/aggregate";
import { DEFAULT_CURRENCY } from "../hooks/useClientPayments";
import type {
  ClientPayment,
  ClientSession,
  TrainerClientBilling,
} from "../types";

const TRAINER_ID = "trainer-1";

function billing(
  clientId: string,
  name: string,
  overrides: Partial<TrainerClientBilling> = {},
): TrainerClientBilling {
  return {
    clientId,
    name,
    avatarUrl: null,
    status: "active",
    historicalOffsetSessions: 0,
    totalPaidOffset: 0,
    pricePerSession: null,
    ...overrides,
  };
}

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

/**
 * Roster fixture:
 * - Alice: offset 5 + 3 session rows = 8 completed; paid offset 2 + 4 included = 6 paid; @ $50 → 2 outstanding / $100
 * - Bob:   0 offset + 2 session rows = 2 completed; 0 paid; @ $100 → 2 outstanding / $200
 * - Cara:  offsets only (3 completed / 3 paid), no rate → square, no amount
 */
function fixture() {
  return {
    billing: [
      billing("alice", "Alice", {
        historicalOffsetSessions: 5,
        totalPaidOffset: 2,
        pricePerSession: 50,
      }),
      billing("bob", "Bob", { pricePerSession: 100 }),
      billing("cara", "Cara", {
        historicalOffsetSessions: 3,
        totalPaidOffset: 3,
      }),
    ],
    sessions: [
      session("s1", "alice"),
      session("s2", "alice"),
      session("s3", "alice"),
      session("s4", "bob"),
      session("s5", "bob"),
    ],
    payments: [payment("p1", "alice")],
  };
}

describe("buildTrainerPaymentRows — per-client rows", () => {
  it("derives completed / paid / outstanding from the F2 primitives", () => {
    const { billing: b, sessions, payments } = fixture();
    const { rows } = buildTrainerPaymentRows(b, sessions, payments);

    const alice = rows.find((r) => r.clientId === "alice")!;
    expect(alice.completedSessions).toBe(8);
    expect(alice.paidSessions).toBe(6);
    expect(alice.outstandingSessions).toBe(2);
    expect(alice.outstandingAmount).toBe(100);
    expect(alice.hasOutstanding).toBe(true);
    expect(alice.paidAmount).toBe(200);
  });

  it("counts a client whose numbers come from offsets only, with no rows", () => {
    const { billing: b, sessions, payments } = fixture();
    const { rows } = buildTrainerPaymentRows(b, sessions, payments);

    const cara = rows.find((r) => r.clientId === "cara")!;
    expect(cara.completedSessions).toBe(3);
    expect(cara.paidSessions).toBe(3);
    expect(cara.outstandingSessions).toBe(0);
    expect(cara.hasOutstanding).toBe(false);
    // No rate set → no money figure, only the session count.
    expect(cara.outstandingAmount).toBeNull();
    expect(cara.payments).toEqual([]);
  });

  it("changing the rate moves outstandingAmount but NOT the counts", () => {
    const { billing: b, sessions, payments } = fixture();
    const before = buildTrainerPaymentRows(b, sessions, payments).rows.find(
      (r) => r.clientId === "alice",
    )!;

    const repriced = b.map((row) =>
      row.clientId === "alice" ? { ...row, pricePerSession: 80 } : row,
    );
    const after = buildTrainerPaymentRows(repriced, sessions, payments).rows.find(
      (r) => r.clientId === "alice",
    )!;

    expect(after.outstandingAmount).toBe(160);
    expect(before.outstandingAmount).toBe(100);
    expect(after.completedSessions).toBe(before.completedSessions);
    expect(after.paidSessions).toBe(before.paidSessions);
    expect(after.outstandingSessions).toBe(before.outstandingSessions);
  });

  it("ignores unpaid payment rows when counting paid sessions", () => {
    const { billing: b, sessions } = fixture();
    const { rows } = buildTrainerPaymentRows(b, sessions, [
      payment("p1", "alice"),
      payment("p2", "alice", { status: "pending", sessionsIncluded: 10 }),
    ]);

    expect(rows.find((r) => r.clientId === "alice")!.paidSessions).toBe(6);
  });
});

describe("buildTrainerPaymentRows — totals", () => {
  it("rolls up outstanding, paid and completed across the roster", () => {
    const { billing: b, sessions, payments } = fixture();
    const { totals } = buildTrainerPaymentRows(b, sessions, payments);

    expect(totals.outstandingAmount).toBe(300);
    expect(totals.outstandingSessions).toBe(4);
    expect(totals.clientsWithOutstanding).toBe(2);
    expect(totals.totalPaid).toBe(200);
    expect(totals.completedSessions).toBe(13);
    expect(totals.paidSessions).toBe(9);
    expect(totals.activeClients).toBe(3);
    expect(totals.currency).toBe("NZD");
    expect(totals.excludedCurrencies).toEqual([]);
  });

  it("counts only active connections as active clients", () => {
    const { sessions, payments } = fixture();
    const { totals } = buildTrainerPaymentRows(
      [
        billing("alice", "Alice"),
        billing("pending", "Pat", { status: "pending" }),
      ],
      sessions,
      payments,
    );

    expect(totals.activeClients).toBe(1);
  });

  it("returns zeroed totals and no rows for an empty roster", () => {
    const { rows, totals } = buildTrainerPaymentRows([], [], []);

    expect(rows).toEqual([]);
    expect(totals).toEqual({
      currency: FALLBACK_CURRENCY,
      excludedCurrencies: [],
      outstandingAmount: 0,
      outstandingSessions: 0,
      clientsWithOutstanding: 0,
      totalPaid: 0,
      completedSessions: 0,
      paidSessions: 0,
      activeClients: 0,
    });
  });
});

describe("buildTrainerPaymentRows — sort order", () => {
  it("puts outstanding clients first (largest first), then alphabetical", () => {
    const { billing: b, sessions, payments } = fixture();
    const { rows } = buildTrainerPaymentRows(b, sessions, payments);

    // Bob owes $200, Alice owes $100, Cara is square.
    expect(rows.map((r) => r.clientId)).toEqual(["bob", "alice", "cara"]);
  });

  it("sorts square clients alphabetically", () => {
    const { rows } = buildTrainerPaymentRows(
      [billing("z", "Zoe"), billing("a", "Ana"), billing("m", "Mia")],
      [],
      [],
    );

    expect(rows.map((r) => r.name)).toEqual(["Ana", "Mia", "Zoe"]);
  });

  it("ranks rated outstanding rows above unrated ones, then by session count", () => {
    const { rows } = buildTrainerPaymentRows(
      [
        billing("rated", "Rated", {
          historicalOffsetSessions: 1,
          pricePerSession: 10,
        }),
        billing("unrated-many", "Unrated Many", {
          historicalOffsetSessions: 9,
        }),
        billing("unrated-few", "Unrated Few", { historicalOffsetSessions: 2 }),
      ],
      [],
      [],
    );

    expect(rows.map((r) => r.clientId)).toEqual([
      "rated",
      "unrated-many",
      "unrated-few",
    ]);
  });
});

describe("mixed currencies", () => {
  it("picks the dominant currency and never sums across rates", () => {
    const payments = [
      payment("p1", "alice", { currency: "NZD", amount: 100 }),
      payment("p2", "alice", { currency: "NZD", amount: 50 }),
      payment("p3", "bob", { currency: "USD", amount: 900 }),
    ];

    expect(dominantCurrency(payments)).toBe("NZD");

    const { totals } = buildTrainerPaymentRows(
      [billing("alice", "Alice"), billing("bob", "Bob")],
      [],
      payments,
    );

    expect(totals.currency).toBe("NZD");
    expect(totals.totalPaid).toBe(150);
    expect(totals.excludedCurrencies).toEqual(["USD"]);
  });

  it("falls back to NZD when there are no payments at all", () => {
    expect(dominantCurrency([])).toBe(FALLBACK_CURRENCY);
    expect(FALLBACK_CURRENCY).toBe("NZD");
  });

  it("uses the same fallback currency as the per-client hook", () => {
    expect(FALLBACK_CURRENCY).toBe(DEFAULT_CURRENCY);
  });

  it("excludes a foreign-currency client's outstanding from the money total", () => {
    const payments = [
      payment("p1", "alice", {
        currency: "NZD",
        amount: 100,
        sessionsIncluded: 0,
      }),
      payment("p2", "alice", {
        currency: "NZD",
        amount: 100,
        sessionsIncluded: 0,
      }),
      payment("p3", "bob", { currency: "USD", amount: 10, sessionsIncluded: 0 }),
    ];

    const { totals, rows } = buildTrainerPaymentRows(
      [
        billing("alice", "Alice", {
          historicalOffsetSessions: 3,
          pricePerSession: 10,
        }),
        billing("bob", "Bob", {
          historicalOffsetSessions: 5,
          pricePerSession: 20,
        }),
      ],
      [],
      payments,
    );

    expect(rows.find((r) => r.clientId === "bob")!.currency).toBe("USD");
    // Alice: 3 outstanding @ $10 = 30 (NZD). Bob's $100 USD is not summed in.
    expect(totals.outstandingAmount).toBe(30);
    // Session counts stay currency-agnostic.
    expect(totals.outstandingSessions).toBe(8);
  });
});

describe("buildTrainerEarnings", () => {
  const now = new Date("2026-07-15T12:00:00.000Z"); // Wednesday

  it("sums all-time, this-week and this-month amounts", () => {
    const earnings = buildTrainerEarnings(
      [
        payment("p1", "alice", { paidAt: "2026-07-15T09:00:00.000Z", amount: 50 }),
        payment("p2", "alice", { paidAt: "2026-07-02T09:00:00.000Z", amount: 70 }),
        payment("p3", "bob", { paidAt: "2026-05-02T09:00:00.000Z", amount: 30 }),
      ],
      now,
    );

    expect(earnings.total).toBe(150);
    expect(earnings.week).toBe(50);
    expect(earnings.month).toBe(120);
    expect(earnings.currency).toBe("NZD");
  });

  it("falls back to created_at when paid_at is null", () => {
    const earnings = buildTrainerEarnings(
      [
        payment("p1", "alice", {
          paidAt: null,
          createdAt: "2026-07-14T09:00:00.000Z",
          amount: 25,
        }),
      ],
      now,
    );

    expect(earnings.week).toBe(25);
    expect(earnings.month).toBe(25);
    expect(earnings.total).toBe(25);
  });

  it("returns zeros for no payments", () => {
    const earnings = buildTrainerEarnings([], now);
    expect(earnings).toEqual({
      currency: FALLBACK_CURRENCY,
      excludedCurrencies: [],
      total: 0,
      week: 0,
      month: 0,
    });
  });

  it("excludes non-dominant currencies from every window", () => {
    const earnings = buildTrainerEarnings(
      [
        payment("p1", "alice", { paidAt: "2026-07-15T09:00:00.000Z", amount: 10 }),
        payment("p2", "alice", { paidAt: "2026-07-15T09:00:00.000Z", amount: 10 }),
        payment("p3", "bob", {
          paidAt: "2026-07-15T09:00:00.000Z",
          amount: 999,
          currency: "AUD",
        }),
      ],
      now,
    );

    expect(earnings.currency).toBe("NZD");
    expect(earnings.week).toBe(20);
    expect(earnings.total).toBe(20);
    expect(earnings.excludedCurrencies).toEqual(["AUD"]);
  });
});
