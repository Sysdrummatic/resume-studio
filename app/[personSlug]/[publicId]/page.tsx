import { notFound } from "next/navigation";
import { BasicResumeDocument } from "../../master-resume/resume-live-preview";
import { getAppBaseUrl } from "../../lib/env";
import { fetchPublishedResumePresetByPublicLink } from "../../lib/resume-server";
import "../../resume/resume.css";

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

export async function generateMetadata({ params, searchParams }: PublicResumeByPublicIdPageProps) {
  const { personSlug, publicId } = await params;
  const query = searchParams ? await searchParams : {};
  const publishedRoute = await fetchPublishedResumePresetByPublicLink(personSlug, publicId, query.lang);

  if (!publishedRoute) {
    return {
      title: "Resume not found | OpenCVHub",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const { published, allowIndexing, personSlug: canonicalPersonSlug, publicId: canonicalPublicId } = publishedRoute;
  const title = `${published.resume.name || published.preset.title} | OpenCVHub`;
  const description = published.resume.role || published.preset.title;
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

  const { published } = publishedRoute;

  return (
    <main className="container py-8 public-resume-route">
      <BasicResumeDocument
        locale={published.document.locale}
        resume={published.resume}
        languages={published.languages}
        status="public"
        aiGenerated={published.preset.ai_generated || published.document.ai_generated}
      />
    </main>
  );
}
