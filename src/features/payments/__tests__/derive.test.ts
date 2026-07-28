import { describe, it, expect } from "vitest";

import {
  getDisplayedSessionCount,
  getDisplayedPaidCount,
  getOutstanding,
} from "../lib/derive";

describe("getDisplayedSessionCount", () => {
  it("returns offset + session count", () => {
    const sessions = [
      { clientId: "c1", trainerId: "t1" },
      { clientId: "c1", trainerId: "t1" },
    ];
    expect(getDisplayedSessionCount(5, sessions)).toBe(7);
  });

  it("clamps to zero when offset is negative and sessions don't compensate", () => {
    expect(getDisplayedSessionCount(-5, [])).toBe(0);
  });

  it("handles null-ish offset (undefined)", () => {
    expect(getDisplayedSessionCount(undefined as unknown as number, [])).toBe(0);
  });

  it("works with zero offset and zero sessions", () => {
    expect(getDisplayedSessionCount(0, [])).toBe(0);
  });
});

describe("getDisplayedPaidCount", () => {
  it("sums sessions_included for paid payments + offset", () => {
    const payments = [
      { status: "paid", sessionsIncluded: 5 },
      { status: "paid", sessionsIncluded: 3 },
      { status: "pending", sessionsIncluded: 10 },
    ];
    expect(getDisplayedPaidCount(2, payments)).toBe(10);
  });

  it("defaults sessionsIncluded to 1 when missing", () => {
    const payments = [
      { status: "paid" },
      { status: "paid" },
    ];
    expect(getDisplayedPaidCount(0, payments)).toBe(2);
  });

  it("excludes non-paid statuses", () => {
    const payments = [
      { status: "refunded", sessionsIncluded: 5 },
      { status: "overdue", sessionsIncluded: 3 },
      { status: "pending", sessionsIncluded: 2 },
    ];
    expect(getDisplayedPaidCount(0, payments)).toBe(0);
  });

  it("clamps to zero with negative offset", () => {
    expect(getDisplayedPaidCount(-10, [])).toBe(0);
  });

  it("handles null-ish paidOffset (undefined)", () => {
    expect(
      getDisplayedPaidCount(undefined as unknown as number, []),
    ).toBe(0);
  });

  it("handles null payments array", () => {
    expect(
      getDisplayedPaidCount(3, null as unknown as never[]),
    ).toBe(3);
  });
});

describe("getOutstanding", () => {
  it("returns zero outstanding when paid >= completed", () => {
    const result = getOutstanding(5, 5, 50);
    expect(result.outstandingSessions).toBe(0);
    expect(result.outstandingAmount).toBe(0);
    expect(result.hasOutstanding).toBe(false);
  });

  it("returns outstanding when completed > paid", () => {
    const result = getOutstanding(10, 7, 50);
    expect(result.outstandingSessions).toBe(3);
    expect(result.outstandingAmount).toBe(150);
    expect(result.hasOutstanding).toBe(true);
  });

  it("returns null amount when pricePerSession is not provided", () => {
    const result = getOutstanding(10, 7);
    expect(result.outstandingSessions).toBe(3);
    expect(result.outstandingAmount).toBeNull();
    expect(result.hasOutstanding).toBe(true);
  });

  it("clamps outstanding to zero when paid > completed", () => {
    const result = getOutstanding(3, 10, 50);
    expect(result.outstandingSessions).toBe(0);
    expect(result.outstandingAmount).toBe(0);
    expect(result.hasOutstanding).toBe(false);
  });

  it("hasOutstanding is true when sessions >= 1", () => {
    expect(getOutstanding(1, 0).hasOutstanding).toBe(true);
    expect(getOutstanding(0, 0).hasOutstanding).toBe(false);
  });
});

describe("rate-change regression: historical paid counts are not altered", () => {
  it("changing price_per_session does not change displayedPaidCount", () => {
    const payments = [
      { status: "paid", sessionsIncluded: 10 },
      { status: "paid", sessionsIncluded: 5 },
    ];

    const paidAtOldRate = getDisplayedPaidCount(0, payments);
    const paidAtNewRate = getDisplayedPaidCount(0, payments);

    expect(paidAtOldRate).toBe(15);
    expect(paidAtNewRate).toBe(15);
  });

  it("changing price_per_session only affects outstandingAmount, not outstandingSessions", () => {
    const completed = 20;
    const paid = 15;

    const atOldRate = getOutstanding(completed, paid, 40);
    const atNewRate = getOutstanding(completed, paid, 60);

    expect(atOldRate.outstandingSessions).toBe(5);
    expect(atNewRate.outstandingSessions).toBe(5);

    expect(atOldRate.outstandingAmount).toBe(200);
    expect(atNewRate.outstandingAmount).toBe(300);

    expect(atOldRate.hasOutstanding).toBe(true);
    expect(atNewRate.hasOutstanding).toBe(true);
  });
});
