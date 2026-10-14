import type { Metadata } from "next";
import { LegalDocumentView } from "../components/legal-document";
import { getRequestAppI18n } from "../i18n/server";
import { getLanguageAlternatesMetadata } from "../lib/language-alternates";

export async function generateMetadata(): Promise<Metadata> {
  const { dictionary } = await getRequestAppI18n();
  const document = dictionary.legal.terms;
  return {
    title: `${document.title} | OpenCiVera`,
    description: document.description,
    alternates: await getLanguageAlternatesMetadata("/terms"),
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function TermsOfServicePage() {
  const { dictionary } = await getRequestAppI18n();

  return (
    <main className="container py-8">
      <LegalDocumentView document={dictionary.legal.terms} />
    </main>
  );
}
