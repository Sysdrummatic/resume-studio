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

- [ ] Implement SSR or ISR public route `/r/[slug]`
  Source: [SaaS Transition Work Plan](guides/saas-transition-work-plan.md)
- [ ] Apply indexing controls to robots and headers for public resume pages
  Source: [SaaS Transition Work Plan](guides/saas-transition-work-plan.md)
- [ ] Add canonical URLs and OpenGraph/Twitter metadata for public resume pages
  Source: [SaaS Transition Work Plan](guides/saas-transition-work-plan.md)
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
- [ ] Complete Next.js consumption of `resume_public_links` via `/r/[slug]`
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
