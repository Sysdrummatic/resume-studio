import { queryTable } from "./supabase-http";

const PDF_DRAFT_FLAG_KEY = "pdf_draft_enabled";

type PlatformFeatureFlagRow = {
  key: string;
  enabled: boolean;
};

// Fail-open: draft PDF export is a UX convenience, not a security boundary.
// Auth and role checks on the preview route remain the security gate.
export async function isPdfDraftEnabled(): Promise<boolean> {
  try {
    const result = await queryTable<PlatformFeatureFlagRow>({
      table: "platform_feature_flags",
      select: "key,enabled",
      useServiceRole: true,
      query: `key=eq.${PDF_DRAFT_FLAG_KEY}&limit=1`,
    });
    if (result.error || !result.data?.length) {
      return true;
    }
    return result.data[0].enabled === true;
  } catch {
    return true;
  }
}
