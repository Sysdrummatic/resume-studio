import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
  readAuthTokens,
  setAuthCookies,
} from "./app/lib/auth-cookies";
import { refreshSession } from "./app/lib/supabase-http";

const PROTECTED_PREFIXES = ["/dashboard", "/master-resume", "/user", "/admin"];
const ACCESS_TOKEN_SKEW_MS = 30_000;

/**
 * Defense-in-depth CSP, layered on top of (not instead of) escaping vulnerable
 * output at the source (see app/lib/jsonld.ts, app/lib/safe-url.ts). Uses a
 * per-request nonce + 'strict-dynamic' so Next.js's own framework scripts (and
 * next/script tags like /vendor/js-yaml.min.js) keep working while any script
 * injected without the nonce is blocked outright by the browser.
 * style-src keeps 'unsafe-inline' because the app uses React inline style
 * props (e.g. app/components/design-system/atoms/Button.tsx) that CSP has no
 * practical nonce/hash story for; tightening that is a separate refactor.
 */
function buildContentSecurityPolicy(): string {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  // Next.js dev mode (Fast Refresh, eval-based sourcemaps) requires 'unsafe-eval'.
  const devEval = isDev ? " 'unsafe-eval'" : "";
  // Fast Refresh's HMR client connects over ws:/wss: in dev; 'self' does not
  // reliably cover the WebSocket scheme across browsers (see MDN connect-src).
  const devConnect = isDev ? " ws: wss:" : "";
  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${devEval};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self' data:;
    connect-src 'self'${devConnect};
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'self';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function decodeJwtPayload(token: string): { exp?: number } | null {
  const segments = token.split(".");
  if (segments.length < 2) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(segments[1], "base64url").toString("utf8")) as { exp?: number };
  } catch {
    return null;
  }
}

function accessTokenIsFresh(accessToken: string | null): boolean {
  if (!accessToken) {
    return false;
  }
  const payload = decodeJwtPayload(accessToken);
  if (!payload || typeof payload.exp !== "number") {
    return false;
  }
  // Refresh slightly before expiry so a token never lapses mid-render.
  return Date.now() < payload.exp * 1000 - ACCESS_TOKEN_SKEW_MS;
}

function redirectToLogin(request: NextRequest, reason: "session" | "signed-out"): NextResponse {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("reason", reason);
  return NextResponse.redirect(loginUrl);
}

/**
 * Keeps the auth session coherent for server-rendered requests.
 *
 * The access-token cookie expires after ~1 hour while the refresh-token cookie
 * lives for 30 days, so a returning user often has only the refresh token. The
 * previous guard checked the access cookie alone and redirected protected pages
 * to /login even though the session was still recoverable, while the header
 * (which falls back to the refresh token) showed the user as logged in.
 *
 * Server components cannot persist a refreshed session, so this runs first: when
 * the access token is missing or expired it refreshes once, forwards the fresh
 * access token to the current request, and writes the rotated pair back to the
 * browser. Protected paths redirect to /login only when no session can be
 * recovered.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const protectedPath = isProtectedPath(request.nextUrl.pathname);
  const { accessToken, refreshToken } = readAuthTokens(request.cookies);

  const contentSecurityPolicy = buildContentSecurityPolicy();
  request.headers.set("Content-Security-Policy", contentSecurityPolicy);

  function withCsp(response: NextResponse): NextResponse {
    response.headers.set("Content-Security-Policy", contentSecurityPolicy);
    return response;
  }

  if (accessTokenIsFresh(accessToken)) {
    return withCsp(NextResponse.next({ request }));
  }

  if (!refreshToken) {
    // Never had a session on this browser: a neutral prompt, not an alarm.
    return withCsp(protectedPath ? redirectToLogin(request, "signed-out") : NextResponse.next({ request }));
  }

  const refreshResult = await refreshSession(refreshToken);

  if (!refreshResult.data || refreshResult.error) {
    // Had a session that failed to restore: the "please sign in again" copy applies here.
    const response = protectedPath ? redirectToLogin(request, "session") : NextResponse.next({ request });
    clearAuthCookies(response.cookies);
    return withCsp(response);
  }

  request.cookies.set(ACCESS_TOKEN_COOKIE, refreshResult.data.access_token);
  request.cookies.set(REFRESH_TOKEN_COOKIE, refreshResult.data.refresh_token);
  const response = NextResponse.next({ request });
  setAuthCookies(response.cookies, refreshResult.data);
  return withCsp(response);
}

export const config = {
  // Runs on page navigations so the session is refreshed and persisted before
  // server components read it. API routes manage their own session; static
  // assets and Next internals are skipped.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
