import { NextResponse } from "next/server";
import { requireRequestActor } from "../../../lib/auth-request";
import {
  publishResumeDocument,
  RESUME_DOCUMENT_CONFLICT_MESSAGE,
  RESUME_LEGACY_PAIRING_MESSAGE,
  ResumeDocumentConflictError,
  ResumeLanguageLinkageError,
  ResumeLegacyPairingError,
  upgradeLegacyResumeYamlContent,
} from "../../../lib/resume-server";
import { normalizeLocale, RESUME_LIMITS_DOC_URL, RESUME_YAML_MAX_BYTES } from "../../../lib/resume-schema";
import { callRpc } from "../../../lib/supabase-http";
import { flagSuspiciousResumeContent } from "../../../lib/content-safety-audit";
import { rateLimit } from "../../../lib/rate-limit";

type PublishBody = {
  locale?: string;
  yamlContent?: string;
  title?: string;
  styleSettings?: unknown;
  changeNote?: string;
  baseUpdatedAt?: unknown;
};

export async function POST(request: Request): Promise<Response> {
  const actorResult = await requireRequestActor({ anyCapability: "resume.document.write_own" });
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  const rl = await rateLimit(`resume-publish:${actorResult.actor.userId}`, { interval: 60_000, limit: 20 });
  if (!rl.success) {
    return NextResponse.json(
      { error: "You've exceeded the maximum allowed save limit. Try again in a minute.", docsUrl: RESUME_LIMITS_DOC_URL },
      { status: 429, headers: { "Retry-After": Math.ceil((rl.reset - Date.now()) / 1000).toString() } },
    );
  }

  let body: PublishBody;
  try {
    body = (await request.json()) as PublishBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const locale = normalizeLocale(body.locale);
  const { baseUpdatedAt } = body;
  if (baseUpdatedAt !== undefined && baseUpdatedAt !== null && typeof baseUpdatedAt !== "string") {
    return NextResponse.json({ error: "baseUpdatedAt must be a string or null." }, { status: 400 });
  }
  const submittedYamlContent = String(body.yamlContent || "").trim();
  if (!submittedYamlContent) {
    return NextResponse.json({ error: "YAML payload is required." }, { status: 400 });
  }
  if (new TextEncoder().encode(submittedYamlContent).length > RESUME_YAML_MAX_BYTES) {
    return NextResponse.json(
      { error: "You've exceeded the maximum allowed document size.", docsUrl: RESUME_LIMITS_DOC_URL },
      { status: 413 },
    );
  }
  const yamlContent = upgradeLegacyResumeYamlContent(submittedYamlContent);

  const yamlValidation = await callRpc<boolean>({
    functionName: "validate_resume_document_yaml",
    payload: { input_yaml: yamlContent },
    accessToken: actorResult.accessToken,
  });

  if (yamlValidation.error || !yamlValidation.data) {
    return NextResponse.json({ error: "YAML schema validation failed." }, { status: 400 });
  }

  let payload;
  try {
    payload = await publishResumeDocument(actorResult.accessToken, actorResult.actor.userId, locale, {
      yamlContent,
      title: String(body.title || "Master resume"),
      styleSettings: body.styleSettings,
      changeNote: String(body.changeNote || "Publish"),
      baseUpdatedAt,
    });
  } catch (error) {
    if (error instanceof ResumeLanguageLinkageError) {
      return NextResponse.json({ error: "Language entry IDs must match the default language.", linkageIssues: error.issues }, { status: 409 });
    }
    if (error instanceof ResumeDocumentConflictError) {
      return NextResponse.json({ error: RESUME_DOCUMENT_CONFLICT_MESSAGE, conflict: true }, { status: 409 });
    }
    if (error instanceof ResumeLegacyPairingError) {
      return NextResponse.json({ error: RESUME_LEGACY_PAIRING_MESSAGE, legacyConflicts: error.conflicts }, { status: 409 });
    }
    throw error;
  }

  if (!payload) {
    return NextResponse.json({ error: "Publish failed." }, { status: 500 });
  }

  await flagSuspiciousResumeContent(yamlContent, {
    userId: actorResult.actor.userId,
    documentId: payload.document.id,
    locale,
    source: "resume_publish_save",
  });

  return NextResponse.json({
    ok: true,
    locale,
    document: payload.document,
    revisions: payload.revisions,
    synchronizedDocuments: payload.synchronized ?? [],
    synchronizationFailed: payload.synchronizationFailed ?? [],
    synchronizationComplete: payload.synchronizationComplete ?? true,
  });
}
