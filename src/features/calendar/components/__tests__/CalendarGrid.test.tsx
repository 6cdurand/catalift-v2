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

  it("renders view-mode toggle with Month active and Week/Day disabled", () => {
    render(
      <CalendarGrid sessions={sessions} today={today} initialMonth={new Date(2024, 0, 1)} />,
    );
    const monthBtn = screen.getByText("Month");
    expect(monthBtn).toBeDefined();

    const weekBtn = screen.getByLabelText("Week view (coming soon)");
    expect(weekBtn).toBeDefined();
    expect(weekBtn).toHaveProperty("disabled", true);

    const dayBtn = screen.getByLabelText("Day view (coming soon)");
    expect(dayBtn).toBeDefined();
    expect(dayBtn).toHaveProperty("disabled", true);
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
