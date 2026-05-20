import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearAuthCookies, readAuthTokens, setAuthCookies } from "../../../lib/auth-cookies";
import { getAuthUser, refreshSession } from "../../../lib/supabase-http";
import { resolveProfile } from "../../../lib/auth-profile";

function buildUnauthorizedResponse(message = "Authentication required."): Response {
  return NextResponse.json({ error: message }, { status: 401 });
}

export async function GET(): Promise<Response> {
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

  return NextResponse.json({
    ok: true,
    actor: {
      userId: userResult.data.id,
      email: userResult.data.email ?? "",
      emailConfirmed: Boolean(userResult.data.email_confirmed_at),
      displayName: profileResult.data.display_name ?? "",
      role: profileResult.data.role,
      isActive: profileResult.data.is_active,
    },
  });
}
