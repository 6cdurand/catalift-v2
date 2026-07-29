import { describe, it, expect } from "vitest";

import {
  CALENDAR_HOURS,
  addDaysISO,
  formatDayHeaderLabel,
  formatHourLabel,
  formatWeekRangeLabel,
  getWeekDates,
} from "../calendarDate";

describe("calendarDate", () => {
  it("CALENDAR_HOURS spans 06:00–19:00 (14 hours, matches v1)", () => {
    expect(CALENDAR_HOURS).toHaveLength(14);
    expect(CALENDAR_HOURS[0]).toBe(6);
    expect(CALENDAR_HOURS[CALENDAR_HOURS.length - 1]).toBe(19);
  });

  it("formatHourLabel pads to HH:00", () => {
    expect(formatHourLabel(6)).toBe("06:00");
    expect(formatHourLabel(19)).toBe("19:00");
  });

  it("addDaysISO adds/subtracts across month and year boundaries", () => {
    expect(addDaysISO("2024-01-10", 1)).toBe("2024-01-11");
    expect(addDaysISO("2024-01-31", 1)).toBe("2024-02-01");
    expect(addDaysISO("2024-01-01", -1)).toBe("2023-12-31");
    expect(addDaysISO("2024-01-10", -7)).toBe("2024-01-03");
  });

  it("getWeekDates returns 7 dates, Sunday-anchored, containing the input date", () => {
    const week = getWeekDates("2024-01-10"); // Wednesday
    expect(week).toEqual([
      "2024-01-07",
      "2024-01-08",
      "2024-01-09",
      "2024-01-10",
      "2024-01-11",
      "2024-01-12",
      "2024-01-13",
    ]);
  });

  it("getWeekDates on a Sunday starts on that same day", () => {
    const week = getWeekDates("2024-01-07"); // Sunday
    expect(week[0]).toBe("2024-01-07");
    expect(week[6]).toBe("2024-01-13");
  });

  it("formatWeekRangeLabel renders a 'Mon d – Mon d' range", () => {
    const week = getWeekDates("2024-01-10");
    expect(formatWeekRangeLabel(week)).toBe("Jan 7 \u2013 Jan 13");
  });

  it("formatDayHeaderLabel renders 'Wkday, Mon d'", () => {
    expect(formatDayHeaderLabel("2024-01-10")).toBe("Wed, Jan 10");
  });
});
