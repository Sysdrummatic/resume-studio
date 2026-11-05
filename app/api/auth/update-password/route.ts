import { NextResponse } from "next/server";
import { updateUserPassword } from "../../../lib/supabase-http";
import { enforceRateLimit } from "../../../lib/rate-limit";
import { getClientIp } from "../../../lib/client-ip";
import { NEW_PASSWORD_MIN_LENGTH } from "../../../lib/auth-policy";

type UpdatePasswordBody = {
  accessToken?: string;
  password?: string;
};

export async function POST(request: Request): Promise<Response> {
  const limited = await enforceRateLimit({
    action: "update-password",
    limits: [{ dim: "ip", value: getClientIp(request.headers), interval: 900_000, limit: 10 }],
  });
  if (limited) return limited;

  let body: UpdatePasswordBody;
  try {
    body = (await request.json()) as UpdatePasswordBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const accessToken = typeof body.accessToken === "string" ? body.accessToken.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!accessToken) {
    return NextResponse.json({ error: "Missing recovery token." }, { status: 400 });
  }

  if (password.length < NEW_PASSWORD_MIN_LENGTH) {
    return NextResponse.json(
      { error: `Use a password with at least ${NEW_PASSWORD_MIN_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const result = await updateUserPassword(accessToken, password);
  if (result.error) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status >= 500 ? 503 : 400 },
    );
  }

  return NextResponse.json({ ok: true, message: "Password updated. You can sign in now." });
}
