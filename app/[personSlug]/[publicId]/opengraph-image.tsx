import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import { OgCard } from "../../components/og-card";
import { buildCvOgContent, OG_IMAGE_ALT, OG_IMAGE_CONTENT_TYPE, OG_IMAGE_SIZE } from "../../lib/og-image";
import { fetchPublishedResumePresetByPublicLink } from "../../lib/resume-server";
import { resumeFullName } from "../../lib/resume-schema";

export const alt = OG_IMAGE_ALT;
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ personSlug: string; publicId: string }> }) {
  const { personSlug, publicId } = await params;
  const route = await fetchPublishedResumePresetByPublicLink(personSlug, publicId);

  if (!route) {
    notFound();
  }

  const { published, allowIndexing } = route;
  const cv = buildCvOgContent({
    allowIndexing,
    name: resumeFullName(published.resume) || published.preset.title,
    role: published.resume.summary.find((summary) => summary.default)?.position ?? "",
  });

  return new ImageResponse(<OgCard cv={cv} />, size);
}
