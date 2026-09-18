import { NextResponse } from "next/server";
import { requireRequestActor } from "../../../../../lib/auth-request";
import { publishResumePreset } from "../../../../../lib/resume-server";
import { normalizeLocale, RESUME_LIMITS_DOC_URL } from "../../../../../lib/resume-schema";
import { rateLimit } from "../../../../../lib/rate-limit";

type PublishBody = {
  allowIndexing?: boolean;
  aiGenerated?: boolean;
  defaultLocale?: string;
  selectedLocales?: string[];
};

type PublishRouteContext = {
  params: Promise<{
    presetId: string;
  }>;
};

export async function POST(request: Request, context: PublishRouteContext): Promise<Response> {
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

  let body: PublishBody;
  try {
    body = (await request.json()) as PublishBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const params = await context.params;
  const presetId = String(params.presetId || "").trim();
  if (!presetId) {
    return NextResponse.json({ error: "CV Version id is required." }, { status: 400 });
  }

  const defaultLocale =
    typeof body.defaultLocale === "string" && body.defaultLocale.trim() ? normalizeLocale(body.defaultLocale) : undefined;
  const selectedLocales = Array.isArray(body.selectedLocales)
    ? Array.from(new Set(body.selectedLocales.map((locale) => normalizeLocale(String(locale)))))
    : [];
  if (selectedLocales.length === 0) {
    return NextResponse.json({ error: "At least one selected locale is required for publish." }, { status: 400 });
  }
  try {
    const preset = await publishResumePreset(actorResult.accessToken, actorResult.actor.userId, presetId, {
      allowIndexing: typeof body.allowIndexing === "boolean" ? body.allowIndexing : false,
      aiGenerated: typeof body.aiGenerated === "boolean" ? body.aiGenerated : false,
      defaultLocale,
      selectedLocales,
    });

    if (!preset) {
      return NextResponse.json({ error: "CV Version publish failed." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, preset });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CV Version publish failed.";
    console.error("[publish-route-error]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
