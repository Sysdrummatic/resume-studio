# ResumeStudio SaaS Transition Work Plan

This document translates product discussions into an execution plan optimized for fast, visible production progress.

## 1) Confirmed product decisions

The following decisions are locked and should be treated as implementation constraints:

1. **One master resume per user** stored as structured data (YAML/JSON equivalent).
2. **Multiple public links per user** are allowed through visibility configurations/presets.
3. **Email verification is mandatory** from day one.
4. **Disposable email protection is required** at signup using a **free external verification API**.
5. **Multilingual support is a core requirement** (EN/PL now, DE/FR prepared in architecture).
6. **User-controlled indexing** must be supported (indexable vs `noindex` per public resume).
7. **Admin capabilities are required from initial releases** with full management scope.
8. **Delivery priority is speed** with production-facing increments after every phase.
9. **MVP target release date:** **May 31, 2026**.

## 2) Current-state assessment (existing repository)

Current strengths:

- YAML-driven public resume rendering.
- EN/PL locale support in content.
- Section visibility controls (local mode).
- Clean static deployment footprint.

Current gaps versus target SaaS:

- No multi-tenant accounts.
- No per-user persistent backend model.
- No upload/import pipeline.
- No platform-level admin operations.
- No secure public-link governance.

## 3) Target architecture (MVP-first)

- **Frontend:** Vite + React + TypeScript.
- **API layer:** Netlify Functions.
- **Data/Auth/Storage:** Supabase (PostgreSQL + Auth + Storage + RLS).
- **Hosting:** Netlify.

Implementation principle:

- Keep and migrate the current renderer into a reusable `ResumeView` component.
- Build product capabilities around this renderer without rewriting proven presentation logic.

## 4) Phase plan with production-visible outcomes

Each phase must be shipped on a dedicated branch and deployed to Netlify so progress is visible online.

### Phase A — Public marketing launch first

**Branch:** `feat/01-landing-live`

Scope:

- Build and deploy the new landing page at `/`.
- Add clear CTA, product positioning, and waitlist/sign-up placeholder.
- Keep app area inaccessible or marked as "coming next".

Production outcome:

- A professional, publicly visible product page is live immediately.

Acceptance checks:

- Netlify production URL shows new landing page.
- Mobile/desktop layout QA passes.

### Phase B — Auth foundation + anti-abuse

**Branch:** `feat/02-auth-and-verification`

Scope:

- Supabase sign up/sign in/sign out/password reset.
- Mandatory email verification.
- Disposable-email domain blocking policy via free external API.
- Protected routes in React Router.

Production outcome:

- Users can create verified accounts securely.

Acceptance checks:

- Unverified users cannot access protected features.
- Disposable domains are blocked during signup.

### Phase C — Data model + admin from day one

**Branch:** `feat/03-schema-rls-admin-base`

Scope:

- Supabase migrations for profiles/resumes/configurations/public links/uploads.
- RLS policies for owner-scoped access.
- Admin role model and admin dashboard (user list + activate/deactivate + force password reset + moderation access).

Production outcome:

- Platform owner can fully manage users in production.

Acceptance checks:

- Admin routes are admin-only.
- Data isolation works for regular users.
- Admin actions are auditable.

### Phase D — Master resume editor (single resume rule)

**Branch:** `feat/04-master-resume-editor`

Scope:

- Multi-step editor storing one master resume per user.
- Draft save + restore.
- Review-and-publish flow.

Production outcome:

- Verified user can maintain their master resume online.

Acceptance checks:

- Exactly one active master resume is enforced per user.
- Refresh does not lose in-progress data.

### Phase E — Public resume links + indexing controls

**Branch:** `feat/05-public-links-and-indexing`

Scope:

- Public route `/r/:slug` without authentication.
- Default public link + additional links per visibility preset.
- Per-link indexing setting (`index` / `noindex`) reflected in meta robots and headers where applicable.

Production outcome:

- Users can share tailored public resume versions.

Acceptance checks:

- Public links render correctly for anonymous visitors.
- Indexing preference is reflected on the rendered page.

### Phase F — Visibility configurator

**Branch:** `feat/06-visibility-configurator`

Scope:

- Preset CRUD in user panel.
- Mapping of visible sections/items per preset.
- Link assignment to selected preset.

Production outcome:

- Users can prepare role-specific resume variants quickly.

Acceptance checks:

- Switching presets changes public content deterministically.

### Phase G — Import pipeline (simple now) + AI expansion track

**Branch:** `feat/07-import-pipeline`

Scope:

- File upload for PDF/image resumes.
- Deterministic parsing baseline (text extraction + simple rule-based mapping).
- Mandatory human review before save.

Production outcome:

- Users can bootstrap resume data from existing files faster.

Acceptance checks:

- Import flow works without AI dependency.
- Parsing failures are visible and recoverable by manual edit.

### Phase H — AI-assisted import enhancement

**Branch:** `feat/08-ai-import-enhancement`

Scope:

- Add AI enrichment to improve extraction quality for ambiguous or complex CV layouts.
- Keep AI call server-side only (Netlify Functions).
- Add confidence indicators + fallback to deterministic output.

Production outcome:

- Better extraction quality while keeping manual control and predictable fallback.

Acceptance checks:

- AI path is optional and fails safely.
- Deterministic parser remains functional as baseline.

## 5) Milestone schedule (targeting May 31, 2026)

- **By April 12, 2026:** Phase A live.
- **By April 20, 2026:** Phase B live.
- **By April 30, 2026:** Phase C live.
- **By May 10, 2026:** Phase D live.
- **By May 18, 2026:** Phase E live.
- **By May 24, 2026:** Phase F live.
- **By May 28, 2026:** Phase G live.
- **By May 31, 2026:** Stabilization + release candidate for MVP.
- **Post-MVP (June 2026+):** Phase H.

## 6) Manual steps required from you (non-coding)

1. Create Supabase project and store credentials securely:
   - Project URL.
   - Anon key.
   - Service-role key (server only).
2. Create Netlify site and connect repository.
3. Set environment variables in Netlify and local `.env` files.
4. Configure Supabase Auth:
   - Site URL and redirect URLs.
   - Email verification templates and behavior.
5. Select and validate the free disposable-email verification API:
   - Quotas/rate limits.
   - SLA/reliability.
   - Privacy and data-processing terms.
6. Decide legal baseline pages owner/content:
   - Privacy Policy.
   - Terms of Service.
7. Configure observability:
   - Error monitoring (e.g., Sentry).
   - Basic product analytics.
8. Define support channel (email/help form).
9. Define release acceptance routine:
   - Test checklist per phase.
   - Production smoke test after each merge.

## 7) Branch and review workflow (mandatory)

For every update:

1. `git checkout -b feat/NN-short-name`
2. Keep scope aligned to one phase only.
3. Run local tests and smoke checks.
4. Open PR with: scope, impact, risks, rollback.
5. Merge only after review and successful preview deploy.
6. Validate production after merge.

## 8) Risks and controls

- **Risk:** Scope creep before first value is visible.
  - **Control:** Phase A must ship first and be publicly reachable.
- **Risk:** Abuse via fake accounts.
  - **Control:** Mandatory email verification + external disposable-email verification API.
- **Risk:** Data leakage across tenants.
  - **Control:** Strict RLS tests for `anon`, `authenticated`, and `admin` roles.
- **Risk:** Parser quality issues.
  - **Control:** Deterministic baseline parser + mandatory user review + AI enhancement only as additive layer.
