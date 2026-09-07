import Script from "next/script";
import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchOnboarding } from "../lib/resume-onboarding-server";
import { shouldStartOnboarding } from "../lib/resume-onboarding";
import { fetchOnboardingTest } from "../lib/onboarding-test-server";
import DashboardClient from "./dashboard-client";
import { requireAuthenticatedActor } from "../lib/auth-server";
import { isPdfDraftEnabled } from "../lib/pdf-feature-flags";
import { isUserDataTransferEnabled } from "../lib/platform-feature-flags";
import { bootstrapResumeUserLocales, fetchResumeDocumentsForUser, fetchResumePresetsForUser, fetchResumeUserLocalesForUser } from "../lib/resume-server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const actor = await requireAuthenticatedActor();
  const testRun = actor.role === "admin" ? await fetchOnboardingTest(actor.accessToken, actor.userId) : null;
  if (testRun?.auto_start && testRun.status !== "completed") redirect(`/onboarding?test=${testRun.id}`);
  const onboarding = await fetchOnboarding(actor.accessToken, actor.userId);
  if (shouldStartOnboarding(onboarding)) redirect("/onboarding");
  await bootstrapResumeUserLocales(actor.accessToken, actor.userId, actor.displayName);
  const resumeDocuments = await fetchResumeDocumentsForUser(actor.userId);
  const [resumePresets, resumeLanguages, draftPdfEnabled, dataTransferEnabled] = await Promise.all([
    fetchResumePresetsForUser(actor.userId),
    fetchResumeUserLocalesForUser(actor.userId),
    isPdfDraftEnabled(),
    isUserDataTransferEnabled(),
  ]);
  const ownedLocaleCodes = new Set(resumeLanguages.map((language) => language.code));
  const ownedDocuments = resumeDocuments.filter((document) => ownedLocaleCodes.has(document.locale));
  const masterResume = ownedDocuments.find((document) => document.locale === "en") || ownedDocuments[0] || null;

  return (
    <div className="dashboard-page stack">
      <Script src="/vendor/js-yaml.min.js" strategy="afterInteractive" />
      <header className="dashboard-page__hero stack">
        <div className="product-surface__eyebrow">Publishing workspace</div>
        <h1 className="product-surface__title">Dashboard</h1>
      </header>

      {testRun && testRun.status !== "completed" ? <div className="card stack">
        <strong>Test onboardingu / Onboarding test</strong>
        <Link className="button button--primary" href={`/onboarding?test=${testRun.id}`}>{testRun.ui_language === "pl" ? "Wznów test" : "Resume test"}</Link>
      </div> : null}
      {onboarding && onboarding.status !== "completed" ? (
        <div className="card stack">
          <strong>{onboarding.ui_language === "pl" ? "Dokończ swoje pierwsze CV" : "Finish your first CV"}</strong>
          <p>{onboarding.ui_language === "pl" ? "Twoje zapisane dane czekają. Wróć do przewodnika w miejscu, w którym przerwano." : "Your saved details are ready. Continue the guide where you left off."}</p>
          <Link className="button button--primary" href="/onboarding">{onboarding.ui_language === "pl" ? "Wznów przewodnik" : "Resume guide"}</Link>
        </div>
      ) : null}
      <DashboardClient
        masterResume={masterResume}
        initialDocuments={ownedDocuments}
        languageOptions={resumeLanguages}
        initialPresets={resumePresets}
        draftPdfEnabled={draftPdfEnabled && actor.role === "admin"}
        dataTransferEnabled={dataTransferEnabled}
      />
    </div>
  );
}
