import { NextResponse } from "next/server";
import { requireRequestActor } from "../../../../../lib/auth-request";
import { republishResumePreset } from "../../../../../lib/resume-server";
import { RESUME_LIMITS_DOC_URL } from "../../../../../lib/resume-schema";
import { rateLimit } from "../../../../../lib/rate-limit";

type RepublishBody = {
  selectedLocales?: unknown;
  defaultLocale?: unknown;
};

type RepublishRouteContext = {
  params: Promise<{
    presetId: string;
  }>;
};

export async function POST(request: Request, context: RepublishRouteContext): Promise<Response> {
  const actorResult = await requireRequestActor({ anyCapability: "resume.preset.publish_own" });
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  const rl = await rateLimit(`resume-preset-publish:${actorResult.actor.userId}`, { interval: 60_000, limit: 20 });
  if (!rl.success) {
    return NextResponse.json(
      { error: "You've exceeded the maximum allowed publish limit. Try again in a minute.", docsUrl: RESUME_LIMITS_DOC_URL },
      { status: 429, headers: { "Retry-After": Math.ceil((rl.reset - Date.now()) / 1000).toString() } },
    );
  }

  const params = await context.params;
  const presetId = String(params.presetId || "").trim();
  if (!presetId) {
    return NextResponse.json({ error: "CV Version id is required." }, { status: 400 });
  }

  // An empty body keeps the languages the link already serves.
  const body = (await request.json().catch(() => ({}))) as RepublishBody;
  const choice =
    Array.isArray(body.selectedLocales) && typeof body.defaultLocale === "string"
      ? { selectedLocales: body.selectedLocales.map(String), defaultLocale: body.defaultLocale }
      : undefined;

  try {
    const preset = await republishResumePreset(actorResult.accessToken, actorResult.actor.userId, presetId, choice);
    if (!preset) {
      return NextResponse.json({ error: "CV Version update failed." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, preset });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CV Version update failed.";
    console.error("[republish-route-error]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
