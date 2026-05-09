# ADR 0007: Publication Analytics, View Counting, And Audit Retention

Status: Proposed

Date: 2026-05-09

Extends: [ADR 0001](0001-cv-publication-model.md), [ADR 0003](0003-privacy-first-admin-access.md)

## Context

Admin and product operations need publication analytics and audit visibility without breaking privacy boundaries.

## Decision

- Analytics are privacy-first and aggregated by default.
- Public view counting is tied to active Public Links and separated from private CV content.
- Admin/manager dashboards expose metadata and trends, not raw CV YAML.
- Audit logs capture privileged operations with retention and filtering policy.
- Data retention windows for analytics/audit must be explicitly defined.

## Consequences

- Better operational visibility with controlled privacy risk.
- Requires clear storage/retention contracts and role-aware access checks.

## Implementation Checklist

- [ ] Define analytics event/count model for Public Links.
- [ ] Define retention windows for analytics and audit data.
- [ ] Define role-based visibility for analytics widgets.
- [ ] Add admin audit explorer/filter requirements.
- [ ] Add privacy/security tests for analytics and audit access.
