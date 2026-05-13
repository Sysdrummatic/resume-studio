import { requireStaffActor } from "../../lib/auth-server";
import { hasCapability } from "../../lib/rbac";
import { queryTable } from "../../lib/supabase-http";
import AuditLogsClient from "./audit-logs-client";

export const dynamic = "force-dynamic";

type AuditLog = {
  id: string;
  actor_user_id: string;
  action: string;
  target_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export default async function AuditLogsPage() {
  const actor = await requireStaffActor();

  if (!hasCapability(actor.role, "admin.audit.read")) {
    return null;
  }

  const logsResult = await queryTable<AuditLog>({
    table: "admin_audit_logs",
    select: "id,actor_user_id,action,target_user_id,metadata,created_at",
    accessToken: actor.accessToken,
    query: "order=created_at.desc&limit=100",
  });

  return (
    <section className="card stack">
      <header className="card-header">
        <div>
          <h1>Audit Log Explorer</h1>
          <p className="card-lead">Monitor administrative actions with metadata-only filters and inspection tools.</p>
        </div>
      </header>

      <AuditLogsClient initialLogs={logsResult.data || []} />
    </section>
  );
}
