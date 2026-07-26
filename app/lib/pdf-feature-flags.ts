import { isFeatureFlagEnabled } from "./platform-feature-flags";

const PDF_DRAFT_FLAG_KEY = "pdf_draft_enabled";

// Controls the admin-only draft PDF preview route (ADR 0014). Fail-open:
// draft PDF export is a UX convenience, not a security boundary. Auth and
// role checks on the preview route remain the security gate.
export function isPdfDraftEnabled(): Promise<boolean> {
  return isFeatureFlagEnabled(PDF_DRAFT_FLAG_KEY);
}
