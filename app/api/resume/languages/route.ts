import { NextResponse } from "next/server";
import { requireRequestActor } from "../../../lib/auth-request";
import {
  ensureResumeDocument,
  disableResumeLanguage,
  fetchResumeLanguageVersionsForUser,
  fetchResumeLanguages,
  setDefaultResumeLocaleForUser,
  upsertResumeLanguage,
  validateResumeLanguageInput,
} from "../../../lib/resume-server";
import { normalizeLocale } from "../../../lib/resume-schema";

type LanguageBody = {
  code?: string;
  label?: string;
  shortLabel?: string;
  labels?: Record<string, string>;
  isEnabled?: boolean;
  createDocument?: boolean;
  setDefault?: boolean;
};

export async function GET(request: Request): Promise<Response> {
  const actorResult = await requireRequestActor({ anyCapability: "resume.language.read_own" });
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  const { searchParams } = new URL(request.url);
  const withDocuments = searchParams.get("withDocuments") === "true";
  const languages = withDocuments
    ? await fetchResumeLanguageVersionsForUser(actorResult.actor.userId)
    : await fetchResumeLanguages({ enabledOnly: true });

  return NextResponse.json({ ok: true, languages });
}

export async function POST(request: Request): Promise<Response> {
  const actorResult = await requireRequestActor({ anyCapability: "resume.language.write_own" });
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  let body: LanguageBody;
  try {
    body = (await request.json()) as LanguageBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const input = {
    code: String(body.code || ""),
    label: String(body.label || ""),
    shortLabel: body.shortLabel,
    labels: body.labels,
    isEnabled: body.isEnabled,
  };
  const errors = validateResumeLanguageInput(input);
  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  const language = await upsertResumeLanguage(input);
  if (!language) {
    return NextResponse.json({ error: "Language version could not be saved." }, { status: 500 });
  }

  const documentPayload =
    body.createDocument === false
      ? null
      : await ensureResumeDocument(actorResult.accessToken, actorResult.actor.userId, language.code, actorResult.actor.displayName);
  const defaultUpdated = body.setDefault
    ? await setDefaultResumeLocaleForUser(actorResult.accessToken, actorResult.actor.userId, language.code)
    : false;

  return NextResponse.json({
    ok: true,
    language,
    document: documentPayload?.document || null,
    revisions: documentPayload?.revisions || [],
    defaultUpdated,
  });
}

export async function PATCH(request: Request): Promise<Response> {
  const actorResult = await requireRequestActor({ anyCapability: "resume.language.write_own" });
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  let body: Pick<LanguageBody, "code" | "setDefault">;
  try {
    body = (await request.json()) as Pick<LanguageBody, "code" | "setDefault">;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!body.setDefault) {
    return NextResponse.json({ error: "Unsupported language action." }, { status: 400 });
  }

  const updated = await setDefaultResumeLocaleForUser(actorResult.accessToken, actorResult.actor.userId, String(body.code || ""));
  if (!updated) {
    return NextResponse.json({ error: "Default language could not be updated." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, defaultLocale: normalizeLocale(body.code) });
}

export async function DELETE(request: Request): Promise<Response> {
  const actorResult = await requireRequestActor({ anyCapability: "resume.language.write_own" });
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  let body: Pick<LanguageBody, "code">;
  try {
    body = (await request.json()) as Pick<LanguageBody, "code">;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const code = String(body.code || "");
  if (!code) {
    return NextResponse.json({ error: "Language code is required." }, { status: 400 });
  }

  const deleted = await disableResumeLanguage(code);
  if (!deleted) {
    return NextResponse.json({ error: "Language version could not be removed." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
