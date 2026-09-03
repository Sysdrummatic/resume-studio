# ADR 0002: OpenCV YAML Public Contract And Schema Evolution

Status: Accepted

Date: 2026-05-09

Extends: [ADR 0001](0001-cv-publication-model.md)

## Context

ADR 0001 establishes that public CV rendering must read immutable publish-time snapshots. We now need a strict OpenCV YAML contract for publish, versioning, and future schema changes.

## Decision

- Public OpenCV YAML is emitted only at publish time from Saved Version selection.

> **Clarification (2026-07-16):** in the current implementation the snapshot
> rows (`resume_published_cv_locales.yaml_content`) physically store the full
> Master Resume YAML with the saved-version selection stored alongside; the
> selection is applied deterministically at read time by the shared resolver
> (`buildPublishedExportContent`/`buildPublishedResumeDocument`,
> `app/lib/published-export.ts`). The **emitted public contract** is therefore
> the selected content only — storage layout is an internal detail. See ADR
> 0008 and risk R09 in `docs/security/security-and-risk-plan.md` (private
> `OpenCiVera-Project` repo; including the residual note on storing full master
> YAML at rest).
- Each Published CV snapshot stores explicit `schema_version` and contract version.
- Historical snapshots are immutable and are never silently rewritten after schema updates.
- Any migration of historical snapshots requires explicit migration logic and test coverage.
- Public resolvers and future export/API surfaces read only Published CV snapshots, never live drafts.

## Consequences

- Stable public contract for SEO/AEO and integrations.
- Safer evolution path for OpenCV standard work.
- Higher migration/testing burden when schema changes.

## Implementation Checklist

- [x] Define OpenCV YAML public schema versioning rules.
- [x] Define compatibility policy for schema evolution and deprecations.
- [x] Add publish-time validation gates tied to schema version and contract stamping.
- [x] Add snapshot migration policy for historical versions.
- [x] Add regression tests for schema drift prevention.
