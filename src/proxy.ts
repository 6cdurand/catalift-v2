import { NextResponse, type NextRequest } from "next/server";
import { getProxyClient } from "@/lib/supabase-server";

/**
 * Next.js 16 Proxy (formerly Middleware) — the authoritative server-side
 * auth gate for protected routes (BUG-012).
 *
 * Responsibilities, in order:
 *   1. Refresh the Supabase auth session on every matched request. Without
 *      this, sessions expire and users get randomly logged out. The
 *      `supabase.auth.getUser()` call below performs BOTH the refresh and the
 *      gate check in a single round-trip — do NOT remove it.
 *   2. If there is no authenticated user AND the path is not public, redirect
 *      to /login. This closes the gap where signed-out users could hard-nav
 *      straight to /today, /workouts, etc. and see authed shell pages.
 *   3. Nicety: bounce a signed-IN user away from the login/signup pages.
 *
 * getClaims vs getUser: this project HAS asymmetric (ES256) JWT signing keys,
 * so local claim verification is technically available. We still use
 * getUser() because it ALSO performs the mandatory cookie refresh that
 * getClaims() does not — using getClaims() would force an extra getUser()
 * call (defeating the no-network goal) or drop the refresh (a regression).
 * Reusing getUser() = zero extra round-trips. See PR notes.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabase = getProxyClient(request, response);

  const authed = await isAuthenticated(request, supabase);
  const { pathname } = request.nextUrl;

  // Gate: no session + a route that requires one → /login.
  if (!authed && !isPublicPath(pathname)) {
    return redirectTo(request, response, "/login");
  }

  // Nicety: a signed-IN user landing on an auth page → /today.
  // NOTE: deliberately excludes /reset-password and /update-password — the
  // password-recovery flow establishes a session yet must reach those pages.
  if (authed && SIGNED_IN_REDIRECT_FROM.has(pathname)) {
    return redirectTo(request, response, "/today");
  }

  return response;
}

/**
 * Public (no-auth) allowlist — derived from the real src/app/** route tree:
 *   - `(auth)` group → /login, /signup, /reset-password, /update-password
 *     (Next strips the route-group parens from the URL).
 *   - `(auth)/callback` route handler → MUST stay reachable mid-flow so the
 *     email/OAuth code exchange can complete.
 *   - `/` → root self-redirects in app/page.tsx based on the session.
 *   - `/invite` → invite landing for users who do not have a session yet.
 * Everything else (the entire `(app)` group, /onboarding/**, /workout/**,
 * /program/**) requires an authenticated session.
 */
const PUBLIC_PATHS = new Set<string>([
  "/",
  "/login",
  "/signup",
  "/reset-password",
  "/update-password",
  "/callback",
  "/invite",
]);

/** Auth pages a signed-IN user should be bounced away from. */
const SIGNED_IN_REDIRECT_FROM = new Set<string>(["/login", "/signup"]);

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

async function isAuthenticated(
  request: NextRequest,
  supabase: ReturnType<typeof getProxyClient>,
): Promise<boolean> {
  // E2E ONLY: a deterministic, server-verifiable session for Playwright.
  // Provably disabled in production (see `e2eAuthBypassEnabled`). Even when
  // enabled it REQUIRES a validly-signed test JWT — a bare/forged cookie
  // fails verification, so this never weakens the real gate logic.
  if (e2eAuthBypassEnabled()) {
    if (await verifyE2EAccessToken(request)) return true;
    // Fall through so signed-OUT e2e cases still redirect correctly.
  }

  // Production/default: real verification + mandatory session refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user != null;
}

/**
 * Builds a redirect while preserving any auth cookies refreshed on `response`
 * during this request (so we never throw away a freshly-rotated session).
 */
function redirectTo(
  request: NextRequest,
  response: NextResponse,
  pathname: string,
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  for (const cookie of response.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}

// ---------------------------------------------------------------------------
// E2E test-auth bridge (NOT a production code path).
//
// Playwright's mock-auth is browser-side only (page.route + an injected
// cookie), which the SERVER-side proxy cannot see. To let protected-route e2e
// tests pass deterministically and offline, this verifies a test JWT that the
// test helper signs with E2E_JWT_SECRET (local HS256 verification, no network).
//
// PROD-SAFETY GUARANTEE: this branch is unreachable in any deployed build.
//   - `NODE_ENV === "production"` (every `next build`/`next start`, i.e. all
//     Vercel/Netlify deploys) hard-returns false REGARDLESS of any env var.
//   - It additionally requires the opt-in flag `E2E_AUTH_BYPASS === "1"`,
//     which is set ONLY by playwright.config.ts when launching `next dev`.
// Production therefore ALWAYS falls through to the real getUser() check (G-02:
// never trust client-set values).
// ---------------------------------------------------------------------------

function e2eAuthBypassEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.E2E_AUTH_BYPASS === "1";
}

async function verifyE2EAccessToken(request: NextRequest): Promise<boolean> {
  const secret = process.env.E2E_JWT_SECRET;
  if (!secret) return false;
  const token = readAccessTokenFromCookies(request);
  if (!token) return false;
  return verifyHs256(token, secret);
}

function supabaseRef(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname.split(".")[0];
  } catch {
    return null;
  }
}

function readAccessTokenFromCookies(request: NextRequest): string | null {
  const ref = supabaseRef();
  if (!ref) return null;
  const base = `sb-${ref}-auth-token`;

  let raw = request.cookies.get(base)?.value ?? null;
  if (!raw) {
    const chunks: string[] = [];
    for (let i = 0; ; i++) {
      const chunk = request.cookies.get(`${base}.${i}`)?.value;
      if (!chunk) break;
      chunks.push(chunk);
    }
    if (chunks.length) raw = chunks.join("");
  }
  if (!raw) return null;

  let text = raw;
  if (text.startsWith("base64-")) {
    try {
      text = globalThis.atob(text.slice("base64-".length));
    } catch {
      return null;
    }
  }

  for (const candidate of [text, safeDecodeURIComponent(text)]) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate);
      const session = Array.isArray(parsed) ? parsed[0] : parsed;
      const accessToken = session?.access_token;
      if (typeof accessToken === "string") return accessToken;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

/** Local HS256 verification via Web Crypto (Edge- and Node-runtime safe). */
async function verifyHs256(token: string, secret: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [header, payload, signature] = parts;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(signature) as BufferSource,
      new TextEncoder().encode(`${header}.${payload}`) as BufferSource,
    );
    if (!valid) return false;

    const claims = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(payload)),
    ) as { exp?: number };
    if (typeof claims.exp === "number" && claims.exp * 1000 <= Date.now()) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function base64UrlToBytes(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = globalThis.atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
