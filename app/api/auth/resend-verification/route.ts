import { NextResponse } from "next/server";
import { getAppBaseUrl } from "../../../lib/env";
import { isValidEmailAddress } from "../../../lib/disposable-email";
import { resendVerificationEmail } from "../../../lib/supabase-http";
import { normalizeEmail } from "../../../lib/auth-profile";
import { enforceRateLimit } from "../../../lib/rate-limit";
import { getClientIp } from "../../../lib/client-ip";

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

  const limited = await enforceRateLimit({
    action: "resend",
    limits: [
      { dim: "ip", value: getClientIp(request.headers), interval: 900_000, limit: 10 },
      { dim: "email", value: email, interval: 900_000, limit: 3 },
    ],
    message: "Too many verification email requests. Try again later.",
  });
  if (limited) return limited;

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
