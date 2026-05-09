# ADR 0002: OpenCV YAML Public Contract And Schema Evolution

Status: Proposed

Date: 2026-05-09

Extends: [ADR 0001](0001-cv-publication-model.md)

## Context

ADR 0001 establishes that public CV rendering must read immutable publish-time snapshots. We now need a strict OpenCV YAML contract for publish, versioning, and future schema changes.

## Decision

- Public OpenCV YAML is emitted only at publish time from Saved Version selection.
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
