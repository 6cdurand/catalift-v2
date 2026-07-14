import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { StateStorage } from "zustand/middleware";
import {
  getLocalItem,
  setLocalItem,
  removeLocalItem,
  userScopedKey,
} from "@/lib/storage";

export type ViewMode = "user" | "trainer";

interface ViewModeState {
  /** Local view-mode override. `null` = follow the server-governed role. */
  viewOverride: ViewMode | null;
  setViewMode: (mode: ViewMode) => void;
  resetViewMode: () => void;
}

// The active user id the store persists under. Resolved lazily via
// `setViewModeUserScope()` (called from the app shell) because the store is a
// module-level singleton created before any session exists.
let activeUserId: string | null = null;

/**
 * User-scoped localStorage adapter (G-04). The persist `name` is ignored — the
 * real key is `catalift-view-mode-<userId>`, so one account's preview mode can
 * never leak to another on a shared device. When no user is scoped yet, reads
 * return `null` and writes are dropped.
 */
const scopedStorage: StateStorage = {
  getItem: () =>
    activeUserId ? getLocalItem(userScopedKey("view-mode", activeUserId)) : null,
  setItem: (_name, value) => {
    if (activeUserId) setLocalItem(userScopedKey("view-mode", activeUserId), value);
  },
  removeItem: () => {
    if (activeUserId) removeLocalItem(userScopedKey("view-mode", activeUserId));
  },
};

/**
 * Global view-mode override store.
 *
 * Trainers can preview the athlete view by toggling mode on the Profile page.
 * This store makes the override visible to MainLayout (nav + theme) without
 * writing to `public.users.role` (G-20 — mode is a LOCAL view toggle only).
 *
 * The override IS persisted (user-scoped localStorage) so a trainer's chosen
 * mode survives a hard refresh — matching v1, which keeps the active `mode`
 * (persistent) separate from the permanent account role. Persistence is a UI
 * preference only; the DB role stays server-governed.
 */
export const useViewModeStore = create<ViewModeState>()(
  persist(
    (set) => ({
      viewOverride: null,
      setViewMode: (mode) => set({ viewOverride: mode }),
      resetViewMode: () => set({ viewOverride: null }),
    }),
    {
      // Ignored by `scopedStorage`, which derives the real user-scoped key.
      name: "catalift-view-mode",
      storage: createJSONStorage(() => scopedStorage),
      // Persist ONLY the override, never the action functions.
      partialize: (state) => ({ viewOverride: state.viewOverride }),
      // No user is known at module load, so defer the first read to
      // `setViewModeUserScope()` once the session resolves.
      skipHydration: true,
    },
  ),
);

/**
 * Points the store at a user's scoped storage and rehydrates from it. Call from
 * the app shell when the session resolves or changes. Switching accounts clears
 * the previous user's in-memory override before rehydrating the new one.
 */
export function setViewModeUserScope(userId: string | null): void {
  if (userId === activeUserId) return;
  const hadPreviousUser = activeUserId !== null;
  if (hadPreviousUser) {
    // Account switch / sign-out: drop the prior user's override so it can't
    // linger in memory. Detach the scope first (activeUserId = null) so this
    // reset is NOT written back to either user's storage.
    activeUserId = null;
    useViewModeStore.setState({ viewOverride: null });
  }
  activeUserId = userId;
  if (userId) void useViewModeStore.persist.rehydrate();
}
