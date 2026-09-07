import { NextResponse } from "next/server";
import { requireRequestActor } from "../../../lib/auth-request";
import { parseOnboardingProgress } from "../../../lib/resume-onboarding";
import {
  completeOnboarding,
  fetchOnboarding,
  updateOnboarding
} from "../../../lib/resume-onboarding-server";

export async function PATCH(request: Request): Promise<Response> {
  const auth = await requireRequestActor({ anyCapability: "resume.document.write_own" });
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const progress = parseOnboardingProgress(body);
  if (!progress) return NextResponse.json({ error: "Invalid progress." }, { status: 400 });
  try {
    const state = await fetchOnboarding(auth.accessToken, auth.actor.userId);
    if (!state) return NextResponse.json({ error: "Guide is unavailable." }, { status: 409 });
    if (state.status === "completed") return NextResponse.json({ state });
    if (state.first_preset_id && progress.locale !== state.locale)
      return NextResponse.json(
        { error: "Finish creating your first CV in the selected language." },
        { status: 409 }
      );
    return NextResponse.json({
      state: await updateOnboarding(auth.accessToken, auth.actor.userId, progress)
    });
  } catch {
    return NextResponse.json({ error: "Could not save progress. Please retry." }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  const auth = await requireRequestActor({
    allCapabilities: [
      "resume.document.write_own",
      "resume.preset.write_own",
      "resume.preset.publish_own"
    ]
  });
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (
    !body ||
    typeof body !== "object" ||
    !("publish" in body) ||
    typeof body.publish !== "boolean"
  ) {
    return NextResponse.json({ error: "Choose whether to publish." }, { status: 400 });
  }
  try {
    return NextResponse.json(
      await completeOnboarding(auth.accessToken, auth.actor.userId, body.publish)
    );
  } catch {
    return NextResponse.json(
      { error: "Could not finish. Your saved data is safe; please retry." },
      { status: 500 }
    );
  }
}
