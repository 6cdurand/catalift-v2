import { describe, it, expect, beforeEach } from "vitest";
import { useViewModeStore, setViewModeUserScope } from "../use-view-mode";
import { userScopedKey } from "@/lib/storage";

const USER_A = "user-aaaa";
const USER_B = "user-bbbb";

describe("useViewModeStore persistence (user-scoped)", () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset scope + in-memory state between tests.
    setViewModeUserScope(null);
    useViewModeStore.setState({ viewOverride: null });
  });

  it("persists viewOverride under a user-scoped key", () => {
    setViewModeUserScope(USER_A);
    useViewModeStore.getState().setViewMode("user");

    expect(localStorage.getItem(userScopedKey("view-mode", USER_A))).toBeTruthy();
  });

  it("survives a simulated reload (rehydrate restores the value)", async () => {
    setViewModeUserScope(USER_A);
    useViewModeStore.getState().setViewMode("user");

    // Simulate a hard refresh: detach the scope (clears in-memory state without
    // touching storage), then re-scope + rehydrate from the same user's key.
    setViewModeUserScope(null);
    expect(useViewModeStore.getState().viewOverride).toBeNull();

    setViewModeUserScope(USER_A);
    await useViewModeStore.persist.rehydrate();

    expect(useViewModeStore.getState().viewOverride).toBe("user");
  });

  it("does NOT leak one user's override to another account", async () => {
    setViewModeUserScope(USER_A);
    useViewModeStore.getState().setViewMode("user");

    // Switch to a different user (as on a shared device) and rehydrate.
    setViewModeUserScope(USER_B);
    await useViewModeStore.persist.rehydrate();

    expect(useViewModeStore.getState().viewOverride).toBeNull();
    expect(localStorage.getItem(userScopedKey("view-mode", USER_B))).toBeNull();
    // User A's override is untouched in its own scoped key.
    expect(localStorage.getItem(userScopedKey("view-mode", USER_A))).toBeTruthy();
  });

  it("drops writes when no user is scoped", () => {
    setViewModeUserScope(null);
    useViewModeStore.getState().setViewMode("trainer");

    const leaked = Object.keys(localStorage).some((k) =>
      k.startsWith("catalift-view-mode"),
    );
    expect(leaked).toBe(false);
  });
});
