# ADR 0007: Publication Analytics, View Counting, And Audit Retention

Status: Accepted

Date: 2026-05-09

Extends: [ADR 0001](0001-cv-publication-model.md), [ADR 0003](0003-privacy-first-admin-access.md)

## Context

Admin and product operations need publication analytics and audit visibility without breaking privacy boundaries.

## Decision

- Analytics are privacy-first and aggregated by default.
- Public view counting is tied to active Public Links and separated from private CV content.
- Admin/manager dashboards expose metadata and trends, not raw CV YAML.
- Audit logs capture privileged operations with retention and filtering policy.
- Data retention windows for analytics/audit are explicitly defined.

## Analytics Model

- Primary source: `resume_public_links.view_count` and publication metadata (`status`, `is_active`, `allow_indexing`, `published_at`, `revoked_at`).
- Public view metrics are link-scoped, not content-scoped:
  - canonical views,
  - compatibility-route views,
  - total active-link views.
- Analytics surfaces must avoid YAML/body fields and show only aggregate counters, trend series, and identifiers required for operations.

## Retention Policy

- Raw compatibility/public route telemetry logs: 30 days.
- Daily aggregated publication analytics: 365 days.
- `admin_audit_logs`: minimum 365 days, target 730 days for compliance and incident response.
- Any retention extension must be explicit and documented before rollout.

## Role Visibility

- `admin`, `manager`:
  - platform-level aggregates,
  - user-level metadata trends,
  - audit explorer access.
- `user`:
  - own Saved Version/Public Link counters only.
- `recruiter`:
  - no ambient analytics/admin visibility in MVP.
  - future recruiter analytics requires separate consent-based ADR.

## Audit Explorer Requirements

- Filterable by:
  - actor role,
  - actor id,
  - target user id,
  - action type,
  - time range.
- Export and bulk read must remain metadata-only.
- CV YAML/content fields are never included in audit explorer payloads.

## Security/Privacy Requirements

- Analytics queries must not expose private drafts or CV YAML.
- Admin metadata endpoints must remain role-gated through existing RBAC.
- Service-role jobs that generate aggregates must emit only non-sensitive fields.

## Consequences

- Better operational visibility with controlled privacy risk.
- Requires clear storage/retention contracts and role-aware access checks.

## Implementation Checklist

- [x] Define analytics event/count model for Public Links.
- [x] Define retention windows for analytics and audit data.
- [x] Define role-based visibility for analytics widgets.
- [x] Add admin audit explorer/filter requirements.
- [x] Add privacy/security tests for analytics and audit access.
