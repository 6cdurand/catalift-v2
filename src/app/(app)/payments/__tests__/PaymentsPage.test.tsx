import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

vi.mock("@/components/layouts/MainLayout", () => ({
  PageHeader: ({ title }: { title: string }) => (
    <header data-testid="page-header">{title}</header>
  ),
}));

vi.mock("@/features/payments", () => ({
  TrainerPaymentsSurface: ({
    onOpenClient,
  }: {
    onOpenClient: (clientId: string) => void;
  }) => (
    <button data-testid="trainer-payments-surface" onClick={() => onOpenClient("c1")}>
      surface
    </button>
  ),
}));

const mockUseSession = vi.fn();
const mockUseUserRole = vi.fn();

vi.mock("@/features/auth", () => ({
  useSession: () => mockUseSession(),
  useUserRole: () => mockUseUserRole(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUseSession.mockReturnValue({ user: { id: "trainer-1" }, loading: false });
  mockUseUserRole.mockReturnValue({ role: "trainer", loading: false });
});

afterEach(() => cleanup());

describe("PaymentsPage — trainer gate", () => {
  it("renders the tracker for a trainer", async () => {
    const { default: PaymentsPage } = await import("../page");
    render(<PaymentsPage />);

    expect(screen.getByTestId("trainer-payments-surface")).toBeDefined();
    expect(screen.getByTestId("page-header").textContent).toBe("Payments");
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("redirects a client to /today and renders nothing client-facing", async () => {
    mockUseSession.mockReturnValue({ user: { id: "client-1" }, loading: false });
    mockUseUserRole.mockReturnValue({ role: "client", loading: false });

    const { default: PaymentsPage } = await import("../page");
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/today");
    });
    expect(screen.queryByTestId("trainer-payments-surface")).toBeNull();
  });

  it("does not redirect or render the tracker while the role is still loading", async () => {
    mockUseUserRole.mockReturnValue({ role: "client", loading: true });

    const { default: PaymentsPage } = await import("../page");
    render(<PaymentsPage />);

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.queryByTestId("trainer-payments-surface")).toBeNull();
  });

  it("routes to the client file when the tracker asks", async () => {
    const { default: PaymentsPage } = await import("../page");
    render(<PaymentsPage />);

    screen.getByTestId("trainer-payments-surface").click();
    expect(mockPush).toHaveBeenCalledWith("/clients/c1");
  });
});
