import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import type { RosterClientDetail } from "@/types/roster";
import type { TrainerDaySession } from "@/features/trainer-ops/hooks/useTrainerWeekSchedule";

const {
  mockPush,
  mockToastSuccess,
  mockToastError,
  mockMarkSessionComplete,
  mockCompleteCalendarEvent,
  mockRefresh,
  mockUseTrainerWeekSchedule,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockMarkSessionComplete: vi.fn(),
  mockCompleteCalendarEvent: vi.fn(),
  mockRefresh: vi.fn(),
  mockUseTrainerWeekSchedule: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("sonner", () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

vi.mock("@/features/payments", () => ({
  markSessionComplete: mockMarkSessionComplete,
}));

vi.mock("@/features/calendar", () => ({
  completeCalendarEvent: mockCompleteCalendarEvent,
}));

vi.mock("@/features/trainer-ops/hooks/useTrainerWeekSchedule", () => ({
  useTrainerWeekSchedule: mockUseTrainerWeekSchedule,
}));

import {
  formatAccessibleDate,
  formatMonthDay,
  getWeekWindow,
  shiftISODate,
  toISODate,
  DAYS_IN_WEEK,
} from "@/lib/week";
import { TrainerTodaySurface } from "../TrainerTodaySurface";

// Derived from the real device clock (the surface computes `today` the same
// way) so these assertions hold on any day, without faking timers.
const TODAY = toISODate(new Date());
const WEEK = getWeekWindow(TODAY);
const MONDAY = WEEK.days[0];
const OTHER_DAY = WEEK.days.find((d) => d !== TODAY)!;

const mockClients: RosterClientDetail[] = [
  {
    id: "client-1",
    name: "Anna Jones",
    email: "anna@example.com",
    status: "active",
    username: null,
    avatarUrl: null,
    sessions: 10,
    lastSeen: "2026-07-15T00:00:00Z",
  },
];

function makeRow(overrides: Partial<TrainerDaySession> = {}): TrainerDaySession {
  return {
    clientId: "client-1",
    clientName: "Anna Jones",
    avatarUrl: null,
    session: {
      date: TODAY,
      programId: "prog-1",
      dayIndex: 0,
      dayRef: "Push Day",
      label: "Push Day",
      status: "upcoming",
      kind: "program-day",
    },
    programName: "12-Week Strength",
    completedKey: `program:prog-1:0:${TODAY}`,
    isMarkedComplete: false,
    ...overrides,
  };
}

function scheduleResult(overrides: Record<string, unknown> = {}) {
  return {
    daySessions: [makeRow()],
    datesWithSessions: new Set([TODAY]),
    sessionCountsByDate: { [TODAY]: 1 },
    clientCount: 1,
    isLoading: false,
    error: null,
    refresh: mockRefresh,
    ...overrides,
  };
}

function renderSurface(
  overrides: Partial<React.ComponentProps<typeof TrainerTodaySurface>> = {},
) {
  return render(
    <TrainerTodaySurface
      trainerId="trainer-1"
      clients={mockClients}
      isLoading={false}
      error={null}
      {...overrides}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseTrainerWeekSchedule.mockReturnValue(scheduleResult());
  mockMarkSessionComplete.mockResolvedValue({ id: "cs-1" });
  mockCompleteCalendarEvent.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
});

describe("TrainerTodaySurface — removed roster sections (Christo 2026-07-28)", () => {
  it("no longer renders the Your Clients roster stats", () => {
    renderSurface();

    expect(screen.queryByText("Your Clients")).toBeNull();
    expect(screen.queryByText("Total")).toBeNull();
    expect(screen.queryByText("Pending")).toBeNull();
    expect(screen.queryByText("See All")).toBeNull();
  });

  it("no longer renders the top-5 client list", () => {
    renderSurface();

    // The client's name only appears as a schedule row, not as a roster card.
    expect(screen.queryByText(/10 sessions/)).toBeNull();
  });

  it("no longer renders Recent Client Completions", () => {
    renderSurface();
    expect(screen.queryByText("Recent Client Completions")).toBeNull();
  });
});

describe("TrainerTodaySurface — retained shell", () => {
  it("keeps the Quick Actions row", () => {
    renderSurface();

    expect(screen.getByText("Clients")).toBeDefined();
    expect(screen.getByText("Calendar")).toBeDefined();

    fireEvent.click(screen.getByText("Clients").closest("button")!);
    expect(mockPush).toHaveBeenCalledWith("/clients");
  });

  it("keeps the Open Workout Builder link", () => {
    renderSurface();

    fireEvent.click(screen.getByText("Open Workout Builder").closest("button")!);
    expect(mockPush).toHaveBeenCalledWith("/workout/builder");
  });

  it("renders loading and error states", () => {
    renderSurface({ isLoading: true });
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);

    cleanup();
    renderSurface({ error: new Error("Network error") });
    expect(screen.getByText(/Network error/)).toBeDefined();
  });
});

describe("TrainerTodaySurface — day selector", () => {
  it("defaults the selection to today and asks for that week's range", () => {
    renderSurface();

    expect(mockUseTrainerWeekSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        trainerId: "trainer-1",
        enabled: true,
        rangeStart: WEEK.rangeStart,
        rangeEnd: WEEK.rangeEnd,
        selectedDate: TODAY,
      }),
    );
    expect(screen.getByText("Today's Schedule")).toBeDefined();
  });

  it("selecting another day re-queries that day and retitles the section", () => {
    mockUseTrainerWeekSchedule.mockReturnValue(
      scheduleResult({ daySessions: [] }),
    );
    renderSurface();

    fireEvent.click(
      screen.getByRole("button", {
        name: new RegExp(formatAccessibleDate(OTHER_DAY)),
      }),
    );

    expect(mockUseTrainerWeekSchedule).toHaveBeenLastCalledWith(
      expect.objectContaining({ selectedDate: OTHER_DAY }),
    );
    expect(
      screen.getByText(`Schedule — ${formatMonthDay(OTHER_DAY)}`),
    ).toBeDefined();
  });

  it("the next-week chevron moves the range and the selection by 7 days", () => {
    renderSurface();

    fireEvent.click(screen.getByRole("button", { name: "Next week" }));

    expect(mockUseTrainerWeekSchedule).toHaveBeenLastCalledWith(
      expect.objectContaining({
        rangeStart: shiftISODate(WEEK.rangeStart, DAYS_IN_WEEK),
        rangeEnd: shiftISODate(WEEK.rangeEnd, DAYS_IN_WEEK),
        selectedDate: shiftISODate(TODAY, DAYS_IN_WEEK),
      }),
    );
  });

  it("a swipe steps one day and rolls the week window at the edge", () => {
    renderSurface();
    const strip = screen.getByTestId("trainer-day-strip");

    // Monday is the first pill: swiping right from it rolls back a week.
    fireEvent.click(
      screen.getByRole("button", {
        name: new RegExp(formatAccessibleDate(MONDAY)),
      }),
    );
    fireEvent.touchStart(strip, { touches: [{ clientX: 100 }] });
    fireEvent.touchEnd(strip, { changedTouches: [{ clientX: 220 }] });

    expect(mockUseTrainerWeekSchedule).toHaveBeenLastCalledWith(
      expect.objectContaining({
        rangeStart: shiftISODate(WEEK.rangeStart, -DAYS_IN_WEEK),
        rangeEnd: shiftISODate(WEEK.rangeEnd, -DAYS_IN_WEEK),
        selectedDate: shiftISODate(MONDAY, -1),
      }),
    );
  });
});

describe("TrainerTodaySurface — mark complete (UI-C)", () => {
  it("writes a client_sessions row with the exact completedKey", async () => {
    renderSurface();

    fireEvent.click(screen.getByRole("button", { name: /Mark complete/ }));

    await waitFor(() =>
      expect(mockMarkSessionComplete).toHaveBeenCalledWith({
        clientId: "client-1",
        source: "pt_completion",
        sessionDate: TODAY,
        calendarEventId: `program:prog-1:0:${TODAY}`,
      }),
    );
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
    expect(mockToastSuccess).toHaveBeenCalled();
    // The synthetic-key path must NOT reach the booking RPC — there is no
    // `calendar_events` row for a program-derived session to complete.
    expect(mockCompleteCalendarEvent).not.toHaveBeenCalled();
  });

  it("flips the row optimistically and hides the action", async () => {
    renderSurface();

    fireEvent.click(screen.getByRole("button", { name: /Mark complete/ }));

    await waitFor(() => expect(screen.getByText("Completed")).toBeDefined());
    expect(screen.queryByRole("button", { name: /Mark complete/ })).toBeNull();
  });

  it("a second tap does not issue a second write", async () => {
    renderSurface();

    fireEvent.click(screen.getByRole("button", { name: /Mark complete/ }));
    await waitFor(() => expect(mockMarkSessionComplete).toHaveBeenCalledTimes(1));

    // The action is gone; re-rendering with the server truth keeps it gone.
    mockUseTrainerWeekSchedule.mockReturnValue(
      scheduleResult({ daySessions: [makeRow({ isMarkedComplete: true })] }),
    );
    cleanup();
    renderSurface();

    expect(screen.queryByRole("button", { name: /Mark complete/ })).toBeNull();
    expect(mockMarkSessionComplete).toHaveBeenCalledTimes(1);
  });

  it("reverts the row and toasts when the write fails", async () => {
    mockMarkSessionComplete.mockRejectedValue(new Error("offline"));
    renderSurface();

    fireEvent.click(screen.getByRole("button", { name: /Mark complete/ }));

    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: /Mark complete/ })).toBeDefined();
    expect(screen.queryByText("Completed")).toBeNull();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("marking never starts or creates a workout", async () => {
    renderSurface();

    fireEvent.click(screen.getByRole("button", { name: /Mark complete/ }));
    await waitFor(() => expect(mockMarkSessionComplete).toHaveBeenCalled());

    expect(mockPush).not.toHaveBeenCalledWith("/workout/active");
  });
});

// P-09. The two mark-complete paths are NOT interchangeable, and getting the
// routing wrong is the whole bug: a booked session written only to
// client_sessions leaves calendar_events.status = 'scheduled', which
// deriveBookingStatus renders as "missed" the next day.
describe("TrainerTodaySurface — mark complete routing (P-09)", () => {
  // A booked row: real `calendar_events.id`, so completedKey IS the event id
  // (useTrainerWeekSchedule never mints a synthetic key for these).
  function bookedRow(): TrainerDaySession {
    return makeRow({
      session: {
        date: TODAY,
        dayIndex: -1,
        dayRef: "PT Session",
        label: "PT Session",
        status: "upcoming",
        kind: "booking",
        startTime: "09:00",
        eventId: "event-abc",
      },
      programName: "",
      completedKey: "event-abc",
    });
  }

  it("a session with an eventId goes through completeCalendarEvent, not the ledger insert", async () => {
    mockUseTrainerWeekSchedule.mockReturnValue(
      scheduleResult({ daySessions: [bookedRow()] }),
    );
    renderSurface();

    fireEvent.click(screen.getByRole("button", { name: /Mark complete/ }));

    await waitFor(() =>
      expect(mockCompleteCalendarEvent).toHaveBeenCalledWith("event-abc"),
    );
    expect(mockCompleteCalendarEvent).toHaveBeenCalledTimes(1);
    // One transaction, not two writes: the client must never insert the
    // ledger row for a booking itself.
    expect(mockMarkSessionComplete).not.toHaveBeenCalled();
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
  });

  it("a program-derived session still uses markSessionComplete with the synthetic key", async () => {
    mockUseTrainerWeekSchedule.mockReturnValue(
      scheduleResult({ daySessions: [makeRow()] }),
    );
    renderSurface();

    fireEvent.click(screen.getByRole("button", { name: /Mark complete/ }));

    await waitFor(() =>
      expect(mockMarkSessionComplete).toHaveBeenCalledWith({
        clientId: "client-1",
        source: "pt_completion",
        sessionDate: TODAY,
        calendarEventId: `program:prog-1:0:${TODAY}`,
      }),
    );
    expect(mockCompleteCalendarEvent).not.toHaveBeenCalled();
  });

  it("a failed booking completion reverts the row and toasts", async () => {
    mockCompleteCalendarEvent.mockRejectedValue(new Error("offline"));
    mockUseTrainerWeekSchedule.mockReturnValue(
      scheduleResult({ daySessions: [bookedRow()] }),
    );
    renderSurface();

    fireEvent.click(screen.getByRole("button", { name: /Mark complete/ }));

    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: /Mark complete/ })).toBeDefined();
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
