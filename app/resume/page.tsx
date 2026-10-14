import type { Metadata } from "next";
import ResumeViewClient from "./resume-view-client";
import { getRequestAppI18n } from "../i18n/server";
import { publicPageMetadata } from "../lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const { dictionary } = await getRequestAppI18n();
  return publicPageMetadata({ ...dictionary.meta.pages.resume, path: "/resume" });
}

export default async function SampleResumePage() {
  const { locale, dictionary } = await getRequestAppI18n();
  return (
    <main className="container pb-8 cv-domain-page">
      <ResumeViewClient initialLocale={locale} loadingLabel={dictionary.sample_resume.loading} />
    </main>
  );
}
