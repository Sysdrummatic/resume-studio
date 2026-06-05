import { NextResponse } from "next/server";
import { requireRequestActor } from "../../../lib/auth-request";
import { bootstrapResumeUserLocales, ensureResumeDocument } from "../../../lib/resume-server";
import { normalizeLocale } from "../../../lib/resume-schema";

export async function GET(request: Request): Promise<Response> {
  const actorResult = await requireRequestActor({ anyCapability: "resume.document.read_own" });
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  const { searchParams } = new URL(request.url);
  const locale = normalizeLocale(searchParams.get("locale"));

  const locales = await bootstrapResumeUserLocales(
    actorResult.accessToken,
    actorResult.actor.userId,
    actorResult.actor.displayName,
  );
  if (!locales.some((entry) => entry.code === locale)) {
    return NextResponse.json({ error: "Locale version is not available for this account." }, { status: 404 });
  }

  const payload = await ensureResumeDocument(
    actorResult.accessToken,
    actorResult.actor.userId,
    locale,
    actorResult.actor.displayName,
  );

  if (!payload) {
    return NextResponse.json({ error: "Unable to load resume document." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    actor: {
      userId: actorResult.actor.userId,
      displayName: actorResult.actor.displayName,
      role: actorResult.actor.role,
    },
    locale,
    document: payload.document,
    revisions: payload.revisions,
  });
}
