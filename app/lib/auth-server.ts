import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthUser } from "./supabase-http";
import { readAuthTokens } from "./auth-cookies";
import { canAccessAdminArea } from "./rbac";
import type { SessionActor } from "./auth-types";
import { normalizeEmail, normalizeProfileForActor, resolveProfile } from "./auth-profile";

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
  const profile = normalizeProfileForActor(profileResult.data, email);
  return {
    userId: user.id,
    email,
    emailConfirmed: Boolean(user.email_confirmed_at),
    displayName: profile.displayName,
    firstName: profile.firstName,
    lastName: profile.lastName,
    personSlug: profile.personSlug,
    nameSyncMode: profile.nameSyncMode,
    avatarUrl: profileResult.data.avatar_url,
    role: profileResult.data.role,
    bio: profileResult.data.bio,
    isActive: profileResult.data.is_active,
    accessToken,
  };
}

export async function getCurrentActor(): Promise<SessionActor | null> {
  // The proxy (proxy.ts) refreshes and persists the session before any server
  // component renders, so the access token here is already current. This is a
  // pure reader; do not reintroduce a refresh fallback (it cannot persist
  // rotated tokens from a server component and would burn the refresh token).
  const cookieStore = await cookies();
  const { accessToken } = readAuthTokens(cookieStore);

  if (!accessToken) {
    return null;
  }

  return readActorFromAccessToken(accessToken);
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
