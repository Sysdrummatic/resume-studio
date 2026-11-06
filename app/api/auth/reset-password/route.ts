import { NextResponse } from "next/server";
import { getAppBaseUrl } from "../../../lib/env";
import { isValidEmailAddress } from "../../../lib/disposable-email";
import { sendPasswordResetEmail } from "../../../lib/supabase-http";
import { normalizeEmail } from "../../../lib/auth-profile";
import { enforceRateLimit } from "../../../lib/rate-limit";
import { getClientIp } from "../../../lib/client-ip";

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

  const limited = await enforceRateLimit({
    action: "reset",
    limits: [
      { dim: "ip", value: getClientIp(request.headers), interval: 900_000, limit: 10 },
      { dim: "email", value: email, interval: 900_000, limit: 3 },
    ],
    message: "Too many password reset requests. Try again later.",
  });
  if (limited) return limited;

  const redirectTo = `${getAppBaseUrl()}/login`;
  const result = await sendPasswordResetEmail(email, redirectTo);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status >= 500 ? 503 : 400 });
  }

  return NextResponse.json({ ok: true, message: "Password reset email sent." });
}
