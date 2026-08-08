// P-06-L1 — client profile card (inventory row 57, shipped PARTIAL).
//
// v1 shows Workouts / Medals / PBs tiles plus a strength rating. In v2
// FEATURE_FLAGS.medals and .strengthRating are false and neither module exists,
// so those two must not render — and must not render as empty tiles either.
// They are additionally data-gated so flipping a flag alone cannot produce an
// inert tile.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const mockIsFeatureEnabled = vi.fn();
vi.mock("@/config/feature-flags", () => ({
  isFeatureEnabled: (flag: string) => mockIsFeatureEnabled(flag),
}));

import { ClientProfileCard } from "../_components/ClientProfileCard";

const baseProps = {
  open: true,
  onOpenChange: () => {},
  name: "Anna Jones",
  username: "annaj",
  avatarUrl: null,
  workoutCount: 12,
  pbCount: 4,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockIsFeatureEnabled.mockReturnValue(false);
});

afterEach(() => cleanup());

describe("ClientProfileCard", () => {
  it("renders the data points v2 actually has", () => {
    render(<ClientProfileCard {...baseProps} />);

    expect(screen.getByText("Anna Jones")).toBeDefined();
    expect(screen.getByTestId("profile-card-username").textContent).toBe("@annaj");
    expect(screen.getByText("Workouts")).toBeDefined();
    expect(screen.getByText("12")).toBeDefined();
    expect(screen.getByText("PBs")).toBeDefined();
    expect(screen.getByText("4")).toBeDefined();
  });

  it("renders no medals or strength rating while the flags are off", () => {
    render(<ClientProfileCard {...baseProps} medalCount={7} strengthRating={82} />);

    expect(screen.queryByText("Medals")).toBeNull();
    expect(screen.queryByText("Strength Rating")).toBeNull();
    expect(mockIsFeatureEnabled).toHaveBeenCalledWith("medals");
    expect(mockIsFeatureEnabled).toHaveBeenCalledWith("strengthRating");
  });

  it("renders medals and strength rating once the flags flip AND data exists", () => {
    mockIsFeatureEnabled.mockReturnValue(true);
    render(<ClientProfileCard {...baseProps} medalCount={7} strengthRating={82} />);

    expect(screen.getByText("Medals")).toBeDefined();
    expect(screen.getByText("7")).toBeDefined();
    expect(screen.getByText("Strength Rating")).toBeDefined();
    expect(screen.getByText("82")).toBeDefined();
  });

  it("renders no empty tile when a flag is on but the module supplies nothing", () => {
    mockIsFeatureEnabled.mockReturnValue(true);
    render(<ClientProfileCard {...baseProps} />);

    expect(screen.queryByText("Medals")).toBeNull();
    expect(screen.queryByText("Strength Rating")).toBeNull();
  });

  it("omits the @handle entirely when username is null (never a bare @)", () => {
    render(<ClientProfileCard {...baseProps} username={null} />);

    expect(screen.queryByTestId("profile-card-username")).toBeNull();
    expect(screen.queryByText("@")).toBeNull();
  });

  it("omits the PBs tile when the personal_bests read failed", () => {
    render(<ClientProfileCard {...baseProps} pbCount={null} />);

    expect(screen.queryByText("PBs")).toBeNull();
    expect(screen.getByText("Workouts")).toBeDefined();
  });
});
