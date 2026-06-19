import { NextResponse, type NextRequest } from "next/server";
import { getProxyClient } from "@/lib/supabase-server";

/**
 * Next.js 16 Proxy (formerly Middleware).
 *
 * Refreshes the Supabase auth session on every matched request.
 * Without this, sessions expire and users get randomly logged out.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = getProxyClient(request, response);

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
