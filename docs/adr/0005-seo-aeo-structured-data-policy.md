# ADR 0005: SEO/AEO, Structured Data, Sitemap, And Robots Policy

Status: Proposed

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

## Consequences

- Stronger SEO/AEO consistency and safer indexing behavior.
- Requires ongoing contract tests and metadata QA.

## Implementation Checklist

- [ ] Define final robots policy matrix for active/revoked/missing links.
- [ ] Define canonical and hreflang generation contract.
- [ ] Implement sitemap inclusion rules for indexable links only.
- [ ] Define JSON-LD payload scope for public CV pages.
- [ ] Add SEO/AEO contract tests and preview QA checklist.
