import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearAuthCookies, readAuthTokens, setAuthCookies } from "../../../lib/auth-cookies";
import { enforceRateLimit } from "../../../lib/rate-limit";
import { getClientIp } from "../../../lib/client-ip";
import { getAuthUser, refreshSession } from "../../../lib/supabase-http";
import { normalizeEmail, normalizeProfileForActor, resolveProfile } from "../../../lib/auth-profile";

function buildUnauthorizedResponse(message = "Authentication required."): Response {
  return NextResponse.json({ error: message }, { status: 401 });
}

export async function GET(request: Request): Promise<Response> {
  // Covers token refresh. Generous per-IP cap (shared NATs); fail-open so a counter outage
  // does not sign everyone out — Supabase enforces its own refresh limits.
  const limited = await enforceRateLimit({
    action: "session-refresh",
    limits: [{ dim: "ip", value: getClientIp(request.headers), interval: 60_000, limit: 300 }],
    onStoreError: "open",
  });
  if (limited) return limited;

  const cookieStore = await cookies();
  const { accessToken, refreshToken } = readAuthTokens(cookieStore);

  let activeAccessToken = accessToken;
  if (!activeAccessToken && refreshToken) {
    const refreshResult = await refreshSession(refreshToken);
    if (!refreshResult.data || refreshResult.error) {
      clearAuthCookies(cookieStore);
      return buildUnauthorizedResponse("Session expired. Sign in again.");
    }
    setAuthCookies(cookieStore, refreshResult.data);
    activeAccessToken = refreshResult.data.access_token;
  }

  if (!activeAccessToken) {
    return buildUnauthorizedResponse();
  }

  let userResult = await getAuthUser(activeAccessToken);
  if ((!userResult.data || userResult.error) && refreshToken) {
    const refreshResult = await refreshSession(refreshToken);
    if (!refreshResult.data || refreshResult.error) {
      clearAuthCookies(cookieStore);
      return buildUnauthorizedResponse("Session expired. Sign in again.");
    }

    setAuthCookies(cookieStore, refreshResult.data);
    activeAccessToken = refreshResult.data.access_token;
    userResult = await getAuthUser(activeAccessToken);
  }

  if (!userResult.data || userResult.error) {
    clearAuthCookies(cookieStore);
    return buildUnauthorizedResponse();
  }

  const profileResult = await resolveProfile(userResult.data.id, activeAccessToken);
  if (!profileResult.data || profileResult.error) {
    return NextResponse.json({ error: "User profile unavailable." }, { status: 403 });
  }

  const email = normalizeEmail(userResult.data.email);
  const profile = normalizeProfileForActor(profileResult.data, email);
  return NextResponse.json({
    ok: true,
    actor: {
      userId: userResult.data.id,
      email,
      emailConfirmed: Boolean(userResult.data.email_confirmed_at),
      displayName: profile.displayName,
      firstName: profile.firstName,
      lastName: profile.lastName,
      personSlug: profile.personSlug,
      nameSyncMode: profile.nameSyncMode,
      role: profileResult.data.role,
      isActive: profileResult.data.is_active,
    },
  });
}
