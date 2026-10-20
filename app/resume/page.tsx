import type { Metadata } from "next";
import ResumeViewClient from "./resume-view-client";
import { getRequestAppI18n } from "../i18n/server";
import { publicPageMetadata } from "../lib/seo-metadata";
import { getLanguageAlternatesMetadata } from "../lib/language-alternates";
import { preloadCvFont } from "../lib/cv-font-preload";
import { loadSampleResumeData } from "../lib/sample-resume";

export async function generateMetadata(): Promise<Metadata> {
  const { dictionary } = await getRequestAppI18n();
  return publicPageMetadata({
    ...dictionary.meta.pages.resume,
    path: "/resume",
    index: true,
    alternates: await getLanguageAlternatesMetadata("/resume"),
  });
}

export default async function SampleResumePage() {
  preloadCvFont();
  const [{ locale }, data] = await Promise.all([getRequestAppI18n(), loadSampleResumeData()]);
  return (
    <main className="container pb-8 cv-domain-page">
      <ResumeViewClient initialLocale={locale} data={data} />
    </main>
  );
}
