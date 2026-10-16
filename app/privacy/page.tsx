import type { Metadata } from "next";
import { LegalDocumentView } from "../components/legal-document";
import { getRequestAppI18n } from "../i18n/server";
import { publicPageMetadata } from "../lib/seo-metadata";
import { getLanguageAlternatesMetadata } from "../lib/language-alternates";

export async function generateMetadata(): Promise<Metadata> {
  const { dictionary } = await getRequestAppI18n();
  return publicPageMetadata({
    ...dictionary.meta.pages.privacy,
    path: "/privacy",
    index: true,
    alternates: await getLanguageAlternatesMetadata("/privacy"),
  });
}

export default async function PrivacyPolicyPage() {
  const { dictionary } = await getRequestAppI18n();

  return (
    <main className="container py-8">
      <LegalDocumentView document={dictionary.legal.privacy} />
    </main>
  );
}
