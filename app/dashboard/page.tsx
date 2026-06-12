import Script from "next/script";
import DashboardClient from "./dashboard-client";
import { requireAuthenticatedActor } from "../lib/auth-server";
import { isPdfDraftEnabled } from "../lib/pdf-feature-flags";
import { bootstrapResumeUserLocales, fetchResumeDocumentsForUser, fetchResumePresetsForUser, fetchResumeUserLocalesForUser } from "../lib/resume-server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const actor = await requireAuthenticatedActor();
  await bootstrapResumeUserLocales(actor.accessToken, actor.userId, actor.displayName);
  const resumeDocuments = await fetchResumeDocumentsForUser(actor.userId);
  const [resumePresets, resumeLanguages, draftPdfEnabled] = await Promise.all([
    fetchResumePresetsForUser(actor.userId),
    fetchResumeUserLocalesForUser(actor.userId),
    isPdfDraftEnabled(),
  ]);
  const ownedLocaleCodes = new Set(resumeLanguages.map((language) => language.code));
  const ownedDocuments = resumeDocuments.filter((document) => ownedLocaleCodes.has(document.locale));
  const masterResume = ownedDocuments.find((document) => document.locale === "en") || ownedDocuments[0] || null;

  return (
    <div className="dashboard-page stack">
      <Script src="/vendor/js-yaml.min.js" strategy="afterInteractive" />
      <header className="stack">
        <div className="product-surface__eyebrow">Publishing workspace</div>
        <h1 className="product-surface__title">Dashboard</h1>
      </header>

      <DashboardClient
        masterResume={masterResume}
        initialDocuments={ownedDocuments}
        languageOptions={resumeLanguages}
        initialPresets={resumePresets}
        actorRole={actor.role}
        draftPdfEnabled={draftPdfEnabled}
      />
    </div>
  );
}
