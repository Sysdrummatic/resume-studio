import { NextRequest, NextResponse } from "next/server";
import { requireRequestActor } from "../../../lib/auth-request";
import { queryTable } from "../../../lib/supabase-http";

export const dynamic = "force-dynamic";

type AuditLog = {
  id: string;
  actor_user_id: string;
  action: string;
  target_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

function trimFilter(value: string | null): string | null {
  const normalized = String(value || "").trim();
  return normalized || null;
}

export async function GET(request: NextRequest) {
  const actorResult = await requireRequestActor({ anyCapability: "admin.audit.read" });
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  const searchParams = request.nextUrl.searchParams;
  const actorUserId = trimFilter(searchParams.get("actorUserId"));
  const targetUserId = trimFilter(searchParams.get("targetUserId"));
  const action = trimFilter(searchParams.get("action"));
  const actorRole = trimFilter(searchParams.get("actorRole"));
  const dateFrom = trimFilter(searchParams.get("dateFrom"));
  const dateTo = trimFilter(searchParams.get("dateTo"));

  const queryParts = ["order=created_at.desc", "limit=250"];
  if (actorUserId) queryParts.push(`actor_user_id=eq.${encodeURIComponent(actorUserId)}`);
  if (targetUserId) queryParts.push(`target_user_id=eq.${encodeURIComponent(targetUserId)}`);
  if (action) queryParts.push(`action=eq.${encodeURIComponent(action)}`);
  if (dateFrom) queryParts.push(`created_at=gte.${encodeURIComponent(dateFrom)}`);
  if (dateTo) queryParts.push(`created_at=lte.${encodeURIComponent(dateTo)}`);

  const logsResult = await queryTable<AuditLog>({
    table: "admin_audit_logs",
    select: "id,actor_user_id,action,target_user_id,metadata,created_at",
    accessToken: actorResult.accessToken,
    query: queryParts.join("&"),
  });

  if (!logsResult.data || logsResult.error) {
    return NextResponse.json({ error: logsResult.error || "Unable to load audit logs." }, { status: 500 });
  }

  const logs = actorRole
    ? logsResult.data.filter((log) => String(log.metadata?.actorRole || "").trim().toLowerCase() === actorRole.toLowerCase())
    : logsResult.data;

  return NextResponse.json({
    ok: true,
    logs,
    filters: {
      actorUserId,
      targetUserId,
      action,
      actorRole,
      dateFrom,
      dateTo,
    },
  });
}
