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
  // Track the role we resolved AND which userId it belongs to. `loading` is
  // derived during render (not stored) so that the instant `userId` transitions
  // from undefined -> defined (e.g. after useSession resolves on a reload), the
  // hook reports `loading: true` in the SAME commit. Storing loading in state
  // lagged by one render, which let trainer gates fire a premature redirect
  // before the role fetch resolved.
  const [resolved, setResolved] = useState<{
    id: string;
    role: UserRole;
  } | null>(null);

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
        setResolved({ id: userId, role: roleFromProfileRow(data) });
      })
      .catch(() => {
        if (cancelled) return;
        setResolved({ id: userId, role: "client" });
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!userId) return { role: "client", loading: false };
  if (resolved?.id === userId) return { role: resolved.role, loading: false };
  return { role: "client", loading: true };
}
