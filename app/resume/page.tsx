import type { Metadata } from "next";
import ResumeViewClient from "./resume-view-client";
import { getRequestAppI18n } from "../i18n/server";
import { loadSampleResumeData } from "../lib/sample-resume";

export async function generateMetadata(): Promise<Metadata> {
  const { dictionary } = await getRequestAppI18n();
  return {
    title: dictionary.sample_resume.title,
    description: dictionary.sample_resume.description,
  };
}

export default async function SampleResumePage() {
  const [{ locale }, data] = await Promise.all([getRequestAppI18n(), loadSampleResumeData()]);
  return (
    <main className="container pb-8 cv-domain-page">
      <ResumeViewClient initialLocale={locale} data={data} />
    </main>
  );
}
