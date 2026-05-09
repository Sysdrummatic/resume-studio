# ADR 0008: OpenCV Public API And Export Surface

Status: Proposed

Date: 2026-05-09

Extends: [ADR 0001](0001-cv-publication-model.md), [ADR 0002](0002-opencv-yaml-public-contract.md)

## Context

The long-term vision includes OpenCV-standard exchange. Public export/API boundaries need an architectural contract before broad integration.

## Decision

- Public export/API reads only Published CV snapshots.
- Draft/master/private data is never exposed through public export endpoints.
- Export contract is versioned and aligned with OpenCV YAML schema version.
- API behavior must define caching, rate limiting, and compatibility guarantees.
- Future integration endpoints must preserve canonical publication state and locale rules.

## Consequences

- Safer foundation for OpenCV ecosystem integrations.
- Additional API governance and backward compatibility responsibilities.

## Implementation Checklist

- [ ] Define public export/API endpoint surface and versioning.
- [ ] Ensure export reads only Published CV snapshots.
- [ ] Define locale selection and fallback behavior for export.
- [ ] Add rate limiting, caching, and abuse protections.
- [ ] Add contract tests for backward compatibility and access control.
