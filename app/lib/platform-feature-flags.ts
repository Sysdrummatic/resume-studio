import { queryTable } from "./supabase-http";

const USER_DATA_TRANSFER_FLAG_KEY = "user_data_transfer_enabled";
const PUBLIC_CV_INDEXING_FLAG_KEY = "public_cv_indexing_enabled";

type PlatformFeatureFlagRow = {
  key: string;
  enabled: boolean;
};

// Fail-open by default: feature flags gate UX conveniences, not security
// boundaries. Auth and ownership checks on the affected routes remain the
// security gate. Pass `fallback: false` for flags that must fail closed.
export async function isFeatureFlagEnabled(key: string, fallback = true): Promise<boolean> {
  try {
    const result = await queryTable<PlatformFeatureFlagRow>({
      table: "platform_feature_flags",
      select: "key,enabled",
      useServiceRole: true,
      query: `key=eq.${key}&limit=1`,
    });
    if (result.error || !result.data?.length) {
      return fallback;
    }
    return result.data[0].enabled === true;
  } catch {
    return fallback;
  }
}

// Public CV indexing is paused (ADR 0001/0005): fail-closed, so a missing flag
// row or a failed lookup keeps every public CV noindex.
export async function isPublicCvIndexingEnabled(): Promise<boolean> {
  return isFeatureFlagEnabled(PUBLIC_CV_INDEXING_FLAG_KEY, false);
}

// Controls dashboard Export/Import of the user's CV data bundle (ADR 0018).
export async function isUserDataTransferEnabled(): Promise<boolean> {
  return isFeatureFlagEnabled(USER_DATA_TRANSFER_FLAG_KEY);
}
