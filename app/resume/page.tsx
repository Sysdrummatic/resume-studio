import type { Metadata } from "next";
import ResumeViewClient from "./resume-view-client";
import { getRequestAppI18n } from "../i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { dictionary } = await getRequestAppI18n();
  return {
    title: dictionary.sample_resume.title,
    description: dictionary.sample_resume.description,
  };
}

export default async function SampleResumePage() {
  const { locale, dictionary } = await getRequestAppI18n();
  return (
    <main className="container pb-8 cv-domain-page">
      <ResumeViewClient initialLocale={locale} loadingLabel={dictionary.sample_resume.loading} />
    </main>
  );
}
