import { insertTable } from "./supabase-http";

type AuditPayload = {
  actorUserId: string;
  action: string;
  targetUserId?: string | null;
  targetDocumentId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function writeAdminAuditLog(payload: AuditPayload): Promise<void> {
  await insertTable({
    table: "admin_audit_logs",
    useServiceRole: true,
    values: {
      actor_user_id: payload.actorUserId,
      action: payload.action,
      target_user_id: payload.targetUserId ?? null,
      target_document_id: payload.targetDocumentId ?? null,
      metadata: payload.metadata ?? {},
    },
  });
}
