import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchOnboarding } from "../lib/resume-onboarding-server";
import { shouldStartOnboarding } from "../lib/resume-onboarding";
import { fetchOnboardingTest } from "../lib/onboarding-test-server";
import DashboardClient from "./dashboard-client";
import WorkspaceBreadcrumbs from "../components/workspace-breadcrumbs";
import { requireAuthenticatedActor } from "../lib/auth-server";
import { isPdfDraftEnabled } from "../lib/pdf-feature-flags";
import { isPublicCvIndexingEnabled, isUserDataTransferEnabled } from "../lib/platform-feature-flags";
import {
  bootstrapResumeUserLocales,
  fetchResumeDocumentsForUser,
  fetchResumePresetsForUser,
  fetchResumeUserLocalesForUser,
  pickMasterResumeDocument
} from "../lib/resume-server";
import { getRequestAppI18n } from "../i18n/server";
import { Panel, buttonClassName } from "../components/design-system/primitives";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const { dictionary } = await getRequestAppI18n();
  const onboardingText = (text: string) => dictionary.onboarding.text[text] ?? text;
  const actor = await requireAuthenticatedActor();
  const testRun =
    actor.role === "admin" ? await fetchOnboardingTest(actor.accessToken, actor.userId) : null;
  if (testRun?.auto_start && testRun.status !== "completed")
    redirect(`/onboarding?test=${testRun.id}`);
  const onboarding = await fetchOnboarding(actor.accessToken, actor.userId);
  if (shouldStartOnboarding(onboarding)) redirect("/onboarding");
  await bootstrapResumeUserLocales(actor.accessToken, actor.userId, actor.displayName);
  const resumeDocuments = await fetchResumeDocumentsForUser(actor.userId);
  const [resumePresets, resumeLanguages, draftPdfEnabled, dataTransferEnabled, indexingEnabled] = await Promise.all([
    fetchResumePresetsForUser(actor.userId),
    fetchResumeUserLocalesForUser(actor.userId),
    isPdfDraftEnabled(),
    isUserDataTransferEnabled(),
    isPublicCvIndexingEnabled()
  ]);
  const ownedLocaleCodes = new Set(resumeLanguages.map((language) => language.code));
  const ownedDocuments = resumeDocuments.filter((document) =>
    ownedLocaleCodes.has(document.locale)
  );
  const masterResume = pickMasterResumeDocument(ownedDocuments, resumeLanguages);

  return (
    <div className="dashboard-page ocv-page">
      <Script src="/vendor/js-yaml.min.js" strategy="afterInteractive" />
      <WorkspaceBreadcrumbs current={dictionary.dashboard.main.title} />

      {onboarding && onboarding.status !== "completed" ? (
        <Panel className="dashboard-banner">
          <strong>{onboardingText("Finish your first CV")}</strong>
          <p className="ocv-meta">
            {onboardingText("Your saved details are ready. Continue the guide where you left off.")}
          </p>
          <Link className={buttonClassName("primary")} href="/onboarding">
            {onboardingText("Resume guide")}
          </Link>
        </Panel>
      ) : null}
      <DashboardClient
        masterResume={masterResume}
        initialDocuments={ownedDocuments}
        languageOptions={resumeLanguages}
        initialPresets={resumePresets}
        draftPdfEnabled={draftPdfEnabled && actor.role === "admin"}
        dataTransferEnabled={dataTransferEnabled}
        indexingEnabled={indexingEnabled}
      />
    </div>
  );
}
