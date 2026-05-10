import { NextResponse } from "next/server";
import { requireRequestActor } from "../../../../../lib/auth-request";
import { publishResumePreset } from "../../../../../lib/resume-server";
import { normalizeLocale } from "../../../../../lib/resume-schema";

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
  const presetId = String(params.presetId || "").trim();
  if (!presetId) {
    return NextResponse.json({ error: "Saved Version id is required." }, { status: 400 });
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
      return NextResponse.json({ error: "Saved Version publish failed." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, preset });
  } catch (error: any) {
    console.error("[publish-route-error]", error);
    return NextResponse.json({ error: error.message || "Saved Version publish failed." }, { status: 500 });
  }
}
