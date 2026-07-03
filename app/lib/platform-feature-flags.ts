import { queryTable } from "./supabase-http";

const USER_DATA_TRANSFER_FLAG_KEY = "user_data_transfer_enabled";

type PlatformFeatureFlagRow = {
  key: string;
  enabled: boolean;
};

// Fail-open: feature flags gate UX conveniences, not security boundaries.
// Auth and ownership checks on the affected routes remain the security gate.
export async function isFeatureFlagEnabled(key: string): Promise<boolean> {
  try {
    const result = await queryTable<PlatformFeatureFlagRow>({
      table: "platform_feature_flags",
      select: "key,enabled",
      useServiceRole: true,
      query: `key=eq.${key}&limit=1`,
    });
    if (result.error || !result.data?.length) {
      return true;
    }
    return result.data[0].enabled === true;
  } catch {
    return true;
  }
}

// Controls dashboard Export/Import of the user's CV data bundle (ADR 0018).
export async function isUserDataTransferEnabled(): Promise<boolean> {
  return isFeatureFlagEnabled(USER_DATA_TRANSFER_FLAG_KEY);
}
