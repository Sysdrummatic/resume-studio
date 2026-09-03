import { NextResponse } from "next/server";
import { requireRequestActor } from "../../../lib/auth-request";
import { fetchResumeRevisionYaml } from "../../../lib/resume-server";

export async function GET(request: Request): Promise<Response> {
  const actorResult = await requireRequestActor({ anyCapability: "resume.document.read_own" });
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  const url = new URL(request.url);
  const documentId = String(url.searchParams.get("documentId") || "").trim();
  const revisionNumber = Number(url.searchParams.get("revisionNumber") || 0);

  if (!documentId) {
    return NextResponse.json({ error: "documentId is required." }, { status: 400 });
  }
  if (!Number.isInteger(revisionNumber) || revisionNumber < 1) {
    return NextResponse.json({ error: "revisionNumber must be a positive integer." }, { status: 400 });
  }

  // RLS scopes this to revisions of the caller's own documents, so a miss is
  // indistinguishable from "not yours" — both answer 404 on purpose.
  const yamlContent = await fetchResumeRevisionYaml(actorResult.accessToken, documentId, revisionNumber);
  if (yamlContent === null) {
    return NextResponse.json({ error: "Revision not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, revisionNumber, yamlContent });
}
