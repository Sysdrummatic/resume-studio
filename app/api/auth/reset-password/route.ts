import { NextResponse } from "next/server";
import { getAppBaseUrl } from "../../../lib/env";
import { isValidEmailAddress } from "../../../lib/disposable-email";
import { sendPasswordResetEmail } from "../../../lib/supabase-http";

type ResetBody = {
  email?: string;
};

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function POST(request: Request): Promise<Response> {
  let body: ResetBody;
  try {
    body = (await request.json()) as ResetBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  if (!isValidEmailAddress(email)) {
    return NextResponse.json({ error: "Provide a valid email address." }, { status: 400 });
  }

  const redirectTo = `${getAppBaseUrl()}/login`;
  const result = await sendPasswordResetEmail(email, redirectTo);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, message: "Password reset email sent." });
}
