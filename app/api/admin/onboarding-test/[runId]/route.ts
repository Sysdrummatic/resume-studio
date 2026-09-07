import { NextResponse } from "next/server";
import yaml from "js-yaml";
import { requireRequestActor } from "../../../../lib/auth-request";
import { fetchOnboardingTest, onboardingTestRpc } from "../../../../lib/onboarding-test-server";
import { isTestRunId, type OnboardingTestRun } from "../../../../lib/onboarding-test";
import { firstCvSelection, isFirstCvReady, parseOnboardingProgress } from "../../../../lib/resume-onboarding";
import { normalizeResumeDocument, validateResumeDocument } from "../../../../lib/resume-schema";
import { flagSuspiciousResumeContent } from "../../../../lib/content-safety-audit";

type Context = { params: Promise<{ runId: string }> };

export async function GET(_request: Request, context: Context): Promise<Response> {
  const auth = await requireRequestActor({ acceptedRoles: ["admin"] });
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const { runId } = await context.params;
  if (!isTestRunId(runId)) return NextResponse.json({ error: "Invalid test." }, { status: 400 });
  try {
    const run = await fetchOnboardingTest(auth.accessToken, auth.actor.userId, runId);
    return NextResponse.json({ run }, { status: run ? 200 : 404 });
  } catch { return NextResponse.json({ error: "Could not load test." }, { status: 500 }); }
}

export async function PATCH(request: Request, context: Context): Promise<Response> {
  const auth = await requireRequestActor({ acceptedRoles: ["admin"] });
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const { runId } = await context.params;
  if (!isTestRunId(runId)) return NextResponse.json({ error: "Invalid test." }, { status: 400 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const payload: Record<string, unknown> = { input_run_id: runId };
  if (body && typeof body.yamlContent === "string") {
    if (!["en","pl"].includes(body.locale) || body.yamlContent.length > 250000) return NextResponse.json({ error: "Invalid draft." }, { status: 400 });
    try {
      const parsed = yaml.load(body.yamlContent);
      if (!validateResumeDocument(parsed).valid) return NextResponse.json({ error: "Invalid CV." }, { status: 400 });
      Object.assign(payload, { input_locale: body.locale, input_yaml: body.yamlContent, input_selection: firstCvSelection(parsed) });
    } catch { return NextResponse.json({ error: "Invalid YAML." }, { status: 400 }); }
  } else {
    const progress = parseOnboardingProgress(body);
    if (!progress || !["en","pl"].includes(progress.locale)) return NextResponse.json({ error: "Invalid progress." }, { status: 400 });
    payload.input_progress = progress;
  }
  try {
    const existing = await fetchOnboardingTest(auth.accessToken, auth.actor.userId, runId);
    if (!existing) return NextResponse.json({ error: "Test not found." }, { status: 404 });
    if (existing.status === "completed") {
      if (payload.input_yaml !== undefined) return NextResponse.json({ error: "This test is complete. Open account settings to start another test." }, { status: 409 });
      return NextResponse.json({ state: existing });
    }
    const run = await onboardingTestRpc<OnboardingTestRun>(auth.accessToken, "save_onboarding_test", payload);
    if (typeof payload.input_yaml === "string") {
      await flagSuspiciousResumeContent(payload.input_yaml, {
        userId: auth.actor.userId,
        locale: body.locale,
        source: "onboarding_test_save",
      });
    }
    return NextResponse.json({ state: run });
  } catch { return NextResponse.json({ error: "Could not save test. Your Master CV has not changed." }, { status: 500 }); }
}

export async function POST(request: Request, context: Context): Promise<Response> {
  const auth = await requireRequestActor({ acceptedRoles: ["admin"] });
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const { runId } = await context.params;
  if (!isTestRunId(runId)) return NextResponse.json({ error: "Invalid test." }, { status: 400 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (!body || typeof body.publish !== "boolean") return NextResponse.json({ error: "Publication choice required." }, { status: 400 });
  try {
    const run = await fetchOnboardingTest(auth.accessToken, auth.actor.userId, runId);
    if (!run) return NextResponse.json({ error: "Test not found." }, { status: 404 });
    if (body.publish && run.status !== "completed" && !isFirstCvReady(normalizeResumeDocument(yaml.load(run.drafts[run.locale] ?? ""), ""))) {
      return NextResponse.json({ error: "Add your name and professional summary." }, { status: 400 });
    }
    return NextResponse.json(await onboardingTestRpc(auth.accessToken, "finish_onboarding_test", { input_run_id: runId, input_publish: body.publish }));
  } catch { return NextResponse.json({ error: "Could not finish test. Please retry." }, { status: 500 }); }
}
