import { NextResponse } from "next/server";
import { requireRequestActor } from "../../../../lib/auth-request";
import { deleteResumePreset, normalizeResumePresetSelection, saveResumePreset, validateResumePresetSelection } from "../../../../lib/resume-server";

type PresetBody = {
  documentId?: string;
  title?: string;
  selection?: unknown;
  isPublic?: boolean;
  allowIndexing?: boolean;
};

type PresetRouteContext = {
  params: Promise<{
    presetId: string;
  }>;
};

export async function PATCH(request: Request, context: PresetRouteContext): Promise<Response> {
  const actorResult = await requireRequestActor(["admin", "manager", "user", "recruiter"]);
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  let body: PresetBody;
  try {
    body = (await request.json()) as PresetBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const params = await context.params;
  const presetId = String(params.presetId || "").trim();
  const documentId = String(body.documentId || "").trim();
  if (!presetId || !documentId) {
    return NextResponse.json({ error: "Preset id and master resume document id are required." }, { status: 400 });
  }

  const selection = normalizeResumePresetSelection(body.selection);
  const validationErrors = validateResumePresetSelection(selection);
  if (validationErrors.length > 0) {
    return NextResponse.json({ error: validationErrors.join(" ") }, { status: 400 });
  }

  const preset = await saveResumePreset(actorResult.accessToken, actorResult.actor.userId, {
    presetId,
    documentId,
    title: String(body.title || "Untitled preset"),
    selection,
    isPublic: typeof body.isPublic === "boolean" ? body.isPublic : false,
    allowIndexing: typeof body.allowIndexing === "boolean" ? body.allowIndexing : false,
  });

  if (!preset) {
    return NextResponse.json({ error: "Preset update failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, preset });
}

export async function DELETE(_request: Request, context: PresetRouteContext): Promise<Response> {
  const actorResult = await requireRequestActor(["admin", "manager", "user", "recruiter"]);
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  const params = await context.params;
  const presetId = String(params.presetId || "").trim();
  if (!presetId) {
    return NextResponse.json({ error: "Preset id is required." }, { status: 400 });
  }

  const deleted = await deleteResumePreset(actorResult.accessToken, actorResult.actor.userId, presetId);
  if (!deleted) {
    return NextResponse.json({ error: "Preset delete failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
