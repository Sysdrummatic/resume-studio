import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidEmailAddress } from "../../../lib/disposable-email";
import { setAuthCookies } from "../../../lib/auth-cookies";
import { fetchProfileById, fetchProfileByIdAsService, signInWithPassword, signOut } from "../../../lib/supabase-http";
import { normalizeEmail } from "../../../lib/auth-profile";
import { getAccessRestriction } from "../../../lib/access-restriction";
import { isStaffRole } from "../../../lib/rbac";
import { rateLimit } from "../../../lib/rate-limit";

function tooManyRequests(reset: number): Response {
  return NextResponse.json(
    { error: "Too many sign-in attempts. Try again shortly." },
    { status: 429, headers: { "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString() } },
  );
}

type SignInBody = {
  email?: string;
  password?: string;
};

function mapUpstreamStatus(status: number): number {
  return status >= 500 ? 503 : 400;
}

async function resolveProfileForSignIn(userId: string, accessToken: string) {
  const profileResult = await fetchProfileById(userId, accessToken);
  if (profileResult.data || profileResult.status < 500) {
    return profileResult;
  }

  const fallbackResult = await fetchProfileByIdAsService(userId);
  if (fallbackResult.data) {
    return fallbackResult;
  }

  return profileResult;
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

  // Deliberately looser than NEW_PASSWORD_MIN_LENGTH (app/lib/auth-policy.ts):
  // this checks an EXISTING password before attempting auth, not a new one.
  // Accounts created before the policy was raised may have shorter (still
  // valid) passwords — matching the new-password minimum here would reject
  // their real password before it ever reaches Supabase.
  if (!isValidEmailAddress(email) || password.length < 8) {
    return NextResponse.json(
      { error: "Provide a valid email and password (minimum 8 characters)." },
      { status: 400 },
    );
  }

  const ip = request.headers.get("x-forwarded-for") || "anonymous";
  // Dual-key: per-IP catches distributed guessing across accounts, per-email
  // catches credential stuffing/brute force concentrated on one account.
  const ipLimit = await rateLimit(`signin-ip:${ip}`, { interval: 60000, limit: 20 });
  if (!ipLimit.success) return tooManyRequests(ipLimit.reset);
  const emailLimit = await rateLimit(`signin-email:${email}`, { interval: 60000, limit: 5 });
  if (!emailLimit.success) return tooManyRequests(emailLimit.reset);

  try {
    const authResult = await signInWithPassword(email, password);
    if (!authResult.data || authResult.error) {
      const isInvalidCredentials = /invalid login credentials/i.test(authResult.error || "");
      return NextResponse.json(
        {
          error: isInvalidCredentials
            ? "Invalid login credentials. Confirm email and password, then try again."
            : authResult.error || "Sign in failed.",
        },
        { status: isInvalidCredentials ? 401 : mapUpstreamStatus(authResult.status) },
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

    const profileResult = await resolveProfileForSignIn(user.id, session.access_token);
    if (!profileResult.data || profileResult.error) {
      await signOut(session.access_token);
      const status = profileResult.status >= 500 ? 503 : 403;
      return NextResponse.json(
        {
          error:
            status === 503
              ? "Authentication service is temporarily unavailable. Try again."
              : "Profile not found. Contact support.",
        },
        { status },
      );
    }

    if (!profileResult.data.is_active) {
      await signOut(session.access_token);
      return NextResponse.json({ error: "Your account is inactive. Contact support." }, { status: 403 });
    }

    // Beta test mode: staff can always sign in so an admin can lift the restriction.
    if (!isStaffRole(profileResult.data.role)) {
      const restriction = await getAccessRestriction();
      if (restriction.restricted) {
        await signOut(session.access_token);
        return NextResponse.json({ error: restriction.reason }, { status: 403 });
      }
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
  } catch (err) {
    console.error("[signin] Unhandled error during sign-in:", err);
    return NextResponse.json(
      {
        error: "Authentication service is temporarily unavailable. Try again.",
      },
      { status: 503 },
    );
  }
}
