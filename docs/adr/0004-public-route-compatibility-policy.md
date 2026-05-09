# ADR 0004: Public Route Compatibility And Deprecation Policy

Status: Accepted

Date: 2026-05-09

Extends: [ADR 0001](0001-cv-publication-model.md)

## Context

Canonical public URLs are now `/{person-slug}/{public-id}`. Legacy `/r/[slug]` links still exist in the wild and need controlled compatibility.

## Decision

- `/{person-slug}/{public-id}` is the only canonical public route.
- `/r/[slug]` remains a compatibility route and should redirect to canonical URL when resolvable.
- Compatibility behavior must be monitored before final deprecation.
- Removal of `/r/[slug]` requires explicit rollout gate and rollback plan.
- Legacy route telemetry is emitted as structured server logs tagged with `[public-route-compat]`.
- Deprecation requires explicit communication window and objective traffic/error thresholds.

## Consequences

- Preserves historical links while consolidating SEO on canonical URLs.
- Requires temporary dual-route maintenance.

## Compatibility Contract

1. `/r/[slug]` checks canonical `/{person-slug}/{public-id}` resolution first.
2. If canonical path exists, route issues a permanent redirect.
3. If canonical path does not exist, route tries legacy compatibility rendering.
4. If legacy data is missing/revoked, route returns not-found and noindex metadata.
5. Canonical URL remains SEO source of truth.

## Observability

- Log events for `/r/[slug]` outcomes:
  - `redirected`
  - `resolved_legacy`
  - `not_found`
- Event payload should include route tag, slug, requested locale, timestamp, and outcome.
- Weekly review metric set:
  - total legacy requests
  - redirect ratio
  - not-found ratio
  - p95 resolution latency for compatibility path

## Deprecation Gates

All gates must be green for 2 consecutive release windows:

1. Legacy traffic below agreed threshold (for example `<5%` of all public CV traffic).
2. `not_found` ratio for legacy route stable and non-increasing.
3. Canonical route error budget unchanged after redirect policy.
4. Support window communication completed and acknowledged in docs/changelog.

## Rollback Criteria

Rollback to compatibility-first behavior is required if any condition is met:

1. Canonical resolution regression causes broken public links.
2. Significant SEO indexing regressions after deprecation rollout.
3. Elevated public route errors tied to redirect or slug resolution.
4. Critical customer reports for historical links.

Rollback path:

- Keep `/r/[slug]` route active.
- Re-enable compatibility render fallback without forced deprecation behavior.
- Pause cleanup migrations touching legacy slug semantics.

## Communication Plan

1. Announce compatibility route sunset window and canonical URL standard.
2. Update dashboard copy to show canonical URL as primary and `/r/[slug]` as legacy.
3. Publish migration note for recruiters/users who bookmarked legacy links.
4. Publish final deprecation confirmation only after gates are green.

## Implementation Checklist

- [x] Define compatibility redirect behavior for `/r/[slug]`.
- [x] Add observability for legacy route traffic and errors.
- [x] Define deprecation gates and rollback criteria.
- [x] Add compatibility regression tests for legacy links.
- [x] Publish migration communication plan for users.
