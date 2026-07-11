import { queryTable } from "./supabase-http";

export const LOGIN_RESTRICTED_FLAG_KEY = "login_restricted";

export const ACCESS_RESTRICTION_REASONS = [
  "Access is temporarily unavailable while we deploy a new feature.",
  "Access is temporarily unavailable while we implement beta test results.",
] as const;

export type AccessRestriction = {
  restricted: boolean;
  reason: string;
};

type RestrictionFlagRow = {
  key: string;
  enabled: boolean;
  reason: string | null;
};

// Fail-closed to "not restricted": a missing row or read error must never
// lock users out of sign-in — the opposite polarity of isFeatureFlagEnabled.
export async function getAccessRestriction(): Promise<AccessRestriction> {
  try {
    const result = await queryTable<RestrictionFlagRow>({
      table: "platform_feature_flags",
      select: "key,enabled,reason",
      useServiceRole: true,
      query: `key=eq.${LOGIN_RESTRICTED_FLAG_KEY}&limit=1`,
    });
    const row = result.data?.[0];
    if (result.error || !row || row.enabled !== true) {
      return { restricted: false, reason: "" };
    }
    return { restricted: true, reason: row.reason || ACCESS_RESTRICTION_REASONS[0] };
  } catch {
    return { restricted: false, reason: "" };
  }
}

export function isAllowedRestrictionReason(reason: unknown): reason is (typeof ACCESS_RESTRICTION_REASONS)[number] {
  return typeof reason === "string" && (ACCESS_RESTRICTION_REASONS as readonly string[]).includes(reason);
}
