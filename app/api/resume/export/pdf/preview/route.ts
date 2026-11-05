import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { CvPdfDocument as CvPdfTemplate } from "../../../../../lib/pdf/CvPdfDocument";
import { buildPdfFilename } from "../../../../../lib/pdf/filename";
import { loadPdfFonts } from "../../../../../lib/pdf/engine-react-pdf";
import { isPdfDraftEnabled } from "../../../../../lib/pdf-feature-flags";
import { normalizeResumeDocument, resumeFullName } from "../../../../../lib/resume-schema";
import { requireRequestActor } from "../../../../../lib/auth-request";
import { enforceRateLimit } from "../../../../../lib/rate-limit";
import { applyResumeStyleToTheme, normalizeResumeStyle } from "../../../../../lib/resume-style";
import { cvBasicDotTheme } from "../../../../../lib/pdf/theme";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 1. Auth check
  const actorResult = await requireRequestActor(["admin"]);
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  // 2. Rate limit check (e.g. 10 previews per minute per user)
  const limited = await enforceRateLimit({
    action: "pdf-preview",
    limits: [{ dim: "user", value: actorResult.actor.userId, interval: 60000, limit: 10 }],
    message: "Too many requests. Please wait a minute.",
  });
  if (limited) return limited;

  const draftPdfEnabled = await isPdfDraftEnabled();
  if (!draftPdfEnabled) {
    return NextResponse.json({ error: "Draft PDF export is currently disabled." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const doc = normalizeResumeDocument(body.resume, "");
    const locale = typeof body.locale === "string" ? body.locale : "en";
    const cvStyle = normalizeResumeStyle(body.styleSettings);

    // Metrics have to be readable before render: pagination measures text to

    // decide what may be kept whole. See app/lib/pdf/metrics.ts.

    await loadPdfFonts();


    const pdfBytes = await renderToBuffer(
      React.createElement(CvPdfTemplate, {
        resume: doc,
        title: resumeFullName(doc) || "Resume",
        locale,
        theme: applyResumeStyleToTheme(cvBasicDotTheme, cvStyle),
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
