import { NextResponse } from "next/server";
import { requireRequestActor } from "../../../lib/auth-request";
import { RESUME_PARITY_MESSAGE, ResumeParityError, rollbackResumeDocument } from "../../../lib/resume-server";
import { normalizeLocale } from "../../../lib/resume-schema";

type RollbackBody = {
  locale?: string;
  documentId?: string;
  revisionNumber?: number;
};

export async function POST(request: Request): Promise<Response> {
  const actorResult = await requireRequestActor({ anyCapability: "resume.revision.rollback_own" });
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  let body: RollbackBody;
  try {
    body = (await request.json()) as RollbackBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const locale = normalizeLocale(body.locale);
  const documentId = String(body.documentId || "").trim();
  const revisionNumber = Number(body.revisionNumber || 0);

  if (!documentId) {
    return NextResponse.json({ error: "documentId is required." }, { status: 400 });
  }
  if (!Number.isInteger(revisionNumber) || revisionNumber < 1) {
    return NextResponse.json({ error: "revisionNumber must be a positive integer." }, { status: 400 });
  }

  let payload;
  try {
    payload = await rollbackResumeDocument(
      actorResult.accessToken,
      actorResult.actor.userId,
      locale,
      documentId,
      revisionNumber,
    );
  } catch (error) {
    if (error instanceof ResumeParityError) {
      return NextResponse.json({ error: RESUME_PARITY_MESSAGE, code: "parity", parityIssues: error.issues }, { status: 409 });
    }
    throw error;
  }

  if (!payload) {
    return NextResponse.json({ error: "Rollback failed." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    locale,
    document: payload.document,
    revisions: payload.revisions,
  });
}
