import { NextResponse } from "next/server";
import { writeAdminAuditLog } from "../../../lib/admin-audit";
import { requireRequestActor } from "../../../lib/auth-request";
import {
  ACCESS_RESTRICTION_REASONS,
  getAccessRestriction,
  isAllowedRestrictionReason,
  LOGIN_RESTRICTED_FLAG_KEY,
} from "../../../lib/access-restriction";
import { updateTable } from "../../../lib/supabase-http";

type UpdateRestrictionBody = {
  enabled?: boolean;
  reason?: string;
};

export async function GET(): Promise<Response> {
  const actorResult = await requireRequestActor({ anyCapability: "admin.area.access" });
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  const restriction = await getAccessRestriction();
  return NextResponse.json({
    ok: true,
    restriction,
    reasons: ACCESS_RESTRICTION_REASONS,
  });
}

export async function PATCH(request: Request): Promise<Response> {
  const actorResult = await requireRequestActor({ anyCapability: "admin.area.access" });
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  if (actorResult.actor.role !== "admin") {
    return NextResponse.json({ error: "Admin role is required." }, { status: 403 });
  }

  let body: UpdateRestrictionBody;
  try {
    body = (await request.json()) as UpdateRestrictionBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be boolean." }, { status: 400 });
  }

  if (body.enabled && !isAllowedRestrictionReason(body.reason)) {
    return NextResponse.json({ error: "Select one of the predefined restriction reasons." }, { status: 400 });
  }

  const updateResult = await updateTable({
    table: "platform_feature_flags",
    values: {
      enabled: body.enabled,
      reason: body.enabled ? body.reason : null,
      updated_at: new Date().toISOString(),
      updated_by: actorResult.actor.userId,
    },
    query: `key=eq.${LOGIN_RESTRICTED_FLAG_KEY}`,
    useServiceRole: true,
  });

  if (updateResult.error || !updateResult.data?.length) {
    return NextResponse.json({ error: updateResult.error || "Unable to update access restriction." }, { status: 500 });
  }

  await writeAdminAuditLog({
    actorUserId: actorResult.actor.userId,
    action: "platform.login_restriction_updated",
    metadata: {
      enabled: body.enabled,
      reason: body.enabled ? body.reason : null,
    },
  });

  return NextResponse.json({
    ok: true,
    restriction: {
      restricted: body.enabled,
      reason: body.enabled ? body.reason : "",
    },
  });
}
