import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import type {
  TrainerEarnings,
  TrainerPaymentTotals,
} from "@/features/payments";

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

const mockUseTrainerPayments = vi.fn();
vi.mock("@/features/payments", () => ({
  useTrainerPayments: (enabled?: boolean) => mockUseTrainerPayments(enabled),
}));

const mockUseProfileData = vi.fn();
vi.mock("../_lib/use-profile-data", () => ({
  useProfileData: () => mockUseProfileData(),
}));

vi.mock("../_components/ProfileCardV2", () => ({
  ProfileCardV2: () => null,
}));
vi.mock("../_components/WorkoutStatsCharts", () => ({
  WorkoutStatsCharts: () => null,
}));
vi.mock("../_components/TrainerStatsCharts", () => ({
  TrainerStatsCharts: () => null,
}));

function totals(overrides: Partial<TrainerPaymentTotals> = {}): TrainerPaymentTotals {
  return {
    currency: "NZD",
    excludedCurrencies: [],
    outstandingAmount: 300,
    outstandingSessions: 4,
    clientsWithOutstanding: 2,
    totalPaid: 1300,
    completedSessions: 13,
    paidSessions: 9,
    activeClients: 2,
    ...overrides,
  };
}

function earnings(overrides: Partial<TrainerEarnings> = {}): TrainerEarnings {
  return {
    currency: "NZD",
    excludedCurrencies: [],
    total: 1300,
    week: 150,
    month: 700,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  mockUseTrainerPayments.mockReturnValue({
    totals: totals(),
    earnings: earnings(),
  });

  mockUseProfileData.mockReturnValue({
    loading: false,
    user: {
      id: "trainer-1",
      email: "t@test.com",
      username: "coach",
      displayName: "Coach Kim",
      gender: "other",
      mode: "trainer",
      isTrainer: true,
      preferredUnit: "kg",
      createdAt: "2026-01-01T00:00:00.000Z",
      followers: [],
      following: [],
    },
    isTrainerMode: true,
    workouts: [],
    personalBests: [],
    roster: [
      { id: "c1", name: "Alice", email: "a@test.com", status: "active" },
      { id: "c2", name: "Bob", email: "b@test.com", status: "active" },
    ],
    gyms: [],
    setViewMode: vi.fn(),
    setGym: vi.fn(),
    addGym: vi.fn(),
    logout: vi.fn(),
  });
});

afterEach(() => cleanup());

describe("ProfilePage — trainer earnings card", () => {
  it("renders real aggregate values instead of hardcoded zeros", async () => {
    const { default: ProfilePage } = await import("../page");
    render(<ProfilePage />);

    const row = screen.getByTestId("profile-earnings-row");
    expect(row.textContent).toContain("$150"); // this week
    expect(row.textContent).toContain("$700"); // this month
    expect(row.textContent).toContain("$1300"); // total paid

    // Sessions completed roster-wide, clients from the roster, and the derived
    // per-session / collection / per-client figures.
    expect(screen.getByText("13")).toBeDefined();
    expect(screen.getByText("$100")).toBeDefined(); // avg per session
    expect(screen.getByText("69%")).toBeDefined(); // collection rate
    expect(screen.getByText("$650")).toBeDefined(); // revenue per client
  });

  it("routes to /payments when the earnings card is tapped", async () => {
    const { default: ProfilePage } = await import("../page");
    render(<ProfilePage />);

    fireEvent.click(screen.getByTestId("profile-earnings-row"));
    expect(mockPush).toHaveBeenCalledWith("/payments");
  });

  it("stays 0-safe when the trainer has no sessions or payments yet", async () => {
    mockUseTrainerPayments.mockReturnValue({
      totals: totals({
        outstandingAmount: 0,
        outstandingSessions: 0,
        clientsWithOutstanding: 0,
        totalPaid: 0,
        completedSessions: 0,
        paidSessions: 0,
        activeClients: 0,
      }),
      earnings: earnings({ total: 0, week: 0, month: 0 }),
    });

    const { default: ProfilePage } = await import("../page");
    render(<ProfilePage />);

    const row = screen.getByTestId("profile-earnings-row");
    expect(row.textContent).toContain("$0");
    expect(screen.getByText("100%")).toBeDefined(); // collection rate
  });

  it("does not fetch payments in athlete mode", async () => {
    mockUseProfileData.mockReturnValue({
      ...mockUseProfileData(),
      isTrainerMode: false,
    });

    const { default: ProfilePage } = await import("../page");
    render(<ProfilePage />);

    expect(mockUseTrainerPayments).toHaveBeenCalledWith(false);
    expect(screen.queryByTestId("profile-earnings-row")).toBeNull();
  });
});
