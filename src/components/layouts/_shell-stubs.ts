"use client";

import { useSession } from "@/features/auth";

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

function useAuthStore(): AuthStoreState {
  const { user, loading } = useSession();

  if (!user || loading) {
    return { user: null, isAuthenticated: false };
  }

  const mode: UserRole =
    (user.user_metadata?.mode as UserRole | undefined) ?? "client";

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
