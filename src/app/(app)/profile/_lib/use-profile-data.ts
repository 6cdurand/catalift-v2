"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@/types";
import { getBrowserClient } from "@/lib/supabase";
import {
  getLocalItem,
  setLocalItem,
  removeLocalItem,
  userScopedKey,
} from "@/lib/storage";
import { useSession, useUserRole, logout as authLogout } from "@/features/auth";
import {
  fetchWorkoutHistory,
  fetchWorkoutHistoryWithBlocks,
} from "@/features/workout-engine/api/fetch-history";
import { fetchPersonalBests } from "@/features/workout-engine/api/fetch-personal-bests";
import { fetchRoster } from "@/features/trainer-ops/api/roster";
import type { RosterClient } from "@/types/roster";
import type { Workout, PersonalBest } from "@/types";
import {
  adaptWorkoutHistory,
  adaptPersonalBest,
} from "./adapt-workout";

/** A gym entry stored in per-user scoped localStorage (G-04 user-scoped keys). */
export interface GymEntry {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
}

type ProfileRow = {
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  gender: string | null;
  email: string;
};

interface ProfileData {
  loading: boolean;
  /** v1-shaped user view assembled from `public.users` + role + local view mode. */
  user: User | null;
  isTrainerMode: boolean;
  workouts: Workout[];
  personalBests: PersonalBest[];
  roster: RosterClient[];
  gyms: GymEntry[];
  /** Local view toggle — trainers can preview athlete mode without touching role (G-20). */
  setViewMode: (mode: "user" | "trainer") => void;
  /** Persist the selected gym to per-user scoped storage. Pass null to clear. */
  setGym: (name: string | null) => void;
  addGym: (name: string) => void;
  logout: () => Promise<void>;
}

export function useProfileData(): ProfileData {
  const { user: sessionUser, loading: sessionLoading } = useSession();
  const { role, loading: roleLoading } = useUserRole(sessionUser?.id);

  const [profileRow, setProfileRow] = useState<ProfileRow | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [personalBests, setPersonalBests] = useState<PersonalBest[]>([]);
  const [roster, setRoster] = useState<RosterClient[]>([]);
  const [gyms, setGyms] = useState<GymEntry[]>([]);
  const [gymName, setGymNameState] = useState<string | undefined>(undefined);
  // Local view-mode override. `null` = follow the server-governed role. Only a
  // trainer's explicit toggle sets it (previewing athlete view) — this never
  // writes to `public.users.role`, so it cannot self-promote a client (G-20).
  const [viewOverride, setViewOverride] = useState<"user" | "trainer" | null>(
    null,
  );
  const [dataLoading, setDataLoading] = useState(true);

  const userId = sessionUser?.id;

  // Effective view mode is derived, not effect-synced.
  const viewMode: "user" | "trainer" =
    viewOverride ?? (role === "trainer" ? "trainer" : "user");

  // Load the profile row + workout history + PBs + roster + scoped gym state.
  // All setState happens after the awaited fetches (never synchronously in the
  // effect body) to satisfy the react-hooks set-state-in-effect rule.
  useEffect(() => {
    if (!userId || roleLoading) return;
    let cancelled = false;
    const uid = userId;
    const isTrainer = role === "trainer";

    async function load() {
      const supabase = getBrowserClient();

      const [rowRes, items, blocks, pbs, rosterRes] = await Promise.all([
        supabase
          .from("users")
          .select("full_name, username, avatar_url, gender, email")
          .eq("id", uid)
          .single(),
        fetchWorkoutHistory(uid, 50).catch(() => []),
        fetchWorkoutHistoryWithBlocks(uid, 50).catch(() => []),
        fetchPersonalBests(uid).catch(() => []),
        isTrainer ? fetchRoster().catch(() => []) : Promise.resolve([]),
      ]);

      if (cancelled) return;

      // Per-user scoped gym state (G-04). Never a bare key.
      let gymList: GymEntry[] = [];
      try {
        const raw = getLocalItem(userScopedKey("gyms-list", uid));
        gymList = raw ? (JSON.parse(raw) as GymEntry[]) : [];
      } catch {
        gymList = [];
      }
      const selectedGym = getLocalItem(userScopedKey("gym-selected", uid));

      setProfileRow((rowRes.data as ProfileRow) ?? null);
      setWorkouts(adaptWorkoutHistory(items, blocks, uid));
      setPersonalBests(pbs.map(adaptPersonalBest));
      setRoster(rosterRes as RosterClient[]);
      setGyms(gymList);
      setGymNameState(selectedGym ?? undefined);
      setDataLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [userId, role, roleLoading]);

  const setViewMode = useCallback((mode: "user" | "trainer") => {
    setViewOverride(mode);
  }, []);

  const setGym = useCallback(
    (name: string | null) => {
      if (!userId) return;
      const key = userScopedKey("gym-selected", userId);
      if (name) {
        setLocalItem(key, name);
        setGymNameState(name);
      } else {
        removeLocalItem(key);
        setGymNameState(undefined);
      }
    },
    [userId],
  );

  const addGym = useCallback(
    (name: string) => {
      if (!userId || !name.trim()) return;
      const entry: GymEntry = {
        id: `gym-${Date.now()}`,
        name: name.trim(),
        createdBy: userId,
        createdAt: new Date().toISOString(),
      };
      const updated = [...gyms, entry];
      setGyms(updated);
      setLocalItem(userScopedKey("gyms-list", userId), JSON.stringify(updated));
      setGym(name.trim());
    },
    [userId, gyms, setGym],
  );

  const logout = useCallback(async () => {
    await authLogout();
  }, []);

  const isTrainerMode = viewMode === "trainer";

  const user = useMemo<User | null>(() => {
    if (!sessionUser) return null;
    const email = profileRow?.email ?? sessionUser.email ?? "";
    const displayName =
      profileRow?.full_name ||
      profileRow?.username ||
      email.split("@")[0] ||
      "Athlete";
    const genderRaw = profileRow?.gender;
    const gender =
      genderRaw === "male" || genderRaw === "female" ? genderRaw : "other";

    // v1-shaped view object. Deferred/absent v2 columns degrade to safe
    // defaults (no bio, no membership tier, empty social graph).
    return {
      id: sessionUser.id,
      email,
      username: profileRow?.username || displayName,
      displayName,
      gender,
      profilePhoto: profileRow?.avatar_url || undefined,
      mode: viewMode === "trainer" ? "trainer" : "user",
      isTrainer: role === "trainer",
      isVerifiedTrainer: false,
      preferredUnit: "kg",
      createdAt: new Date().toISOString(),
      followers: [],
      following: [],
      gymName,
    } as User;
  }, [sessionUser, profileRow, viewMode, role, gymName]);

  return {
    loading: sessionLoading || roleLoading || dataLoading,
    user,
    isTrainerMode,
    workouts,
    personalBests,
    roster,
    gyms,
    setViewMode,
    setGym,
    addGym,
    logout,
  };
}
