import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MainLayout } from "../MainLayout";
import { useViewModeStore } from "@/hooks/use-view-mode";

// --- Mocks ----------------------------------------------------------------

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/today"),
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
}));

vi.mock("@/features/auth", () => ({
  useSession: vi.fn(() => ({
    user: { id: "test-user-id", email: "test@test.com" },
    loading: false,
  })),
  useUserRole: vi.fn(() => ({ role: "trainer", loading: false })),
}));

vi.mock("@/features/workout-engine/stores/active-workout-store", () => ({
  useActiveWorkoutStore: vi.fn((selector) =>
    selector
      ? selector({ activeWorkout: null })
      : { activeWorkout: null },
  ),
  entriesOfBlock: vi.fn(() => []),
}));

// --- Tests ----------------------------------------------------------------

describe("MainLayout mode switch", () => {
  beforeEach(() => {
    cleanup();
    useViewModeStore.setState({ viewOverride: null });
  });

  it("renders trainer nav (Clients + Builder) when mode is trainer", () => {
    useViewModeStore.setState({ viewOverride: "trainer" });

    render(
      <MainLayout>
        <div>content</div>
      </MainLayout>,
    );

    const tabBar = screen.getByTestId("app-tab-bar");
    const text = tabBar.textContent ?? "";
    expect(text).toContain("Clients");
    expect(text).toContain("Builder");
    expect(text).not.toContain("Community");
    expect(text).not.toContain("Program");
  });

  it("renders athlete nav (Community + Program) when mode is user", () => {
    useViewModeStore.setState({ viewOverride: "user" });

    render(
      <MainLayout>
        <div>content</div>
      </MainLayout>,
    );

    const tabBar = screen.getByTestId("app-tab-bar");
    const text = tabBar.textContent ?? "";
    expect(text).toContain("Community");
    expect(text).toContain("Program");
    expect(text).not.toContain("Clients");
    expect(text).not.toContain("Builder");
  });

  it("re-renders correct nav when toggling mode", () => {
    // Start as trainer
    useViewModeStore.setState({ viewOverride: "trainer" });
    const { rerender } = render(
      <MainLayout>
        <div>content</div>
      </MainLayout>,
    );

    let tabBar = screen.getByTestId("app-tab-bar");
    let text = tabBar.textContent ?? "";
    expect(text).toContain("Clients");
    expect(text).toContain("Builder");

    // Toggle to athlete
    useViewModeStore.setState({ viewOverride: "user" });
    rerender(
      <MainLayout>
        <div>content</div>
      </MainLayout>,
    );

    tabBar = screen.getByTestId("app-tab-bar");
    text = tabBar.textContent ?? "";
    expect(text).toContain("Community");
    expect(text).toContain("Program");
    expect(text).not.toContain("Clients");
    expect(text).not.toContain("Builder");
  });
});
