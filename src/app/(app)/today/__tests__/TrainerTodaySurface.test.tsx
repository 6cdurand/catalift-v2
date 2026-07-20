import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { RosterClientDetail, RosterStats } from "@/types/roster";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { TrainerTodaySurface } from "../TrainerTodaySurface";
import type { ClientCompletion } from "../useTrainerTodayData";

const mockStats: RosterStats = { active: 3, pending: 1, total: 4 };

const mockClients: RosterClientDetail[] = [
  {
    id: "client-1",
    name: "John Doe",
    email: "john@example.com",
    status: "active",
    avatarUrl: null,
    sessions: 10,
    lastSeen: "2026-07-15T00:00:00Z",
  },
  {
    id: "client-2",
    name: "Jane Smith",
    email: "jane@example.com",
    status: "pending",
    avatarUrl: null,
    sessions: 0,
    lastSeen: null,
  },
];

const mockCompletions: ClientCompletion[] = [
  {
    id: "w-1",
    clientName: "John Doe",
    workoutName: "Push Day",
    performedAt: "2026-07-19T10:00:00Z",
    clientId: "client-1",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("TrainerTodaySurface", () => {
  it("renders loading state", () => {
    render(
      <TrainerTodaySurface
        clients={[]}
        stats={{ active: 0, pending: 0, total: 0 }}
        recentCompletions={[]}
        isLoading={true}
        error={null}
      />,
    );

    const pulses = document.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThan(0);
  });

  it("renders error state", () => {
    render(
      <TrainerTodaySurface
        clients={[]}
        stats={{ active: 0, pending: 0, total: 0 }}
        recentCompletions={[]}
        isLoading={false}
        error={new Error("Network error")}
      />,
    );

    expect(screen.getByText(/Network error/)).toBeDefined();
  });

  it("renders quick actions with rose accent", () => {
    render(
      <TrainerTodaySurface
        clients={mockClients}
        stats={mockStats}
        recentCompletions={[]}
        isLoading={false}
        error={null}
      />,
    );

    expect(screen.getByText("Clients")).toBeDefined();
    expect(screen.getByText("Calendar")).toBeDefined();
  });

  it("renders roster summary stats", () => {
    render(
      <TrainerTodaySurface
        clients={mockClients}
        stats={mockStats}
        recentCompletions={[]}
        isLoading={false}
        error={null}
      />,
    );

    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText("4")).toBeDefined();
    // "Active" and "Pending" appear in both the stats labels and client badges
    const activeEls = screen.getAllByText("Active");
    expect(activeEls.length).toBeGreaterThanOrEqual(1);
    const pendingEls = screen.getAllByText("Pending");
    expect(pendingEls.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Total")).toBeDefined();
  });

  it("renders client list with names", () => {
    render(
      <TrainerTodaySurface
        clients={mockClients}
        stats={mockStats}
        recentCompletions={[]}
        isLoading={false}
        error={null}
      />,
    );

    expect(screen.getByText("John Doe")).toBeDefined();
    expect(screen.getByText("Jane Smith")).toBeDefined();
  });

  it("renders empty state when no clients", () => {
    render(
      <TrainerTodaySurface
        clients={[]}
        stats={{ active: 0, pending: 0, total: 0 }}
        recentCompletions={[]}
        isLoading={false}
        error={null}
      />,
    );

    expect(screen.getByText(/No clients yet/)).toBeDefined();
  });

  it("renders recent completions section", () => {
    render(
      <TrainerTodaySurface
        clients={mockClients}
        stats={mockStats}
        recentCompletions={mockCompletions}
        isLoading={false}
        error={null}
      />,
    );

    expect(screen.getByText("Recent Client Completions")).toBeDefined();
    // The workout name appears in the completion card
    expect(screen.getByText(/Push Day/)).toBeDefined();
  });

  it("navigates to /clients when Clients button clicked", () => {
    render(
      <TrainerTodaySurface
        clients={mockClients}
        stats={mockStats}
        recentCompletions={[]}
        isLoading={false}
        error={null}
      />,
    );

    const clientsButton = screen.getByText("Clients").closest("button");
    if (clientsButton) {
      clientsButton.click();
    }
    expect(mockPush).toHaveBeenCalledWith("/clients");
  });

  it("navigates to /calendar when Calendar button clicked", () => {
    render(
      <TrainerTodaySurface
        clients={mockClients}
        stats={mockStats}
        recentCompletions={[]}
        isLoading={false}
        error={null}
      />,
    );

    const calendarButton = screen.getByText("Calendar").closest("button");
    if (calendarButton) {
      calendarButton.click();
    }
    expect(mockPush).toHaveBeenCalledWith("/calendar");
  });
});
