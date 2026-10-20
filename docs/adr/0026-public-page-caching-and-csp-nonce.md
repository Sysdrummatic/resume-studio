# ADR 0026: Public Page Caching Under a Nonce CSP

Status: Accepted

Date: 2026-10-20

Related: [ADR 0014](0014-pdf-rendering-architecture.md), [ADR 0025](0025-public-basic-documentation.md), SEO plan task T14 (`docs/seo/seo-improvement-plan.md`)

## Context

Every page is rendered per request. Three things force that:

1. `proxy.ts` mints a per-request CSP nonce (`script-src 'nonce-…' 'strict-dynamic'`) and Next embeds the same nonce in the HTML it renders.
2. The root layout reads `cookies()` (theme), the session actor and, for anonymous visitors, the `login_restricted` flag from Supabase.
3. The public CV route is `force-dynamic` and resolves the link twice (`generateMetadata` and the page).

Measured on production (2026-10-20, `curl`, mobile Lighthouse was not available): TTFB of `/`, `/resume`, `/docs` is 0.6–1.5 s; the landing HTML is 160 kB. TTFB is dominated by sequential Supabase round trips, not by rendering.

## Options

| Option | Effect | Cost |
| --- | --- | --- |
| A. CDN/static HTML for public pages | Best TTFB | Cached HTML carries a stale nonce while the CSP header is minted per request, so every script is blocked. Needs hash-based CSP (`experimental.sri`) or a CSP without `strict-dynamic` on public routes: weaker or experimental security posture. Layout would also have to stop reading the session. |
| B. Move signed-in state to the client | Makes layout cacheable | Flash of anonymous header, new `/api/auth/session` dependency on every page, large refactor of the shell. |
| C. Keep dynamic HTML, cache the data | Removes the Supabase round trips from the hot path; CSP unchanged | Data cache must be invalidated on publish/unpublish. |

## Decision

**Option C.** Security and data integrity rank above speed (CLAUDE.md priorities), and the nonce CSP is a Phase G control (G-P0-01). HTML stays dynamic; we cache what the HTML is built from.

1. **Cached reads** (Next data cache, `unstable_cache`, readers in `app/lib/public-data-cache.ts`, invalidation in `app/lib/public-cache-invalidation.ts` (separate, so mutation code never imports the readers)):
   - the `login_restricted` access flag (layout, every anonymous page): TTL 60 s;
   - public CV resolution by `(personSlug, publicId, locale)`: TTL 300 s, tag `public-cv`;
   - the `public_cv_indexing_enabled` flag is read inside the cached resolver, so a SQL toggle takes effect within the 300 s TTL.
2. **Per-request dedupe** with React `cache()` for the public CV resolver, so `generateMetadata` and the page share one lookup.
3. **Invalidation contract.** Everything that changes what a public link serves calls one helper, `revalidatePublicCv()`:
   publish and republish, unpublish (which deleting a published saved version goes through), and account deletion by the user or an admin. The TTL is only a backstop: after unpublish the CV must answer 404 on the next request, never after the TTL.
4. **What is never cached:** anything keyed by a session (actor, dashboard, editor, admin), exports and the OpenCV API (they already set their own `Cache-Control`), and any result computed with user-specific credentials. The cached public resolver uses the service role and returns only the already-published, selection-filtered snapshot (R09), so one cached value is valid for every visitor.
5. **Out of scope now:** CDN caching of HTML (option A). Revisit only if measured TTFB after this change is still above target and a hash-based CSP has its own ADR.

## Consequences

- TTFB for anonymous pages drops by the two Supabase round trips (flag + link); first request after expiry or invalidation pays them once per instance.
- A missed invalidation path would show an unpublished CV until the TTL. The contract test lists every mutation entry point so a new one is a deliberate decision.
- `unstable_cache` is Next's stable data-cache API in 16.x; moving to `use cache` later only touches `public-data-cache.ts`.

## Test contract

`tests/public-data-cache.test.mjs`: the mutation entry points (publish, unpublish, account delete by user and admin) call `revalidatePublicCv`; the cached resolver is keyed by slug, id and locale; session-keyed readers do not use the helper.
