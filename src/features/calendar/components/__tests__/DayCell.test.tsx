import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import { DayCell } from "../DayCell";
import type { ScheduledSession } from "../../types";

afterEach(() => cleanup());

function makeSession(
  overrides: Partial<ScheduledSession> = {},
): ScheduledSession {
  return {
    date: "2024-01-10",
    dayIndex: 0,
    dayRef: "Push",
    label: "Push",
    status: "upcoming",
    kind: "program-day",
    ...overrides,
  };
}

describe("DayCell", () => {
  it("renders the day number", () => {
    const { container } = render(
      <DayCell date="2024-01-10" sessions={[]} today="2024-01-10" />,
    );
    expect(container.querySelector("button")?.textContent).toContain("10");
  });

  it("renders a distinct 'rest' state for a non-slot day (carry-forward b)", () => {
    const { container } = render(
      <DayCell date="2024-01-09" sessions={[]} today="2024-01-10" />,
    );
    const button = container.querySelector("button");
    expect(button?.getAttribute("data-state")).toBe("rest");
    expect(screen.getByLabelText("rest")).toBeDefined();
  });

  it("renders 'done' state when session.status === 'done'", () => {
    const sessions = [makeSession({ date: "2024-01-10", status: "done" })];
    const { container } = render(
      <DayCell date="2024-01-10" sessions={sessions} today="2024-01-10" />,
    );
    const button = container.querySelector("button");
    expect(button?.getAttribute("data-state")).toBe("done");
    expect(screen.getByLabelText("done")).toBeDefined();
  });

  it("renders 'upcoming' state when session.status === 'upcoming'", () => {
    const sessions = [makeSession({ date: "2024-01-10", status: "upcoming" })];
    const { container } = render(
      <DayCell date="2024-01-10" sessions={sessions} today="2024-01-10" />,
    );
    const button = container.querySelector("button");
    expect(button?.getAttribute("data-state")).toBe("upcoming");
  });

  it("renders 'missed' state when session.status === 'missed'", () => {
    const sessions = [makeSession({ date: "2024-01-08", status: "missed" })];
    const { container } = render(
      <DayCell date="2024-01-08" sessions={sessions} today="2024-01-10" />,
    );
    const button = container.querySelector("button");
    expect(button?.getAttribute("data-state")).toBe("missed");
  });

  it("highlights the cell where date === today (ring)", () => {
    const { container } = render(
      <DayCell date="2024-01-10" sessions={[]} today="2024-01-10" />,
    );
    const button = container.querySelector("button");
    expect(button?.getAttribute("data-today")).toBe("true");
  });

  it("does NOT highlight non-today cells", () => {
    const { container } = render(
      <DayCell date="2024-01-09" sessions={[]} today="2024-01-10" />,
    );
    const button = container.querySelector("button");
    expect(button?.getAttribute("data-today")).toBeNull();
  });

  it("calls onSelect with the day's sessions when tapped", () => {
    const onSelect = vi.fn();
    const sessions = [makeSession({ date: "2024-01-10", status: "done" })];
    const { container } = render(
      <DayCell
        date="2024-01-10"
        sessions={sessions}
        today="2024-01-10"
        onSelect={onSelect}
      />,
    );
    const button = container.querySelector("button");
    fireEvent.click(button!);
    expect(onSelect).toHaveBeenCalledWith("2024-01-10", sessions);
  });
});
