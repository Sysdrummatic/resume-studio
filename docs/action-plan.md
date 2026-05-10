# Action Plan

This file is the consolidated execution checklist for the current project state.

Each item includes the source guide it comes from, so the detailed rationale and implementation notes remain easy to trace.

## How To Use

- Treat this file as the top-level checklist for ongoing work.
- Mark items here first when work is completed.
- Then update the originating guide if the implementation changed the documented state.

## Current Status

- [x] Phase A foundation is complete
  Source: [SaaS Transition Work Plan](guides/saas-transition-work-plan.md)
- [x] Phase B YAML-first data layer is complete
  Source: [Phase B YAML Data Layer](guides/phase-b-yaml-data-layer.md)
- [x] Phase C auth, RBAC, and admin core is complete
  Source: [SaaS Transition Work Plan](guides/saas-transition-work-plan.md), [Phase C Auth + RBAC + Admin](guides/phase-c-auth-rbac-admin.md)
- [x] Phase D editor canvas and revisioning is complete
  Source: [SaaS Transition Work Plan](guides/saas-transition-work-plan.md), [Phase D Resume Editor Canvas](guides/phase-d-editor-canvas.md)
- [ ] Phase E public resume rendering and SEO/AEO is complete
  Source: [SaaS Transition Work Plan](guides/saas-transition-work-plan.md)
- [ ] Phase F user panel and analytics is complete
  Source: [SaaS Transition Work Plan](guides/saas-transition-work-plan.md)
- [ ] Phase G hardening and launch readiness is complete
  Source: [SaaS Transition Work Plan](guides/saas-transition-work-plan.md)

## Core Product Work

- [ ] Decide and write post-PR4 ADR backlog in priority order: OpenCV YAML contract, privacy-first admin, public route compatibility/deprecation, SEO/AEO policy, Saved Version/link-management UX, analytics/audit retention, and future OpenCV export/API surface
  Source: [ADR 0001 CV Publication Model](adr/0001-cv-publication-model.md), `.codex/state.yaml#adr_backlog`
- [ ] Implement SSR or ISR public route `/r/[slug]`
  Source: [SaaS Transition Work Plan](guides/saas-transition-work-plan.md)
- [x] Apply indexing controls to robots and headers for public resume pages
  Source: [SaaS Transition Work Plan](guides/saas-transition-work-plan.md)
- [x] Add canonical URLs and OpenGraph/Twitter metadata for public resume pages
  Source: [SaaS Transition Work Plan](guides/saas-transition-work-plan.md)
- [x] Add multilingual public CV SEO support with `hreflang`, canonical language handling, `?lang=<locale>` support, and a future route shape such as `/r/{slug}/{locale}` without changing the data model
  Source: [SaaS Transition Work Plan](guides/saas-transition-work-plan.md)
- [/] Build `Language Versions` UI for adding draft language documents and setting the default published CV language; duplication and per-version publish controls remain follow-up work
  Source: [SaaS Transition Work Plan](guides/saas-transition-work-plan.md)
- [ ] Merge Language Versions UX into the Master Resume dashboard modal with EN as the default first badge, right-side add-language control, and left-to-right badge ordering
  Source: `.codex/state.yaml#language_modal_merge_plan`
- [ ] Add structured data (JSON-LD) for public resume pages where applicable
  Source: [SaaS Transition Work Plan](guides/saas-transition-work-plan.md)
- [ ] Add sitemap and robots configuration
  Source: [SaaS Transition Work Plan](guides/saas-transition-work-plan.md)
- [ ] Verify compatibility redirects from legacy static routes
  Source: [SaaS Transition Work Plan](guides/saas-transition-work-plan.md)
- [ ] Build user panel for CV and link management
  Source: [SaaS Transition Work Plan](guides/saas-transition-work-plan.md)
- [ ] Add role-aware admin dashboard views for analytics and audit visibility
  Source: [SaaS Transition Work Plan](guides/saas-transition-work-plan.md)
- [ ] Implement role inheritance capability model: `user` base, `manager` and `recruiter` inherit `user`, `admin` inherits both, with API guards/UI gates/SQL helpers kept least-privilege and privacy-first
  Source: `.codex/state.yaml#role_inheritance_rollout_package`, `.codex/state.yaml#role_inheritance_model`, [Phase C Auth + RBAC + Admin](guides/phase-c-auth-rbac-admin.md), [Privacy-First Admin Access Policy](guides/privacy-first-admin-access-policy.md)

### Role Inheritance Rollout Package

Source of truth: `.codex/state.yaml#role_inheritance_rollout_package`.

Guardrails:
- Preserve flat persisted profile roles: `admin`, `manager`, `user`, `recruiter`.
- Preserve inheritance semantics: `manager -> user`, `recruiter -> user`, `admin -> manager + recruiter -> user`.
- Preserve privacy boundary: private resume YAML, revisions, draft selections, and owner documents stay owner-only.
- Keep recruiter inheritance as own-account/user parity only; it is not staff/admin visibility.

Execution sequence:
1. Backend PR1: add capability helpers and tests in `app/lib/rbac.ts`, `app/lib/auth-types.ts`, `app/lib/auth-request.ts`, `app/lib/auth-server.ts`, and `tests/**`; keep `acceptedRoles` compatibility and avoid route behavior migration.
2. Backend PR2: migrate admin user APIs in `app/api/admin/users/**` to `admin.*` capabilities plus target-aware helpers; keep manager limited to self plus `user`/`recruiter` and keep responses metadata-only.
3. Backend PR3: migrate owner resume APIs in `app/api/resume/**` to `resume.*_own` capabilities; align recruiter with user for own resume/language management unless an explicit product exception is documented.
4. Frontend PR4: update `app/components/account-menu.tsx`, `app/admin/page.tsx`, and `app/admin/admin-users-client.tsx` to use shared capability/target helpers; manager sees User management, user/recruiter do not.
5. Backend PR5: decide SQL alignment; add a forward-only helper migration only if needed, otherwise document why existing SQL/RPC helpers are sufficient. Do not modify historical migrations or broaden owner-only RLS.
6. Test PR6: update brittle literal-role tests, run full validation, and attach manual QA evidence for all roles.

Definition of done:
- `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd test` pass.
- Capability tests prove admin inherits manager/recruiter/user, manager inherits user only, recruiter inherits user only, and no role has `resume.content.read_other`.
- Admin and manager can access `/admin`; user and recruiter cannot.
- Manager can manage only `user`/`recruiter` targets and cannot modify own privileges.
- All private resume routes use actor-owned access only and do not accept staff target-user overrides.
- Admin APIs remain metadata-only and do not expose `yaml_content`, private revisions, or draft selections.

Rollback:
- Roll back PRs in reverse order. PR1 helpers are backward-compatible and can remain inert if PR2-PR5 are reverted.
- If SQL helpers are added, rollback is a new forward migration that drops only new helper functions/policies; no data rollback is expected.
- Existing `/language-versions` and dashboard worktree changes are unrelated and must not be reverted by role-inheritance work.
- [ ] Add analytics widgets for counts, active links, and views
  Source: [SaaS Transition Work Plan](guides/saas-transition-work-plan.md)
- [ ] Add audit log explorer and filtering
  Source: [SaaS Transition Work Plan](guides/saas-transition-work-plan.md)
- [ ] Add recruiter baseline workflow smoke coverage
  Source: [SaaS Transition Work Plan](guides/saas-transition-work-plan.md)

## Editor Follow-Ups

- [ ] Add AI demo generation actions in the editor
  Source: [Phase D Resume Editor Canvas](guides/phase-d-editor-canvas.md), [AI Demo Resume Generation Workstream](guides/ai-demo-resume-generation-plan.md)
- [ ] Expose public-link management from the editor or an adjacent panel
  Source: [Phase D Resume Editor Canvas](guides/phase-d-editor-canvas.md)
- [ ] Align editor preview badges with future public `/r/[slug]` rendering
  Source: [Phase D Resume Editor Canvas](guides/phase-d-editor-canvas.md)
- [/] Add shared CV language switcher and public/draft/AI-generated badges to sample, preview, and public renderers
  Source: [SaaS Transition Work Plan](guides/saas-transition-work-plan.md)

## AI Demo Resume Workstream

- [ ] Add provider config and environment variable handling for AI generation
  Source: [AI Demo Resume Generation Workstream](guides/ai-demo-resume-generation-plan.md)
- [ ] Add `ai_resume_generations` usage tracking migration and helpers
  Source: [AI Demo Resume Generation Workstream](guides/ai-demo-resume-generation-plan.md)
- [ ] Implement `POST /api/resume/generate-demo`
  Source: [AI Demo Resume Generation Workstream](guides/ai-demo-resume-generation-plan.md)
- [ ] Add prompt builder and schema validator helpers for fictional CV generation
  Source: [AI Demo Resume Generation Workstream](guides/ai-demo-resume-generation-plan.md)
- [ ] Add editor UI, loading states, and quota messaging for demo generation
  Source: [AI Demo Resume Generation Workstream](guides/ai-demo-resume-generation-plan.md)
- [ ] Add AI badge rendering in preview and editor state
  Source: [AI Demo Resume Generation Workstream](guides/ai-demo-resume-generation-plan.md)
- [ ] Add tests for unauthorized access, quota exhaustion, validation, and happy path
  Source: [AI Demo Resume Generation Workstream](guides/ai-demo-resume-generation-plan.md)
- [ ] Add phase 2 job-description-tailored fictional CV option
  Source: [AI Demo Resume Generation Workstream](guides/ai-demo-resume-generation-plan.md)

## Data Layer And Public Link Follow-Ups

- [x] `resume_documents` is the active source of truth
  Source: [Phase B YAML Data Layer](guides/phase-b-yaml-data-layer.md)
- [x] `resume_revisions` is active and queryable
  Source: [Phase B YAML Data Layer](guides/phase-b-yaml-data-layer.md)
- [x] `resume_public_links` is present in the active model
  Source: [Phase B YAML Data Layer](guides/phase-b-yaml-data-layer.md)
- [x] Migration and validation tooling exists in the repo
  Source: [Phase B YAML Data Layer](guides/phase-b-yaml-data-layer.md)
- [x] Complete Next.js consumption of `resume_public_links` via `/r/[slug]`
  Source: [Phase B YAML Data Layer](guides/phase-b-yaml-data-layer.md)

## Auth And Admin Verification

- [x] Next.js sign up / sign in / sign out / reset flows exist
  Source: [Phase C Auth + RBAC + Admin](guides/phase-c-auth-rbac-admin.md)
- [x] Email verification is enforced
  Source: [Phase C Auth + RBAC + Admin](guides/phase-c-auth-rbac-admin.md)
- [x] Disposable email blocking is implemented
  Source: [Phase C Auth + RBAC + Admin](guides/phase-c-auth-rbac-admin.md)
- [x] Role-aware route protection exists
  Source: [Phase C Auth + RBAC + Admin](guides/phase-c-auth-rbac-admin.md)
- [x] Admin panel exists for role, status, and delete actions
  Source: [Phase C Auth + RBAC + Admin](guides/phase-c-auth-rbac-admin.md)
- [x] Privileged actions are audit-logged
  Source: [Phase C Auth + RBAC + Admin](guides/phase-c-auth-rbac-admin.md)

## Environment And Delivery

- [x] `dev`, `preview`, and `prod` environments are defined
  Source: [Environment Matrix](guides/environment-matrix.md)
- [x] Required environment variables are documented
  Source: [Environment Matrix](guides/environment-matrix.md), [Local Development Setup](guides/local-development.md)
- [x] CI policy for lint, typecheck, test, and build is documented
  Source: [Environment Matrix](guides/environment-matrix.md)
- [ ] Preview deploy QA is complete for the next release
  Source: [Deployment and QA Checklist](guides/deployment-qa.md)
- [ ] Production deploy QA is complete for the next release
  Source: [Deployment and QA Checklist](guides/deployment-qa.md)

## Release And QA

- [ ] Confirm CI workflow is green before deploy
  Source: [Deployment and QA Checklist](guides/deployment-qa.md)
- [ ] Confirm required Supabase migrations are applied
  Source: [Deployment and QA Checklist](guides/deployment-qa.md)
- [ ] Run auth smoke checks
  Source: [Deployment and QA Checklist](guides/deployment-qa.md)
- [ ] Run protected route smoke checks
  Source: [Deployment and QA Checklist](guides/deployment-qa.md)
- [ ] Run admin panel and audit smoke checks
  Source: [Deployment and QA Checklist](guides/deployment-qa.md)
- [ ] Run editor publish and rollback smoke checks
  Source: [Deployment and QA Checklist](guides/deployment-qa.md)
- [ ] Validate Netlify serves the latest build
  Source: [Deployment and QA Checklist](guides/deployment-qa.md)
- [ ] Confirm legacy redirects still resolve
  Source: [Deployment and QA Checklist](guides/deployment-qa.md)
- [ ] Capture release evidence if required
  Source: [Deployment and QA Checklist](guides/deployment-qa.md)

## Hardening

- [ ] Complete E2E regression suite for critical paths
  Source: [SaaS Transition Work Plan](guides/saas-transition-work-plan.md)
- [ ] Run performance and accessibility checks
  Source: [SaaS Transition Work Plan](guides/saas-transition-work-plan.md)
- [ ] Validate security controls and RLS behavior
  Source: [SaaS Transition Work Plan](guides/saas-transition-work-plan.md)
- [ ] Finalize observability dashboards and alerting
  Source: [SaaS Transition Work Plan](guides/saas-transition-work-plan.md)
- [ ] Prepare release checklist and rollback playbook
  Source: [SaaS Transition Work Plan](guides/saas-transition-work-plan.md)
- [ ] Execute production smoke test protocol
  Source: [SaaS Transition Work Plan](guides/saas-transition-work-plan.md)
