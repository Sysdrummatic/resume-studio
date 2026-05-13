"use client";

import { useState } from "react";
import { StatusToast, useStatusToast } from "../../components/status-toast";

type AuditLog = {
  id: string;
  actor_user_id: string;
  action: string;
  target_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type Props = {
  initialLogs: AuditLog[];
};

type AuditFilterState = {
  actorUserId: string;
  targetUserId: string;
  action: string;
  actorRole: string;
  dateFrom: string;
  dateTo: string;
};

const EMPTY_FILTERS: AuditFilterState = {
  actorUserId: "",
  targetUserId: "",
  action: "",
  actorRole: "",
  dateFrom: "",
  dateTo: "",
};

function buildQuery(filters: AuditFilterState): string {
  const params = new URLSearchParams();
  if (filters.actorUserId) params.set("actorUserId", filters.actorUserId);
  if (filters.targetUserId) params.set("targetUserId", filters.targetUserId);
  if (filters.action) params.set("action", filters.action);
  if (filters.actorRole) params.set("actorRole", filters.actorRole);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export default function AuditLogsClient({ initialLogs }: Props) {
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs);
  const [filters, setFilters] = useState<AuditFilterState>(EMPTY_FILTERS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast, showToast, closeToast } = useStatusToast();

  async function loadLogs(query = "") {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/audit${query}`, { method: "GET" });
      const payload = (await response.json()) as { error?: string; logs?: AuditLog[] };
      if (!response.ok || payload.error) {
        showToast(payload.error || "Failed to load audit logs.", "error");
        return;
      }

      setLogs(payload.logs || []);
      setExpandedId(null);
      closeToast();
    } catch {
      showToast("Failed to load audit logs.", "error");
    } finally {
      setIsLoading(false);
    }
  }

  async function applyFilters() {
    await loadLogs(buildQuery(filters));
  }

  function updateFilter<Key extends keyof AuditFilterState>(key: Key, value: AuditFilterState[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    void loadLogs();
  }

  return (
    <div className="stack" style={{ gap: "1.5rem" }}>
      <StatusToast toast={toast} onClose={closeToast} />

      <section className="card stack">
        <div className="section-row">
          <h2 style={{ margin: 0, fontSize: "1rem" }}>Filters</h2>
          <div className="actions-row">
            <button type="button" className="button button--ghost button--small" onClick={clearFilters} disabled={isLoading}>
              Clear
            </button>
            <button type="button" className="button button--primary button--small" onClick={() => void applyFilters()} disabled={isLoading}>
              {isLoading ? "Loading..." : "Apply"}
            </button>
          </div>
        </div>
        <div className="meta-grid">
          <label>
            Actor ID
            <input value={filters.actorUserId} onChange={(event) => updateFilter("actorUserId", event.target.value)} />
          </label>
          <label>
            Target User ID
            <input value={filters.targetUserId} onChange={(event) => updateFilter("targetUserId", event.target.value)} />
          </label>
          <label>
            Action Type
            <input value={filters.action} onChange={(event) => updateFilter("action", event.target.value)} />
          </label>
          <label>
            Actor Role
            <select value={filters.actorRole} onChange={(event) => updateFilter("actorRole", event.target.value)}>
              <option value="">Any</option>
              <option value="admin">admin</option>
              <option value="manager">manager</option>
              <option value="user">user</option>
              <option value="recruiter">recruiter</option>
            </select>
          </label>
          <label>
            Date From
            <input type="datetime-local" value={filters.dateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} />
          </label>
          <label>
            Date To
            <input type="datetime-local" value={filters.dateTo} onChange={(event) => updateFilter("dateTo", event.target.value)} />
          </label>
        </div>
      </section>

      <div className="table-wrap">
        <table className="users-table">
          <thead>
            <tr>
              <th style={{ width: "180px" }}>Timestamp</th>
              <th>Action</th>
              <th>Actor</th>
              <th>Role</th>
              <th>Target</th>
              <th style={{ textAlign: "right" }}>Metadata</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
                  No audit logs found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{new Date(log.created_at).toLocaleString()}</td>
                  <td>
                    <span className="resume-badge" style={{ fontWeight: 600 }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.85rem" }}>{log.actor_user_id.slice(0, 8)}...</td>
                  <td style={{ fontSize: "0.85rem" }}>{String(log.metadata?.actorRole || "-")}</td>
                  <td style={{ fontSize: "0.85rem" }}>{log.target_user_id ? `${log.target_user_id.slice(0, 8)}...` : "-"}</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      className="button button--ghost button--small"
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    >
                      {expandedId === log.id ? "Hide" : "Inspect"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {expandedId ? (
        <div className="card stack" style={{ background: "rgba(0,0,0,0.2)", borderStyle: "dashed" }}>
          <div className="card-header">
            <h3 style={{ margin: 0, fontSize: "1rem" }}>Log Metadata: {expandedId}</h3>
            <button className="button button--small" onClick={() => setExpandedId(null)}>
              Close
            </button>
          </div>
          <pre
            style={{
              fontSize: "0.8rem",
              overflowX: "auto",
              padding: "1rem",
              background: "var(--surface)",
              borderRadius: "8px",
              color: "var(--accent)",
            }}
          >
            {JSON.stringify(logs.find((item) => item.id === expandedId)?.metadata, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
