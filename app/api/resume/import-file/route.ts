import { NextResponse } from "next/server";
import { requireRequestActor } from "../../../lib/auth-request";
import { rateLimit } from "../../../lib/rate-limit";
import { detectSourceKind, parseResumeFile } from "../../../lib/resume-import/parse-resume-file";

export const dynamic = "force-dynamic";

// Raw upload cap — generous enough for a real CV PDF/DOCX (which are mostly
// fonts/formatting overhead), well short of a deliberate large-file DoS.
// The text pulled out of it is capped again, much lower, before parsing
// (EXTRACTED_TEXT_MAX_CHARS) — the two caps guard different things.
const IMPORT_FILE_MAX_BYTES = 8 * 1024 * 1024;

/**
 * POST /api/resume/import-file
 * Parses an uploaded PDF, DOCX, YAML, or TXT resume into a best-effort,
 * partial ResumeDocument for the import review step. Read-only: nothing is
 * saved here — the reviewed result is written back through the normal
 * editor draft path once the user confirms it in the UI.
 */
export async function POST(request: Request): Promise<Response> {
  const actorResult = await requireRequestActor({ anyCapability: "resume.document.write_own" });
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  const rl = await rateLimit(`import-file:${actorResult.actor.userId}`, { interval: 60_000, limit: 10 });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many import attempts. Try again in a minute." },
      { status: 429, headers: { "Retry-After": Math.ceil((rl.reset - Date.now()) / 1000).toString() } },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected a multipart/form-data upload." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
  }
  if (file.size > IMPORT_FILE_MAX_BYTES) {
    return NextResponse.json({ error: "File is too large (max 8 MB)." }, { status: 400 });
  }

  const sourceKind = detectSourceKind(file.name, file.type);
  if (!sourceKind) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload a PDF, DOCX, YAML, or TXT file." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await parseResumeFile(buffer, sourceKind);
    return NextResponse.json({ ok: true, ...result, filename: file.name });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? `Could not read this file: ${error.message}` : "Could not read this file." },
      { status: 422 },
    );
  }
}
