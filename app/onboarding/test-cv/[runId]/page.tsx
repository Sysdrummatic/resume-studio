import { notFound } from "next/navigation";
import { requireAdminActor } from "../../../lib/auth-server";
import { fetchOnboardingTest } from "../../../lib/onboarding-test-server";
import { isTestRunId } from "../../../lib/onboarding-test";
import { normalizeResumeDocument } from "../../../lib/resume-schema";
import { firstCvSelection } from "../../../lib/resume-onboarding";
import { applyResumeSelectionToRawDocument } from "../../../lib/preset-selection";
import { BasicResumeDocument } from "../../../components/resume-renderer/BasicResumeDocument";
import yaml from "js-yaml";
import type { Metadata } from "next";
import { getRequestAppI18n } from "../../../i18n/server";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const { dictionary } = await getRequestAppI18n();
  return {
    title: `${dictionary.onboarding.text["Onboarding test CV"]} | OpenCiVera`,
    robots: { index: false, follow: false }
  };
}

export default async function TestCvPage({ params }: { params: Promise<{ runId: string }> }) {
  const { dictionary } = await getRequestAppI18n();
  const actor = await requireAdminActor();
  const { runId } = await params;
  if (!isTestRunId(runId)) notFound();
  const run = await fetchOnboardingTest(actor.accessToken, actor.userId, runId);
  if (!run || !run.drafts[run.locale]) notFound();
  const resume = normalizeResumeDocument(yaml.load(run.drafts[run.locale]), "");
  const selected = normalizeResumeDocument(
    applyResumeSelectionToRawDocument(resume, firstCvSelection(resume)) ?? resume,
    ""
  );
  return (
    <section className="stack">
      <h1>{dictionary.onboarding.text["Onboarding test CV"]}</h1>
      <BasicResumeDocument locale={run.locale} resume={selected} showChrome={false} />
    </section>
  );
}
