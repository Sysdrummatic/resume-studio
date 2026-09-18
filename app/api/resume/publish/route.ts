import { NextResponse } from "next/server";
import { requireRequestActor } from "../../../lib/auth-request";
import { publishResumeDocument, upgradeLegacyResumeYamlContent } from "../../../lib/resume-server";
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

  const payload = await publishResumeDocument(actorResult.accessToken, actorResult.actor.userId, locale, {
    yamlContent,
    title: String(body.title || "Master resume"),
    styleSettings: body.styleSettings,
    changeNote: String(body.changeNote || "Publish"),
  });

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
  });
}
