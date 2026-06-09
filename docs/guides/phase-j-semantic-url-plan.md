# Phase J — Semantic Public Link URL

Status: Planned (post-launch)

Depends on: Phase G (hardening/launch) and Phase I (ATS Intelligence) complete and stable in production.

Related ADR: [ADR 0013 — Semantic Public Link URL](../adr/0013-semantic-public-link-url.md)

## Goal and rationale

Public CV URLs should read as human- and recruiter-friendly identities, and optionally
communicate the role a given Saved Version targets. The current canonical shape
`/{person_slug}/{public_id}` uses a compact person slug such as `arianaholt-a1b2c3d4`
(no hyphen between first and last name), which reads poorly when shared and does not
expose the targeted role.

Phase J introduces a semantic, snapshot-stable URL model that:
- separates the human-readable name slug from the opaque public id,
- supports an optional role segment derived from the published CV at publish time,
- keeps URLs immutable per Public Link so shared links never silently change meaning.

## Target URL format

```
General:       /{name-slug}/{public_id}
Role-specific: /{name-slug}/{role-slug}/{public_id}
```

Examples:

```
ariana-holt/432c7756f7674d
ariana-holt/technical-writer/432c7756f7674d
```

- `name-slug` is the hyphenated profile slug (for example `ariana-holt`).
- `role-slug` is a slugified snapshot of the published role.
- `public_id` stays the opaque, generated identifier.

## Approved product decisions

- `link_type` is set once, at the first publish of a Saved Version, and is immutable thereafter.
- `role_slug` is derived from `summary[default].position` in the YAML at publish time — it is a
  frozen snapshot and does not change when the Master CV is later edited.
- Changing the role shown in the URL requires a new Saved Version and a new Public Link.
- All existing links are migrated to `link_type = 'general'`; there are no legacy URL elements left behind.
- Old URLs issue `301` redirects to the new format.
- Middle name handling is out of scope for this phase.

## Affected layers

| Layer | Change |
|---|---|
| `profiles.person_slug` | Migrate slug format to hyphenated `name-slug` (for example `arianaholt-…` → `ariana-holt`). |
| `resume_public_links` | Add columns `role_slug` (nullable) and `link_type` (`general` \| `role`). |
| Routing | Add new route `app/[personSlug]/[roleSlug]/[publicId]/page.tsx` for the role-specific format. |
| UI | Add a general/role choice (checkbox/toggle) in the publish modal, shown before first publish only. |
| RPC | Extend `publish_resume_saved_version` to accept and persist `link_type` and the derived `role_slug`. |
| Data migration | Backfill all existing `resume_public_links` rows with `link_type = 'general'` and `role_slug = NULL`. |
| Redirects | `301` from legacy slug/URL shapes to the new canonical format. |

### Notes per layer

- **`profiles.person_slug` migration:** the migration must be deterministic and collision-safe.
  Where a hyphenated slug would collide, preserve the existing disambiguation strategy used today.
- **`resume_public_links`:** `link_type` is required and immutable post-publish; `role_slug` is only
  populated when `link_type = 'role'`. The pair must be consistent (role implies non-null role_slug).
- **Routing:** the role-specific route resolves the same Public Link as the general route; the role
  segment is validated against the stored `role_slug` snapshot and redirects/404s on mismatch.
- **UI modal:** the format choice is disabled/hidden for already-published Saved Versions because
  `link_type` is immutable.
- **RPC:** role slug derivation happens server-side at publish to keep the snapshot authoritative.
- **Redirects:** old `/{person_slug}/{public_id}` shapes resolve to the migrated canonical URL via `301`.

## Risk register

| Risk | Control |
|---|---|
| Slug migration collisions | Deterministic slug builder + existing disambiguation suffix + pre-migration dry-run report. |
| Broken/lost inbound links after slug change | `301` redirects from legacy slug shapes; keep redirect map until traffic decays. |
| SEO regression during URL change | Canonical + `301` + sitemap refresh; monitor index coverage post-rollout. |
| Role slug drift vs Master CV edits | `role_slug` frozen at publish; role change requires a new Public Link (by design). |
| Inconsistent `link_type`/`role_slug` rows | DB constraint enforcing role implies non-null `role_slug`; backfill verified by tests. |
| Route ambiguity between name/role/id segments | Strict segment validation against stored snapshot; explicit not-found + noindex on mismatch. |

## Dependencies

- Phase G complete (hardening/launch readiness) — URL changes affect SEO and must ship on a stable base.
- Phase I complete (ATS Intelligence) — avoids overlapping churn in editor/publish surfaces.

## Suggested PR breakdown (minimum 3)

### PR1 — `profiles.person_slug` migration + redirects
- Migrate slug format to hyphenated `name-slug` with a dry-run report.
- Add `301` redirects from legacy slug shapes to the new canonical URL.
- Contract tests for slug migration determinism and redirect behavior.

### PR2 — `role_slug` + routing
- Add `resume_public_links.role_slug` and `link_type` columns and constraints.
- Add the new route `app/[personSlug]/[roleSlug]/[publicId]/page.tsx`.
- Resolve role-specific URLs against the stored `role_slug` snapshot; mismatch → 404/redirect.

### PR3 — UI modal + RPC + data migration
- Add general/role choice to the publish modal (first publish only; immutable afterward).
- Extend `publish_resume_saved_version` RPC to persist `link_type` and derived `role_slug`.
- Backfill existing links to `link_type = 'general'`, `role_slug = NULL`.
- ADR 0013, tests, and documentation updates.

## Definition of done

- Both URL formats work end-to-end (general and role-specific).
- Legacy URLs `301`-redirect to the new format.
- Publish modal lets the user choose the format before the first publish.
- The choice is immutable after publish.
- All checks green: `npm run lint && npm run typecheck && npm run test`.
