import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import { DayView } from "../DayView";
import type { ScheduledSession } from "../../types";

afterEach(() => cleanup());

function makeSession(
  date: string,
  status: ScheduledSession["status"],
  label = "Push",
): ScheduledSession {
  return { date, dayIndex: 0, dayRef: label, label, status, kind: "program-day" };
}

describe("DayView", () => {
  const sessions: ScheduledSession[] = [makeSession("2024-01-10", "upcoming")];

  it("renders a single day grid for the given date", () => {
    const { container } = render(<DayView sessions={sessions} date="2024-01-10" />);
    const grid = container.querySelector('[data-slot="day-grid"]');
    expect(grid).not.toBeNull();
    expect(grid?.getAttribute("data-date")).toBe("2024-01-10");
  });

  it("renders the full 06:00–19:00 hour grid (14 rows)", () => {
    const { container } = render(<DayView sessions={sessions} date="2024-01-10" />);
    expect(container.querySelectorAll("[data-hour]").length).toBe(14);
  });

  it("does NOT duplicate a date label (CalendarGrid's nav header owns that)", () => {
    render(<DayView sessions={sessions} date="2024-01-10" />);
    expect(screen.queryByText("Wed, Jan 10")).toBeNull();
  });

  it("auto-selects the displayed day on mount (day view IS the selected day)", () => {
    const onSelectDay = vi.fn();
    render(<DayView sessions={sessions} date="2024-01-10" onSelectDay={onSelectDay} />);
    expect(onSelectDay).toHaveBeenCalledWith("2024-01-10", sessions);
  });

  it("re-fires onSelectDay when the displayed date changes", () => {
    const onSelectDay = vi.fn();
    const { rerender } = render(
      <DayView sessions={sessions} date="2024-01-10" onSelectDay={onSelectDay} />,
    );
    onSelectDay.mockClear();
    rerender(<DayView sessions={sessions} date="2024-01-11" onSelectDay={onSelectDay} />);
    expect(onSelectDay).toHaveBeenCalledWith("2024-01-11", []);
  });

  it("clicking an hour slot calls onSlotClick(date, hour)", () => {
    const onSlotClick = vi.fn();
    render(<DayView sessions={sessions} date="2024-01-10" onSlotClick={onSlotClick} />);
    fireEvent.click(screen.getByLabelText("2024-01-10 14:00"));
    expect(onSlotClick).toHaveBeenCalledWith("2024-01-10", 14);
  });
});
