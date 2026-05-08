import { NextResponse } from "next/server";
import { requireRequestActor } from "../../../../../lib/auth-request";
import { publishResumePreset } from "../../../../../lib/resume-server";
import { normalizeLocale } from "../../../../../lib/resume-schema";

type PublishBody = {
  allowIndexing?: boolean;
  aiGenerated?: boolean;
  defaultLocale?: string;
};

type PublishRouteContext = {
  params: Promise<{
    presetId: string;
  }>;
};

export async function POST(request: Request, context: PublishRouteContext): Promise<Response> {
  const actorResult = await requireRequestActor(["admin", "manager", "user", "recruiter"]);
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  let body: PublishBody;
  try {
    body = (await request.json()) as PublishBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const params = await context.params;
  const preset = await publishResumePreset(actorResult.accessToken, actorResult.actor.userId, params.presetId, {
    allowIndexing: typeof body.allowIndexing === "boolean" ? body.allowIndexing : false,
    aiGenerated: typeof body.aiGenerated === "boolean" ? body.aiGenerated : false,
    defaultLocale: normalizeLocale(body.defaultLocale),
  });

  if (!preset) {
    return NextResponse.json({ error: "Preset publish failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, preset });
}
