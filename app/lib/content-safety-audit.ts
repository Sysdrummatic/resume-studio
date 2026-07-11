import { createHash } from "node:crypto";
import { insertTable } from "./supabase-http";
import { detectContentSafetyFindings } from "./content-safety";

type FlagContext = {
  userId: string;
  documentId?: string | null;
  locale?: string | null;
  source?: string;
};

const FLAG_INSERT_TIMEOUT_MS = 3000;

/** Per ADR 0003, staff get metadata only — never the raw CV content that triggered a flag. */
function hashMatch(match: string): string {
  return createHash("sha256").update(match).digest("hex").slice(0, 16);
}

/**
 * Scans saved CV content for likely script-injection attempts and records any
 * findings in content_safety_flags for staff visibility in /admin. Never throws:
 * a detection/logging failure must not block the user's own save.
 */
export async function flagSuspiciousResumeContent(yamlContent: string, context: FlagContext): Promise<void> {
  const findings = detectContentSafetyFindings(yamlContent);
  if (findings.length === 0) return;

  try {
    await insertTable({
      table: "content_safety_flags",
      useServiceRole: true,
      signal: AbortSignal.timeout(FLAG_INSERT_TIMEOUT_MS),
      values: findings.map((finding) => ({
        user_id: context.userId,
        document_id: context.documentId ?? null,
        locale: context.locale ?? null,
        rule: finding.rule,
        match_hash: hashMatch(finding.match),
        source: context.source ?? "resume_draft_save",
      })),
    });
  } catch {
    // Detection is best-effort defense-in-depth visibility, not the actual
    // security control — a logging failure (including a timeout) here must
    // never surface to, or block, the user's own save.
  }
}
