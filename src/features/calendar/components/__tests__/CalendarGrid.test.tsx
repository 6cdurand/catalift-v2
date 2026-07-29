import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import { CalendarGrid } from "../CalendarGrid";
import type { ScheduledSession } from "../../types";

afterEach(() => cleanup());

function makeSession(
  date: string,
  status: ScheduledSession["status"],
  label = "Push",
): ScheduledSession {
  return {
    date,
    dayIndex: 0,
    dayRef: label,
    label,
    status,
    kind: "program-day",
  };
}

describe("CalendarGrid", () => {
  const today = "2024-01-10"; // Wednesday
  const sessions: ScheduledSession[] = [
    makeSession("2024-01-08", "done"), // Monday
    makeSession("2024-01-10", "upcoming"), // Wednesday (today)
    makeSession("2024-01-05", "missed"), // Friday prev week
  ];

  it("renders weekday headers", () => {
    render(
      <CalendarGrid sessions={sessions} today={today} initialMonth={new Date(2024, 0, 1)} />,
    );
    expect(screen.getByText("Sun")).toBeDefined();
    expect(screen.getByText("Mon")).toBeDefined();
    expect(screen.getByText("Tue")).toBeDefined();
    expect(screen.getByText("Wed")).toBeDefined();
    expect(screen.getByText("Thu")).toBeDefined();
    expect(screen.getByText("Fri")).toBeDefined();
    expect(screen.getByText("Sat")).toBeDefined();
  });

  it("renders one cell per day in the month grid (42 cells for 6 rows)", () => {
    const { container } = render(
      <CalendarGrid sessions={sessions} today={today} initialMonth={new Date(2024, 0, 1)} />,
    );
    // January 2024: starts on Monday (1st), so 0 leading + 31 days + trailing
    // Total should be 35 (5 rows × 7) since Jan 2024 starts on Monday and has 31 days
    const cells = container.querySelectorAll("[data-date]");
    expect(cells.length).toBeGreaterThanOrEqual(35);
    expect(cells.length).toBeLessThanOrEqual(42);
  });

  it("renders the month label", () => {
    render(
      <CalendarGrid sessions={sessions} today={today} initialMonth={new Date(2024, 0, 1)} />,
    );
    expect(screen.getByText("January 2024")).toBeDefined();
  });

  it("status comes straight from session.status (no recompute)", () => {
    const { container } = render(
      <CalendarGrid sessions={sessions} today={today} initialMonth={new Date(2024, 0, 1)} />,
    );
    const doneCell = container.querySelector('[data-date="2024-01-08"]');
    expect(doneCell?.getAttribute("data-state")).toBe("done");

    const upcomingCell = container.querySelector('[data-date="2024-01-10"]');
    expect(upcomingCell?.getAttribute("data-state")).toBe("upcoming");
  });

  it("renders 'rest' state for days with no session", () => {
    const { container } = render(
      <CalendarGrid sessions={sessions} today={today} initialMonth={new Date(2024, 0, 1)} />,
    );
    // Jan 9 (Tuesday) has no session
    const restCell = container.querySelector('[data-date="2024-01-09"]');
    expect(restCell?.getAttribute("data-state")).toBe("rest");
  });

  it("highlights the today cell", () => {
    const { container } = render(
      <CalendarGrid sessions={sessions} today={today} initialMonth={new Date(2024, 0, 1)} />,
    );
    const todayCell = container.querySelector('[data-date="2024-01-10"]');
    expect(todayCell?.getAttribute("data-today")).toBe("true");
  });

  it("month nav prev/next changes the month label (no refetch)", () => {
    render(
      <CalendarGrid sessions={sessions} today={today} initialMonth={new Date(2024, 0, 1)} />,
    );
    expect(screen.getByText("January 2024")).toBeDefined();

    // Click next month
    fireEvent.click(screen.getByLabelText("Next month"));
    expect(screen.getByText("February 2024")).toBeDefined();

    // Click prev month twice → back to January, then December 2023
    fireEvent.click(screen.getByLabelText("Previous month"));
    expect(screen.getByText("January 2024")).toBeDefined();

    fireEvent.click(screen.getByLabelText("Previous month"));
    expect(screen.getByText("December 2023")).toBeDefined();
  });

  it("calls onSelectDay when a day is tapped", () => {
    const onSelectDay = vi.fn();
    const { container } = render(
      <CalendarGrid
        sessions={sessions}
        today={today}
        initialMonth={new Date(2024, 0, 1)}
        onSelectDay={onSelectDay}
      />,
    );
    // Click on Jan 8 (done session)
    const cell = container.querySelector('[data-date="2024-01-08"]')!;
    fireEvent.click(cell);
    expect(onSelectDay).toHaveBeenCalledWith(
      "2024-01-08",
      sessions.filter((s) => s.date === "2024-01-08"),
    );
  });

  it("renders a Today button that jumps to today's month", () => {
    render(
      <CalendarGrid sessions={sessions} today={today} initialMonth={new Date(2024, 5, 1)} />,
    );
    // Starting on June 2024
    expect(screen.getByText("June 2024")).toBeDefined();

    // Click Today button
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(screen.getByText("January 2024")).toBeDefined();
  });

  it("renders view-mode toggle with Month active and Week/Day enabled", () => {
    render(
      <CalendarGrid sessions={sessions} today={today} initialMonth={new Date(2024, 0, 1)} />,
    );
    const monthBtn = screen.getByText("Month");
    expect(monthBtn).toBeDefined();

    const weekBtn = screen.getByLabelText("Week view");
    expect(weekBtn).toBeDefined();
    expect(weekBtn).toHaveProperty("disabled", false);

    const dayBtn = screen.getByLabelText("Day view");
    expect(dayBtn).toBeDefined();
    expect(dayBtn).toHaveProperty("disabled", false);
  });

  // Regression lock for the exact bug being fixed (A2 / P-01): the toggle used
  // to set state that nothing consumed. Assert month/week/day render distinct
  // DOM structures and that clicking the toggle actually swaps them.
  describe("view-mode switch actually changes the rendered structure", () => {
    it("month view renders the month grid and no week/day grid", () => {
      const { container } = render(
        <CalendarGrid sessions={sessions} today={today} initialMonth={new Date(2024, 0, 1)} />,
      );
      expect(container.querySelector('[data-slot="month-grid"]')).not.toBeNull();
      expect(container.querySelector('[data-slot="week-grid"]')).toBeNull();
      expect(container.querySelector('[data-slot="day-grid"]')).toBeNull();
    });

    it("clicking Week swaps in the week grid and removes the month grid", () => {
      const { container } = render(
        <CalendarGrid sessions={sessions} today={today} initialMonth={new Date(2024, 0, 1)} />,
      );
      fireEvent.click(screen.getByLabelText("Week view"));

      expect(container.querySelector('[data-slot="week-grid"]')).not.toBeNull();
      expect(container.querySelector('[data-slot="month-grid"]')).toBeNull();
      expect(container.querySelector('[data-slot="day-grid"]')).toBeNull();
      // Week grid has a 7-column day header, structurally distinct from month.
      expect(container.querySelectorAll("[data-week-date]").length).toBe(7);
    });

    it("clicking Day swaps in the day grid and removes the month/week grid", () => {
      const { container } = render(
        <CalendarGrid sessions={sessions} today={today} initialMonth={new Date(2024, 0, 1)} />,
      );
      fireEvent.click(screen.getByLabelText("Day view"));

      expect(container.querySelector('[data-slot="day-grid"]')).not.toBeNull();
      expect(container.querySelector('[data-slot="month-grid"]')).toBeNull();
      expect(container.querySelector('[data-slot="week-grid"]')).toBeNull();
      // Day grid renders exactly one day (unlike week's 7 or month's 35-42).
      expect(container.querySelectorAll("[data-hour]").length).toBe(14);
    });

    it("clicking Month after Week/Day returns to the month grid", () => {
      const { container } = render(
        <CalendarGrid sessions={sessions} today={today} initialMonth={new Date(2024, 0, 1)} />,
      );
      fireEvent.click(screen.getByLabelText("Day view"));
      expect(container.querySelector('[data-slot="day-grid"]')).not.toBeNull();

      fireEvent.click(screen.getByLabelText("Month view"));
      expect(container.querySelector('[data-slot="month-grid"]')).not.toBeNull();
      expect(container.querySelector('[data-slot="day-grid"]')).toBeNull();
    });
  });

  describe("week/day nav + onSlotClick wiring", () => {
    it("week view header label shows a date range, not a month name", () => {
      render(
        <CalendarGrid sessions={sessions} today={today} initialMonth={new Date(2024, 0, 1)} />,
      );
      fireEvent.click(screen.getByLabelText("Week view"));
      // today = 2024-01-10 (Wed); its week is Jan 7 – Jan 13.
      expect(screen.getByText("Jan 7 – Jan 13")).toBeDefined();
    });

    it("day view header label shows the anchored day", () => {
      render(
        <CalendarGrid sessions={sessions} today={today} initialMonth={new Date(2024, 0, 1)} />,
      );
      fireEvent.click(screen.getByLabelText("Day view"));
      expect(screen.getByText("Wed, Jan 10")).toBeDefined();
    });

    it("Next/Previous shift by a week in week view and by a day in day view", () => {
      render(
        <CalendarGrid sessions={sessions} today={today} initialMonth={new Date(2024, 0, 1)} />,
      );
      fireEvent.click(screen.getByLabelText("Week view"));
      expect(screen.getByText("Jan 7 – Jan 13")).toBeDefined();
      fireEvent.click(screen.getByLabelText("Next week"));
      expect(screen.getByText("Jan 14 – Jan 20")).toBeDefined();

      // Switching view keeps the same anchor date (Jan 17 — advanced by the
      // week-nav click above), it does not jump to the end of the week.
      fireEvent.click(screen.getByLabelText("Day view"));
      expect(screen.getByText("Wed, Jan 17")).toBeDefined();
      fireEvent.click(screen.getByLabelText("Previous day"));
      expect(screen.getByText("Tue, Jan 16")).toBeDefined();
    });

    it("clicking an empty hour slot in day view fires onSlotClick(date, hour)", () => {
      const onSlotClick = vi.fn();
      const { container } = render(
        <CalendarGrid
          sessions={sessions}
          today={today}
          initialMonth={new Date(2024, 0, 1)}
          onSlotClick={onSlotClick}
        />,
      );
      fireEvent.click(screen.getByLabelText("Day view"));
      const slot = container.querySelector('[data-hour="6"]')!;
      fireEvent.click(slot);
      expect(onSlotClick).toHaveBeenCalledWith("2024-01-10", 6);
    });

    it("onSlotClick is optional — clicking a slot without it is a no-op", () => {
      const { container } = render(
        <CalendarGrid sessions={sessions} today={today} initialMonth={new Date(2024, 0, 1)} />,
      );
      fireEvent.click(screen.getByLabelText("Day view"));
      const slot = container.querySelector('[data-hour="6"]')!;
      expect(() => fireEvent.click(slot)).not.toThrow();
    });
  });

  it("selecting a day renders its session list below the grid", () => {
    const { container } = render(
      <CalendarGrid sessions={sessions} today={today} initialMonth={new Date(2024, 0, 1)} />,
    );

    // Click on Jan 8 (done session)
    const cell = container.querySelector('[data-date="2024-01-08"]')!;
    fireEvent.click(cell);

    // The selected-day list should show the session label
    expect(screen.getByText("Push")).toBeDefined();
  });

  it("selecting an empty day shows rest/empty state", () => {
    const { container } = render(
      <CalendarGrid sessions={sessions} today={today} initialMonth={new Date(2024, 0, 1)} />,
    );

    // Click on Jan 9 (Tuesday — no sessions)
    const cell = container.querySelector('[data-date="2024-01-09"]')!;
    fireEvent.click(cell);

    // Should show "Rest day" empty state
    expect(screen.getByText("Rest day")).toBeDefined();
  });

  it("day cell renders chips + '+N' overflow when >3 sessions", () => {
    const manySessions: ScheduledSession[] = [
      makeSession("2024-01-15", "done", "A"),
      makeSession("2024-01-15", "done", "B"),
      makeSession("2024-01-15", "upcoming", "C"),
      makeSession("2024-01-15", "upcoming", "D"),
      makeSession("2024-01-15", "missed", "E"),
    ];
    const { container } = render(
      <CalendarGrid sessions={manySessions} today={today} initialMonth={new Date(2024, 0, 1)} />,
    );

    const cell = container.querySelector('[data-date="2024-01-15"]');
    expect(cell?.getAttribute("data-chip-count")).toBe("5");
    // The overflow text should be inside the cell
    expect(cell?.textContent).toContain("+2");
  });

  it("today ring is present on the today cell", () => {
    const { container } = render(
      <CalendarGrid sessions={sessions} today={today} initialMonth={new Date(2024, 0, 1)} />,
    );
    const todayCell = container.querySelector('[data-date="2024-01-10"]');
    expect(todayCell?.getAttribute("data-today")).toBe("true");
    expect(todayCell?.className).toContain("ring-sky-500");
  });
});
