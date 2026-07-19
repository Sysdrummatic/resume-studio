import { NextResponse } from "next/server";
import { getAppBaseUrl } from "../../../lib/env";
import { isDisposableEmailAddress, isValidEmailAddress } from "../../../lib/disposable-email";
import { signUpWithPassword } from "../../../lib/supabase-http";
import { normalizeEmail } from "../../../lib/auth-profile";
import { getAccessRestriction } from "../../../lib/access-restriction";

type SignUpBody = {
  email?: string;
  password?: string;
  wantsBetaTestUser?: boolean;
};

export async function POST(request: Request): Promise<Response> {
  const restriction = await getAccessRestriction();
  if (restriction.restricted) {
    return NextResponse.json({ error: restriction.reason }, { status: 403 });
  }

  let body: SignUpBody;
  try {
    body = (await request.json()) as SignUpBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  const wantsBetaTestUser = body.wantsBetaTestUser === true;

  if (!isValidEmailAddress(email)) {
    return NextResponse.json({ error: "Provide a valid email address." }, { status: 400 });
  }

  if (password.length < 10) {
    return NextResponse.json({ error: "Use a password with at least 10 characters." }, { status: 400 });
  }

  const isDisposable = await isDisposableEmailAddress(email);
  if (isDisposable) {
    return NextResponse.json(
      { error: "Disposable email addresses are blocked. Use a permanent address." },
      { status: 400 },
    );
  }

  const emailRedirectTo = `${getAppBaseUrl()}/login?verified=1`;
  const signUpResult = await signUpWithPassword(email, password, emailRedirectTo, wantsBetaTestUser);
  if (!signUpResult.data || signUpResult.error) {
    return NextResponse.json(
      { error: signUpResult.error || "Sign up failed." },
      { status: signUpResult.status >= 500 ? 503 : 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Account created. Check your inbox and verify email before sign in.",
  });
}
