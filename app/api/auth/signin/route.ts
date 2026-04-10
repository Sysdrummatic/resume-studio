import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidEmailAddress } from "../../../lib/disposable-email";
import { setAuthCookies } from "../../../lib/auth-cookies";
import { fetchProfileById, signInWithPassword, signOut } from "../../../lib/supabase-http";

type SignInBody = {
  email?: string;
  password?: string;
};

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function POST(request: Request): Promise<Response> {
  let body: SignInBody;
  try {
    body = (await request.json()) as SignInBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";

  if (!isValidEmailAddress(email) || password.length < 8) {
    return NextResponse.json(
      { error: "Provide a valid email and password (minimum 8 characters)." },
      { status: 400 },
    );
  }

  const authResult = await signInWithPassword(email, password);
  if (!authResult.data || authResult.error) {
    const isInvalidCredentials = /invalid login credentials/i.test(authResult.error || "");
    return NextResponse.json(
      {
        error: isInvalidCredentials
          ? "Invalid login credentials. Confirm email and password, then try again."
          : authResult.error || "Sign in failed.",
      },
      { status: isInvalidCredentials ? 401 : 400 },
    );
  }

  const session = authResult.data;
  const user = session.user;
  if (!user?.id) {
    return NextResponse.json({ error: "Sign in failed. Missing user context." }, { status: 400 });
  }

  if (!user.email_confirmed_at) {
    await signOut(session.access_token);
    return NextResponse.json({ error: "Email verification is required before sign in." }, { status: 403 });
  }

  const profileResult = await fetchProfileById(user.id, session.access_token);
  if (!profileResult.data || profileResult.error) {
    await signOut(session.access_token);
    return NextResponse.json({ error: "Profile not found. Contact support." }, { status: 403 });
  }

  if (!profileResult.data.is_active) {
    await signOut(session.access_token);
    return NextResponse.json({ error: "Your account is inactive. Contact support." }, { status: 403 });
  }

  const cookieStore = await cookies();
  setAuthCookies(cookieStore, session);

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email ?? email,
      role: profileResult.data.role,
      isActive: profileResult.data.is_active,
      emailConfirmed: true,
    },
  });
}
