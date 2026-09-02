import { NextResponse } from "next/server";
import { requireRequestActor } from "../../../lib/auth-request";
import { saveResumeDraftDocument } from "../../../lib/resume-server";
import { normalizeLocale } from "../../../lib/resume-schema";
import { callRpc } from "../../../lib/supabase-http";
import { flagSuspiciousResumeContent } from "../../../lib/content-safety-audit";

type DraftBody = {
  locale?: string;
  yamlContent?: string;
  title?: string;
};

export async function POST(request: Request): Promise<Response> {
  const actorResult = await requireRequestActor({ anyCapability: "resume.document.write_own" });
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  let body: DraftBody;
  try {
    body = (await request.json()) as DraftBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const locale = normalizeLocale(body.locale);
  const yamlContent = String(body.yamlContent || "").trim();
  if (!yamlContent) {
    return NextResponse.json({ error: "YAML payload is required." }, { status: 400 });
  }

  const yamlValidation = await callRpc<boolean>({
    functionName: "validate_resume_document_yaml",
    payload: { input_yaml: yamlContent },
    accessToken: actorResult.accessToken,
  });

  if (yamlValidation.error || !yamlValidation.data) {
    return NextResponse.json({ error: "YAML schema validation failed." }, { status: 400 });
  }

  const payload = await saveResumeDraftDocument(actorResult.accessToken, actorResult.actor.userId, locale, {
    yamlContent,
    title: String(body.title || "Master resume draft"),
  });

  if (!payload) {
    return NextResponse.json({ error: "Draft save failed." }, { status: 500 });
  }

  await flagSuspiciousResumeContent(yamlContent, {
    userId: actorResult.actor.userId,
    documentId: payload.document.id,
    locale,
  });

  return NextResponse.json({
    ok: true,
    locale,
    document: payload.document,
    revisions: payload.revisions,
  });
}
