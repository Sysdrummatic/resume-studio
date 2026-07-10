# Publication Analytics And Audit Policy

This guide operationalizes [ADR 0007](../../adr/0007-publication-analytics-and-audit-retention.md).

## Principles

- Privacy-first by default.
- Aggregates over raw content.
- Metadata-only visibility for privileged roles unless explicitly expanded by future ADR.

## Data Sources

- `resume_public_links`:
  - `view_count`
  - `is_active`
  - `status`
  - `allow_indexing`
  - `published_at`
  - `revoked_at`
- `admin_audit_logs`:
  - privileged action history
  - actor/target/action/time metadata

## Retention Windows

- Route telemetry logs: 30 days.
- Aggregated analytics series: 365 days.
- `admin_audit_logs`: 365 days minimum, 730 days target.

## RBAC Visibility Matrix

- `admin` / `manager`: full metadata analytics + audit explorer.
- `user`: own link counters only.
- `recruiter`: no admin analytics/audit access in MVP.

## Audit Explorer Contract

- Required filters:
  - actor id
  - target user id
  - action type
  - role
  - date range
- Response payloads must exclude CV YAML and draft content fields.

## Security Validation

- Confirm analytics/admin endpoints are role-gated.
- Confirm metadata-only responses for admin surfaces.
- Confirm recruiter role is not implicitly treated as admin/manager.
