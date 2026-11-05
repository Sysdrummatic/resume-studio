/**
 * Step-up rule for staff (admin/manager): when the `staff_mfa_required` flag is
 * on, a session must carry an AAL2 token (TOTP verified) to reach any
 * `requireRequestActor` route. The flag ships OFF: enabling it before staff can
 * enroll a factor would lock every admin out (enrollment UI: TECH_DEBT.md).
 */
export function getJwtAal(accessToken: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(accessToken.split(".")[1] ?? "", "base64url").toString("utf8"));
    return typeof payload?.aal === "string" ? payload.aal : null;
  } catch {
    return null;
  }
}

export function staffMfaBlocks(input: { isStaff: boolean; required: boolean; accessToken: string }): boolean {
  return input.required && input.isStaff && getJwtAal(input.accessToken) !== "aal2";
}
