import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { fetchPublishedResumeExportByPublicLink } from "../../../../lib/resume-server";
import { CvPdfTemplate } from "../../../../lib/CvPdfTemplate";
import { normalizeResumeDocument } from "../../../../lib/resume-schema";
import { rateLimit } from "../../../../lib/rate-limit";
import yaml from "js-yaml";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const personSlug = searchParams.get("personSlug");
  const publicId = searchParams.get("publicId");
  const lang = searchParams.get("lang") || undefined;

  if (!personSlug || !publicId) {
    return NextResponse.json({ error: "personSlug and publicId are required." }, { status: 400 });
  }

  // Rate limit by IP or personSlug (to prevent scraping)
  const ip = req.headers.get("x-forwarded-for") || "anonymous";
  const rl = rateLimit(`pdf-export:${ip}`, { interval: 60000, limit: 5 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const exportData = await fetchPublishedResumeExportByPublicLink(personSlug, publicId, lang);
  if (!exportData) {
    return NextResponse.json({ error: "Published CV snapshot not found." }, { status: 404 });
  }

  try {
    const doc = normalizeResumeDocument(yaml.load(exportData.yamlContent), "");
    const pdfBytes = await renderToBuffer(
      React.createElement(CvPdfTemplate, {
        resume: doc,
        title: exportData.personSlug,
        locale: exportData.locale,
      }),
    );

    return new NextResponse(Uint8Array.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="resume-${exportData.personSlug}-${exportData.locale}.pdf"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (err) {
    console.error("[export-pdf-error]", err);
    return NextResponse.json({ error: "Failed to process published resume snapshot." }, { status: 500 });
  }
}
