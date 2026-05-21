import { fetchProfileById, fetchProfileByIdAsService } from "./supabase-http";

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
