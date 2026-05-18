import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { CvPdfTemplate } from "../../../../../lib/CvPdfTemplate";
import { normalizeResumeDocument } from "../../../../../lib/resume-schema";
import { requireRequestActor } from "../../../../../lib/auth-request";
import { rateLimit } from "../../../../../lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 1. Auth check
  const actorResult = await requireRequestActor();
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

  try {
    const body = await req.json();
    const doc = normalizeResumeDocument(body.resume, "");
    
    const pdfBytes = await renderToBuffer(
      React.createElement(CvPdfTemplate, {
        resume: doc,
        title: doc.name || "Resume",
      })
    );

    return new NextResponse(Uint8Array.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="preview-${doc.brand_initials || "CV"}.pdf"`,
      },
    });
  } catch (err) {
    console.error("[export-pdf-preview-error]", err);
    return NextResponse.json({ error: "Failed to generate preview PDF." }, { status: 500 });
  }
}
