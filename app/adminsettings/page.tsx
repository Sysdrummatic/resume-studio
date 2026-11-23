import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminActor } from "../lib/auth-server";
import { fetchOnboardingTest } from "../lib/onboarding-test-server";
import { getRequestAppI18n } from "../i18n/server";
import WorkspaceBreadcrumbs from "../components/workspace-breadcrumbs";
import { Panel, buttonClassName } from "../components/design-system/primitives";
import { OnboardingTestSection } from "../settings/onboarding-test-settings";
import BetaTestModeSettings from "./beta-test-mode-settings";
import "./admin-settings.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { dictionary } = await getRequestAppI18n();
  return {
    title: dictionary.settings.text["Admin settings"],
    robots: { index: false, follow: false },
  };
}

/** Admin-only tools: the onboarding test (moved here from the dashboard notice) and beta test mode (#291). */
export default async function AdminSettingsPage() {
  const { dictionary } = await getRequestAppI18n();
  const settingsText = (text: string) => dictionary.settings.text[text] ?? text;
  const onboardingText = (text: string) => dictionary.onboarding.text[text] ?? text;
  const actor = await requireAdminActor();
  const run = await fetchOnboardingTest(actor.accessToken, actor.userId);

  return (
    <div className="admin-settings ocv-page ocv-page--narrow">
      <WorkspaceBreadcrumbs current={settingsText("Admin settings")} />
      <header className="ocv-page-head">
        <h1 className="ocv-title">{settingsText("Admin settings")}</h1>
      </header>

      {run && run.status !== "completed" ? (
        <Panel className="admin-settings__notice">
          <strong>{onboardingText("Onboarding test")}</strong>
          <Link className={buttonClassName("primary")} href={`/onboarding?test=${run.id}`}>
            {onboardingText("Resume test")}
          </Link>
        </Panel>
      ) : null}

      <OnboardingTestSection initialRun={run} />
      <BetaTestModeSettings />
    </div>
  );
}
