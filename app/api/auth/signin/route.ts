import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidEmailAddress } from "../../../lib/disposable-email";
import { setAuthCookies } from "../../../lib/auth-cookies";
import { getSupabaseProjectRef } from "../../../lib/env";
import {
  fetchAuthUserByEmailAsService,
  fetchProfileById,
  fetchProfileByIdAsService,
  signInWithPassword,
  signOut,
} from "../../../lib/supabase-http";

type SignInBody = {
  email?: string;
  password?: string;
};

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function mapUpstreamStatus(status: number): number {
  return status >= 500 ? 503 : 400;
}

function buildInvalidCredentialsMessage(projectRef: string): string {
  return (
    "Invalid login credentials. Verify email/password, and if this account used to work run Reset password. " +
    `Auth project: ${projectRef}.`
  );
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

  if (!isValidEmailAddress(email) || password.length < 8) {
    return NextResponse.json(
      { error: "Provide a valid email and password (minimum 8 characters)." },
      { status: 400 },
    );
  }

  try {
    const projectRef = getSupabaseProjectRef();
    const authResult = await signInWithPassword(email, password);
    if (!authResult.data || authResult.error) {
      const isInvalidCredentials = /invalid login credentials/i.test(authResult.error || "");
      if (isInvalidCredentials) {
        const authUserResult = await fetchAuthUserByEmailAsService(email);
        if (authUserResult.data?.email_confirmed_at == null) {
          return NextResponse.json(
            { error: "Email verification is required before sign in." },
            { status: 403 },
          );
        }

        console.warn("[signin] Invalid credentials diagnostic", {
          email,
          projectRef,
          authUserExists: Boolean(authUserResult.data),
          authUserLookupError: authUserResult.error,
          status: authUserResult.status,
        });
      }

      return NextResponse.json(
        {
          error: isInvalidCredentials
            ? buildInvalidCredentialsMessage(projectRef)
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
