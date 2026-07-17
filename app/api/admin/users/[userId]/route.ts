import { NextResponse } from "next/server";
import { writeAdminAuditLog } from "../../../../lib/admin-audit";
import type { AppRole } from "../../../../lib/auth-types";
import { isAppRole } from "../../../../lib/auth-types";
import { requireRequestActor } from "../../../../lib/auth-request";
import { canAssignRole, canDeleteTarget, hasCapability } from "../../../../lib/rbac";
import { callRpc, deleteAuthUserAsService, fetchProfileByIdAsService } from "../../../../lib/supabase-http";

type UpdateUserBody = {
  role?: AppRole;
  isActive?: boolean;
  isTestUser?: boolean;
  isOcvStaff?: boolean;
};

const USER_FLAG_FIELDS = [
  { bodyKey: "isTestUser", column: "is_test_user" },
  { bodyKey: "isOcvStaff", column: "is_ocv_staff" },
] as const;

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

function normalizeId(value: string): string {
  return String(value || "").trim();
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const actorResult = await requireRequestActor({ anyCapability: "admin.users.read" });
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  const { userId: rawUserId } = await context.params;
  const userId = normalizeId(rawUserId);
  if (!userId) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  let body: UpdateUserBody;
  try {
    body = (await request.json()) as UpdateUserBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const targetProfileResult = await fetchProfileByIdAsService(userId);
  if (!targetProfileResult.data || targetProfileResult.error) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  const targetProfile = targetProfileResult.data;

  if (!hasCapability(actorResult.actor.role, "admin.users.role_write") && (targetProfile.role === "admin" || targetProfile.role === "manager")) {
    return NextResponse.json({ error: "Manager cannot manage admin or manager accounts." }, { status: 403 });
  }

  if (!hasCapability(actorResult.actor.role, "admin.users.role_write") && actorResult.actor.userId === targetProfile.id) {
    return NextResponse.json({ error: "Manager cannot modify own account privileges." }, { status: 403 });
  }

  const metadata: Record<string, unknown> = {};
  let hasChanges = false;

  if (body.role !== undefined) {
    if (!isAppRole(body.role)) {
      return NextResponse.json({ error: "Invalid role value." }, { status: 400 });
    }

    const decision = canAssignRole(actorResult.actor.role, targetProfile.role, body.role);
    if (!decision.allowed) {
      return NextResponse.json({ error: decision.reason || "Role change is not allowed." }, { status: 403 });
    }

    if (body.role !== targetProfile.role) {
      hasChanges = true;
      metadata.previousRole = targetProfile.role;
      metadata.nextRole = body.role;
    }
  }

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") {
      return NextResponse.json({ error: "isActive must be boolean." }, { status: 400 });
    }
    if (body.isActive !== targetProfile.is_active) {
      hasChanges = true;
      metadata.previousIsActive = targetProfile.is_active;
      metadata.nextIsActive = body.isActive;
    }
  }

  for (const { bodyKey, column } of USER_FLAG_FIELDS) {
    const nextValue = body[bodyKey];
    if (nextValue === undefined) {
      continue;
    }
    if (typeof nextValue !== "boolean") {
      return NextResponse.json({ error: `${bodyKey} must be boolean.` }, { status: 400 });
    }
    if (nextValue !== targetProfile[column]) {
      hasChanges = true;
      metadata[`previous_${column}`] = targetProfile[column];
      metadata[`next_${column}`] = nextValue;
    }
  }

  if (!hasChanges) {
    return NextResponse.json({
      ok: true,
      message: "No changes applied.",
      user: {
        id: targetProfile.id,
        role: targetProfile.role,
        isActive: targetProfile.is_active,
        isTestUser: targetProfile.is_test_user,
        isOcvStaff: targetProfile.is_ocv_staff,
      },
    });
  }

  const updateResult = await callRpc<null>({
    functionName: "update_user_privileges",
    payload: {
      target_user_id: userId,
      next_role: body.role ?? null,
      target_is_active: body.isActive ?? null,
      target_is_test_user: body.isTestUser ?? null,
      target_is_ocv_staff: body.isOcvStaff ?? null,
    },
    accessToken: actorResult.accessToken,
  });
  if (updateResult.error) {
    return NextResponse.json({ error: updateResult.error }, { status: 403 });
  }

  const updatedProfileResult = await fetchProfileByIdAsService(userId);
  const updatedRow = updatedProfileResult.data;
  if (!updatedRow) {
    return NextResponse.json({ error: "Profile update succeeded but re-fetch failed." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: userId,
      role: String(updatedRow.role),
      isActive: Boolean(updatedRow.is_active),
      isTestUser: Boolean(updatedRow.is_test_user),
      isOcvStaff: Boolean(updatedRow.is_ocv_staff),
    },
    metadata,
  });
}

export async function DELETE(_: Request, context: RouteContext): Promise<Response> {
  const actorResult = await requireRequestActor({ anyCapability: "admin.users.read" });
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  const { userId: rawUserId } = await context.params;
  const userId = normalizeId(rawUserId);
  if (!userId) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  const targetProfileResult = await fetchProfileByIdAsService(userId);
  if (!targetProfileResult.data || targetProfileResult.error) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  const targetProfile = targetProfileResult.data;

  const canDeleteResult = await callRpc<boolean>({
    functionName: "can_delete_user_account",
    payload: { target_user_id: userId },
    accessToken: actorResult.accessToken,
  });

  if (canDeleteResult.error || !canDeleteResult.data || !canDeleteTarget(actorResult.actor.role, targetProfile.role)) {
    return NextResponse.json({ error: "You cannot delete this user." }, { status: 403 });
  }

  const deleteResult = await deleteAuthUserAsService(userId);
  if (deleteResult.error) {
    return NextResponse.json({ error: deleteResult.error || "Unable to delete user." }, { status: 500 });
  }

  await writeAdminAuditLog({
    actorUserId: actorResult.actor.userId,
    action: "user.deleted",
    targetUserId: userId,
    metadata: {
      actorRole: actorResult.actor.role,
      targetRole: targetProfile.role,
      deleted_via: "supabase_admin_api",
    },
  });

  return NextResponse.json({ ok: true });
}
