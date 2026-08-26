# ADR 0013: Semantic Public Link URL

Status: Planned

Date: 2026-06-09

Extends: [ADR 0001](0001-cv-publication-model.md)

## Context

Canonical public URLs are currently `/{person_slug}/{public_id}`, where `person_slug` is a compact
slug such as `arianaholt-a1b2c3d4` with no hyphen between first and last name. This reads poorly when
shared and does not communicate the role a published Saved Version targets.

[ADR 0001](0001-cv-publication-model.md) established the Saved Version / Published CV / Public Link
model and the `/{person-slug}/{public-id}` shape, with canonical URLs as the SEO source of truth. This
ADR refines the canonical URL contract to a semantic, snapshot-stable shape while preserving that
guarantee.

## Decision

The canonical public URL contract becomes:

```text
General:       /{name-slug}/{public_id}
Role-specific: /{name-slug}/{role-slug}/{public_id}
```

- `name-slug` is the hyphenated profile slug (for example `ariana-holt`).
- `role-slug` is a slugified snapshot of the published role.
- `public_id` remains the opaque generated identifier.

Approved decisions:

- `link_type` (`general` | `role`) is set once at the first publish of a Saved Version and is immutable.
- `role_slug` is derived from `summary[default].position` in the published YAML at publish time. It is a
  frozen snapshot and does not change when the Master CV is later edited.
- Changing the role shown in the URL requires a new Saved Version and a new Public Link.
- All existing Public Links migrate to `link_type = 'general'`; no legacy URL elements remain.
- Legacy `/{person_slug}/{public_id}` URLs issue `301` redirects to the migrated canonical URL.
- Middle name handling is out of scope for this phase.

## Domain Model Changes

### `profiles.person_slug`

The slug format changes from compact (`arianaholt-…`) to hyphenated (`ariana-holt`). Migration must be
deterministic and collision-safe, reusing the existing disambiguation strategy where a hyphenated slug
would otherwise collide.

### `resume_public_links`

Two additive columns:

- `link_type`: required, `general` | `role`, immutable after first publish.
- `role_slug`: nullable; populated only when `link_type = 'role'`.

A consistency constraint enforces that `link_type = 'role'` implies a non-null `role_slug`, and
`link_type = 'general'` implies `role_slug IS NULL`.

### Routing

A new route `app/[personSlug]/[roleSlug]/[publicId]/page.tsx` resolves the role-specific format. It
resolves the same Public Link as the general route and validates the role segment against the stored
`role_slug` snapshot; on mismatch it redirects to canonical or returns not-found with noindex.

### RPC

`publish_resume_saved_version` is extended to accept `link_type` and to derive and persist `role_slug`
server-side at publish time, keeping the snapshot authoritative.

## Migration Strategy

The migration is additive and staged:

1. Add `resume_public_links.link_type` and `role_slug` columns plus the consistency constraint.
2. Backfill all existing rows with `link_type = 'general'`, `role_slug = NULL`.
3. Migrate `profiles.person_slug` to the hyphenated format with a dry-run report and collision handling.
4. Add `301` redirects from legacy slug/URL shapes to the migrated canonical URL.
5. Add the role-specific route and snapshot validation.
6. Extend the publish RPC and the publish modal to capture the format choice before first publish.

Rollback is supported by the additive column design and redirect compatibility during early phases.

## Consequences

Positive:

- Human- and recruiter-friendly URLs.
- Optional role context surfaced directly in the URL.
- Immutable per-link semantics: shared links never silently change meaning.
- Canonical/SEO guarantees from ADR 0001/0004 preserved.

Negative:

- Requires a `profiles.person_slug` data migration with collision handling.
- Requires dual-format routing and redirect maintenance during rollout.
- Adds publish-time complexity (role slug derivation, immutable `link_type`).

## Implementation Checklist

- [ ] PR1: Migrate `profiles.person_slug` to hyphenated `name-slug` with dry-run report and collision handling.
- [ ] PR1: Add `301` redirects from legacy slug/URL shapes to the new canonical URL.
- [ ] PR1: Contract tests for slug migration determinism and redirect behavior.
- [ ] PR2: Add `resume_public_links.role_slug` and `link_type` columns plus consistency constraint.
- [ ] PR2: Add route `app/[personSlug]/[roleSlug]/[publicId]/page.tsx`.
- [ ] PR2: Validate role-specific URLs against the stored `role_slug` snapshot (redirect/404 on mismatch).
- [ ] PR3: Add general/role choice to the publish modal (first publish only; immutable afterward).
- [ ] PR3: Extend `publish_resume_saved_version` RPC to persist `link_type` and derived `role_slug`.
- [ ] PR3: Backfill existing links to `link_type = 'general'`, `role_slug = NULL`.
- [ ] PR3: Add tests for both URL formats, immutability, and redirect behavior.
- [ ] PR3: Documentation alignment across guides/README/action plan.
