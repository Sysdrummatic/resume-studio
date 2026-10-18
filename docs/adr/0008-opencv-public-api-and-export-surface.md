# ADR 0008: OpenCV Public API And Export Surface

Status: Accepted

Date: 2026-05-09

Extends: [ADR 0001](0001-cv-publication-model.md), [ADR 0002](0002-opencv-yaml-public-contract.md)

## Context

The long-term vision includes OpenCV-standard exchange. Public export/API boundaries need an architectural contract before broad integration.

## Decision

- Public export/API reads only Published CV snapshots.
- Draft/master/private data is never exposed through public export endpoints.
- Export contract is versioned and aligned with OpenCV YAML schema version.
- API behavior defines caching, basic abuse guardrails, and compatibility guarantees.
- Integration endpoints preserve canonical publication state and locale rules.

## Public Endpoint Surface (v1)

- `GET /api/public/opencv/v1/{personSlug}/{publicId}`
  - default response: YAML (`text/yaml`)
  - optional `?format=json` for envelope response
  - optional `?lang=<locale>` for locale selection

## Locale Rules

- If `lang` matches a published locale, export that locale snapshot.
- If `lang` is missing, export default published locale.
- If `lang` is unsupported, fallback to default locale, then first available published locale.
- Export must never use private drafts as fallback source.

## Caching/Abuse Policy

- Response caching:
  - `Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=600`
  - `Vary: Accept, Accept-Encoding`
- Missing/revoked resources return 404 with `no-store`.
- Rate limiting is delegated to edge/platform controls for MVP, with route-level contract reserved for a follow-up hardening task.

## Compatibility And Versioning

- Contract headers:
  - `X-OpenCV-Contract-Version`
  - `X-OpenCV-Schema-Version`
  - `X-OpenCV-Locale`
- Major version is path-based (`/v1/`).
- Backward-incompatible changes require new major path (`/v2/`) and migration notes.

## Clarification (2026-07-15)

"Published CV snapshot" means the document as published: snapshot rows store
the full Master Resume YAML plus the saved-version selection, and every export
surface (public OpenCV API, PDF, ATS text/YAML, CVasCode) must apply that
selection before serving content — the same filtering the public web view
applies. "Raw" (CVasCode) means no ATS transformations, not unselected master
content. Serving unselected master content through these endpoints violates
the "Draft/master/private data is never exposed" decision above (risk R09 in
`docs/security/security-and-risk-plan.md`, private `OpenCiVera-Project` repo).

## Privacy hardening (2026-09-27)

The snapshot tables contain the full private Experience Base YAML. They are
not public database resources: anonymous and other non-owner clients must use
the public page/export resolvers, which apply the saved selection before
returning content. Direct PostgREST reads of raw snapshot rows are denied by
RLS and anonymous SELECT privileges. Owners retain access to their own rows;
the server-side resolver retains its service-role read and active-link checks.

Public YAML contains only recognized top-level resume fields (including the
legacy `name` identity field). Unknown top-level fields cannot be selected and
remain private. Extension fields within selected entries are preserved. This
narrows the v1 export to its documented selected-CV boundary; consumers must
not treat private top-level extensions as part of the public contract.

## Consequences

- Safer foundation for OpenCV ecosystem integrations.
- Additional API governance and backward compatibility responsibilities.

## Implementation Checklist

- [x] Define public export/API endpoint surface and versioning.
- [x] Ensure export reads only Published CV snapshots.
- [x] Define locale selection and fallback behavior for export.
- [x] Add rate limiting, caching, and abuse protections.
- [x] Add contract tests for backward compatibility and access control.

## Addendum 2026-10-15: AI-bot policy and machine access (issue #220)

- **v1 is for people and trusted integrations.** The unauthenticated v1 API and the PDF/TXT/YAML exports are not an open feed for AI crawlers. Known AI-bot User-Agents (`app/lib/ai-bots.ts`) get `403` on public CV paths (`proxy.ts`) and on `/api/resume/export/*` and `/api/public/opencv/v1/*` (checked in each route handler via `rejectAiBot()`, so a percent-encoded path cannot bypass a matcher). `robots.txt` lists them with an anchored allowlist (marketing, docs) and `Disallow: /` for the rest; `Google-Extended` and `Applebot-Extended` are robots.txt-only tokens that never appear in a User-Agent, so they are not enforced by `403`. Both surfaces send `X-Robots-Tag: noindex, nofollow, noarchive`.
- **Temporary policy.** The block is a stop for honest bots, not a security boundary (a client can spoof a browser User-Agent). Data protection remains the saved selection (R09), unguessable `publicId`s and rate limiting. Googlebot is never blocked on CVs, so `noindex` stays readable.
- **Cache.** The `403` is `Cache-Control: private, no-store` with `Vary: User-Agent`, so a CDN cannot replay it to browsers. Exports are `private, no-store`; v1 responses carry `s-maxage`, so whether the CDN serves a cached `200` before the handler runs must be checked after deploy (`curl -A GPTBot`).
- **Machine access later.** Integrators that need machine access (ATS importers, partner tools) will use API keys under a new `/api/public/opencv/v2/`. Changing v1 in place would be a breaking contract change, so v1 keeps its documented behavior apart from this policy.
- **Reserved person slugs.** A slug equal to a top-level route (`resume`, `docs`, `api`, ...) is shadowed by that route, so `assign_profile_person_slug()` suffixes it (`20261016000000_reserve_route_person_slugs.sql`). The list is `RESERVED_PERSON_SLUGS` in `app/lib/ai-bots.ts`; a test compares it with the `app/` and `public/` folders and with the SQL list.
- The User-Agent list is reviewed quarterly.
