"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "./use-session";

/**
 * Auth guard hook — redirects to `/login` if not authenticated.
 *
 * Use in client components that require authentication.
 * Returns the same `{ user, loading }` as `useSession`.
 */
export function useRequireAuth() {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!session.loading && !session.user) {
      router.replace("/login");
    }
  }, [session.loading, session.user, router]);

  return session;
}
