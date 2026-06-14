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

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function decodeJwtPayload(token: string): { exp?: number } | null {
  const segments = token.split(".");
  if (segments.length < 2) {
    return null;
  }
  try {
    const base64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return JSON.parse(atob(padded)) as { exp?: number };
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

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("reason", "session");
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

  if (accessTokenIsFresh(accessToken)) {
    return NextResponse.next();
  }

  if (!refreshToken) {
    return protectedPath ? redirectToLogin(request) : NextResponse.next();
  }

  const refreshResult = await refreshSession(refreshToken);

  if (!refreshResult.data || refreshResult.error) {
    const response = protectedPath ? redirectToLogin(request) : NextResponse.next();
    clearAuthCookies(response.cookies);
    return response;
  }

  request.cookies.set(ACCESS_TOKEN_COOKIE, refreshResult.data.access_token);
  request.cookies.set(REFRESH_TOKEN_COOKIE, refreshResult.data.refresh_token);
  const response = NextResponse.next({ request });
  setAuthCookies(response.cookies, refreshResult.data);
  return response;
}

export const config = {
  // Runs on page navigations so the session is refreshed and persisted before
  // server components read it. API routes manage their own session; static
  // assets and Next internals are skipped.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
