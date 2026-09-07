import { requireAdminActor } from "../lib/auth-server";
import { fetchOnboardingTest } from "../lib/onboarding-test-server";
import OnboardingTestSettings from "./onboarding-test-settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account settings | OpenCiVera", robots: { index: false, follow: false } };

export default async function SettingsPage() {
  const actor = await requireAdminActor();
  const run = await fetchOnboardingTest(actor.accessToken, actor.userId);
  return <OnboardingTestSettings initialRun={run} />;
}
