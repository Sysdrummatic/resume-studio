import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearAuthCookies, readAuthTokens } from "../../../lib/auth-cookies";
import { signOut } from "../../../lib/supabase-http";

export async function POST(): Promise<Response> {
  const cookieStore = await cookies();
  const { accessToken } = readAuthTokens(cookieStore);

  if (accessToken) {
    await signOut(accessToken);
  }

  clearAuthCookies(cookieStore);
  return NextResponse.json({ ok: true });
}
