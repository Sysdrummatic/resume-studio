import { NextRequest, NextResponse } from "next/server";
import { fetchPublishedResumeExportByPublicLink } from "../../../../lib/resume-server";
import { convertResumeToPlainText } from "../../../../lib/resume-export";
import { normalizeResumeDocument } from "../../../../lib/resume-schema";
import yaml from "js-yaml";

export const dynamic = "force-dynamic";

/**
 * GET /api/resume/export/text
 * Exports a resume as plain text (ATS-friendly).
 * Query params: personSlug, publicId, lang (optional)
 */
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
    const plainText = convertResumeToPlainText(doc, exportData.locale);

    return new NextResponse(plainText, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="resume-${exportData.personSlug}-${exportData.locale}.txt"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (err) {
    console.error("[export-text-error]", err);
    return NextResponse.json({ error: "Failed to process published resume snapshot." }, { status: 500 });
  }
}
