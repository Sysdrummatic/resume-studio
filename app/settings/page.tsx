import { requireAdminActor } from "../lib/auth-server";
import { fetchOnboardingTest } from "../lib/onboarding-test-server";
import OnboardingTestSettings from "./onboarding-test-settings";
import type { Metadata } from "next";
import { getRequestAppI18n } from "../i18n/server";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const { dictionary } = await getRequestAppI18n();
  return {
    title: `${dictionary.settings.text["Account settings"]} | OpenCiVera`,
    robots: { index: false, follow: false }
  };
}

export default async function SettingsPage() {
  const actor = await requireAdminActor();
  const run = await fetchOnboardingTest(actor.accessToken, actor.userId);
  return <OnboardingTestSettings initialRun={run} />;
}
