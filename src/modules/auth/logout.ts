"use client";

import { getBrowserClient } from "@/lib/supabase";

/**
 * Logs out the current user.
 *
 * Calls `supabase.auth.signOut` and clears all Zustand persisted stores.
 * Supabase Auth is the ONLY credential source — no localStorage fast-path.
 */
export async function logout(): Promise<void> {
  const supabase = getBrowserClient();
  await supabase.auth.signOut();

  // Clear all user-scoped persist keys
  clearAllPersistedStores();
}

function clearAllPersistedStores() {
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith("catalift-")) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // best-effort
  }
}
