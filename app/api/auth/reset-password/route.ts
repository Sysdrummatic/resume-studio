import { NextResponse } from "next/server";
import { getAppBaseUrl } from "../../../lib/env";
import { isValidEmailAddress } from "../../../lib/disposable-email";
import { sendPasswordResetEmail } from "../../../lib/supabase-http";
import { normalizeEmail } from "../../../lib/auth-profile";
import { rateLimit } from "../../../lib/rate-limit";

type ResetBody = {
  email?: string;
};

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

  const ip = request.headers.get("x-forwarded-for") || "anonymous";
  const ipLimit = await rateLimit(`reset-ip:${ip}`, { interval: 900000, limit: 10 });
  const emailLimit = await rateLimit(`reset-email:${email}`, { interval: 900000, limit: 3 });
  if (!ipLimit.success || !emailLimit.success) {
    const reset = Math.max(ipLimit.reset, emailLimit.reset);
    return NextResponse.json(
      { error: "Too many password reset requests. Try again later." },
      { status: 429, headers: { "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString() } },
    );
  }

  const redirectTo = `${getAppBaseUrl()}/login`;
  const result = await sendPasswordResetEmail(email, redirectTo);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status >= 500 ? 503 : 400 });
  }

  return NextResponse.json({ ok: true, message: "Password reset email sent." });
}
