import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// --- Mocks ----------------------------------------------------------------

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockBack = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush, back: mockBack, replace: mockReplace })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

const mockLogout = vi.fn();
const mockUpsertProfile = vi.fn();

vi.mock("@/features/auth", () => ({
  useSession: vi.fn(() => ({
    user: { id: "test-user-id", email: "test@test.com" },
    loading: false,
  })),
  useUserRole: vi.fn(() => ({ role: "client", loading: false })),
  logout: mockLogout,
  upsertProfile: mockUpsertProfile,
}));

vi.mock("@/lib/supabase", () => ({
  getBrowserClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { full_name: "Test User", username: null, email: "test@test.com" },
            }),
          ),
        })),
      })),
    })),
  })),
}));

vi.mock("@/lib/storage", () => ({
  getLocalItem: vi.fn(() => "[]"),
  setLocalItem: vi.fn(),
  removeLocalItem: vi.fn(),
  userScopedKey: vi.fn((resource: string, userId: string) => `catalift-${resource}-${userId}`),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// --- Tests ----------------------------------------------------------------

describe("Settings page", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("mounts and shows the ported sections", async () => {
    const { default: SettingsPage } = await import("../page");
    render(<SettingsPage />);

    // Profile section
    expect(screen.getByText("Profile")).toBeTruthy();
    expect(screen.getByPlaceholderText("Your display name")).toBeTruthy();

    // Connected Services
    expect(screen.getByText("Connected Services")).toBeTruthy();
    expect(screen.getByText("Apple Health")).toBeTruthy();

    // Preferences
    expect(screen.getByText("Preferences")).toBeTruthy();
    expect(screen.getByText("Body Weight Unit")).toBeTruthy();

    // Privacy
    expect(screen.getByText("Public Profile")).toBeTruthy();

    // Notifications
    expect(screen.getByText("Email Notifications")).toBeTruthy();
    expect(screen.getByText("Push Notifications")).toBeTruthy();

    // Privacy & Security link
    expect(screen.getByTestId("settings-privacy-button")).toBeTruthy();

    // Sign Out
    expect(screen.getByTestId("settings-sign-out")).toBeTruthy();

    // Danger Zone
    expect(screen.getByText("Delete My Account")).toBeTruthy();
  });

  it("sign-out calls the v2 auth logout and redirects to /login", async () => {
    const { default: SettingsPage } = await import("../page");
    render(<SettingsPage />);

    const signOutBtn = screen.getByTestId("settings-sign-out");
    await fireEvent.click(signOutBtn);

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  it("navigates to /settings/privacy when Privacy & Security is clicked", async () => {
    const { default: SettingsPage } = await import("../page");
    render(<SettingsPage />);

    const privacyBtn = screen.getByTestId("settings-privacy-button");
    await fireEvent.click(privacyBtn);

    expect(mockPush).toHaveBeenCalledWith("/settings/privacy");
  });
});
