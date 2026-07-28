import { describe, it, expect } from "vitest";

import {
  DAYS_IN_WEEK,
  formatAccessibleDate,
  formatDayNumber,
  formatMonthDay,
  formatWeekdayLong,
  formatWeekdayShort,
  getWeekDays,
  getWeekWindow,
  parseISODate,
  shiftISODate,
  startOfWeekISO,
  toISODate,
} from "../week";

describe("toISODate / parseISODate", () => {
  it("round-trips an ISO date through local midnight", () => {
    expect(toISODate(parseISODate("2026-07-28"))).toBe("2026-07-28");
  });

  it("uses local-time fields, not UTC (no off-by-one)", () => {
    // 23:30 local on the 28th must still be the 28th, whatever the tz offset.
    const late = new Date(2026, 6, 28, 23, 30, 0);
    expect(toISODate(late)).toBe("2026-07-28");
  });

  it("pads month and day", () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("startOfWeekISO", () => {
  it("returns the Monday of the week (weeks start Monday)", () => {
    // 2026-07-28 is a Tuesday.
    expect(startOfWeekISO("2026-07-28")).toBe("2026-07-27");
  });

  it("treats Monday as its own week start", () => {
    expect(startOfWeekISO("2026-07-27")).toBe("2026-07-27");
  });

  it("keeps Sunday in the week that started the previous Monday", () => {
    // 2026-08-02 is a Sunday.
    expect(startOfWeekISO("2026-08-02")).toBe("2026-07-27");
  });
});

describe("getWeekDays", () => {
  it("returns 7 consecutive ISO dates Mon→Sun", () => {
    expect(getWeekDays("2026-07-27")).toEqual([
      "2026-07-27",
      "2026-07-28",
      "2026-07-29",
      "2026-07-30",
      "2026-07-31",
      "2026-08-01",
      "2026-08-02",
    ]);
  });

  it("crosses a month boundary without gaps", () => {
    const days = getWeekDays("2026-08-31");
    expect(days).toHaveLength(DAYS_IN_WEEK);
    expect(days[0]).toBe("2026-08-31");
    expect(days[DAYS_IN_WEEK - 1]).toBe("2026-09-06");
  });

  it("crosses a year boundary without gaps", () => {
    const days = getWeekDays("2026-12-28");
    expect(days[0]).toBe("2026-12-28");
    expect(days[DAYS_IN_WEEK - 1]).toBe("2027-01-03");
  });
});

describe("shiftISODate", () => {
  it("shifts forward by a whole week", () => {
    expect(shiftISODate("2026-07-27", 7)).toBe("2026-08-03");
  });

  it("shifts backward by a whole week", () => {
    expect(shiftISODate("2026-07-27", -7)).toBe("2026-07-20");
  });

  it("shifts a single day across a month boundary", () => {
    expect(shiftISODate("2026-07-31", 1)).toBe("2026-08-01");
    expect(shiftISODate("2026-08-01", -1)).toBe("2026-07-31");
  });

  it("shifts a single day across a year boundary", () => {
    expect(shiftISODate("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("handles a leap day", () => {
    expect(shiftISODate("2028-02-28", 1)).toBe("2028-02-29");
    expect(shiftISODate("2028-02-29", 1)).toBe("2028-03-01");
  });

  it("is calendar-based, so a DST transition never skips or repeats a date", () => {
    // Around DST changes a naive +24h shift lands on the wrong calendar date.
    // Walk a full year one day at a time and assert we hit every date exactly
    // once, in order.
    let cursor = "2026-01-01";
    const seen = new Set<string>([cursor]);
    for (let step = 0; step < 365; step++) {
      const next = shiftISODate(cursor, 1);
      expect(next > cursor).toBe(true);
      expect(seen.has(next)).toBe(false);
      seen.add(next);
      cursor = next;
    }
    expect(cursor).toBe("2027-01-01");
  });
});

describe("getWeekWindow", () => {
  it("produces a Mon→Sun window around the anchor", () => {
    const window = getWeekWindow("2026-07-30");
    expect(window.weekStart).toBe("2026-07-27");
    expect(window.rangeStart).toBe("2026-07-27");
    expect(window.rangeEnd).toBe("2026-08-02");
    expect(window.days).toHaveLength(DAYS_IN_WEEK);
    expect(window.days[0]).toBe(window.rangeStart);
    expect(window.days[DAYS_IN_WEEK - 1]).toBe(window.rangeEnd);
  });

  it("shifting the anchor by ±7 days moves the window by exactly one week", () => {
    const base = getWeekWindow("2026-07-28");
    const forward = getWeekWindow(shiftISODate("2026-07-28", DAYS_IN_WEEK));
    const back = getWeekWindow(shiftISODate("2026-07-28", -DAYS_IN_WEEK));

    expect(forward.weekStart).toBe(shiftISODate(base.weekStart, DAYS_IN_WEEK));
    expect(back.weekStart).toBe(shiftISODate(base.weekStart, -DAYS_IN_WEEK));
  });
});

describe("display formatting", () => {
  it("formats the pill labels", () => {
    expect(formatWeekdayShort("2026-07-27")).toBe("MON");
    expect(formatDayNumber("2026-07-27")).toBe("27");
    expect(formatDayNumber("2026-07-05")).toBe("5");
  });

  it("formats the schedule header date", () => {
    expect(formatMonthDay("2026-07-28")).toBe("Jul 28");
  });

  it("formats the empty-state weekday", () => {
    expect(formatWeekdayLong("2026-07-28")).toBe("Tuesday");
  });

  it("formats the accessible pill name", () => {
    expect(formatAccessibleDate("2026-07-28")).toBe("Tuesday 28 July");
  });
});
