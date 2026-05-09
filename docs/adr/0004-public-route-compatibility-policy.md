# ADR 0004: Public Route Compatibility And Deprecation Policy

Status: Proposed

Date: 2026-05-09

Extends: [ADR 0001](0001-cv-publication-model.md)

## Context

Canonical public URLs are now `/{person-slug}/{public-id}`. Legacy `/r/[slug]` links still exist in the wild and need controlled compatibility.

## Decision

- `/{person-slug}/{public-id}` is the only canonical public route.
- `/r/[slug]` remains a compatibility route and should redirect to canonical URL when resolvable.
- Compatibility behavior must be monitored before final deprecation.
- Removal of `/r/[slug]` requires explicit rollout gate and rollback plan.

## Consequences

- Preserves historical links while consolidating SEO on canonical URLs.
- Requires temporary dual-route maintenance.

## Implementation Checklist

- [ ] Define compatibility redirect behavior for `/r/[slug]`.
- [ ] Add observability for legacy route traffic and errors.
- [ ] Define deprecation gates and rollback criteria.
- [ ] Add compatibility regression tests for legacy links.
- [ ] Publish migration communication plan for users.
