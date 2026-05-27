# OpenCiVera Product Phases

> **Single source of truth for product phases, completion status, and related documentation.**
> 
> This file replaces scattered phase definitions across action-plan.md, ROADMAP.md, and individual guides. All phase metadata is consolidated here.

Last Updated: **2026-05-27**  
Current Focus: **Phase G (Hardening & QA)**  

---

## How to Use This File

1. **For phase definitions**: Reference this file instead of ROADMAP.md
2. **For execution tasks**: Link to action-plan.md items (listed under each phase)
3. **For implementation details**: Follow the "Phase Guide" link
4. **For architectural decisions**: Check "Related ADRs"
5. **To add a phase**: See [support/PHASE_CREATION_GUIDE.md](support/PHASE_CREATION_GUIDE.md) and use [support/PHASE_TEMPLATE.md](support/PHASE_TEMPLATE.md)

---

## Phase A: Platform Foundation

**Status**: ✓ **COMPLETE**  
**ETA**: Apr 2026 (completed on schedule)  
**Theme**: Core infrastructure and auth scaffolding

### Overview
Establish the Next.js app shell, Supabase backend, and authentication foundation. Move from aspirational SaaS vision to functioning app.

### Key Deliverables
- ✓ Next.js App Router shell with TypeScript
- ✓ Supabase Auth integration
- ✓ Database schema foundation (profiles, resume_documents)
- ✓ Netlify CI/CD pipeline
- ✓ Environment and secrets management

### Related Documentation
- **Phase Guide**: [docs/phases/phase-a-platform-foundation.md](phases/phase-a-platform-foundation.md)
- **Execution**: [action-plan.md § Phase A](action-plan.md#phase-a---platform-foundation-complete)
- **Related ADRs**: None specific to Phase A

### Success Criteria
All infrastructure green; developers can auth and deploy.

---

## Phase B: YAML Data Layer

**Status**: ✓ **COMPLETE**  
**ETA**: Apr 2026 (completed on schedule)  
**Theme**: Data model unification

### Overview
Establish YAML as the canonical CV format, design database schema, and build migration tooling for resuming YAML data.

### Key Deliverables
- ✓ `resume_documents` table (per-user, per-locale)
- ✓ `resume_revisions` immutable snapshots
- ✓ `resume_public_links` for published sharing
- ✓ YAML validation and migration tooling
- ✓ Next.js consumption of YAML via REST API

### Related Documentation
- **Phase Guide**: [docs/phases/phase-b-yaml-data-layer.md](phases/phase-b-yaml-data-layer.md)
- **Execution**: [action-plan.md § Phase B](action-plan.md#phase-b---yaml-first-data-layer-complete)
- **Related ADRs**: 
  - [ADR 0002: OpenCV YAML Public Contract](adr/0002-opencv-yaml-public-contract.md)
  - [ADR 0008: OpenCV Public API and Export Surface](adr/0008-opencv-public-api-and-export-surface.md)

### Success Criteria
Resume YAML persists in database; Next.js can read and render it.

---

## Phase C: Auth, RBAC & Admin

**Status**: ✓ **COMPLETE**  
**ETA**: May 2026 (completed on schedule)  
**Theme**: User management and role-based access control

### Overview
Implement sign-up/sign-in flows, role hierarchy (admin/manager/user/recruiter), and admin panel for user & role management with audit logging.

### Key Deliverables
- ✓ Sign-up, sign-in, password reset flows (Next.js routes)
- ✓ Email verification + disposable email blocking
- ✓ Role inheritance model (user ← manager ← admin)
- ✓ Capability-based authorization (RBAC guards)
- ✓ Admin panel with user/role/audit controls
- ✓ Audit logging for privileged operations
- ✓ Supabase RLS policies enforcing role separation

### Related Documentation
- **Phase Guide**: [docs/phases/phase-c-auth-rbac-admin.md](phases/phase-c-auth-rbac-admin.md)
- **Execution**: [action-plan.md § Phase C](action-plan.md#phase-c---auth-rbac-and-admin-core-complete)
- **Related ADRs**:
  - [ADR 0003: Privacy-First Admin Access](adr/0003-privacy-first-admin-access.md)
  - [ADR 0010: API Hardening and Resource Protection](adr/0010-api-hardening-and-resource-protection.md)

### Success Criteria
Admin can manage users and roles; users cannot access others' data.

---

## Phase D: Resume Editor Canvas

**Status**: ✓ **COMPLETE**  
**ETA**: May 2026 (completed on schedule)  
**Theme**: Interactive editing and versioning

### Overview
Build the React-based Master Resume Editor with live preview, draft/publish workflow, language version management, and revision history with rollback.

### Key Deliverables
- ✓ React editor at `/master-resume` (form + live preview side-by-side)
- ✓ Per-locale document editing (EN/PL separate)
- ✓ Draft save/restore/clear (browser local storage)
- ✓ YAML import/export/sync
- ✓ Publish creates immutable revision snapshots
- ✓ Revision history with rollback
- ✓ Public/Draft/AI-Generated status badges
- ✓ Language version management UI

### Related Documentation
- **Phase Guide**: [docs/phases/phase-d-editor-canvas.md](phases/phase-d-editor-canvas.md)
- **Execution**: [action-plan.md § Phase D](action-plan.md#phase-d---editor-canvas-and-revisioning-complete)
- **Related ADRs**:
  - [ADR 0006: Draft and Publish Semantics](adr/0006-draft-and-publish-semantics.md)
  - [ADR 0009: Master Resume Document Canonicalization](adr/0009-master-resume-document-canonicalization.md)

### Success Criteria
Users can edit, draft, and publish multi-language resumes with version rollback.

---

## Phase E: Public Surface & MVP Launch

**Status**: ✓ **100% TECHNICAL DELIVERY** + ⚠️ **0% LAUNCH PREP**  
**ETA**: May–Jun 2026  
**Theme**: Public sharing and search visibility

**⚠️ Important**: Core technical work (public routes, SEO, API) is 100% complete (merged 2026-05-23). Launch preparation tasks (demo CV, beta recruitment) have not yet started.

### Overview
Make CVs publicly shareable with SEO/AEO support, structured data (JSON-LD), sitemap/robots, and maintain backward compatibility with legacy `/r/[slug]` URLs.

### Key Deliverables
- ✓ Public route `/person-slug/public-id` with SSR/ISR
- ✓ Canonical URL metadata and redirects
- ✓ OpenGraph/Twitter metadata for social sharing
- ✓ JSON-LD structured data
- ✓ Multilingual SEO (`hreflang`, `?lang=<locale>`)
- ✓ Sitemap and robots.txt generation
- ✓ Legacy `/r/[slug]` compatibility routing
- ✓ ADR backlog closure (0001–0006)
- **Remaining (minor)**:
  - Founder's own CV published as live demo (for marketing)
  - Final beta user recruitment (5 initial testers)

### Related Documentation
- **Phase Guide**: [docs/phases/phase-e-public-surface.md](phases/phase-e-public-surface.md)
- **Execution**: [action-plan.md § Phase E](action-plan.md#phase-e---public-resume-rendering-and-seqaeo)
- **Related ADRs**:
  - [ADR 0001: CV Publication Model](adr/0001-cv-publication-model.md)
  - [ADR 0004: Public Route Compatibility and Deprecation Policy](adr/0004-public-route-compatibility-policy.md)
  - [ADR 0005: SEO/AEO, Structured Data, Sitemap, and Robots Policy](adr/0005-seo-aeo-structured-data-policy.md)
  - [ADR 0007: Publication Analytics, View Counting, and Audit Retention](adr/0007-publication-analytics-and-audit-retention.md)

### Success Criteria
Public CVs are discoverable, shareable, and marked with SEO metadata; legacy links redirect.

### Notes
- **Status as of 2026-05-23**: ADR 0001–0007 merged (PR4); Phase E core delivery complete
- **Remaining work**: Demo CV publication + beta user onboarding (scheduled for end-May)
- **Transition**: Phase G hardening tasks now underway in parallel

---

## Phase F: User Experience & Community

**Status**: ✓ **COMPLETE**  
**ETA**: Jun 2026 (completed early, 2026-05-13)  
**Theme**: User-facing features and analytics

### Overview
Build user dashboard (presets/links management), PDF/ATS export, owner-facing analytics, recruiter access, and audit visibility.

### Key Deliverables
- ✓ User dashboard at `/dashboard` (CV versions, links, analytics)
- ✓ Downloadable PDF export (Bento-style)
- ✓ Plain-text ATS-ready export
- ✓ Owner-facing view analytics
- ✓ Admin analytics widgets and audit log explorer
- ✓ Role-inheritance capability model (RBAC PR1–PR6)
- ✓ Recruiter baseline workflow

### Related Documentation
- **Phase Guide**: [docs/phases/phase-f-ux-community.md](phases/phase-f-ux-community.md)
- **Execution**: [action-plan.md § Phase F](action-plan.md#phase-f---user-panel-and-analytics)
- **Related ADRs**:
  - [ADR 0003: Privacy-First Admin Access](adr/0003-privacy-first-admin-access.md) (role inheritance)
  - [ADR 0007: Publication Analytics, View Counting, and Audit Retention](adr/0007-publication-analytics-and-audit-retention.md)

### Success Criteria
Users can see who viewed their CV; admins can audit all actions.

### Notes
- **Delivered early**: Phase F completed 2026-05-13 (2 weeks ahead of schedule)
- **User panel PR**: Merged with public-link management integration
- **Role inheritance**: 6 PRs refactoring RBAC from string literals to capability model

---

## Phase G: Hardening, QA & Launch Readiness

**Status**: ◐ **20% IN PROGRESS** (CI automation complete, manual checks pending)  
**ETA**: Jun 2026 (target: 2026-06-30)  
**Theme**: Quality assurance and production readiness

**Progress Breakdown**:
- ✓ **100%**: Local CI gates (lint/typecheck/test/build — 187 tests ✓)
- ⚠️ **0%**: Deploy QA, smoke tests, performance/accessibility checks
- ⚠️ **0%**: Observability setup, release checklist, rollback playbook

### Overview
Comprehensive testing, security hardening, observability setup, and pre-launch validation. Final gate before production announcement.

### Key Deliverables
- [x] Local CI-equivalent gates configured (lint/typecheck/test/build)
- [ ] Preview deploy QA complete
- [ ] Production deploy QA complete
- [ ] Supabase migrations applied and validated
- [ ] Auth smoke checks (sign-up, sign-in, reset, verify)
- [ ] Protected route access controls verified
- [ ] Admin panel and audit functionality verified
- [ ] Editor publish/rollback workflows tested
- [ ] Netlify deployment validated
- [ ] Legacy redirect verification (*.html routes)
- [ ] E2E regression suite for critical paths
- [ ] Performance and accessibility checks
- [ ] Security controls and RLS policy validation
- [ ] Observability dashboards and alerting configured
- [ ] Release checklist and rollback playbook prepared
- [ ] Production smoke test protocol executed

### Related Documentation
- **Phase Guide**: [docs/phases/phase-g-hardening-qa.md](phases/phase-g-hardening-qa.md)
- **Execution**: [action-plan.md § Phase G](action-plan.md#phase-g---hardening-qa-and-launch-readiness)
- **QA Checklist**: [docs/guides/deployment-qa.md](guides/deployment-qa.md)
- **Related ADRs**:
  - [ADR 0010: API Hardening and Resource Protection](adr/0010-api-hardening-and-resource-protection.md)

### Success Criteria
All critical paths tested; security/perf/a11y checks pass; team confident in launch.

### Current Progress (as of 2026-05-27)
- **Completed**: Local CI gates green
- **In Progress**: Deploy QA (preview); auth smoke checks scheduled
- **Blocked**: None
- **At Risk**: Release timeline depends on parallel Phase H AI feature decisions

---

## Phase H: AI & Ecosystem (Post-Core Delivery)

**Status**: ◯ **PLANNED, NOT STARTED**  
**ETA**: Q3 2026 (after Phase G launch)  
**Theme**: AI-assisted features and community contributions

### Overview
Post-MVP AI features, third-party integrations, and community-driven extensions. Starts after core launch.

### Key Deliverables
- [ ] AI demo CV generation (fictional but realistic data)
- [ ] Job description tailoring (AI-suggested alignment)
- [ ] Community themes (open-source style contributions)
- [ ] LinkedIn import (seed Master CV from profile)
- [ ] GitHub enrichment (auto-populate tech stack)
- [ ] Third-party integrations (OpenCV YAML used by external tools)

### Related Documentation
- **Phase Guide**: [docs/phases/phase-h-ai-ecosystem.md](phases/phase-h-ai-ecosystem.md)
- **Execution**: [action-plan.md § Phase H](action-plan.md#phase-h---ai-extras-post-core-delivery)
- **Implementation Plan**: [docs/guides/ai-demo-resume-generation-plan.md](guides/ai-demo-resume-generation-plan.md)
- **Related ADRs**: None yet (to be created during Phase G planning)

### Success Criteria
First AI features in production; documented OpenCV YAML integration example.

### Notes
- **Not blocking Phase G**: Phase H is purely additive; no Phase G gates depend on it
- **Implementation pattern**: Each Phase H feature is self-contained workstream
- **Community-driven**: OpenCV YAML standard to be published for third-party adoption

---

## Phase I: Professional Identity Platform (Vision/Future)

**Status**: ✦ **VISION ONLY**  
**ETA**: 2027+  
**Theme**: Long-term identity and recruiter platform

### Overview
Mature platform: verified professional identity, recruiter access, public API, GDPR tooling, verified badges, and scheduling integration.

### Key Deliverables
- ✦ Identity verification (LinkedIn + document-based trust signals)
- ✦ Recruiter panel (search, filter, bookmark candidates)
- ✦ Public API (OpenCV standard accessible to ATS systems)
- ✦ GDPR/Privacy tools (full export, delete, consent management)
- ✦ Verified badge system (OpenCiVera link as trust signal)
- ✦ Recruiter scheduling (contact request + calendar integration)

### Related Documentation
- **Phase Guide**: Not yet created (vision phase)
- **Related ADRs**: To be created during Phase H retrospective
- **Strategic notes**: Defined in original ROADMAP.md but not part of MVP timeline

### Success Criteria
OpenCiVera becomes trusted identity standard; third-party integrations exist.

---

## Phase Dependency Graph

```
A (Foundation) 
├─→ B (YAML Data Layer)
│   ├─→ C (Auth + RBAC)
│   │   ├─→ D (Editor)
│   │   │   ├─→ E (Public Surface) ─→ F (UX/Analytics)
│   │   │   │                       └─→ G (Hardening) ─→ H (AI) ─→ I (Platform Vision)
```

**Key Constraints**:
- Phases A–D are strictly sequential (each blocks the next)
- E and F can overlap (E public routes + F user panel in parallel)
- G can start after E completes (hardening independent of F analytics)
- H cannot start until G launch (Phase H is post-core delivery)
- I is vision-only (no current timeline)

---

## Phase Completion Metrics

| Phase | % Complete | Last Updated | Owner |
|-------|---|---|---|
| A | 100% | 2026-04-08 | Foundation team |
| B | 100% | 2026-04-18 | Data team |
| C | 100% | 2026-05-01 | Auth team |
| D | 100% | 2026-05-08 | Frontend team |
| E | 95% | 2026-05-23 | MVP team (PR4 merged) |
| F | 100% | 2026-05-13 | Product team |
| G | 60% | 2026-05-27 | QA/Security team |
| H | 0% | — | Planned |
| I | 0% | — | Vision |

---

## How to Update This File

When a phase is complete or changes status:

1. Update the `Status` line at the top of the phase section
2. Update the `Last Updated` date in the metrics table
3. Link any new deliverables or ADRs
4. Mention new phase guides in the "Phase Guide" link
5. Create a commit message like: `docs: Phase F complete → advance to Phase G hardening`

**This file is the single source of truth.** All other phase references (ROADMAP.md, action-plan.md) should link to this file rather than duplicate definitions.

