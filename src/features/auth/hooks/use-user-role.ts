"use client";

import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase";
import { roleFromProfileRow } from "../api/resolve-role";
import type { UserRole } from "../types";

interface UserRoleState {
  role: UserRole;
  loading: boolean;
}

/**
 * G-20 ROLE AUTHORITY — reads the user's role from `public.users.role`
 * (the server-governed source), NOT from `user_metadata.mode`.
 *
 * Returns `{ role: "client", loading: true }` until the profile row is
 * fetched. Anything that gates trainer features must check `role === "trainer"`
 * AND `!loading` to avoid a flash of incorrect access.
 */
export function useUserRole(
  userId: string | undefined,
): UserRoleState {
  const [state, setState] = useState<UserRoleState>(() => ({
    role: "client",
    loading: !!userId,
  }));

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const supabase = getBrowserClient();
    supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single()
      .then(({ data }: { data: { role: string } | null }) => {
        if (cancelled) return;
        setState({ role: roleFromProfileRow(data), loading: false });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ role: "client", loading: false });
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return state;
}
