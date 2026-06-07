import { NextRequest, NextResponse } from "next/server";
import { fetchPublishedResumeExportByPublicLink } from "../../../../lib/resume-server";
import { convertResumeToAtsYaml } from "../../../../lib/resume-export";
import { normalizeResumeDocument } from "../../../../lib/resume-schema";
import { rateLimit } from "../../../../lib/rate-limit";
import yaml from "js-yaml";

export const dynamic = "force-dynamic";

/**
 * GET /api/resume/export/yaml
 * Exports a resume as ATS-cleaned YAML (interests removed, skills+tech flattened, ratings stripped).
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

  const ip = req.headers.get("x-forwarded-for") || "anonymous";
  const rl = rateLimit(`yaml-export:${ip}`, { interval: 60000, limit: 5 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const exportData = await fetchPublishedResumeExportByPublicLink(personSlug, publicId, lang);
  if (!exportData) {
    return NextResponse.json({ error: "Published CV snapshot not found." }, { status: 404 });
  }

  try {
    const doc = normalizeResumeDocument(yaml.load(exportData.yamlContent), "");
    const atsYaml = convertResumeToAtsYaml(doc);

    return new NextResponse(atsYaml, {
      headers: {
        "Content-Type": "text/yaml; charset=utf-8",
        "Content-Disposition": `attachment; filename="resume-${exportData.personSlug}-${exportData.locale}.yaml"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (err) {
    console.error("[export-yaml-error]", err);
    return NextResponse.json({ error: "Failed to process published resume snapshot." }, { status: 500 });
  }
}
