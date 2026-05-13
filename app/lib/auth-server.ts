import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchProfileById, fetchProfileByIdAsService, getAuthUser, refreshSession } from "./supabase-http";
import { readAuthTokens } from "./auth-cookies";
import { canAccessAdminArea } from "./rbac";
import type { SessionActor } from "./auth-types";

function normalizeEmail(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

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

async function readActorFromAccessToken(accessToken: string): Promise<SessionActor | null> {
  const authUserResult = await getAuthUser(accessToken);
  if (!authUserResult.data || authUserResult.error) {
    return null;
  }

  const user = authUserResult.data;
  const profileResult = await resolveProfile(user.id, accessToken);
  if (!profileResult.data || profileResult.error) {
    return null;
  }

  const email = normalizeEmail(user.email);
  return {
    userId: user.id,
    email,
    emailConfirmed: Boolean(user.email_confirmed_at),
    displayName: normalizeDisplayName(profileResult.data.display_name, email),
    role: profileResult.data.role,
    isActive: profileResult.data.is_active,
    accessToken,
  };
}

export async function getCurrentActor(): Promise<SessionActor | null> {
  const cookieStore = await cookies();
  const { accessToken, refreshToken } = readAuthTokens(cookieStore);

  if (accessToken) {
    const actor = await readActorFromAccessToken(accessToken);
    if (actor) {
      return actor;
    }
  }

  if (!refreshToken) {
    return null;
  }

  const refreshResult = await refreshSession(refreshToken);
  if (!refreshResult.data || refreshResult.error) {
    return null;
  }

  const actor = await readActorFromAccessToken(refreshResult.data.access_token);
  return actor;
}

export async function requireAuthenticatedActor(): Promise<SessionActor> {
  const actor = await getCurrentActor();
  if (!actor) {
    redirect("/login?reason=session");
  }

  if (!actor.emailConfirmed) {
    redirect("/login?reason=unverified");
  }

  if (!actor.isActive) {
    redirect("/login?reason=inactive");
  }

  return actor;
}

export async function requireStaffActor(): Promise<SessionActor> {
  const actor = await requireAuthenticatedActor();
  if (!canAccessAdminArea(actor.role)) {
    redirect("/dashboard?reason=forbidden");
  }
  return actor;
}
