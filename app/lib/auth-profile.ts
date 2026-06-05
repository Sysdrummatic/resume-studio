import { fetchProfileById, fetchProfileByIdAsService } from "./supabase-http";
import type { ProfileRecord } from "./auth-types";
import { buildProfileDisplayName, normalizeNameSyncMode, splitProfileName } from "./profile-name";

export function normalizeEmail(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function normalizeDisplayName(displayName: unknown, email: string): string {
  if (typeof displayName === "string" && displayName.trim()) {
    return displayName.trim();
  }
  if (email.includes("@")) {
    return email.split("@")[0];
  }
  return "User";
}

export function resolveProfileDisplayName(profile: Pick<ProfileRecord, "display_name" | "first_name" | "last_name">, email: string): string {
  const nameFromParts = buildProfileDisplayName(profile.first_name, profile.last_name);
  return normalizeDisplayName(nameFromParts || profile.display_name, email);
}

export function normalizeProfileForActor(profile: ProfileRecord, email: string) {
  const fallbackParts = splitProfileName(profile.display_name);
  return {
    displayName: resolveProfileDisplayName(profile, email),
    firstName: typeof profile.first_name === "string" && profile.first_name.trim() ? profile.first_name.trim() : fallbackParts.firstName,
    lastName: typeof profile.last_name === "string" && profile.last_name.trim() ? profile.last_name.trim() : fallbackParts.lastName,
    personSlug: typeof profile.person_slug === "string" && profile.person_slug.trim() ? profile.person_slug.trim() : null,
    nameSyncMode: normalizeNameSyncMode(profile.name_sync_mode),
  };
}

export async function resolveProfile(userId: string, accessToken: string) {
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
