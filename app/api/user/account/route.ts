import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearAuthCookies } from "../../../lib/auth-cookies";
import { requireRequestActor } from "../../../lib/auth-request";
import { deleteAuthUserAsService } from "../../../lib/supabase-http";
import { sendEmail } from "../../../lib/email";

// Target account is derived exclusively from the caller's own session
// (requireRequestActor) — never from a request body field. This is the only
// guard against IDOR for a destructive, irreversible operation.
export async function DELETE(): Promise<Response> {
  const actorResult = await requireRequestActor();
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  const { userId, email } = actorResult.actor;

  const deleteResult = await deleteAuthUserAsService(userId);
  if (deleteResult.error) {
    return NextResponse.json({ error: deleteResult.error || "Unable to delete account." }, { status: 500 });
  }

  const cookieStore = await cookies();
  clearAuthCookies(cookieStore);

  // Deletion already succeeded and cannot be rolled back at this point.
  // Email failure is reported as a warning, not an error.
  const emailResult = await sendEmail({
    to: email,
    subject: "Your OpenCiVera account has been deleted",
    html: "<p>Your OpenCiVera account and all associated CV data have been permanently deleted, as requested.</p>",
  });

  if (!emailResult.sent) {
    return NextResponse.json({ ok: true, warning: "Account deleted, but the confirmation email could not be sent." });
  }

  return NextResponse.json({ ok: true });
}
