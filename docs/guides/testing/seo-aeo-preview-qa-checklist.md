# SEO/AEO Preview QA Checklist

Use this checklist before shipping public CV SEO/AEO changes.

## Metadata Contract

- [ ] Canonical URL is `/{person-slug}/{public-id}`.
- [ ] `?lang=` is used only for non-default locales.
- [ ] `hreflang` alternates match `available_locales`.
- [ ] Robots are `index,follow` only when link is active and indexable.
- [ ] Missing or revoked links return non-indexable metadata.

## Sitemap Contract

- [ ] `sitemap.xml` includes only active + indexable Public Links.
- [ ] Each sitemap entry uses canonical URL as primary.
- [ ] Alternate locale URLs are emitted only for published locales.
- [ ] Revoked/inactive links are absent from sitemap.

## Structured Data Contract

- [ ] JSON-LD is emitted only for active/indexable public pages.
- [ ] JSON-LD includes snapshot-safe fields only.
- [ ] JSON-LD does not expose draft/private/admin-only fields.

## Compatibility Safety

- [ ] `/r/[slug]` never appears as canonical URL.
- [ ] `/r/[slug]` behavior remains compatibility-only and covered by regression tests.
