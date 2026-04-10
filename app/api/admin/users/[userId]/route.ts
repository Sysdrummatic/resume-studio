import { NextResponse } from "next/server";
import { writeAdminAuditLog } from "../../../../lib/admin-audit";
import type { AppRole } from "../../../../lib/auth-types";
import { isAppRole } from "../../../../lib/auth-types";
import { requireRequestActor } from "../../../../lib/auth-request";
import { canAssignRole, canDeleteTarget } from "../../../../lib/rbac";
import { callRpc, deleteAuthUserAsService, fetchProfileByIdAsService } from "../../../../lib/supabase-http";

type UpdateUserBody = {
  role?: AppRole;
  isActive?: boolean;
};

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

function normalizeId(value: string): string {
  return String(value || "").trim();
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const actorResult = await requireRequestActor(["admin", "manager"]);
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

  if (actorResult.actor.role === "manager" && (targetProfile.role === "admin" || targetProfile.role === "manager")) {
    return NextResponse.json({ error: "Manager cannot manage admin or manager accounts." }, { status: 403 });
  }

  if (actorResult.actor.role === "manager" && actorResult.actor.userId === targetProfile.id) {
    return NextResponse.json({ error: "Manager cannot modify own account privileges." }, { status: 403 });
  }

  const metadata: Record<string, unknown> = {};
  const updates: Array<Promise<{ error: string | null }>> = [];

  if (body.role !== undefined) {
    if (!isAppRole(body.role)) {
      return NextResponse.json({ error: "Invalid role value." }, { status: 400 });
    }

    const decision = canAssignRole(actorResult.actor.role, targetProfile.role, body.role);
    if (!decision.allowed) {
      return NextResponse.json({ error: decision.reason || "Role change is not allowed." }, { status: 403 });
    }

    if (body.role !== targetProfile.role) {
      updates.push(
        callRpc<null>({
          functionName: "set_user_role",
          payload: {
            target_user_id: userId,
            next_role: body.role,
          },
          accessToken: actorResult.accessToken,
        }),
      );
      metadata.previousRole = targetProfile.role;
      metadata.nextRole = body.role;
    }
  }

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") {
      return NextResponse.json({ error: "isActive must be boolean." }, { status: 400 });
    }
    if (body.isActive !== targetProfile.is_active) {
      updates.push(
        callRpc<null>({
          functionName: "set_user_active",
          payload: {
            target_user_id: userId,
            target_is_active: body.isActive,
          },
          accessToken: actorResult.accessToken,
        }),
      );
      metadata.previousIsActive = targetProfile.is_active;
      metadata.nextIsActive = body.isActive;
    }
  }

  if (updates.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "No changes applied.",
      user: {
        id: targetProfile.id,
        role: targetProfile.role,
        isActive: targetProfile.is_active,
      },
    });
  }

  const execution = await Promise.all(updates);
  const firstError = execution.find((result) => result.error)?.error;
  if (firstError) {
    return NextResponse.json({ error: firstError }, { status: 403 });
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
    },
    metadata,
  });
}

export async function DELETE(_: Request, context: RouteContext): Promise<Response> {
  const actorResult = await requireRequestActor(["admin", "manager"]);
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
