import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("ADR 0007 is accepted and checklist is complete", () => {
  const adr = read("docs/adr/0007-publication-analytics-and-audit-retention.md");

  assert.equal(adr.includes("Status: Accepted"), true);
  assert.equal(adr.includes("- [x] Define analytics event/count model for Public Links."), true);
  assert.equal(adr.includes("- [x] Define retention windows for analytics and audit data."), true);
  assert.equal(adr.includes("- [x] Define role-based visibility for analytics widgets."), true);
  assert.equal(adr.includes("- [x] Add admin audit explorer/filter requirements."), true);
  assert.equal(adr.includes("- [x] Add privacy/security tests for analytics and audit access."), true);
});

test("ADR 0007 policy guide defines retention windows and RBAC visibility", () => {
  const guide = read("docs/guides/policies/publication-analytics-audit-policy.md");

  assert.equal(guide.includes("Route telemetry logs: 30 days."), true);
  assert.equal(guide.includes("Aggregated analytics series: 365 days."), true);
  assert.equal(guide.includes("admin_audit_logs"), true);
  assert.equal(guide.includes("recruiter"), true);
});

test("analytics and audit contracts stay metadata-only on admin surfaces", () => {
  const adminUsers = read("app/api/admin/users/route.ts");
  const auditRoute = read("app/api/admin/audit/route.ts");
  const auditClient = read("app/admin/audit/audit-logs-client.tsx");
  const auditWriter = read("app/lib/admin-audit.ts");

  assert.equal(adminUsers.includes("requireRequestActor({ anyCapability: \"admin.users.read\" })"), true);
  assert.equal(auditRoute.includes("requireRequestActor({ anyCapability: \"admin.audit.read\" })"), true);
  assert.equal(auditRoute.includes("actorUserId"), true);
  assert.equal(auditRoute.includes("targetUserId"), true);
  assert.equal(auditRoute.includes("actorRole"), true);
  assert.equal(auditRoute.includes("dateFrom"), true);
  assert.equal(auditRoute.includes("dateTo"), true);
  assert.equal(auditClient.includes("Action Type"), true);
  assert.equal(auditClient.includes("Actor Role"), true);
  assert.equal(auditClient.includes("Date From"), true);
  assert.equal(auditClient.includes("Date To"), true);
  assert.equal(auditClient.includes("async function loadLogs"), true);
  assert.equal(auditClient.includes("await loadLogs(buildQuery(filters));"), true);
  assert.equal(adminUsers.includes("yaml_content"), false);
  assert.equal(auditWriter.includes("table: \"admin_audit_logs\""), true);
  assert.equal(auditWriter.includes("metadata: payload.metadata ?? {}"), true);
});
