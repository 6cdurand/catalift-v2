import { redirect } from "next/navigation";
import { getServerClient } from "@/lib/supabase-server";

/**
 * Root route — server-side session gate (design tweak #1: the chooser is gone).
 *
 * v1 read auth state from localStorage, ran a legacy key migration, and
 * cleared seed data here. ALL of that is DROPPED: localStorage-auth is a
 * G-02/G-03 footgun. v2 checks the Supabase session on the server and
 * redirects — no client spinner, no flash of a login/signup choice screen.
 *
 * Signed in → /today. Signed out → /login. (G-18: server redirect survives
 * hard-nav/refresh.)
 */
export default async function Home() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/today" : "/login");
}
