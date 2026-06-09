# OpenCiVera Rebuild Work Plan (Next.js + React)

This document is the execution source of truth for rebuilding the product from static pages to a production-ready SaaS in Next.js.

## 0) Progress Tracking Rules

Status legend:
- `[ ]` not started
- `[/]` in progress
- `[x]` done

Global completion checklist:
- [x] Phase A - Platform foundation
- [x] Phase B - Data model refactor (YAML-first)
- [x] Phase C - Auth + RBAC + Admin
- [x] Phase D - Resume editor canvas + versioning
- [x] Phase E - Public CV + SEO/AEO + URL compatibility
- [x] Phase F - User panel + admin analytics/audit
- [ ] Phase G - Hardening, QA, launch readiness
- [ ] Phase I — ATS Intelligence (post-launch, after Phase G)
- [ ] Phase J — Semantic Public Link URL (post-launch, after Phase I)

Current implementation status as of `2026-05-09`:

- The Next.js shell, auth, admin flows, and resume editor are live in `app/`.
- The sample public resume view on `/resume` is implemented from YAML data.
- Canonical public route `/{person-slug}/{public-id}` resolves from `resume_public_links` with snapshot-backed rendering and SEO metadata.
- `/r/[slug]` is a compatibility route and redirects to canonical public URLs when available.
- Shared CV language switcher and status badges are active for sample, preview, and public CV rendering. Supabase has metadata foundations for enabled languages, default locale, preset variants, and AI-generated marking.
- The former static HTML/CSS/JS frontend has been retired from `public/`; historical `.html` URLs remain as Netlify redirects.
- AI-assisted demo resume generation is planned as a separate workstream and is not part of the core Phase E SEO/public-route milestone.

## Current Execution Checklist

- [x] Next.js shell is active in `app/`
- [x] Netlify build and CI pipeline are configured
- [x] YAML-first data layer is active
- [x] Auth, RBAC, and admin flows are implemented
- [x] Resume editor and revisioning are implemented
- [x] Sample public resume exists at `/resume`
- [x] Resume editor is rebuilt in React
- [x] Public share route `/r/[slug]` is implemented as compatibility redirect/resolver
- [x] SEO/AEO controls for public resume pages are implemented for canonical routes
- [/] Multilingual CV foundations are active; dedicated language-version management UI is still pending
- [x] User panel and analytics surfaces are complete
- [ ] Launch hardening tasks are complete

## 1) Locked Product Decisions

These are mandatory constraints:
1. Incremental migration with parity gates (no big-bang rewrite).
2. Frontend stack: Next.js (React + TypeScript).
3. YAML is the primary CV format stored in database.
4. Per-language CV files are separate documents (EN and PL at minimum).
5. Resume versioning + rollback is required.
6. Public SEO/AEO is a priority.
7. Role model in v1:
   - `admin` - full access, can delete any user.
   - `manager` - can delete `user` and `recruiter`, cannot delete `manager` or `admin`.
   - `user` - manages own CV only.
   - `recruiter` - same capabilities as `user` for now.
8. Admin panel in v1 includes user management, role assignment, analytics, and audit logs.
9. Backward URL compatibility is required (`*.html` old routes must continue via redirects).
10. Netlify remains hosting platform.
11. Merge policy: no merge without green CI (lint/typecheck/tests/build).

### What incremental migration means (non-negotiable)
- Each PR migrates a small, explicitly scoped slice (route, feature, or workflow), and leaves everything else untouched.
- Legacy static files are retired; compatibility is preserved through redirects from historical `.html` URLs.
- Every migration slice must define:
  - **Scope** (what is changed),
  - **Out of scope** (what is not changed),
  - **Parity checklist** (what must behave the same as legacy),
  - **Rollout/rollback** strategy (feature flag, route fallback, or revert plan).

## 2) Next.js Rationale (React confirmation)

Yes, Next.js uses React.

Why Next.js for this project:
- SEO/AEO priority: SSR/ISR for public resume pages (`/r/[slug]`).
- Better routing and layout control for auth/admin/public areas.
- Easier metadata generation for robots/canonical/structured data.
- Multilingual public CV URLs can start with one canonical slug plus `?lang=<locale>` overrides, then evolve to locale paths such as `/r/ariana/pl` with `hreflang` and canonical metadata without rebuilding the data model.
- Server-side logic for YAML validation, permission checks, and secure admin operations.

## 3) Target Architecture

- Frontend/App: Next.js App Router + React + TypeScript.
- UI: internal design system package in repo (`packages/ui` or `/src/ui`).
- Data/Auth/Storage: Supabase (Postgres/Auth/Storage/RLS).
- Server logic: Next.js server actions/route handlers + optional Netlify Functions only where needed.
- Hosting: Netlify (Preview + Production deploys).
- Monitoring: Sentry (frontend + server).

## 4) Data Model Refactor (YAML-first)

Proposed core tables:
- `profiles`
  - `id`, `email`, `role`, `is_active`, `created_at`, `updated_at`.
- `resume_documents`
  - one row per `(user_id, locale)` active document.
  - fields: `id`, `user_id`, `locale`, `yaml_content`, `schema_version`, `title`, `is_public`, `allow_indexing`, timestamps.
- `resume_revisions`
  - immutable snapshots for rollback.
  - fields: `id`, `document_id`, `revision_number`, `yaml_content`, `created_by`, `created_at`, `change_note`.
- `resume_public_links`
  - `id`, `document_id`, `slug`, `is_active`, `allow_indexing`, `view_count`, timestamps.
- `admin_audit_logs`
  - admin/manager operations with actor, action, target, metadata, timestamp.

Rules:
- YAML is source of truth (`yaml_content`).
- Optional normalized/search projection can be derived from YAML for analytics/search.
- Every publish creates new revision row.
- Rollback creates a new revision based on selected historical snapshot.

Automatic migration requirement:
- Build migration script to convert existing `resumes.data` JSON and legacy structures into `yaml_content` per locale documents.
- Backfill EN/PL documents where possible.
- Generate safe default YAML for missing fields.

## 5) Design Strategy

Global UI concept:
- Mode toggle: `Professional View` and `Technical View` (instead of classic day/night naming).
- `Technical View` visual language: continuation of OpenCV Dark Tech.
- `Professional View` visual language: Editorial Pro (lighter, premium, cleaner).

Design system strategy:
- Start as internal package in the same repo (faster iteration, lower ops overhead).
- External separate repo is only needed later if multiple products must consume shared components independently.

Design tokens to define first:
- color scales, semantic tokens, typography, spacing, radius, shadows, motion.
- mode-aware tokens for Professional/Technical.

## 6) Environments and Delivery Model

Why keep `dev` even with Netlify preview/prod:
- fast local iteration (no deploy wait for every small change),
- easier debugging with local tools and mocks,
- safer schema/API experiments before pushing PR.

Environment model:
- `dev` - local machine, branch-level work.
- `preview` - automatic Netlify Deploy Preview for every PR.
- `prod` - Netlify production deploy from `main`.

Netlify setup requirements:
- separate env vars per context (`production`, `deploy-preview`).
- route redirects for old static URLs to new routes.
- protected preview if needed (optional).

GitHub automation (required):
- CI workflow: lint, typecheck, unit/integration tests, build.
- optional E2E smoke on PR and full E2E on `main` or nightly.

## 7) Test and Quality Baseline

Required from start:
- Lint: ESLint.
- Format: Prettier.
- Type safety: TypeScript strict.
- Unit/integration: Vitest + Testing Library.
- E2E: Playwright (auth, editor, public resume, admin actions).
- Accessibility checks: axe in key flows.
- Performance checks: Lighthouse budget for public pages.
- Error monitoring: Sentry.

Merge gate policy:
- no merge when any required check fails.

## 8) Phased Execution Plan (Checklist)

### Phase A - Platform Foundation

Branch: `feat/phase-a-nextjs-foundation`

Checklist:
- [x] Initialize Next.js TypeScript app structure.
- [x] Configure App Router, layouts, shared shell.
- [x] Configure ESLint, Prettier, strict TypeScript.
- [x] Add CI workflow (lint/typecheck/tests/build).
- [x] Add Netlify build/deploy config for Next.js.
- [x] Add `dev/preview/prod` env variable templates.
- [x] Add redirect map for legacy `.html` routes.

Definition of done:
- Next.js app deploys to Netlify preview and production.
- CI gates are active and required.

### Phase B - YAML Data Layer Refactor

Branch: `feat/phase-b-yaml-data-model`

Checklist:
- [x] Create migration SQL for new YAML-first tables.
- [x] Add schema validation for YAML (server-side).
- [x] Implement revision model and rollback primitives.
- [x] Implement automatic data migration script from legacy data.
- [x] Add data integrity tests and migration dry-run report.
- [x] Add RLS policies aligned to new role model.

Definition of done:
- Existing users/documents migrated safely.
- EN/PL document separation works.
- Revision and rollback data layer is operational.

### Phase C - Auth, RBAC, and Admin Core

Branch: `feat/phase-c-auth-rbac-admin`

Checklist:
- [x] Build Next.js auth flows (sign up/in/out/reset).
- [x] Enforce email verification and disposable email blocking.
- [x] Implement role-aware route protection.
- [x] Implement role assignment flows for admin.
- [x] Enforce delete constraints (`manager` cannot delete `manager/admin`).
- [x] Implement admin user management UI.
- [x] Add audit log writes for all privileged actions.

Definition of done:
- Full auth and RBAC behavior validated by E2E tests.
- Audit logs capture role and user-management operations.

### Phase D - Resume Editor Canvas (Live) + Versioning UX

Branch: `feat/phase-d-editor-canvas`

Checklist:
- [x] Build split canvas editor (form + live preview) in React.
- [x] Render preview with same visual structure as public CV view.
- [x] Add locale-specific editing for separate EN/PL documents.
- [x] Add draft save/restore UX.
- [x] Add publish action creating revision snapshots.
- [x] Add revision history list and rollback action in UI.
- [x] Add YAML import/export in editor panel.
- [x] Expose public-link management from the editor or an adjacent authenticated panel.

Definition of done:
- User can create and edit CV in live canvas.
- Publish, revision history, and rollback work end-to-end.
- Editor-adjacent Saved Version/Public Link management can show canonical/compatibility link state and publish/unpublish through owner-scoped preset APIs.

### Phase E - Public Resume Experience + SEO/AEO

Branch: `feat/phase-e-public-seo-aeo`

Checklist:
- [x] Implement public route `/r/[slug]`.
- [x] Apply baseline indexing controls to robots metadata.
- [x] Add canonical URLs and OpenGraph/Twitter metadata.
- [x] Add multilingual SEO metadata: `hreflang`, canonical language handling, and future-ready locale route support such as `/r/{slug}/{locale}` without data-model changes.
- [/] Build candidate-facing language version management UI. Current implementation adds draft language documents, stores language metadata in Supabase, and can set the default published CV language; duplication, per-version publishing controls, and richer previews remain follow-up work.
- [ ] Add structured data (JSON-LD) for resume pages where applicable.
- [x] Add sitemap and robots configuration.
- [x] Verify compatibility redirects from old static routes.

Definition of done:
- Public resume pages are SEO/AEO-ready and index controls are correct.
- Old links continue to resolve without breaking.

### Phase F - User Panel + Admin Analytics/Audit Dashboard

Branch: `feat/phase-f-panel-analytics-audit`

Checklist:
- [x] Build user panel for CV/link management.
- [x] Add role-aware admin dashboard views.
- [x] Add analytics widgets (user counts, active links, views).
- [x] Add audit log explorer/filter for admin/manager actions.
- [x] Add support for recruiter role baseline (same permissions as user).
- [x] Add smoke tests for all role-specific workflows.

Definition of done:
- User and admin operational workflows are complete in React app.
- Analytics and audit visibility are available to authorized roles.

### Phase G - Hardening and Launch Readiness

Branch: `feat/phase-g-hardening`

Checklist:
- [ ] Complete E2E regression suite (critical paths).
- [ ] Run performance and accessibility checks.
- [ ] Validate security controls and RLS tests.
- [ ] Finalize observability dashboards and alerting.
- [ ] Prepare release checklist and rollback playbook.
- [ ] Execute production smoke test protocol.

Definition of done:
- Quality gates pass consistently.
- Production release readiness checklist is complete.

### Phase I — ATS Intelligence

Branch: `feat/phase-i1-ats-score-sidebar`

Checklist:
- [ ] Static ATS rules engine implemented and tested
- [ ] ATS Score Sidebar integrated in editor canvas
- [ ] Visual Score tab added
- [ ] AI keyword gap analysis added (depends on Phase H)

Definition of done:
- Editor shows live ATS score with actionable issues
- All rules covered by unit tests
- No editor performance regression

### Phase J — Semantic Public Link URL

Branch: `feat/phase-j-semantic-public-url`

Checklist:
- [ ] profiles.person_slug migracja na format ariana-holt
- [ ] Redirect 301 legacy slugów
- [ ] resume_public_links.role_slug + link_type
- [ ] Route /{name}/{role}/{id}
- [ ] Publish modal checkbox general/role
- [ ] RPC rozszerzony o link_type i role_slug
- [ ] Migracja istniejących linków
- [ ] ADR 0013 + testy + docs

Definition of done:
- Oba formaty URL działają end-to-end
- Stare URL-e przekierowują 301
- Publish modal pozwala wybrać format przed pierwszą publikacją
- Wybór jest niezmienny po publikacji
- Wszystkie testy zielone

## 9) Execution Workflow

For every phase:
1. Create branch `feat/phase-xx-name`.
2. Keep scope limited to single phase objective.
3. Open PR with: scope, impact, risk, rollback plan.
4. Require green CI and Netlify preview review.
5. Merge to `main` only after acceptance.
6. Run production smoke checklist after deployment.

## 10) Risk Register

- Risk: migration data loss.
  - Control: dry-run migration reports + backup + reversible scripts.
- Risk: role escalation bugs.
  - Control: explicit RBAC tests for all 4 roles + audit logs.
- Risk: SEO regressions during route migration.
  - Control: redirect matrix + metadata tests + crawl validation.
- Risk: UI inconsistency across modes.
  - Control: design token system + shared components + visual regression checks.

## 11) Immediate Next Actions

- [x] Approve this updated plan as the baseline for the active codebase.
- [x] Complete foundation, YAML, auth/admin, and editor phases.
- [x] Implement the actual `/r/[slug]` public resume rendering flow.
- [x] Add SEO/AEO metadata and indexing controls for public resume pages.
- [x] Extend the dashboard/user panel with link management and analytics.
- [ ] Execute the editor-adjacent Public Link management ticket routing in `docs/action-plan.md`.
- [ ] Add a dedicated `Language Versions` interface for user-managed CV locales.
- [ ] Start the AI demo resume generation workstream after Phase E route/rendering scope is stable.

