import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { fetchPublishedResumeExportByPublicLink } from "../../../../lib/resume-server";
import { ResumePdfDocument } from "../../../../lib/resume-pdf";
import { normalizeResumeDocument } from "../../../../lib/resume-schema";
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

  const exportData = await fetchPublishedResumeExportByPublicLink(personSlug, publicId, lang);
  if (!exportData) {
    return NextResponse.json({ error: "Published CV snapshot not found." }, { status: 404 });
  }

  try {
    const doc = normalizeResumeDocument(yaml.load(exportData.yamlContent), "");
    const pdfBytes = await renderToBuffer(
      React.createElement(ResumePdfDocument, {
        locale: exportData.locale,
        resume: doc,
        title: exportData.personSlug,
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
