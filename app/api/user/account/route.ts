import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearAuthCookies } from "../../../lib/auth-cookies";
import { requireRequestActor } from "../../../lib/auth-request";
import { callRpc, deleteAuthUserAsService } from "../../../lib/supabase-http";
import { sendEmail } from "../../../lib/email";

// Target account is derived exclusively from the caller's own session
// (requireRequestActor) — never from a request body field. This is the only
// guard against IDOR for a destructive, irreversible operation.
export async function DELETE(): Promise<Response> {
  const actorResult = await requireRequestActor();
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  const { userId, email, role } = actorResult.actor;

  // Backstop against a zero-admin system: the DB trigger
  // prevent_last_admin_deletion() enforces this independently of this check.
  if (role === "admin") {
    const lastAdminResult = await callRpc<boolean>({
      functionName: "is_last_admin",
      payload: { p_user_id: userId },
      accessToken: actorResult.accessToken,
    });

    if (lastAdminResult.data) {
      const onlyAccountResult = await callRpc<boolean>({
        functionName: "is_only_profile",
        payload: { p_user_id: userId },
        accessToken: actorResult.accessToken,
      });

      if (onlyAccountResult.data) {
        return NextResponse.json(
          {
            error: "only_account",
            message: "Your account is the only account in the system; deletion is blocked.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          error: "last_admin",
          message: "Promote another account to admin before deleting this one.",
        },
        { status: 409 },
      );
    }
  }

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
