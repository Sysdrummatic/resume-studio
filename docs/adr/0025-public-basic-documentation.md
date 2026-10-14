# ADR 0025: Public Basic Documentation

Status: Accepted

Date: 2026-10-15

Amends: [ADR 0020](0020-test-user-flag-gates-beta-docs-access.md) (docs site access)

Related: [ADR 0021](0021-admin-full-docs-visibility.md), [ADR 0005](0005-seo-aeo-structured-data-policy.md)

## Context

ADR 0020 put the whole `/docs` site behind login. The tutorials (publishing,
import, export) are the best product explanation we have, and search engines and
AI crawlers could not read them (SEO plan task T07).

## Decision

1. **Tutorials and the docs overview are public.** `/docs` and
   `/docs/tutorials/[slug]` (and their `resources/` images) render server-side
   without a session. A tutorial can opt out with `public: false` in its
   frontmatter; the default for `tutorials` is public.
2. **Test Scenarios are never public.** The `public` frontmatter field is
   ignored for `test-scenarios`. They keep the ADR 0020/0021 rule exactly:
   `canViewTestScenarios()` (admin bypass, otherwise `is_test_user` + the
   `beta_test_scenarios_visible` flag). An anonymous request to a scenario URL
   returns 404.
3. **Non-public tutorials** keep the previous behavior: anonymous visitors are
   redirected to login via `requireAuthenticatedActor()`.
4. **Anonymous navigation** lists only public docs (`listDocNavGroups(..., { publicOnly })`).
5. **SEO:** public pages set `generateMetadata` from frontmatter
   (`title`, `description`) with `robots: index, follow`; non-public tutorials
   get `noindex, nofollow`. Public tutorials and `/docs` are in `app/sitemap.ts`.
   Public resources are served with `Cache-Control: public`; non-public stay `private`.

ADR 0020 sections 1 (signup opt-in), the `is_test_user` flag semantics and the
single-helper rule for Test Scenarios are unchanged.

## Consequences

- Tutorial content is now public: never put private or beta-only information in
  a tutorial; use `public: false` or the `test-scenarios` category.
- The access contract is enforced server-side in the page and resource route,
  not by nav visibility.

## Test contract

`tests/docs-routes.test.mjs` (anonymous public render, scenario 404, non-public
login redirect, public resource caching), `tests/beta-docs-site.test.mjs`
(visibility rule, metadata/robots).
