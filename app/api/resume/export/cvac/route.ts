import { rejectAiBot } from "../../../../lib/ai-bots";
import { NextRequest, NextResponse } from "next/server";
import { fetchPublishedResumeExportByPublicLink } from "../../../../lib/resume-server";
import { getRawYamlSource } from "../../../../lib/resume-export";
import { enforceRateLimit } from "../../../../lib/rate-limit";
import { getClientIp } from "../../../../lib/client-ip";
import { buildExportFilename } from "../../../../lib/pdf/filename";

export const dynamic = "force-dynamic";

/**
 * GET /api/resume/export/cvac
 * CVasCode export — returns the published source YAML with no ATS transformations.
 * "Published" means the saved-version selection is already applied by the resolver
 * (ADR 0008: unselected master content is never exposed).
 * Query params: personSlug, publicId, lang (optional)
 */
export async function GET(req: NextRequest) {
  const blocked = rejectAiBot(req);
  if (blocked) {
    return blocked;
  }

  const { searchParams } = new URL(req.url);
  const personSlug = searchParams.get("personSlug");
  const publicId = searchParams.get("publicId");
  const lang = searchParams.get("lang") || undefined;

  if (!personSlug || !publicId) {
    return NextResponse.json({ error: "personSlug and publicId are required." }, { status: 400 });
  }

  const limited = await enforceRateLimit({
    action: "cvac-export",
    limits: [{ dim: "ip", value: getClientIp(req.headers), interval: 60_000, limit: 5 }],
    onStoreError: "open", // ponytail: public, low-risk read; availability over strictness
  });
  if (limited) return limited;

  const exportData = await fetchPublishedResumeExportByPublicLink(personSlug, publicId, lang);
  if (!exportData) {
    return NextResponse.json({ error: "Published CV snapshot not found." }, { status: 404 });
  }

  return new NextResponse(getRawYamlSource(exportData.yamlContent), {
    headers: {
      "Content-Type": "text/yaml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${buildExportFilename(exportData.resume, publicId, "yaml", "cvascode")}"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
