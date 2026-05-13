import { NextResponse } from "next/server";
import { requireRequestActor } from "../../../lib/auth-request";
import { fetchResumePresetsForUser, normalizeResumePresetSelection, saveResumePreset, validateResumePresetSelection } from "../../../lib/resume-server";
import { normalizeLocale } from "../../../lib/resume-schema";

type PresetBody = {
  documentId?: string;
  title?: string;
  selection?: unknown;
  isPublic?: boolean;
  allowIndexing?: boolean;
  aiGenerated?: boolean;
  defaultLocale?: string;
};

export async function GET(): Promise<Response> {
  const actorResult = await requireRequestActor({ anyCapability: "resume.preset.read_own" });
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  const presets = await fetchResumePresetsForUser(actorResult.actor.userId);
  return NextResponse.json({ ok: true, presets });
}

export async function POST(request: Request): Promise<Response> {
  const actorResult = await requireRequestActor({ anyCapability: "resume.preset.write_own" });
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  let body: PresetBody;
  try {
    body = (await request.json()) as PresetBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const documentId = String(body.documentId || "").trim();
  if (!documentId) {
    return NextResponse.json({ error: "Master resume document id is required." }, { status: 400 });
  }

  const selection = normalizeResumePresetSelection(body.selection);
  const validationErrors = validateResumePresetSelection(selection);
  if (validationErrors.length > 0) {
    return NextResponse.json({ error: validationErrors.join(" ") }, { status: 400 });
  }

  const preset = await saveResumePreset(actorResult.accessToken, actorResult.actor.userId, {
    documentId,
    title: String(body.title || "Untitled preset"),
    selection,
    isPublic: typeof body.isPublic === "boolean" ? body.isPublic : false,
    allowIndexing: typeof body.allowIndexing === "boolean" ? body.allowIndexing : false,
    aiGenerated: typeof body.aiGenerated === "boolean" ? body.aiGenerated : false,
    defaultLocale: normalizeLocale(body.defaultLocale),
  });

  if (!preset) {
    return NextResponse.json({ error: "CV Version save failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, preset });
}
