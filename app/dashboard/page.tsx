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
      <section className="card dashboard-overview">
        <div className="dashboard-overview__copy stack">
          <div className="product-surface__eyebrow">Publishing workspace</div>
          <div className="stack">
            <h1 className="product-surface__title">Dashboard</h1>
            <p className="product-surface__lead">
              Manage the master record, locale variants, and public CV versions from one authenticated surface.
            </p>
          </div>
          <p className="dashboard-overview__account">
            Logged in as <strong>{actor.displayName || actor.email}</strong> ({actor.email}).
          </p>
        </div>

        <div className="dashboard-overview__stats" aria-label="Dashboard summary">
          <div className="product-metric">
            <span className="product-metric__label">Resume docs</span>
            <strong>{resumeDocuments.length}</strong>
            <small>Stored source records</small>
          </div>
          <div className="product-metric">
            <span className="product-metric__label">CV versions</span>
            <strong>{resumePresets.length}</strong>
            <small>Targeted public variants</small>
          </div>
          <div className="product-metric">
            <span className="product-metric__label">Locales</span>
            <strong>{resumeLanguages.length}</strong>
            <small>Enabled language set</small>
          </div>
        </div>
      </section>

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
