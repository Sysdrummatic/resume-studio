import { NextResponse } from "next/server";
import { requireRequestActor } from "../../../../../lib/auth-request";
import { unpublishResumePreset } from "../../../../../lib/resume-server";

type UnpublishRouteContext = {
  params: Promise<{
    presetId: string;
  }>;
};

export async function POST(_request: Request, context: UnpublishRouteContext): Promise<Response> {
  const actorResult = await requireRequestActor(["admin", "manager", "user", "recruiter"]);
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  const params = await context.params;
  const presetId = String(params.presetId || "").trim();
  if (!presetId) {
    return NextResponse.json({ error: "CV Version id is required." }, { status: 400 });
  }

  const preset = await unpublishResumePreset(actorResult.accessToken, actorResult.actor.userId, presetId);
  if (!preset) {
    return NextResponse.json({ error: "CV Version unpublish failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, preset });
}
