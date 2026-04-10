import { NextResponse } from "next/server";
import { getAppBaseUrl } from "../../../lib/env";
import { isValidEmailAddress } from "../../../lib/disposable-email";
import { resendVerificationEmail } from "../../../lib/supabase-http";

type ResendBody = {
  email?: string;
};

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function POST(request: Request): Promise<Response> {
  let body: ResendBody;
  try {
    body = (await request.json()) as ResendBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  if (!isValidEmailAddress(email)) {
    return NextResponse.json({ error: "Provide a valid email address." }, { status: 400 });
  }

  const emailRedirectTo = `${getAppBaseUrl()}/login?verified=1`;
  const result = await resendVerificationEmail(email, emailRedirectTo);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    message: "Verification email sent. Confirm email and sign in again.",
  });
}
