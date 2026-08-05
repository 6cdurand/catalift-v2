import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";

import { WeekView } from "../WeekView";
import { getWeekDates } from "../calendarDate";
import type { ScheduledSession } from "../../types";

afterEach(() => cleanup());

function makeSession(
  date: string,
  status: ScheduledSession["status"],
  label = "Push",
): ScheduledSession {
  return { date, dayIndex: 0, dayRef: label, label, status, kind: "program-day" };
}

describe("WeekView", () => {
  const today = "2024-01-10"; // Wednesday
  const weekDates = getWeekDates(today); // Jan 7 (Sun) – Jan 13 (Sat)
  const sessions: ScheduledSession[] = [
    makeSession("2024-01-08", "done"), // Monday
    makeSession("2024-01-10", "upcoming"), // today
  ];

  it("renders exactly 7 day headers spanning the week", () => {
    const { container } = render(
      <WeekView sessions={sessions} today={today} weekDates={weekDates} selectedDate={null} />,
    );
    expect(container.querySelectorAll("[data-week-date]").length).toBe(7);
    expect(container.querySelector('[data-week-date="2024-01-07"]')).not.toBeNull();
    expect(container.querySelector('[data-week-date="2024-01-13"]')).not.toBeNull();
  });

  it("renders the full 06:00–19:00 hour grid (14 rows)", () => {
    const { container } = render(
      <WeekView sessions={sessions} today={today} weekDates={weekDates} selectedDate={null} />,
    );
    expect(container.querySelectorAll("[data-hour]").length).toBe(14);
    expect(container.querySelector('[data-hour="6"]')).not.toBeNull();
    expect(container.querySelector('[data-hour="19"]')).not.toBeNull();
  });

  it("clicking a day header calls onSelectDay with that day's sessions", () => {
    const onSelectDay = vi.fn();
    const { container } = render(
      <WeekView
        sessions={sessions}
        today={today}
        weekDates={weekDates}
        selectedDate={null}
        onSelectDay={onSelectDay}
      />,
    );
    fireEvent.click(container.querySelector('[data-week-date="2024-01-08"]')!);
    expect(onSelectDay).toHaveBeenCalledWith(
      "2024-01-08",
      sessions.filter((s) => s.date === "2024-01-08"),
    );
  });

  it("clicking an hour slot calls onSlotClick(date, hour)", () => {
    const onSlotClick = vi.fn();
    render(
      <WeekView
        sessions={sessions}
        today={today}
        weekDates={weekDates}
        selectedDate={null}
        onSlotClick={onSlotClick}
      />,
    );
    fireEvent.click(screen.getByLabelText("2024-01-09 09:00"));
    expect(onSlotClick).toHaveBeenCalledWith("2024-01-09", 9);
  });

  // P-08: booked (kind: "booking") sessions position in their hour row.
  it("positions a booked session in the hour row matching its startTime", () => {
    const booking: ScheduledSession = {
      date: "2024-01-09",
      dayIndex: -1,
      dayRef: "PT Session",
      label: "PT Session",
      status: "upcoming",
      kind: "booking",
      startTime: "09:00",
      eventId: "evt-1",
    };
    const { container } = render(
      <WeekView
        sessions={[...sessions, booking]}
        today={today}
        weekDates={weekDates}
        selectedDate={null}
      />,
    );
    const nineAmSlot = screen.getByLabelText("2024-01-09 09:00");
    expect(within(nineAmSlot).getByText(/PT Session/)).not.toBeNull();
    // A different hour on the same day stays empty.
    const tenAmSlot = container.querySelector(
      '[aria-label="2024-01-09 10:00"]',
    );
    expect(tenAmSlot?.querySelector("[data-booking-chip]")).toBeNull();
  });

  it("does not position an untimed program-derived session anywhere in the hour grid", () => {
    const { container } = render(
      <WeekView sessions={sessions} today={today} weekDates={weekDates} selectedDate={null} />,
    );
    expect(container.querySelectorAll("[data-booking-chip]").length).toBe(0);
  });
});
