# CV Publication Test Contracts

This document lists the behavior contracts that must be protected when implementing the CV publication model from [ADR 0001](../../adr/0001-cv-publication-model.md).

These are not all implemented yet. They define the required regression coverage for future backend, frontend, and integration work.

## Publish Contract

Given an authenticated owner has a private Saved Version.

When the owner publishes the Saved Version.

Then the system creates an immutable Published CV snapshot.

And the system creates or updates an active Public Link.

And the public route renders the Published CV snapshot, not the editable draft.

## Draft Isolation Contract

Given a Saved Version has already been published.

When the owner edits the Master CV or Saved Version without publishing again.

Then the public URL continues to render the previous Published CV snapshot.

And private draft edits are not visible through the public route.

## Public Link Lifecycle Contract

Given a Saved Version is private.

When the owner publishes it.

Then a new `public-id` is generated.

Given the owner unpublishes the Saved Version.

Then the Saved Version remains private and editable.

And the Public Link becomes inactive or revoked.

Given the owner republishes after unpublish.

Then a different `public-id` is generated.

And the old public URL does not become active again.

## Public Read Contract

Given an active Public Link exists for `/{person-slug}/{public-id}`.

When an anonymous request reads `/{person-slug}/{public-id}?lang=pl`.

Then the response renders the Polish Published CV snapshot for that Public Link.

And the response does not expose private draft fields, admin-only fields, or non-selected languages.

## Missing Or Revoked Link Contract

Given a public URL points to a missing, inactive, or revoked Public Link.

When the URL is requested.

Then the route returns the agreed missing-state response, either 404 or 410.

And the response is always non-indexable.

And the response does not reveal whether a private Saved Version exists.

## Locale Contract

Given a Public Link has published languages.

When `?lang=<locale>` matches a published language.

Then that locale snapshot is rendered.

When `?lang=<locale>` is missing.

Then the default published locale is rendered.

When `?lang=<locale>` is not published for that Public Link.

Then the resolver uses the documented fallback or error behavior.

And fallback behavior must never read the current private draft.

## SEO And Indexing Contract

Given a Public Link is active and `allow_indexing=true`.

Then public pages may emit `index,follow`, canonical URL, and hreflang alternates.

Given `allow_indexing=false`.

Then public pages emit `noindex,nofollow`.

Given a Public Link is revoked, inactive, private, or missing.

Then public pages emit or imply noindex behavior and are excluded from sitemap output.

## Authorization Contract

Given an authenticated user is not the owner.

When that user tries to publish, unpublish, republish, rollback, or mutate another user's Saved Version or Public Link.

Then the request is denied.

Given an admin user.

Then the admin can see metadata and statistics by default.

And the admin cannot read CV YAML/content unless a future explicit policy grants that access.

Given a recruiter role.

Then recruiter read access is not ambient staff access.

And any future recruiter preview must be explicitly scoped and consent-based.

## RLS And Service Role Contract

Given Public Link resolution runs through server-side code.

Then service-role queries must still validate active Public Link, requested locale, and snapshot state before rendering.

Given direct database/RPC access through user-scoped auth.

Then owners can read and write their private Saved Versions.

And anonymous users can read only active public snapshots through approved public access paths.

## Data Integrity Contract

Publish must be atomic.

The system must not create an active Public Link that points to a missing, partial, or invalid Published CV snapshot.

Published CV snapshots are immutable after creation.

Rollback changes the active snapshot pointer or creates a new publish state; it must not mutate historical snapshots silently.

Unpublish does not delete the Saved Version.

## OpenCV YAML Contract

Publishing validates the selected CV data against the current OpenCV YAML schema.

The Published CV snapshot records the schema version.

Historical Published CV snapshots do not change when the private YAML schema or draft evolves.

Schema migrations for historical snapshots must be explicit and test-covered.

## Minimum Validation Commands

Run these before merging implementation work related to CV publication:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
```

For public route, SEO, or migration work, also run:

```powershell
npm.cmd run build
```
