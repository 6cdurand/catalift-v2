"use client";

import { useEffect } from "react";
import { useSession, useUserRole } from "@/features/auth";
import { useViewModeStore, setViewModeUserScope } from "./use-view-mode";
import type { UserMode } from "@/types";

export interface AuthUser {
  id: string;
  email: string;
  mode: UserMode;
}

interface AuthUserState {
  user: AuthUser | null;
  isAuthenticated: boolean;
}

/**
 * Shared auth-user hook for the app shell.
 *
 * Combines the Supabase session, the server-governed role (`public.users.role`),
 * and the local view-mode override into a single `{ user, isAuthenticated }`
 * shape that MainLayout / PageHeader consume.
 *
 * The effective mode is: `viewOverride ?? (role === "trainer" ? "trainer" : "user")`.
 * This never writes to the DB — it only reflects the live toggle (G-20).
 */
export function useAuthUser(): AuthUserState {
  const { user: sessionUser, loading } = useSession();
  const { role } = useUserRole(sessionUser?.id);
  const viewOverride = useViewModeStore((s) => s.viewOverride);

  // Point the view-mode store at this user's scoped storage and rehydrate the
  // persisted override, so a trainer's "preview as athlete" survives a reload.
  useEffect(() => {
    setViewModeUserScope(sessionUser?.id ?? null);
  }, [sessionUser?.id]);

  if (!sessionUser || loading) {
    return { user: null, isAuthenticated: false };
  }

  const mode: UserMode =
    viewOverride ?? (role === "trainer" ? "trainer" : "user");

  return {
    user: { id: sessionUser.id, email: sessionUser.email ?? "", mode },
    isAuthenticated: true,
  };
}
