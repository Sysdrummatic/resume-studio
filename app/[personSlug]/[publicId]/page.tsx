import { notFound } from "next/navigation";
import { BasicResumeDocument } from "../../components/resume-renderer/BasicResumeDocument";
import PrintTrigger from "../../components/print-trigger";
import { getAppBaseUrl } from "../../lib/env";
import { fetchPublishedResumePresetByPublicLink } from "../../lib/resume-server";
import type { PublishedResumePreset } from "../../lib/resume-server";

type PublicResumeByPublicIdPageProps = {
  params: Promise<{
    personSlug: string;
    publicId: string;
  }>;
  searchParams?: Promise<{
    lang?: string;
  }>;
};

export const dynamic = "force-dynamic";

function absoluteUrl(path: string): string {
  const base = getAppBaseUrl().replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function compactJsonLd<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== "")) as T;
}

function buildPublicResumeJsonLd(published: PublishedResumePreset, canonicalUrl: string) {
  const defaultSummary = published.resume.summary.find((summary) => summary.default);
  const displayName = published.resume.name || published.preset.title;

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: displayName,
    url: canonicalUrl,
    inLanguage: published.document.locale,
    isPartOf: {
      "@type": "WebSite",
      name: "OpenCiVera",
      url: getAppBaseUrl(),
    },
    mainEntity: compactJsonLd({
      "@type": "Person",
      name: displayName,
      jobTitle: defaultSummary?.position,
      url: canonicalUrl,
      mainEntityOfPage: canonicalUrl,
    }),
  };
}

export async function generateMetadata({ params, searchParams }: PublicResumeByPublicIdPageProps) {
  const { personSlug, publicId } = await params;
  const query = searchParams ? await searchParams : {};
  const publishedRoute = await fetchPublishedResumePresetByPublicLink(personSlug, publicId, query.lang);

  if (!publishedRoute) {
    return {
      title: "Resume not found | OpenCiVera",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const { published, allowIndexing, personSlug: canonicalPersonSlug, publicId: canonicalPublicId } = publishedRoute;
  const title = `${published.resume.name || published.preset.title} | OpenCiVera`;
  const description = published.resume.summary.find((s) => s.default)?.position || published.preset.title;
  const canonicalPath = `/${encodeURIComponent(canonicalPersonSlug)}/${encodeURIComponent(canonicalPublicId)}`;
  const languageMap = Object.fromEntries(
    published.languages.map((language) => [language.code, absoluteUrl(language.href)]),
  ) as Record<string, string>;

  return {
    title,
    description,
    robots: {
      index: allowIndexing,
      follow: allowIndexing,
    },
    alternates: {
      canonical: absoluteUrl(canonicalPath),
      languages: languageMap,
    },
    openGraph: {
      title,
      description,
      type: "profile",
      url: absoluteUrl(canonicalPath),
    },
  };
}

export default async function PublicResumeByPublicIdPage({ params, searchParams }: PublicResumeByPublicIdPageProps) {
  const { personSlug, publicId } = await params;
  const query = searchParams ? await searchParams : {};
  const publishedRoute = await fetchPublishedResumePresetByPublicLink(personSlug, publicId, query.lang);

  if (!publishedRoute) {
    notFound();
  }

  const { published, allowIndexing, personSlug: canonicalPersonSlug, publicId: canonicalPublicId } = publishedRoute;
  const canonicalPath = `/${encodeURIComponent(canonicalPersonSlug)}/${encodeURIComponent(canonicalPublicId)}`;
  const canonicalUrl = absoluteUrl(canonicalPath);
  const publicResumeJsonLd = buildPublicResumeJsonLd(published, canonicalUrl);

  return (
    <main className="container pb-8 public-resume-route cv-domain-page">
      {allowIndexing ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(publicResumeJsonLd),
          }}
        />
      ) : null}
      <PrintTrigger />
      <BasicResumeDocument
        locale={published.document.locale}
        resume={published.resume}
        languages={published.languages}
        status="public"
        aiGenerated={published.preset.ai_generated || published.document.ai_generated}
        personSlug={canonicalPersonSlug}
        publicId={canonicalPublicId}
        mode="public"
      />
    </main>
  );
}
