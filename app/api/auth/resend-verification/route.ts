import { NextResponse } from "next/server";
import { getAppBaseUrl } from "../../../lib/env";
import { isValidEmailAddress } from "../../../lib/disposable-email";
import { resendVerificationEmail } from "../../../lib/supabase-http";
import { normalizeEmail } from "../../../lib/auth-profile";
import { rateLimit } from "../../../lib/rate-limit";

type ResendBody = {
  email?: string;
};

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

  const ip = request.headers.get("x-forwarded-for") || "anonymous";
  const ipLimit = await rateLimit(`resend-ip:${ip}`, { interval: 900000, limit: 10 });
  const emailLimit = await rateLimit(`resend-email:${email}`, { interval: 900000, limit: 3 });
  if (!ipLimit.success || !emailLimit.success) {
    const reset = Math.max(ipLimit.reset, emailLimit.reset);
    return NextResponse.json(
      { error: "Too many verification email requests. Try again later." },
      { status: 429, headers: { "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString() } },
    );
  }

  const emailRedirectTo = `${getAppBaseUrl()}/login?verified=1`;
  const result = await resendVerificationEmail(email, emailRedirectTo);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status >= 500 ? 503 : 400 });
  }

  return NextResponse.json({
    ok: true,
    message: "Verification email sent. Confirm email and sign in again.",
  });
}
