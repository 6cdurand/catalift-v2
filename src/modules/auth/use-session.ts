"use client";

import { useEffect, useState } from "react";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";
import { getBrowserClient } from "@/lib/supabase";

interface SessionState {
  user: User | null;
  loading: boolean;
}

/**
 * Session hook — returns `{ user, loading }`.
 *
 * Listens to `onAuthStateChange` and handles `SIGNED_OUT` explicitly
 * by clearing all Zustand persisted stores.
 *
 * Supabase Auth is the ONLY credential source. No localStorage fast-path.
 */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    user: null,
    loading: true,
  });

  useEffect(() => {
    const supabase = getBrowserClient();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setState({
        user: session?.user ?? null,
        loading: false,
      });
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === "SIGNED_OUT") {
        // Explicitly clear all Zustand persisted stores on sign out
        clearAllPersistedStores();
        setState({ user: null, loading: false });
        return;
      }

      setState({
        user: session?.user ?? null,
        loading: false,
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return state;
}

/**
 * Clears all Zustand persisted stores from localStorage.
 * Called explicitly on SIGNED_OUT event.
 *
 * Only clears keys matching `catalift-*` pattern (user-scoped persist keys).
 * Auth tokens (`sb-*`) are managed by Supabase Auth directly.
 */
function clearAllPersistedStores() {
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith("catalift-")) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // best-effort — localStorage may be unavailable
  }
}
