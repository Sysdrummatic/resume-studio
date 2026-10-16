import { notFound } from "next/navigation";
import Link from "../../components/localized-link";
import { getRequestAppI18n } from "../../i18n/server";
import { BasicResumeDocument } from "../../components/resume-renderer/BasicResumeDocument";
import PrintTrigger from "../../components/print-trigger";
import { getAppBaseUrl } from "../../lib/env";
import { fetchPublishedResumePresetByPublicLink } from "../../lib/resume-server";
import type { PublishedResumePreset } from "../../lib/resume-server";
import { safeJsonLdScript } from "../../lib/jsonld";
import { buildPublicPersonJsonLd } from "../../lib/jsonld-schemas";
import { resumeFullName } from "../../lib/resume-schema";
import { buildPublicCvDescription, buildPublicCvTitle } from "../../lib/seo-metadata";
import { absoluteOgImageUrl, cvOgImagePath, OG_IMAGE_ALT, OG_IMAGE_SIZE } from "../../lib/og-image";

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

function buildPublicResumeJsonLd(published: PublishedResumePreset, canonicalUrl: string) {
  const displayName = resumeFullName(published.resume) || published.preset.title;

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
    mainEntity: buildPublicPersonJsonLd(published.resume, { name: displayName, canonicalUrl }),
  };
}

export async function generateMetadata({ params, searchParams }: PublicResumeByPublicIdPageProps) {
  const { personSlug, publicId } = await params;
  const query = searchParams ? await searchParams : {};
  const publishedRoute = await fetchPublishedResumePresetByPublicLink(personSlug, publicId, query.lang);

  if (!publishedRoute) {
    return {
      title: "Resume not found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const { published, allowIndexing, personSlug: canonicalPersonSlug, publicId: canonicalPublicId } = publishedRoute;
  const defaultSummary = published.resume.summary.find((s) => s.default);
  const title = buildPublicCvTitle(resumeFullName(published.resume) || published.preset.title, defaultSummary?.position ?? "");
  const description = buildPublicCvDescription(defaultSummary?.description ?? "", defaultSummary?.position || published.preset.title);
  const socialTitle = `${title} | OpenCiVera`;
  const canonicalPath = `/${encodeURIComponent(canonicalPersonSlug)}/${encodeURIComponent(canonicalPublicId)}`;
  const languageMap = Object.fromEntries(
    published.languages.map((language) => [language.code, absoluteUrl(language.href)]),
  ) as Record<string, string>;
  const ogImage = {
    url: absoluteOgImageUrl(getAppBaseUrl(), cvOgImagePath(canonicalPath)),
    ...OG_IMAGE_SIZE,
    alt: OG_IMAGE_ALT,
  };

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
      title: socialTitle,
      description,
      type: "profile",
      url: absoluteUrl(canonicalPath),
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [ogImage.url],
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
  const { dictionary } = await getRequestAppI18n();

  return (
    <main className="container pb-8 public-resume-route cv-domain-page">
      {allowIndexing ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLdScript(publicResumeJsonLd),
          }}
        />
      ) : null}
      <PrintTrigger />
      <BasicResumeDocument
        locale={published.document.locale}
        resume={published.resume}
        languages={published.languages}
        status="public"
        aiGenerated={published.preset.ai_generated}
        personSlug={canonicalPersonSlug}
        publicId={canonicalPublicId}
        mode="public"
        cvStyle={published.cvStyle}
      />
      <p className="public-resume-route__cta">
        <Link href="/">{dictionary.landing.cta.primary_action}</Link>
      </p>
    </main>
  );
}
