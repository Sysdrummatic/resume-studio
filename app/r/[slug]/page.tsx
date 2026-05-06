import { notFound } from "next/navigation";
import { BasicResumeDocument } from "../../master-resume/resume-live-preview";
import { fetchPublishedResumePresetBySlug } from "../../lib/resume-server";
import "../../resume/resume.css";

type PublicResumePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PublicResumePageProps) {
  const { slug } = await params;
  const published = await fetchPublishedResumePresetBySlug(slug);

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
  const description = published.resume.role || published.preset.title;
  const allowIndexing = published.preset.allow_indexing;

  return {
    title,
    description,
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

export default async function PublicResumeBySlugPage({ params }: PublicResumePageProps) {
  const { slug } = await params;
  const published = await fetchPublishedResumePresetBySlug(slug);

  if (!published) {
    notFound();
  }

  return (
    <main className="container py-8 public-resume-route">
      <BasicResumeDocument locale={published.document.locale} resume={published.resume} />
    </main>
  );
}
