import { cookies } from "next/headers";
import type { AppRole, SessionActor } from "./auth-types";
import { clearAuthCookies, readAuthTokens, setAuthCookies } from "./auth-cookies";
import { fetchProfileById, fetchProfileByIdAsService, getAuthUser, refreshSession } from "./supabase-http";

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

function normalizeDisplayName(displayName: unknown, email: string): string {
  if (typeof displayName === "string" && displayName.trim()) {
    return displayName.trim();
  }
  if (email.includes("@")) {
    return email.split("@")[0];
  }
  return "User";
}


async function resolveProfile(userId: string, accessToken: string) {
  const profileResult = await fetchProfileById(userId, accessToken);
  if (profileResult.data || profileResult.status < 500) {
    return profileResult;
  }

  const fallbackResult = await fetchProfileByIdAsService(userId);
  if (fallbackResult.data) {
    return fallbackResult;
  }

  return profileResult;
}

async function buildActor(accessToken: string): Promise<RequestAuthResult> {
  const userResult = await getAuthUser(accessToken);
  if (!userResult.data || userResult.error) {
    return {
      ok: false,
      status: 401,
      message: "Authentication required.",
    };
  }

  const email = typeof userResult.data.email === "string" ? userResult.data.email.toLowerCase() : "";
  const profileResult = await resolveProfile(userResult.data.id, accessToken);
  if (!profileResult.data || profileResult.error) {
    return {
      ok: false,
      status: 403,
      message: "User profile is not available.",
    };
  }

  const actor: SessionActor = {
    userId: userResult.data.id,
    email,
    emailConfirmed: Boolean(userResult.data.email_confirmed_at),
    displayName: normalizeDisplayName(profileResult.data.display_name, email),
    role: profileResult.data.role,
    isActive: profileResult.data.is_active,
  };

  return { ok: true, actor, accessToken };
}

function authorizeRole(actorRole: AppRole, acceptedRoles: readonly AppRole[]): boolean {
  return acceptedRoles.includes(actorRole);
}

export async function requireRequestActor(acceptedRoles?: readonly AppRole[]): Promise<RequestAuthResult> {
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

  if (acceptedRoles && !authorizeRole(result.actor.role, acceptedRoles)) {
    return { ok: false, status: 403, message: "Insufficient permissions." };
  }

  return result;
}
