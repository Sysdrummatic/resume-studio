import { NextResponse } from "next/server";
import { requireRequestActor } from "../../../lib/auth-request";
import { fetchOnboardingTest, onboardingTestRpc } from "../../../lib/onboarding-test-server";
import { isTestRunId, type OnboardingTestRun } from "../../../lib/onboarding-test";

export async function GET(): Promise<Response> {
  const auth = await requireRequestActor({ acceptedRoles: ["admin"] });
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  try { return NextResponse.json({ run: await fetchOnboardingTest(auth.accessToken, auth.actor.userId) }); }
  catch { return NextResponse.json({ error: "Could not load test settings." }, { status: 500 }); }
}

export async function POST(request: Request): Promise<Response> {
  const auth = await requireRequestActor({ acceptedRoles: ["admin"] });
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (!body || !["arm","start","disarm","restart"].includes(body.action) || (body.expectedRunId != null && !isTestRunId(body.expectedRunId))) {
    return NextResponse.json({ error: "Invalid test action." }, { status: 400 });
  }
  try {
    const run = await onboardingTestRpc<OnboardingTestRun>(auth.accessToken, "configure_onboarding_test", { input_action: body.action, input_expected_run_id: body.expectedRunId ?? null });
    return NextResponse.json({ run });
  } catch { return NextResponse.json({ error: "Could not change test settings. Reload and retry." }, { status: 409 }); }
}
