# OpenCiVera Product Phases

> **Single source of truth for product phases, completion status, and related documentation.**
> 
> This file replaces scattered phase definitions across action-plan.md, ROADMAP.md, and individual guides. All phase metadata is consolidated here.

Last Updated: **2026-06-15**  
Current Focus: **Phase I (Hardening, QA & Launch Readiness)**  

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
- **Transition**: Phase F beta testing and Phase I hardening tasks now underway in parallel

---

## Phase F: Community Beta Testing

**Status**: ◯ **PLANNED, NOT STARTED**  
**ETA**: 4 weeks (post Phase E launch prep)  
**Theme**: Real-world validation with external beta testers

### Overview
Recruit and run a structured beta program with 5 testers over 4 weeks. Collect feedback via Likert-scale sentiment surveys and GitHub Issues labeling to validate UX, surface bugs, and gather testimonials before Phase I hardening concludes.

### Scope & Deliverables
- [ ] Beta test scenarios adapted for non-technical testers (#71)
- [ ] Recruit 5 beta testers from the tech-writer community (#72)
- [ ] Feedback infrastructure: Typeform, GitHub Project board, Discord/Slack channel (#73)
- [ ] Solo internal QA pass to establish a baseline before external testing (#74)
- [ ] Beta tester onboarding and 4-week testing window (#75)
- [ ] Continuous feedback collection and weekly sentiment tracking (#76)
- [ ] Post-beta review, bug triage, and launch-readiness decision (#77)

### Responsible Parties
- **software_architect**: scenario completeness, GitHub setup/labeling, bug severity assessment
- **ui_ux_designer**: user-friendly language, UX friction review, improvement prioritization
- **frontend_engineer**: technical edge cases, solo QA execution
- **founder**: tester recruitment, onboarding, weekly check-ins, launch decision
- **project_manager**: Typeform/channel setup, daily triage, progress tracking

### Timeline
| Week | Focus |
|------|-------|
| Pre-Week 1 | Setup + solo testing (#71–74) |
| Week 1–2 | Tester onboarding + testing window (#75) |
| Week 1–4 | Feedback collection & daily triage (#76) |
| Week 3–4 | Analysis + prioritization (#77) |

### Key Metrics
| Metric | Target |
|--------|--------|
| Beta testers recruited | 5/5 |
| Avg sentiment score | ≥ 3.5/5 |
| Feedback items logged | ≥ 30 |
| Scenario completion | ≥ 80% per tester |
| Critical bugs found | < 3 (ideally 0) |
| Launch readiness | Green |

### Related Documentation
- **Phase Guide**: [docs/phases/phase-f-community-beta-testing.md](phases/phase-f-community-beta-testing.md)
- **Execution**: [action-plan.md § Phase F](action-plan.md#phase-f---community-beta-testing)
- **Related ADRs**: None

### Success Criteria
5 confirmed beta testers complete ≥80% of scenarios; average sentiment ≥3.5/5 across ≥30 feedback items; 0 critical security issues; launch-readiness decision documented.

---

## Phase G: User Experience & Community

**Status**: ✓ **COMPLETE**  
**ETA**: Jun 2026 (completed early, 2026-05-13)  
**Theme**: User-facing features and analytics

### Overview
Build user dashboard (presets/links management), PDF/ATS export, owner-facing analytics, recruiter access, and audit visibility.

### Key Deliverables
- ✓ User dashboard at `/dashboard` (CV versions, links, analytics)
- ✓ Downloadable PDF export (Bento-style)
- ✓ ATS export dropdown: CVasCode (raw `.yaml`), ATS-cleaned `.txt`, and ATS-cleaned `.yaml`
- ✓ Owner-facing view analytics
- ✓ Admin analytics widgets and audit log explorer
- ✓ Role-inheritance capability model (RBAC PR1–PR6)
- ✓ Recruiter baseline workflow

### Related Documentation
- **Phase Guide**: [docs/phases/phase-g-ux-community.md](phases/phase-g-ux-community.md)
- **Execution**: [action-plan.md § Phase G](action-plan.md#phase-g---user-panel-and-analytics)
- **Related ADRs**:
  - [ADR 0003: Privacy-First Admin Access](adr/0003-privacy-first-admin-access.md) (role inheritance)
  - [ADR 0007: Publication Analytics, View Counting, and Audit Retention](adr/0007-publication-analytics-and-audit-retention.md)

### Success Criteria
Users can see who viewed their CV; admins can audit all actions.

### Notes
- **Delivered early**: Phase G completed 2026-05-13 (2 weeks ahead of schedule)
- **User panel PR**: Merged with public-link management integration
- **Role inheritance**: 6 PRs refactoring RBAC from string literals to capability model

---

## Phase H: PDF Visual Fidelity — Vercel + Puppeteer Migration

**Status**: ◯ **PLANNED, NOT STARTED**  
**ETA**: Jun–Jul 2026 (after Phase G)  
**Theme**: Pixel-perfect PDF export via browser-based rendering

### Overview
Eliminate the visual fidelity gap in PDF exports by switching from a layout-engine-based renderer (`@react-pdf/renderer`) to a browser-based renderer (Puppeteer + Chromium), and migrate the deployment platform from Netlify to Vercel to support the larger serverless bundle Chromium requires.

### Scope & Deliverables
- [ ] Engine factory (`PDF_ENGINE` env var switching) + internal signed-token PDF render route
- [ ] Print-optimized render mode (`mode="pdf"`) with print-safe CSS
- [ ] Vercel migration: `vercel.json`, ported redirects, reconfigured env vars, full preview validation
- [ ] `PuppeteerEngine` implementation (`@sparticuz/chromium` + `puppeteer-core`)
- [ ] Visual QA: PDF output matches web layout pixel-for-pixel (two-column layout, timeline dots, cards, fonts)
- [ ] Cleanup & documentation: keep/remove `react-pdf` decision, update deployment guides, ADR 0015

### Related Documentation
- **Phase Guide**: [docs/phases/phase-h-vercel-puppeteer-pdf.md](phases/phase-h-vercel-puppeteer-pdf.md)
- **Execution**: [action-plan.md § Phase H](action-plan.md#phase-h---pdf-visual-fidelity-vercel--puppeteer-migration)
- **Implementation Guide**: [Vercel + Puppeteer PDF Migration Guide](guides/vercel-puppeteer-pdf-migration.md)
- **Related ADRs**:
  - [ADR 0015: PDF Rendering Migration — Puppeteer on Vercel](adr/0015-vercel-puppeteer-pdf-migration.md)
  - [ADR 0014: PDF Rendering Architecture](adr/0014-pdf-rendering-architecture.md) (partially superseded)

### Success Criteria
PDF exports are pixel-perfect and match the web CV layout exactly; all routes validated on Vercel; internal render route secured with HMAC tokens; visual QA passed; documentation updated to reflect Vercel.

---

## Phase I: Hardening, QA & Launch Readiness

**Status**: ◐ **60% IN PROGRESS**  
**ETA**: Jun 2026 (target: 2026-06-30)  
**Started**: 2026-05-20  
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
- [ ] Deployment platform validated
- [ ] Legacy redirect verification (*.html routes)
- [ ] E2E regression suite for critical paths
- [ ] Performance and accessibility checks
- [ ] Security controls and RLS policy validation
- [ ] Observability dashboards and alerting configured
- [ ] Release checklist and rollback playbook prepared
- [ ] Production smoke test protocol executed

### Related Documentation
- **Phase Guide**: [docs/phases/phase-i-hardening-qa.md](phases/phase-i-hardening-qa.md)
- **Execution**: [action-plan.md § Phase I](action-plan.md#phase-i---hardening-qa-and-launch-readiness)
- **QA Checklist**: [docs/guides/testing/deployment-qa.md](guides/testing/deployment-qa.md)
- **Related ADRs**:
  - [ADR 0010: API Hardening and Resource Protection](adr/0010-api-hardening-and-resource-protection.md)

### Success Criteria
All critical paths tested; security/perf/a11y checks pass; team confident in launch.

### Current Progress (as of 2026-05-27)
- **Completed**: Local CI gates green
- **In Progress**: Deploy QA (preview); auth smoke checks scheduled
- **Blocked**: None
- **At Risk**: Release timeline depends on parallel Phase J AI feature decisions

---

## Phase J: AI & Ecosystem (Post-Core Delivery)

**Status**: ◯ **PLANNED, NOT STARTED**  
**ETA**: Q3 2026 (after Phase I launch)  
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
- **Phase Guide**: [docs/phases/phase-j-ai-ecosystem.md](phases/phase-j-ai-ecosystem.md)
- **Execution**: [action-plan.md § Phase J](action-plan.md#phase-j---ai-extras-post-core-delivery)
- **Implementation Plan**: [docs/guides/features/ai-demo-resume-generation-plan.md](guides/features/ai-demo-resume-generation-plan.md)
- **Related ADRs**: None yet (to be created during Phase I planning)

### Success Criteria
First AI features in production; documented OpenCV YAML integration example.

### Notes
- **Not blocking Phase I**: Phase J is purely additive; no Phase I gates depend on it
- **Implementation pattern**: Each Phase J feature is self-contained workstream
- **Community-driven**: OpenCV YAML standard to be published for third-party adoption

---

## Phase K: ATS Intelligence (Post-Launch)

**Status**: ◯ **PLANNED, POST-LAUNCH**  
**ETA**: TBD (after Phase I)  
**Theme**: Live ATS compliance scoring in the editor

### Overview
Live, read-only ATS compliance scoring in the Master Resume editor. Analyzes the YAML source against ATS export rules — never modifies CV data, never touches the visual PDF layout.

### Scope & Deliverables
- [ ] **K-1 — ATS Score Sidebar (static rules)**: `app/lib/ats-rules.ts` scoring engine, collapsible sidebar with score ring + category mini-bars + issue list, covering Structure/Skills/Dates/Contact/Metadata categories
- [ ] **K-2 — Visual Score tab**: human-readability rules (summary length, bullet counts, measurable achievements, language coverage)
- [ ] **K-3 — AI keyword gap analysis (post Phase I)**: `POST /api/resume/ats-keyword-gap` comparing CV content against a job description using a free-tier LLM (Gemini Flash / Groq), rate-limited per user/day

### Related Documentation
- **Phase Guide**: [docs/guides/phase-k-ats-intelligence-plan.md](guides/phase-k-ats-intelligence-plan.md)
- **Execution**: [action-plan.md § Phase K](action-plan.md#phase-k---ats-intelligence-post-launch)
- **Foundation**: `app/lib/ats-export-rules.ts` (delivered in the ATS Export refactor, Phase G)
- **Related ADRs**: None yet

### Success Criteria
Correct ATS score for the Ariana Holt fixture; all scoring rules covered by unit tests; sidebar update latency < 600ms; zero regressions in editor tests.

---

## Phase L: Semantic Public Link URL (Post-Launch)

**Status**: ◯ **PLANNED, POST-LAUNCH**  
**ETA**: TBD (after Phase I and Phase K)  
**Theme**: Human-readable, recruiter-friendly public CV URLs

### Overview
Introduce a semantic, snapshot-stable public URL model: `/{name-slug}/{public_id}` (general) and `/{name-slug}/{role-slug}/{public_id}` (role-specific), separating the human-readable name slug from the opaque public ID and optionally encoding the targeted role at publish time.

### Scope & Deliverables
- [ ] **PR1** — Migrate `profiles.person_slug` to hyphenated `name-slug` format with a dry-run report; add `301` redirects from legacy slug shapes
- [ ] **PR2** — Add `resume_public_links.role_slug` + `link_type` columns/constraints; new route `app/[personSlug]/[roleSlug]/[publicId]/page.tsx`
- [ ] **PR3** — Publish modal general/role choice (immutable after first publish), `publish_resume_saved_version` RPC extension, backfill existing links to `link_type = 'general'`

### Related Documentation
- **Phase Guide**: [docs/guides/phase-l-semantic-url-plan.md](guides/phase-l-semantic-url-plan.md)
- **Execution**: [action-plan.md § Phase L](action-plan.md#phase-l---semantic-public-link-url-post-launch-after-phase-k)
- **Related ADRs**:
  - [ADR 0013: Semantic Public Link URL](adr/0013-semantic-public-link-url.md)

### Success Criteria
Both URL formats work end-to-end; legacy URLs `301`-redirect to the new format; publish modal lets the user choose the format before first publish, and the choice is immutable afterward.

---

## Phase M: Professional Identity Platform (Vision/Future)

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
- **Related ADRs**: To be created during Phase J retrospective
- **Strategic notes**: Defined in original ROADMAP.md but not part of MVP timeline

### Success Criteria
OpenCiVera becomes trusted identity standard; third-party integrations exist.

---

## Phase Dependency Graph

```
A (Foundation)
└─→ B (YAML Data Layer)
    └─→ C (Auth + RBAC)
        └─→ D (Editor)
            └─→ E (Public Surface)
                ├─→ F (Beta Testing)
                ├─→ G (UX/Community) ─→ H (PDF Fidelity)
                └─→ I (Hardening & Launch)
                    ├─→ J (AI & Ecosystem) ─→ M (Platform Vision)
                    └─→ K (ATS Intelligence) ─→ L (Semantic URL)
```

**Key Constraints**:
- Phases A–D are strictly sequential (each blocks the next)
- E unlocks F (beta testing), G (UX/community), and I (hardening) — these can overlap
- H (PDF fidelity) starts after G completes
- I (hardening/launch) gates J (AI & Ecosystem) and K (ATS Intelligence)
- L (Semantic URL) requires both I and K complete
- M is vision-only (depends on J), no current timeline

---

## Phase Completion Metrics

| Phase | % Complete | Last Updated | Owner |
|-------|---|---|---|
| A | 100% | 2026-04-08 | Foundation team |
| B | 100% | 2026-04-18 | Data team |
| C | 100% | 2026-05-01 | Auth team |
| D | 100% | 2026-05-08 | Frontend team |
| E | 95% | 2026-05-23 | MVP team (PR4 merged) |
| F | 0% | — | Planned |
| G | 100% | 2026-05-13 | Product team |
| H | 0% | — | Planned |
| I | 60% | 2026-05-27 | QA/Security team |
| J | 0% | — | Planned |
| K | 0% | — | Planned, post-launch |
| L | 0% | — | Planned, post-launch |
| M | 0% | — | Vision |

---

## How to Update This File

When a phase is complete or changes status:

1. Update the `Status` line at the top of the phase section
2. Update the `Last Updated` date in the metrics table
3. Link any new deliverables or ADRs
4. Mention new phase guides in the "Phase Guide" link
5. Create a commit message like: `docs: Phase E complete → advance to Phase F`

**This file is the single source of truth.** All other phase references (ROADMAP.md, action-plan.md, CLAUDE.md) should link to this file rather than duplicate definitions.
