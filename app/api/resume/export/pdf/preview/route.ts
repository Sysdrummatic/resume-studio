import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { CvPdfTemplate } from "../../../../../lib/CvPdfTemplate";
import { buildPdfFilename } from "../../../../../lib/pdf/filename";
import { isPdfDraftEnabled } from "../../../../../lib/pdf-feature-flags";
import { normalizeResumeDocument } from "../../../../../lib/resume-schema";
import { requireRequestActor } from "../../../../../lib/auth-request";
import { rateLimit } from "../../../../../lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 1. Auth check
  const actorResult = await requireRequestActor(["admin"]);
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  // 2. Rate limit check (e.g. 10 previews per minute per user)
  const rl = rateLimit(`pdf-preview:${actorResult.actor.userId}`, { interval: 60000, limit: 10 });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute." }, 
      { status: 429, headers: { "Retry-After": Math.ceil((rl.reset - Date.now()) / 1000).toString() } }
    );
  }

  const draftPdfEnabled = await isPdfDraftEnabled();
  if (!draftPdfEnabled) {
    return NextResponse.json({ error: "Draft PDF export is currently disabled." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const doc = normalizeResumeDocument(body.resume, "");
    const locale = typeof body.locale === "string" ? body.locale : "en";

    const pdfBytes = await renderToBuffer(
      React.createElement(CvPdfTemplate, {
        resume: doc,
        title: doc.name || "Resume",
        locale,
      })
    );

    return new NextResponse(Uint8Array.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${buildPdfFilename(doc, "draft")}"`,
      },
    });
  } catch (err) {
    console.error("[export-pdf-preview-error]", err);
    return NextResponse.json({ error: "Failed to generate preview PDF." }, { status: 500 });
  }
}
