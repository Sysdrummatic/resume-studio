# Public Route Compatibility Rollout

This guide operationalizes [ADR 0004](../../adr/0004-public-route-compatibility-policy.md) for `/r/[slug]` compatibility and deprecation.

## Canonical Rule

- Canonical public URL: `/{person-slug}/{public-id}?lang=<locale>`
- Legacy URL: `/r/[slug]` (compatibility only)

## Runtime Behavior

1. Try canonical resolution from legacy slug.
2. If found, permanent redirect to canonical path.
3. Otherwise resolve legacy compatibility payload.
4. If no active/recoverable data exists, return not-found with non-indexable metadata.

## Observability Baseline

Structured log tag: `[public-route-compat]`

Track outcomes:

- `redirected`
- `resolved_legacy`
- `not_found`

Minimum weekly dashboard:

- legacy request volume
- redirect ratio
- not-found ratio
- error ratio and p95 route time

## Deprecation Gates

Move toward deprecation only when all are true for two release windows:

1. Legacy traffic is below threshold agreed with product.
2. No error-budget regression on public CV reads.
3. SEO indexing health remains stable for canonical URLs.
4. User communication and changelog notice have been completed.

## Rollback Triggers

Rollback and keep compatibility route active when:

- canonical redirects break valid historical links,
- SEO indexing drops unexpectedly,
- route errors spike for legacy requests,
- support escalations indicate public link regressions.

## User Communication Checklist

1. Dashboard: canonical link shown as primary, legacy link labeled compatibility.
2. Release notes: deprecation window and expected behavior.
3. External support note: actions for users with old bookmarked `/r/[slug]`.
4. Final notice: explicit date for compatibility retirement after gates are met.
