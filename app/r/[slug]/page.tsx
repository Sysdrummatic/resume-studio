import { notFound, permanentRedirect } from "next/navigation";
import { BasicResumeDocument } from "../../components/resume-renderer/BasicResumeDocument";
import PrintTrigger from "../../components/print-trigger";
import { fetchCanonicalPublicPathBySlug, fetchPublishedResumePresetBySlug, trackLegacyPublicRouteEvent } from "../../lib/resume-server";

type PublicResumePageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    lang?: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params, searchParams }: PublicResumePageProps) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const canonicalPath = await fetchCanonicalPublicPathBySlug(slug, query.lang);
  const published = await fetchPublishedResumePresetBySlug(slug, query.lang);

  if (!published) {
    return {
      title: "Resume not found | OpenCVHub",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${published.resume.name || published.preset.title} | OpenCVHub`;
  const description = published.resume.summary.find((s) => s.default)?.position || published.preset.title;
  const allowIndexing = published.preset.allow_indexing;

  return {
    title,
    description,
    alternates: canonicalPath
      ? {
          canonical: canonicalPath,
        }
      : undefined,
    robots: {
      index: allowIndexing,
      follow: allowIndexing,
    },
    openGraph: {
      title,
      description,
      type: "profile",
    },
  };
}

export default async function PublicResumeBySlugPage({ params, searchParams }: PublicResumePageProps) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const canonicalPath = await fetchCanonicalPublicPathBySlug(slug, query.lang);
  if (canonicalPath) {
    trackLegacyPublicRouteEvent({
      slug,
      requestedLocale: query.lang,
      outcome: "redirected",
    });
    permanentRedirect(canonicalPath);
  }
  const published = await fetchPublishedResumePresetBySlug(slug, query.lang);

  if (!published) {
    trackLegacyPublicRouteEvent({
      slug,
      requestedLocale: query.lang,
      outcome: "not_found",
    });
    notFound();
  }

  trackLegacyPublicRouteEvent({
    slug,
    requestedLocale: query.lang,
    outcome: "resolved_legacy",
  });

  return (
    <main className="container pb-8 public-resume-route">
      <PrintTrigger />
      <BasicResumeDocument
        locale={published.document.locale}
        resume={published.resume}
        languages={published.languages}
        status="public"
        aiGenerated={published.preset.ai_generated || published.document.ai_generated}
        mode="public"
      />
    </main>
  );
}
