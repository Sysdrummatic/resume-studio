import { cookies } from "next/headers";
import type { AppRole, RequestActorAuthorizationOptions, SessionActor } from "./auth-types";
import { clearAuthCookies, readAuthTokens, setAuthCookies } from "./auth-cookies";
import { getAuthUser, refreshSession } from "./supabase-http";
import { isRoleAuthorized } from "./rbac";
import { normalizeEmail, normalizeProfileForActor, resolveProfile } from "./auth-profile";

type RequestAuthResult =
  | {
      ok: true;
      actor: SessionActor;
      accessToken: string;
    }
  | {
      ok: false;
      status: number;
      message: string;
    };

async function buildActor(accessToken: string): Promise<RequestAuthResult> {
  const userResult = await getAuthUser(accessToken);
  if (!userResult.data || userResult.error) {
    return {
      ok: false,
      status: 401,
      message: "Authentication required.",
    };
  }

  const email = normalizeEmail(userResult.data.email);
  const profileResult = await resolveProfile(userResult.data.id, accessToken);
  if (!profileResult.data || profileResult.error) {
    return {
      ok: false,
      status: 403,
      message: "User profile is not available.",
    };
  }

  const profile = normalizeProfileForActor(profileResult.data, email);
  const actor: SessionActor = {
    userId: userResult.data.id,
    email,
    emailConfirmed: Boolean(userResult.data.email_confirmed_at),
    displayName: profile.displayName,
    firstName: profile.firstName,
    lastName: profile.lastName,
    personSlug: profile.personSlug,
    nameSyncMode: profile.nameSyncMode,
    avatarUrl: profileResult.data.avatar_url,
    role: profileResult.data.role,
    bio: profileResult.data.bio,
    isActive: profileResult.data.is_active,
    isTestUser: profileResult.data.is_test_user === true,
    accessToken,
  };

  return { ok: true, actor, accessToken };
}

export async function requireRequestActor(
  acceptedRolesOrOptions?: readonly AppRole[] | RequestActorAuthorizationOptions,
): Promise<RequestAuthResult> {
  const cookieStore = await cookies();
  const { accessToken, refreshToken } = readAuthTokens(cookieStore);

  if (!accessToken && !refreshToken) {
    return { ok: false, status: 401, message: "Authentication required." };
  }

  let activeAccessToken = accessToken;

  if (!activeAccessToken && refreshToken) {
    const refreshResult = await refreshSession(refreshToken);
    if (!refreshResult.data || refreshResult.error) {
      clearAuthCookies(cookieStore);
      return { ok: false, status: 401, message: "Session expired. Sign in again." };
    }
    setAuthCookies(cookieStore, refreshResult.data);
    activeAccessToken = refreshResult.data.access_token;
  }

  if (!activeAccessToken) {
    return { ok: false, status: 401, message: "Authentication required." };
  }

  let result = await buildActor(activeAccessToken);
  if (!result.ok && refreshToken) {
    const refreshResult = await refreshSession(refreshToken);
    if (refreshResult.data && !refreshResult.error) {
      setAuthCookies(cookieStore, refreshResult.data);
      activeAccessToken = refreshResult.data.access_token;
      result = await buildActor(activeAccessToken);
    }
  }

  if (!result.ok) {
    return result;
  }

  if (!result.actor.emailConfirmed) {
    return { ok: false, status: 403, message: "Email verification required." };
  }

  if (!result.actor.isActive) {
    return { ok: false, status: 403, message: "Account is inactive." };
  }

  const authorizationOptions: RequestActorAuthorizationOptions | undefined = Array.isArray(acceptedRolesOrOptions)
    ? { acceptedRoles: acceptedRolesOrOptions }
    : (acceptedRolesOrOptions as RequestActorAuthorizationOptions | undefined);

  if (!isRoleAuthorized(result.actor.role, authorizationOptions)) {
    return { ok: false, status: 403, message: "Insufficient permissions." };
  }

  return result;
}
