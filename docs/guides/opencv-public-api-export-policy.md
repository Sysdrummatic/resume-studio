# OpenCV Public API Export Policy

Operational guide for [ADR 0008](../adr/0008-opencv-public-api-and-export-surface.md).

## Endpoint

- `GET /api/public/opencv/v1/{personSlug}/{publicId}`
- Query:
  - `lang=<locale>`
  - `format=yaml|json` (default: `yaml`)

## Access Model

- Anonymous/public read allowed only for active Published CV snapshots behind active Public Links.
- Private drafts, Master CV, and unpublished Saved Versions are out of scope for this endpoint.

## Output Contract

- YAML response (`text/yaml`) for default export.
- JSON response (`?format=json`) includes contract metadata plus YAML payload.
- Required headers:
  - `X-OpenCV-Contract-Version`
  - `X-OpenCV-Schema-Version`
  - `X-OpenCV-Locale`

## Caching

- Success:
  - `Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=600`
- Not found/revoked:
  - `Cache-Control: no-store`

## Security Notes

- Locale fallback must stay within published locale set.
- No admin-only/private metadata should be included in payload.
- Platform/edge rate limits should be enforced at deployment boundary in MVP.
