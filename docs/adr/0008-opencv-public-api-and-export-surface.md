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
`docs/security/security-and-risk-plan.md`).

## Consequences

- Safer foundation for OpenCV ecosystem integrations.
- Additional API governance and backward compatibility responsibilities.

## Implementation Checklist

- [x] Define public export/API endpoint surface and versioning.
- [x] Ensure export reads only Published CV snapshots.
- [x] Define locale selection and fallback behavior for export.
- [x] Add rate limiting, caching, and abuse protections.
- [x] Add contract tests for backward compatibility and access control.
