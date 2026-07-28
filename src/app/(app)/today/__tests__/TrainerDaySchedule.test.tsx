import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

import type { TrainerDaySession } from "@/features/trainer-ops/hooks/useTrainerWeekSchedule";
import { TrainerDaySchedule } from "../TrainerDaySchedule";

const TUESDAY = "2026-07-28";
const WEDNESDAY = "2026-07-29";

function makeRow(overrides: Partial<TrainerDaySession> = {}): TrainerDaySession {
  return {
    clientId: "client-1",
    clientName: "Anna Jones",
    avatarUrl: null,
    session: {
      date: TUESDAY,
      programId: "prog-1",
      dayIndex: 0,
      dayRef: "Push Day",
      label: "Push Day",
      status: "upcoming",
      kind: "program-day",
    },
    programName: "12-Week Strength",
    completedKey: "program:prog-1:0:2026-07-28",
    isMarkedComplete: false,
    ...overrides,
  };
}

const onMarkComplete = vi.fn();
const onOpenClient = vi.fn();
const onAddClient = vi.fn();

function renderSchedule(
  overrides: Partial<React.ComponentProps<typeof TrainerDaySchedule>> = {},
) {
  return render(
    <TrainerDaySchedule
      sessions={[makeRow()]}
      selectedDate={TUESDAY}
      today={TUESDAY}
      hasClients
      isLoading={false}
      error={null}
      markingKeys={new Set()}
      onMarkComplete={onMarkComplete}
      onOpenClient={onOpenClient}
      onAddClient={onAddClient}
      {...overrides}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("TrainerDaySchedule", () => {
  it("titles the section 'Today's Schedule' when the selected day is today", () => {
    renderSchedule();
    expect(screen.getByText("Today's Schedule")).toBeDefined();
  });

  it("titles the section with the date when another day is selected", () => {
    renderSchedule({ selectedDate: WEDNESDAY, sessions: [] });
    expect(screen.getByText("Schedule — Jul 29")).toBeDefined();
  });

  it("shows the session count badge", () => {
    renderSchedule({
      sessions: [makeRow(), makeRow({ clientId: "c2", clientName: "Ben", completedKey: "k2" })],
    });
    expect(screen.getByText("2")).toBeDefined();
  });

  it("renders a row per session with the program-day sub-line and no time", () => {
    renderSchedule();

    expect(screen.getAllByTestId("trainer-session-row")).toHaveLength(1);
    expect(screen.getByText("Anna Jones")).toBeDefined();
    expect(screen.getByText("Push Day · 12-Week Strength")).toBeDefined();
    // Phase 1 rows are untimed.
    expect(screen.queryByText(/\d{2}:\d{2}/)).toBeNull();
  });

  it("renders the left sky accent bar", () => {
    const { container } = renderSchedule();
    expect(container.querySelector(".w-1.bg-sky-500")).not.toBeNull();
  });

  it("renders the session status badge", () => {
    renderSchedule();
    expect(screen.getByText("Upcoming")).toBeDefined();

    cleanup();
    renderSchedule({
      sessions: [makeRow({ session: { ...makeRow().session, status: "missed" } })],
    });
    expect(screen.getByText("Missed")).toBeDefined();
  });

  it("opens the client file when the name is clicked", () => {
    renderSchedule();

    fireEvent.click(screen.getByText("Anna Jones"));
    expect(onOpenClient).toHaveBeenCalledWith("client-1");
  });

  it("offers Mark complete on a not-yet-completed row", () => {
    renderSchedule();

    fireEvent.click(screen.getByRole("button", { name: /Mark complete/ }));
    expect(onMarkComplete).toHaveBeenCalledTimes(1);
    expect(onMarkComplete.mock.calls[0][0].completedKey).toBe(
      "program:prog-1:0:2026-07-28",
    );
  });

  it("hides Mark complete and shows the completed state once marked", () => {
    const { container } = renderSchedule({
      sessions: [makeRow({ isMarkedComplete: true })],
    });

    expect(screen.queryByRole("button", { name: /Mark complete/ })).toBeNull();
    expect(screen.getByText("Completed")).toBeDefined();
    expect(container.querySelector(".border-green-200")).not.toBeNull();
  });

  it("disables the action while a mark-complete write is in flight", () => {
    renderSchedule({ markingKeys: new Set(["program:prog-1:0:2026-07-28"]) });

    const button = screen.getByRole("button", { name: /Marking/ });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows the no-clients empty state with an Add Client action", () => {
    renderSchedule({ sessions: [], hasClients: false });

    expect(screen.getByText(/No clients yet/)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /Add Client/ }));
    expect(onAddClient).toHaveBeenCalledTimes(1);
  });

  it("shows the nothing-scheduled empty state when the trainer has clients", () => {
    renderSchedule({ sessions: [], selectedDate: WEDNESDAY });

    expect(screen.getByText("Nothing scheduled for Wednesday.")).toBeDefined();
    expect(screen.queryByText(/No clients yet/)).toBeNull();
  });

  it("says 'today' in the empty state when today is selected", () => {
    renderSchedule({ sessions: [] });
    expect(screen.getByText("Nothing scheduled for today.")).toBeDefined();
  });

  it("renders skeletons while loading", () => {
    renderSchedule({ isLoading: true, sessions: [] });

    expect(screen.getByTestId("schedule-skeleton")).toBeDefined();
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders the schedule error", () => {
    renderSchedule({ sessions: [], error: new Error("boom") });
    expect(screen.getByText(/boom/)).toBeDefined();
  });
});
