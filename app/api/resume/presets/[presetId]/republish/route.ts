import { NextResponse } from "next/server";
import { requireRequestActor } from "../../../../../lib/auth-request";
import { republishResumePreset } from "../../../../../lib/resume-server";
import { normalizeLocale, RESUME_LIMITS_DOC_URL } from "../../../../../lib/resume-schema";
import { rateLimit } from "../../../../../lib/rate-limit";

type RepublishRouteContext = {
  params: Promise<{
    presetId: string;
  }>;
};

type LanguageChoice = { selectedLocales: string[]; defaultLocale: string };
type ParsedChoice = { ok: true; choice?: LanguageChoice } | { ok: false; error: string };

// normalizeLocale turns anything unrecognised into "en", which would silently
// replace a language the caller asked for, so the shape is checked first.
const LOCALE_CODE = /^[a-z]{2}(-[a-z0-9]+)*$/i;

function isLocaleCode(value: unknown): value is string {
  return typeof value === "string" && LOCALE_CODE.test(value.trim());
}

/** An empty body keeps the languages the link already serves; anything else must be a complete, valid choice. */
async function parseLanguageChoice(request: Request): Promise<ParsedChoice> {
  const text = await request.text();
  if (!text.trim()) return { ok: true };

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return { ok: false, error: "Invalid JSON payload." };
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "Invalid JSON payload." };

  const { selectedLocales, defaultLocale } = body as Record<string, unknown>;
  if (selectedLocales === undefined && defaultLocale === undefined) return { ok: true };
  if (!Array.isArray(selectedLocales) || selectedLocales.length === 0 || !selectedLocales.every(isLocaleCode) || !isLocaleCode(defaultLocale)) {
    return { ok: false, error: "selectedLocales (a non-empty list of language codes) and defaultLocale must be sent together." };
  }
  const chosen = Array.from(new Set(selectedLocales.map((locale) => normalizeLocale(locale))));
  const fallback = normalizeLocale(defaultLocale);
  if (!chosen.includes(fallback)) return { ok: false, error: "defaultLocale must be one of selectedLocales." };
  return { ok: true, choice: { selectedLocales: chosen, defaultLocale: fallback } };
}

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

  const parsed = await parseLanguageChoice(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const preset = await republishResumePreset(actorResult.accessToken, actorResult.actor.userId, presetId, parsed.choice);
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
