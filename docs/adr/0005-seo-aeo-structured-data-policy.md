# ADR 0005: SEO/AEO, Structured Data, Sitemap, And Robots Policy

Status: Accepted

Date: 2026-05-09

Extends: [ADR 0001](0001-cv-publication-model.md)

## Context

Public CV pages require stable indexing rules and machine-readable metadata aligned with privacy and publication state.

## Decision

- Canonical metadata derives from active Public Link (`person_slug + public_id`).
- `hreflang`/language alternates are emitted only for published locales on active links.
- `robots`:
  - active + indexable => `index,follow`
  - active + non-indexable => `noindex,nofollow`
  - missing/revoked/private => non-indexable response
- Sitemap includes only active and indexable Public Links.
- Structured data (JSON-LD) is emitted only for active public pages and snapshot-safe fields.
- `robots.txt` references the canonical sitemap endpoint.
- Compatibility `/r/[slug]` remains non-canonical and must never become sitemap source-of-truth.

## Consequences

- Stronger SEO/AEO consistency and safer indexing behavior.
- Requires ongoing contract tests and metadata QA.

## Robots Matrix

- `active + allow_indexing=true` => `index,follow`
- `active + allow_indexing=false` => `noindex,nofollow`
- `missing/revoked/private` => `noindex,nofollow` or route-level not found semantics with non-indexable metadata

## Canonical/Hreflang Contract

- Canonical URL format: `/{person-slug}/{public-id}`.
- Locale override format: `/{person-slug}/{public-id}?lang=<locale>`.
- `hreflang` alternates are emitted only from `available_locales` on active public links.
- Default locale points to canonical URL without query parameter.

## JSON-LD Scope

- Allowed fields:
  - resume name/title
  - role/job title
  - canonical URL
  - active locale
- Prohibited fields:
  - private draft state
  - admin-only metadata
  - unpublished locale content

## Implementation Checklist

- [x] Define final robots policy matrix for active/revoked/missing links.
- [x] Define canonical and hreflang generation contract.
- [x] Implement sitemap inclusion rules for indexable links only.
- [x] Define JSON-LD payload scope for public CV pages.
- [x] Add SEO/AEO contract tests and preview QA checklist.
