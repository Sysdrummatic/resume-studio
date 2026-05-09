# ADR 0003: Privacy-First Admin And Staff Data Access

Status: Proposed

Date: 2026-05-09

Extends: [ADR 0001](0001-cv-publication-model.md)

## Context

The product direction is privacy-first: admins should manage users and operations without default access to private CV content.

## Decision

- Admin and manager roles default to metadata/statistics visibility only.
- CV YAML/content remains owner-private unless a future explicit policy grants scoped access.
- Recruiter access is a separate, future model and is not inherited from staff/admin roles.
- RLS and API contracts must enforce separation between operational metadata and resume content.
- Privileged actions remain auditable.

## Consequences

- Lower privacy and compliance risk.
- Clear boundary for future recruiter workflows.
- Additional implementation effort for metadata-only admin views.

## Implementation Checklist

- [ ] Define metadata-only admin query surface.
- [ ] Audit and tighten RLS for CV content tables.
- [ ] Ensure admin dashboards do not expose YAML/content fields.
- [ ] Define recruiter access as separate scoped model.
- [ ] Add authorization regression tests for staff/admin boundaries.
