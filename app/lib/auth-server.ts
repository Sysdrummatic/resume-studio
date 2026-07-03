import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthUser } from "./supabase-http";
import { readAuthTokens } from "./auth-cookies";
import { canAccessAdminArea, isAdminRole } from "./rbac";
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
  const cookieStore = await cookies();
  const { accessToken, refreshToken } = readAuthTokens(cookieStore);
  const actor = accessToken ? await readActorFromAccessToken(accessToken) : null;

  if (!actor) {
    // A refresh token cookie means the visitor had a session that failed to
    // restore (proxy.ts refresh attempt failed); no cookies at all means they
    // simply aren't signed in yet. These need different copy on /login.
    redirect(refreshToken ? "/login?reason=session" : "/login?reason=signed-out");
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

export async function requireAdminActor(): Promise<SessionActor> {
  const actor = await requireAuthenticatedActor();
  if (!isAdminRole(actor.role)) {
    redirect("/dashboard?reason=forbidden");
  }
  return actor;
}
