/* eslint-disable @typescript-eslint/no-explicit-any */

// P-06-L1 — the client file shell: tab seeding (row 8), the header @handle
// (row 3), and the single-session-count regression guard.
//
// THE COUNT GUARD IS THE IMPORTANT ONE. Before this lane the page rendered
// `{client.sessions} sessions` in the profile summary — a count of `workouts`
// rows — about 150px above ClientPaymentsSection's "Sessions done", which counts
// `historical_offset_sessions + client_sessions`. Two different numbers, both
// called sessions. The word "sessions" now belongs to the ledger alone; the
// workouts count may only ever be labelled as workouts (G-14, trainer-ops rule 2).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { RosterClientDetail } from "@/types/roster";

const mockPush = vi.fn();
const mockReplace = vi.fn();

let query = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useParams: () => ({ id: "client-1" }),
  useSearchParams: () => new URLSearchParams(query),
}));

vi.mock("@/components/layouts/MainLayout", () => ({
  PageHeader: ({ title, subtitle, avatar, action }: any) => (
    <header data-testid="page-header">
      <span data-testid="header-title">{title}</span>
      {subtitle ? <span data-testid="header-subtitle">{subtitle}</span> : null}
      {avatar}
      {action}
    </header>
  ),
}));

vi.mock("@/features/auth", () => ({
  useSession: () => ({ user: { id: "trainer-1" }, loading: false }),
  useUserRole: () => ({ role: "trainer", loading: false }),
}));

const mockFetchClients = vi.fn();
vi.mock("@/lib/roster", () => ({
  fetchClients: () => mockFetchClients(),
}));

vi.mock("@/features/programs", () => ({
  fetchClientProgramsForTrainer: () => Promise.resolve([]),
}));

vi.mock("@/features/workout-engine/api/fetch-history", () => ({
  fetchWorkoutHistory: () => Promise.resolve([]),
}));

vi.mock("@/features/workout-engine/api/fetch-personal-bests", () => ({
  fetchPersonalBests: () => Promise.resolve([]),
}));

// Stands in for the ONE real session authority: offset + ledger = 3.
vi.mock("@/features/payments", () => ({
  ClientPaymentsSection: () => (
    <div data-testid="client-payments-section">
      <span data-testid="stat-completed">3</span>
      <span>Sessions done</span>
    </div>
  ),
}));

vi.mock("@/hooks/use-active-workout", () => ({
  useActiveWorkoutBanner: () => null,
}));

vi.mock("@/features/messaging", () => ({
  ConversationThread: () => <div data-testid="conversation-thread" />,
  getOrCreateConversation: () => Promise.resolve("convo-1"),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/features/trainer-ops/api/clients", () => ({
  removeClient: vi.fn(() => Promise.resolve()),
}));

function makeClient(overrides: Partial<RosterClientDetail> = {}): RosterClientDetail {
  return {
    id: "client-1",
    name: "Anna Jones",
    email: "anna@example.com",
    status: "active",
    avatarUrl: null,
    username: "annaj",
    // A count of `workouts` rows — deliberately different from the ledger's 3.
    sessions: 7,
    lastSeen: null,
    ...overrides,
  };
}

async function renderPage(client = makeClient()) {
  mockFetchClients.mockResolvedValue({
    clients: [client],
    stats: { active: 1, pending: 0, total: 1 },
  });
  const { default: ClientDetailPage } = await import("../page");
  render(<ClientDetailPage />);
  await waitFor(() => expect(screen.getByTestId("page-header")).toBeDefined());
  await waitFor(() =>
    expect(screen.getByTestId("header-title").textContent).toBe(client.name),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  query = "";
  window.history.replaceState(null, "", "/clients/client-1");
});

afterEach(() => cleanup());

describe("client file — one session authority", () => {
  it("never labels the workouts count as sessions", async () => {
    await renderPage();

    const body = document.body.textContent ?? "";
    // 7 is the workouts count. It must never read as a session figure.
    expect(body).not.toMatch(/7\s*sessions?/i);
    expect(body).toMatch(/7 workouts logged/);
  });

  it("renders the ledger-derived count as the only thing called sessions", async () => {
    query = "tab=payments";
    await renderPage();

    await waitFor(() =>
      expect(screen.getByTestId("client-payments-section")).toBeDefined(),
    );
    expect(screen.getByTestId("stat-completed").textContent).toBe("3");

    const body = document.body.textContent ?? "";
    expect(body).toMatch(/Sessions done/);
    expect(body).not.toMatch(/7\s*sessions?/i);
  });
});

describe("client file — tab seeding", () => {
  it("opens the payments tab from ?tab=payments", async () => {
    query = "tab=payments";
    await renderPage();

    expect(screen.getByTestId("client-payments-section")).toBeDefined();
    expect(screen.queryByTestId("progress-workout-history")).toBeNull();
  });

  it("defaults to overview when ?tab= is absent", async () => {
    await renderPage();

    expect(screen.getByTestId("overview-workouts-logged")).toBeDefined();
    expect(screen.queryByTestId("client-payments-section")).toBeNull();
  });

  it("defaults to overview when ?tab= is garbage", async () => {
    query = "tab=not-a-tab";
    await renderPage();

    expect(screen.getByTestId("overview-workouts-logged")).toBeDefined();
  });

  it("renders all five tabs in v1's order", async () => {
    await renderPage();

    const tabs = screen.getAllByRole("tab").map((t) => t.textContent);
    expect(tabs).toEqual([
      "Overview",
      "Program",
      "Progress",
      "Messages",
      "Payments",
    ]);
  });
});

describe("client file — header identity", () => {
  it("renders @username as the header subtitle when present", async () => {
    await renderPage();

    expect(screen.getByTestId("header-subtitle").textContent).toBe("@annaj");
  });

  it("renders no subtitle at all when username is null (never a bare @)", async () => {
    await renderPage(makeClient({ username: null }));

    expect(screen.queryByTestId("header-subtitle")).toBeNull();
    expect(document.body.textContent ?? "").not.toMatch(/@\s*$/);
  });

  it("exposes the avatar as a labelled control that opens the profile card", async () => {
    await renderPage();

    const avatarButton = screen.getByTestId("client-avatar-button");
    expect(avatarButton.getAttribute("aria-label")).toBe("View Anna Jones's profile");
  });

  it("exposes a labelled remove-client control", async () => {
    await renderPage();

    expect(
      screen.getByTestId("remove-client-button").getAttribute("aria-label"),
    ).toBe("Remove client");
  });

  it("renders the real DB status, not a binary Active/Inactive", async () => {
    await renderPage(makeClient({ status: "pending" }));

    expect(screen.getByTestId("badge-client-status").textContent).toBe("Pending");
    expect(screen.getByTestId("badge-pending-signup")).toBeDefined();
  });
});

describe("client file — quick actions", () => {
  it("ships exactly two actions: Message and Book (no Start Workout)", async () => {
    await renderPage();

    const bar = screen.getByTestId("client-quick-actions");
    expect(bar.querySelectorAll("button")).toHaveLength(2);
    expect(screen.getByTestId("quick-action-message")).toBeDefined();
    expect(screen.getByTestId("quick-action-book")).toBeDefined();
    // Row 48 is blocked: a trainer cannot insert a workout for a client
    // (workouts_insert_own), so the only thing a button could do is log the
    // session into the trainer's own history — v1's contamination bug.
    expect(document.body.textContent ?? "").not.toMatch(/Start Workout/i);
  });
});
