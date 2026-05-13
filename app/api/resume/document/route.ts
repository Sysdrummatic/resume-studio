import { NextResponse } from "next/server";
import { requireRequestActor } from "../../../lib/auth-request";
import { ensureResumeDocument } from "../../../lib/resume-server";
import { normalizeLocale } from "../../../lib/resume-schema";

export async function GET(request: Request): Promise<Response> {
  const actorResult = await requireRequestActor({ anyCapability: "resume.document.read_own" });
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  const { searchParams } = new URL(request.url);
  const locale = normalizeLocale(searchParams.get("locale"));

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
