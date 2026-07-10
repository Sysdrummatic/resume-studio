# ADR 0001: CV Publication Model

Status: Accepted

Date: 2026-05-08

## Context

OpenCiVera is moving toward a product model where a user creates one private Master CV, saves tailored versions for specific roles or companies, and publishes selected versions through stable public URLs.

The current implementation already supports parts of this flow, but the domain model is mixed:

- `resume_documents` stores editable YAML content.
- `resume_revisions` stores document revision history.
- `resume_presets` currently represents a tailored CV configuration, but also carries public URL state such as `slug`, `is_public`, and `allow_indexing`.
- `app/r/[slug]/page.tsx` renders public CVs through `resume_presets.slug`.
- `resume_public_links` exists in the older YAML-first data model, but is not the current source of truth for the Next.js public route.

This mixes private saved work, public identity, and published content. It also makes unpublish/republish, SEO/AEO, privacy, language handling, and OpenCV YAML versioning harder to reason about.

## Decision

OpenCiVera will use three separate domain concepts for CV publication:

- `Saved Version`: the private, editable CV version owned by a user. This is the product name for the current preset concept. It has no public URL by itself and is never resolved directly by anonymous public routes.
- `Published CV`: an immutable publish-time snapshot of a Saved Version. It contains validated OpenCV YAML, schema version, selected content, locale data, publish metadata, and the data needed to render the public CV.
- `Public Link`: the public URL identity and publication control record. It owns `person_slug`, `public_id`, active/revoked state, indexing opt-in, canonical URL semantics, view counters, and the pointer to the active Published CV snapshot.

The target public URL shape is:

```text
/{person-slug}/{public-id}?lang=pl
```

`person-slug` comes from the user's profile. `public-id` is generated on publish. `?lang=<locale>` selects a published language variant for that public link.

The existing `/r/[slug]` route becomes a compatibility route during migration. It must not remain the canonical public URL model.

## Domain Model

### Master CV

The full private source of truth for a user's CV information. In the current implementation, this is represented by `resume_documents` per locale.

### Language Version

A locale-specific Master CV document, for example `en` or `pl`. Saved Versions can choose which Language Versions they publish.

### Saved Version

A private tailored CV configuration. It can be edited, deleted, and kept unpublished. It may select sections, projects, skills, experience, and available Language Versions from the Master CV.

Saved Version replaces "preset" as the product/domain term. Existing implementation can keep `resume_presets` internally during migration, but UI and new docs should move toward Saved Version.

### Published CV

An immutable snapshot created by Publish. Public rendering must read Published CV snapshot data, not the current editable Saved Version or current Master CV draft.

Publishing creates the public OpenCV YAML contract for the selected languages. Later draft edits must not change an already published CV until the user publishes again.

### Public Link

The canonical public publication record. It maps `person_slug + public_id` to the active Published CV snapshot and stores publication state such as:

- active or revoked status;
- user indexing opt-in;
- default locale;
- available published locales;
- created/published/revoked timestamps;
- view counts and future analytics metadata.

Unpublish deactivates the Public Link but does not delete the Saved Version. Republish after unpublish creates a new `public-id`.

### OpenCV YAML

OpenCV YAML is the versioned public data contract created at Publish time. It must include a schema version and be stable for a Published CV snapshot. Changes to the YAML contract must not mutate historical snapshots without an explicit migration.

## Lifecycle

1. A user creates or edits the private Master CV.
2. A user creates a private Saved Version by selecting data from the Master CV.
3. A user chooses the Saved Version language set from available Language Versions.
4. A user chooses whether the public CV should be indexable.
5. Publish validates the selected data and languages, creates Published CV snapshot data, generates a new `public-id`, and creates or updates the active Public Link.
6. Public rendering resolves `/{person-slug}/{public-id}?lang=<locale>` through Public Link and reads only the active Published CV snapshot.
7. Unpublish revokes the Public Link and keeps the Saved Version private.
8. Republish after unpublish creates a new Public Link `public-id`.
9. Delete removes a private Saved Version or requires unpublish/revoke first for a published one. Historical publication records should remain available for audit metadata, not public content.

## API Consequences

Future implementation should move toward these API boundaries:

- `POST /api/resume/saved-versions`
- `PATCH /api/resume/saved-versions/:id`
- `DELETE /api/resume/saved-versions/:id`
- `POST /api/resume/saved-versions/:id/publish`
- `POST /api/resume/saved-versions/:id/unpublish`
- public resolver for `/{person-slug}/{public-id}?lang=<locale>`

Current preset endpoints can remain as compatibility paths while the internal model migrates.

`POST /api/resume/presets/[presetId]/publish` should eventually create a Published CV snapshot and Public Link instead of treating `resume_presets.slug` as the public source of truth.

## Security And Privacy

The privacy model is:

- Saved Versions and Master CV drafts are private to the owner.
- Public anonymous access can read only active Published CV snapshots through active Public Links.
- Admins should see metadata and statistics by default, not CV content.
- Recruiter access is a future scoped access model, not inherited admin/staff access.
- Service-role usage in public resolvers must still enforce active Public Link, snapshot, locale, and ownership rules in application logic.
- Publish, unpublish, republish, and rollback should be auditable.

Existing RLS and staff access rules must be reviewed before implementation because older policies may allow staff access to `resume_documents`. The target admin model is metadata-only for MVP.

## SEO And AEO

Indexing is user opt-in.

Public rendering rules:

- active and indexable Public Link: `index,follow`;
- active but non-indexable Public Link: `noindex,nofollow`;
- inactive, revoked, private, or missing Public Link: 404 or 410, always noindex;
- canonical URL should be derived from the Public Link and language contract;
- `hreflang` should be emitted for all published languages available on that Public Link;
- sitemap inclusion should be limited to active and indexable Public Links.

Structured data should be added after the OpenCV YAML snapshot contract is stable.

## Migration Plan

The migration should be additive and reversible:

1. Add or extend the public-link model without dropping `resume_presets.slug`.
2. Add `profiles.person_slug`.
3. Backfill active/public existing presets into Public Links and Published CV snapshots.
4. Add the new public route `/{person-slug}/{public-id}`.
5. Keep `/r/[slug]` as compatibility resolver.
6. Move dashboard copy/link display from "preset" to "Saved Version" and from `/r/[slug]` to the new public URL.
7. After validation and indexing stabilization, redirect `/r/[slug]` to the new URL.
8. Mark `resume_presets.slug` as legacy/deprecated, then remove only in a later dedicated migration if still needed.

Rollback should be possible by keeping old columns and route compatibility during the first implementation phases.

## Rejected Alternatives

### Keep `resume_presets.slug` as the public source of truth

Rejected because it mixes private saved configuration with public publication identity. It does not naturally support unpublish without losing the Saved Version, republish with a new ID, immutable snapshots, audit, stable SEO, or OpenCV YAML versioning.

### Use `resume_documents.is_public` as publication

Rejected because `resume_documents` are editable Master CV language documents. Public rendering from live drafts risks accidental disclosure and publication drift.

### Only expand `/r/[slug]`

Rejected because route changes alone do not separate Saved Version, Published CV snapshot, and Public Link responsibilities.

## Consequences

Positive:

- Clear product language.
- Safer privacy model.
- Stable public URL identity.
- Unpublish and republish semantics match product expectations.
- OpenCV YAML becomes a reliable publish-time contract.
- SEO/AEO can be implemented against stable public snapshots.

Negative:

- Requires additive schema work and migration.
- Requires compatibility handling for existing `/r/[slug]` links.
- Increases storage due to snapshots.
- Requires stronger behavior tests than current source-text smoke tests.

## Ownership

- `software_architect`: domain boundaries, ADR updates, migration strategy.
- `backend_engineer`: schema, RLS, APIs, snapshot/public resolver.
- `frontend_engineer`: dashboard/editor/public route integration.
- `ui_ux_designer`: user-facing naming, publish/unpublish UX, link management clarity.
- `test_engineer`: contract tests for publish, public resolution, locale, SEO, and security.
- `project_manager`: rollout, documentation order, DoD, and sequencing.

## Related Test Contracts

See [CV Publication Test Contracts](../guides/testing/cv-publication-test-contracts.md).

## Implementation Checklist

- [x] PR1: Additive schema foundation migration for ADR 0001 (`profiles.person_slug`, `resume_published_cvs`, `resume_published_cv_locales`, `resume_public_links` extension, indexes, constraints, RLS).
- [x] PR1: Migration contract tests for schema/RLS/compatibility added and passing.
- [x] PR2: Publish flow creates immutable snapshot rows and links `resume_public_links.active_published_cv_id`.
- [x] PR2: Unpublish flow revokes active Public Link without deleting Saved Version.
- [x] PR2: Backend hardening for publish/unpublish failure handling and default locale behavior.
- [x] PR2: Runtime contract tests for publish/unpublish behavior and legacy compatibility added and passing.
- [x] PR3 (partial): Canonical public route `/{person-slug}/{public-id}` added in Next.js.
- [x] PR3 (partial): Canonical public route metadata includes robots + canonical + language alternates.
- [x] PR3: Dashboard should show canonical `/{person-slug}/{public-id}` as the primary share link after publish.
- [x] PR3: Keep `/r/[slug]` visible only as compatibility link in UI and docs.
- [x] PR3: Add UI/API tests confirming canonical link is preferred in dashboard flows.
- [x] PR3: Add compatibility behavior for legacy `/r/[slug]` route (redirect or strict compatibility contract per rollout decision).
- [x] PR3: Final SEO/AEO verification for canonical/hreflang/indexing behavior on public pages.
- [x] PR4: Introduce transactional publish/unpublish RPC flow to ensure atomicity across snapshot + link state changes.
- [x] PR4: Enforce explicit selected language set for Published CV snapshots (avoid accidental draft-language exposure).
- [x] PR4: Finalize republish semantics so new `public-id` is issued only after unpublish.
- [x] PR4: Documentation alignment across guides/README/action plan after runtime transition is complete.
