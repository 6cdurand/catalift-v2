import { create } from "zustand";

export type ViewMode = "user" | "trainer";

interface ViewModeState {
  /** Local view-mode override. `null` = follow the server-governed role. */
  viewOverride: ViewMode | null;
  setViewMode: (mode: ViewMode) => void;
  resetViewMode: () => void;
}

/**
 * Global view-mode override store.
 *
 * Trainers can preview the athlete view by toggling mode on the Profile page.
 * This store makes the override visible to MainLayout (nav + theme) without
 * writing to `public.users.role` (G-20 — mode is a LOCAL view toggle only).
 *
 * Not persisted — resets on page reload, matching the v2 behaviour where the
 * effective mode is always re-derived from the DB role on fresh load.
 */
export const useViewModeStore = create<ViewModeState>()((set) => ({
  viewOverride: null,
  setViewMode: (mode) => set({ viewOverride: mode }),
  resetViewMode: () => set({ viewOverride: null }),
}));
