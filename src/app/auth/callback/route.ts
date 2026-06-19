import { NextResponse, type NextRequest } from "next/server";
import { getProxyClient } from "@/lib/supabase-server";

/**
 * Auth callback route — handles email confirmation redirects.
 *
 * Exchanges the `code` query parameter for a session, then redirects
 * to the home page. If there's an error, redirects to login.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`);
    const supabase = getProxyClient(request, response);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(`${origin}/auth/login?error=callback`);
    }

    return response;
  }

  return NextResponse.redirect(`${origin}/auth/login?error=no-code`);
}
