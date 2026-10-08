import type { Metadata } from "next";
import { LegalDocumentView } from "../components/legal-document";
import { getRequestAppI18n } from "../i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { dictionary } = await getRequestAppI18n();
  const document = dictionary.legal.privacy;
  return {
    title: `${document.title} | OpenCiVera`,
    description: document.description,
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function PrivacyPolicyPage() {
  const { dictionary } = await getRequestAppI18n();

  return (
    <main className="container py-8">
      <LegalDocumentView document={dictionary.legal.privacy} />
    </main>
  );
}
