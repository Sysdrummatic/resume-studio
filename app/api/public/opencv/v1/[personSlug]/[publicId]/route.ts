import { rejectAiBot } from "../../../../../../lib/ai-bots";
import { NextResponse } from "next/server";
import { enforceRateLimit } from "../../../../../../lib/rate-limit";
import { getClientIp } from "../../../../../../lib/client-ip";
import { fetchPublishedResumeExportByPublicLink } from "../../../../../../lib/resume-server";

type RouteContext = {
  params: Promise<{
    personSlug: string;
    publicId: string;
  }>;
};

function buildCacheControl(): string {
  return "public, max-age=60, s-maxage=300, stale-while-revalidate=600";
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const blocked = rejectAiBot(request);
  if (blocked) {
    return blocked;
  }

  const limited = await enforceRateLimit({
    action: "opencv-public-api",
    limits: [{ dim: "ip", value: getClientIp(request.headers), interval: 60_000, limit: 60 }],
    onStoreError: "open", // ponytail: cacheable public read; availability over strictness
  });
  if (limited) return limited;

  const { personSlug, publicId } = await context.params;
  const url = new URL(request.url);
  const localeQuery = url.searchParams.get("lang") || undefined;
  const format = (url.searchParams.get("format") || "yaml").toLowerCase();

  const publishedExport = await fetchPublishedResumeExportByPublicLink(personSlug, publicId, localeQuery);
  if (!publishedExport) {
    return new NextResponse("Not found", {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const baseHeaders = {
    "Cache-Control": buildCacheControl(),
    Vary: "Accept, Accept-Encoding",
    "X-OpenCV-Contract-Version": publishedExport.openCvYamlContractVersion,
    "X-OpenCV-Schema-Version": String(publishedExport.schemaVersion),
    "X-OpenCV-Locale": publishedExport.locale,
  };

  if (format === "json") {
    return NextResponse.json(
      {
        version: publishedExport.openCvYamlContractVersion,
        schemaVersion: publishedExport.schemaVersion,
        canonicalPath: publishedExport.canonicalPath,
        locale: publishedExport.locale,
        defaultLocale: publishedExport.defaultLocale,
        availableLocales: publishedExport.availableLocales,
        allowIndexing: publishedExport.allowIndexing,
        yaml: publishedExport.yamlContent,
      },
      {
        status: 200,
        headers: baseHeaders,
      },
    );
  }

  return new NextResponse(publishedExport.yamlContent, {
    status: 200,
    headers: {
      ...baseHeaders,
      "Content-Type": "text/yaml; charset=utf-8",
    },
  });
}
