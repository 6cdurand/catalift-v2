"use client";

import { useEffect, useState } from "react";
import { useSession, roleFromProfileRow } from "@/features/auth";
import { getBrowserClient } from "@/lib/supabase";

// TODO(lane): replace with real feature store
// This file is a temporary seam so the ported v1 MainLayout compiles and renders.
// Real wiring lands in the workout-engine, messaging, and social feature lanes.

export type UserRole = "client" | "trainer";

export interface CataliftUser {
  id: string;
  email: string;
  mode: UserRole;
}

interface AuthStoreState {
  user: CataliftUser | null;
  isAuthenticated: boolean;
}

/**
 * G-20 ROLE AUTHORITY: `public.users.role` is the single source of truth for
 * gating trainer features. We deliberately do NOT read `user_metadata.mode`
 * here — that value is user-controllable at signup and trusting it for
 * authorization is the v1 self-promotion gap. The mode stays `client` until
 * the profile row's `role` is read back from the DB (RLS: `id = auth.uid()`).
 */
function useAuthStore(): AuthStoreState {
  const { user, loading } = useSession();
  const [mode, setMode] = useState<UserRole>("client");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const supabase = getBrowserClient();
    supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()
      .then(({ data }: { data: { role: string } | null }) => {
        if (cancelled) return;
        setMode(roleFromProfileRow(data));
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user || loading) {
    return { user: null, isAuthenticated: false };
  }

  return {
    user: { id: user.id, email: user.email ?? "", mode },
    isAuthenticated: true,
  };
}

// TODO(lane): replace with real workout-engine store
interface ActiveWorkout {
  name?: string;
  exercises?: unknown[];
}

interface WorkoutStoreState {
  activeWorkout: ActiveWorkout | null;
}

function useWorkoutStore(): WorkoutStoreState {
  return { activeWorkout: null };
}

// TODO(lane): replace with real social/notification store
interface SocialStoreState {
  getUnreadCount: () => number;
}

function useSocialStore(): SocialStoreState {
  return { getUnreadCount: () => 0 };
}

// TODO(lane): replace with real messaging store
interface MessageStoreState {
  getUnreadCount: (_userId: string) => number;
}

function useMessageStore(): MessageStoreState {
  return { getUnreadCount: () => 0 };
}

export {
  useAuthStore,
  useWorkoutStore,
  useSocialStore,
  useMessageStore,
};
