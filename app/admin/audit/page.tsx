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

type ContentSafetyFlag = {
  id: string;
  user_id: string;
  document_id: string | null;
  locale: string | null;
  rule: string;
  match_hash: string;
  source: string;
  created_at: string;
};

export default async function AuditLogsPage() {
  const actor = await requireStaffActor();

  if (!hasCapability(actor.role, "admin.audit.read")) {
    return null;
  }

  const [logsResult, contentSafetyFlagsResult] = await Promise.all([
    queryTable<AuditLog>({
      table: "admin_audit_logs",
      select: "id,actor_user_id,action,target_user_id,metadata,created_at",
      accessToken: actor.accessToken,
      query: "order=created_at.desc&limit=100",
    }),
    queryTable<ContentSafetyFlag>({
      table: "content_safety_flags",
      select: "id,user_id,document_id,locale,rule,match_hash,source,created_at",
      accessToken: actor.accessToken,
      query: "order=created_at.desc&limit=50",
    }),
  ]);

  const contentSafetyFlags = contentSafetyFlagsResult.data || [];

  return (
    <section className="stack">
      <header className="card-header">
        <div>
          <h1>Audit Log Explorer</h1>
          <p className="card-lead">Monitor administrative actions with metadata-only filters and inspection tools.</p>
        </div>
      </header>

      <AuditLogsClient initialLogs={logsResult.data || []} />

      <section className="stack">
        <header className="card-header">
          <div>
            <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Content Safety Flags</h2>
            <p className="card-lead">
              Server-side detections of likely script-injection attempts in saved CV content (see{" "}
              <code>app/lib/content-safety.ts</code>). A flag here does not mean an attack succeeded &mdash; output
              escaping and the URL protocol allowlist already prevent execution &mdash; it means a user submitted
              content matching a known injection shape and is worth reviewing. Per ADR 0003, staff see metadata only
              &mdash; the matched text itself is hashed, not stored or displayed.
            </p>
          </div>
        </header>

        <div className="table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th style={{ width: "180px" }}>Timestamp</th>
                <th>User</th>
                <th>Locale</th>
                <th>Rule</th>
                <th>Match Hash</th>
              </tr>
            </thead>
            <tbody>
              {contentSafetyFlags.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
                    No content safety flags recorded.
                  </td>
                </tr>
              ) : (
                contentSafetyFlags.map((flag) => (
                  <tr key={flag.id}>
                    <td style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                      {new Date(flag.created_at).toLocaleString()}
                    </td>
                    <td style={{ fontSize: "0.85rem" }}>{flag.user_id.slice(0, 8)}...</td>
                    <td style={{ fontSize: "0.85rem" }}>{flag.locale || "-"}</td>
                    <td>
                      <span className="resume-badge" style={{ fontWeight: 600 }}>
                        {flag.rule}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8rem", fontFamily: "monospace", wordBreak: "break-all" }}>
                      {flag.match_hash}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
