import { NextResponse } from "next/server";
import { requireRequestActor } from "../../../lib/auth-request";
import {
  bootstrapResumeUserLocales,
  deleteResumeUserLocale,
  ensureResumeDocument,
  fetchResumeLanguageVersionsForUser,
  setDefaultResumeLocaleForUser,
  upsertResumeUserLocale,
  validateResumeUserLocaleInput,
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

  await bootstrapResumeUserLocales(actorResult.accessToken, actorResult.actor.userId, actorResult.actor.displayName);

  const { searchParams } = new URL(request.url);
  const withDocuments = searchParams.get("withDocuments") === "true";
  const languages = await fetchResumeLanguageVersionsForUser(actorResult.actor.userId);

  return NextResponse.json({
    ok: true,
    languages: withDocuments
      ? languages
      : languages.map((language) => ({
          user_id: language.user_id,
          code: language.code,
          label: language.label,
          short_label: language.short_label,
          labels: language.labels,
          is_default: language.is_default,
          sort_order: language.sort_order,
          created_at: language.created_at,
          updated_at: language.updated_at,
          label_override: language.label_override,
          short_label_override: language.short_label_override,
        })),
  });
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
  };
  const errors = validateResumeUserLocaleInput(input);
  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  const language = await upsertResumeUserLocale(actorResult.accessToken, actorResult.actor.userId, input, {
    setDefault: body.setDefault,
  });
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

  const deleted = await deleteResumeUserLocale(actorResult.accessToken, actorResult.actor.userId, code);
  if (!deleted.ok) {
    return NextResponse.json({ error: "Language version could not be removed." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, defaultLocale: deleted.defaultLocale });
}
