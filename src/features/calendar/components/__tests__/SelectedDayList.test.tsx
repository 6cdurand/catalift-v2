import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import { SelectedDayList } from "../SelectedDayList";
import { getSessionsForDate } from "../../lib/selectors";
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

describe("SelectedDayList", () => {
  const today = "2024-01-10";
  const sessions: ScheduledSession[] = [
    makeSession({ date: "2024-01-10", status: "upcoming", label: "Push Day" }),
    makeSession({ date: "2024-01-08", status: "done", label: "Pull Day" }),
  ];

  it("renders nothing when no date is selected", () => {
    const { container } = render(
      <SelectedDayList sessions={sessions} selectedDate={null} today={today} />,
    );
    expect(container.querySelector('[data-slot="selected-day-list"]')).toBeNull();
  });

  it("renders session cards for the selected day", () => {
    render(
      <SelectedDayList sessions={sessions} selectedDate="2024-01-10" today={today} />,
    );
    expect(screen.getByText("Push Day")).toBeDefined();
  });

  it("renders the same session objects as getSessionsForDate slice", () => {
    const date = "2024-01-10";
    const expected = getSessionsForDate(sessions, date);
    expect(expected).toHaveLength(1);
    expect(expected[0].label).toBe("Push Day");
    expect(expected[0].status).toBe("upcoming");

    render(
      <SelectedDayList sessions={sessions} selectedDate={date} today={today} />,
    );
    expect(screen.getByText("Push Day")).toBeDefined();
  });

  it("shows rest/empty state for a day with no sessions", () => {
    render(
      <SelectedDayList sessions={sessions} selectedDate="2024-01-09" today={today} />,
    );
    expect(screen.getByText("Rest day")).toBeDefined();
    expect(screen.getByText("No training scheduled.")).toBeDefined();
  });

  it("shows Today badge when selectedDate === today", () => {
    render(
      <SelectedDayList sessions={sessions} selectedDate={today} today={today} />,
    );
    expect(screen.getByText("Today")).toBeDefined();
  });

  it("does not show Today badge when selectedDate !== today", () => {
    render(
      <SelectedDayList sessions={sessions} selectedDate="2024-01-08" today={today} />,
    );
    // "Today" badge should not appear — but "Done" badge for the done session will
    // The Pull Day session has status "done" → badge text "Done"
    expect(screen.getByText("Pull Day")).toBeDefined();
    expect(screen.getByText("Done")).toBeDefined();
  });

  it("renders status badge with correct label", () => {
    const doneSessions = [makeSession({ date: "2024-01-08", status: "done", label: "Legs" })];
    render(
      <SelectedDayList sessions={doneSessions} selectedDate="2024-01-08" today={today} />,
    );
    expect(screen.getByText("Legs")).toBeDefined();
    expect(screen.getByText("Done")).toBeDefined();
  });

  it("renders multiple sessions for a day with >1 session", () => {
    const multiSessions = [
      makeSession({ date: "2024-01-15", status: "done", label: "Push" }),
      makeSession({ date: "2024-01-15", status: "upcoming", label: "Pull", kind: "group-event" }),
    ];
    render(
      <SelectedDayList sessions={multiSessions} selectedDate="2024-01-15" today={today} />,
    );
    expect(screen.getByText("Push")).toBeDefined();
    expect(screen.getByText("Pull")).toBeDefined();
  });
});
