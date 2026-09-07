import Script from "next/script";
import { redirect } from "next/navigation";
import { requireAuthenticatedActor } from "../lib/auth-server";
import { fetchOnboarding } from "../lib/resume-onboarding-server";
import EditorCanvasClient from "../master-resume/editor-canvas-client";
import { fetchOnboardingTest } from "../lib/onboarding-test-server";
import { isTestRunId } from "../lib/onboarding-test";
import { notFound } from "next/navigation";
import "./onboarding.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your first CV | OpenCiVera",
  robots: { index: false, follow: false }
};

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ test?: string }> }) {
  const actor = await requireAuthenticatedActor();
  const testId = (await searchParams).test;
  if (testId !== undefined) {
    if (actor.role !== "admin") redirect("/dashboard?reason=forbidden");
    if (!isTestRunId(testId)) notFound();
    const run = await fetchOnboardingTest(actor.accessToken, actor.userId, testId);
    if (!run) notFound();
    if (run.status === "completed") redirect("/settings");
    return <><Script src="/vendor/js-yaml.min.js" strategy="afterInteractive" /><EditorCanvasClient key={run.id} onboarding={run} testRun={run} draftPdfEnabled={false} /></>;
  }
  const onboarding = await fetchOnboarding(actor.accessToken, actor.userId);
  if (!onboarding || onboarding.status === "completed") redirect("/dashboard");
  return (
    <>
      <Script src="/vendor/js-yaml.min.js" strategy="afterInteractive" />
      <EditorCanvasClient onboarding={onboarding} draftPdfEnabled={false} />
    </>
  );
}
