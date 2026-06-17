# OpenCiVera Product Roadmap

> One source of truth for your career. A living link, not a static file.
> Built in public — here's where we're going.

**Updated**: 2026-06-15  
**Overall Progress**: 50% (5 phases complete, 2 in progress, 6 planned/vision)  
**Current Focus**: Phase F (Community Beta Testing) & Phase I (Hardening & QA)  
**Status Note**: Phase E technical core 100% complete (as of 2026-05-23); Phase F beta testing not yet started. Phase I CI automation complete (187 tests ✓); manual QA pending.  

---

## 📍 Single Source of Truth

**For complete phase definitions, status, and documentation**: See [docs/PHASES.md](docs/PHASES.md)

This roadmap provides a high-level timeline view. All phase details, deliverables, and implementation guides are consolidated in `docs/PHASES.md` and linked phase guides.

---

## Phase Timeline

### Completed Foundation & Platform (Phase A–D)

**Apr–May 2026** ✓ Complete

Authentication, RBAC, YAML data layer, editor canvas, admin panel. The engine is built and running.

- ✓ Auth + RBAC + RLS (Supabase-backed, row-level security)
- ✓ OpenCV YAML Schema (Structured, AI-friendly data contract)
- ✓ Master CV Editor (Live preview, YAML panel, draft/publish flow)
- ✓ Saved Versions (Immutable snapshots with rollback)
- ✓ Admin panel (Audit explorer, analytics widgets)
- ✓ Multi-language support (EN/PL, dynamic language switching)

**Details**: [docs/PHASES.md § Phases A–D](docs/PHASES.md)

---

### Phase E: Public Surface & MVP Launch

**May–Jun 2026** ✓ 100% Core Delivery + ⚠️ 0% Launch Prep

**Core Complete** (as of 2026-05-23): Public links, SSR/ISR, SEO/AEO, sitemap, JSON-LD, multi-language support, legacy compatibility.  
**Remaining**: Demo CV publication, beta user recruitment, onboarding materials.

- ✓ Public link (SSR/ISR) — Stable, shareable CV URLs
- ✓ JSON-LD + SEO — Sitemap, robots, structured data
- ✓ Multi-language SEO — `hreflang` and language variant support
- ✓ Legacy compatibility — `/r/[slug]` routes continue to work
- ◯ Founder's demo CV (in progress)
- ◯ Beta user recruitment (in progress)

**Details**: [docs/phases/phase-e-public-surface.md](docs/phases/phase-e-public-surface.md)

---

### Phase F: Community Beta Testing

**4 weeks, post Phase E launch prep** ◯ Planned, Not Started

Recruit and run a structured beta program with 5 testers over 4 weeks. Collect feedback via sentiment surveys and GitHub Issues to validate UX, surface bugs, and gather testimonials before launch.

- ◯ Beta test scenarios adapted for non-technical testers
- ◯ Recruit 5 beta testers from the tech-writer community
- ◯ Feedback infrastructure (Typeform, GitHub Project board, Discord/Slack)
- ◯ Solo internal QA baseline before external testing
- ◯ Beta tester onboarding and 4-week testing window
- ◯ Continuous feedback collection and weekly sentiment tracking
- ◯ Post-beta review and launch-readiness decision

**Details**: [docs/phases/phase-f-community-beta-testing.md](docs/phases/phase-f-community-beta-testing.md)

---

### Phase G: User Experience & Community

**May–Jun 2026** ✓ Complete (Delivered Early)

User dashboard, PDF/ATS export, owner analytics, and audit logging.

- ✓ User dashboard — CV versions, links, analytics
- ✓ PDF export — Bento-style professional format
- ✓ ATS-ready export — Clean text for applicant systems
- ✓ Analytics — View counts and traffic insights
- ✓ Audit logging — Privilege action tracking
- ✓ Recruiter baseline — Public CV access for recruiter role

**Details**: [docs/phases/phase-g-ux-community.md](docs/phases/phase-g-ux-community.md)

---

### Phase H: PDF Visual Fidelity — Vercel + Puppeteer Migration

**Jun–Jul 2026 (after Phase G)** ◯ Planned, Not Started

Eliminate the visual fidelity gap in PDF exports by switching to a browser-based renderer (Puppeteer + Chromium) and migrating the deployment platform from Netlify to Vercel.

- ◯ Engine factory (`PDF_ENGINE` env var switching) + signed-token render route
- ◯ Print-optimized render mode with print-safe CSS
- ◯ Vercel migration and preview validation
- ◯ `PuppeteerEngine` implementation (`@sparticuz/chromium` + `puppeteer-core`)
- ◯ Visual QA: pixel-perfect parity with web layout
- ◯ Cleanup, documentation, and ADR 0015

**Details**: [docs/phases/phase-h-vercel-puppeteer-pdf.md](docs/phases/phase-h-vercel-puppeteer-pdf.md)

---

### Phase I: Hardening, QA & Launch Readiness

**Jun 2026 (target 2026-06-30)** ◐ 60% In Progress

**Complete**: Local CI gates (lint/typecheck/test ✓187/187/build).  
**Pending**: Deploy QA, smoke tests, performance/accessibility, observability, release checklist, rollback playbook.

- ✓ Local CI gates (lint/typecheck/test/build)
- ◯ Deploy QA (preview and production)
- ◯ Auth and access control smoke tests
- ◯ E2E regression suite
- ◯ Performance and accessibility validation
- ◯ Security and RLS verification
- ◯ Observability and alerting
- ◯ Release checklist and rollback plan

**Details**: [docs/phases/phase-i-hardening-qa.md](docs/phases/phase-i-hardening-qa.md)

---

### Phase J: AI & Ecosystem

**Q3 2026 (after Phase I launch)** ◯ Planned, Not Started

AI-assisted CV generation, community themes, integrations, third-party adoption.

- ◯ AI demo CV generation — Fictional but realistic, one-click
- ◯ Job description tailoring — AI-assisted alignment
- ◯ Community themes — Open-source style contributions
- ◯ LinkedIn import — Seed CV from profile
- ◯ GitHub enrichment — Auto-populate tech stack
- ◯ Third-party integrations — OpenCV YAML ecosystem

**Details**: [docs/phases/phase-j-ai-ecosystem.md](docs/phases/phase-j-ai-ecosystem.md)

---

### Phase K: ATS Intelligence (Post-Launch)

**TBD (after Phase I)** ◯ Planned, Post-Launch

Live, read-only ATS compliance scoring in the Master Resume editor — never modifies CV data, never touches the visual PDF layout.

- ◯ K-1: ATS Score Sidebar (static scoring engine + rules)
- ◯ K-2: Visual Score tab (human-readability rules)
- ◯ K-3: AI keyword gap analysis (free-tier LLM, rate-limited)

**Details**: [docs/guides/phase-k-ats-intelligence-plan.md](docs/guides/phase-k-ats-intelligence-plan.md)

---

### Phase L: Semantic Public Link URL (Post-Launch)

**TBD (after Phase I and Phase K)** ◯ Planned, Post-Launch

Human-readable, recruiter-friendly public CV URLs: `/{name-slug}/{public_id}` (general) and `/{name-slug}/{role-slug}/{public_id}` (role-specific).

- ◯ PR1: `profiles.person_slug` migration to hyphenated `name-slug` + legacy redirects
- ◯ PR2: `role_slug`/`link_type` columns + role-specific route
- ◯ PR3: Publish modal general/role choice, RPC extension, link backfill

**Details**: [docs/guides/phase-l-semantic-url-plan.md](docs/guides/phase-l-semantic-url-plan.md)

---

### Phase M: Professional Identity Platform

**2027+** ✦ Vision Only

Verified professional identity, recruiter access, public API, and OpenCiVera as the trusted professional profile standard.

- ✦ Identity verification (LinkedIn + document-based trust)
- ✦ Recruiter panel (search, filter, bookmark candidates)
- ✦ Public API (OpenCV standard for ATS systems)
- ✦ GDPR/Privacy tools (export, delete, consent)
- ✦ Verified badge system (trust signal)
- ✦ Recruiter scheduling (contact + calendar)

**Details**: [docs/PHASES.md § Phase M](docs/PHASES.md#phase-m-professional-identity-platform-visionfuture)

---

## Key Dependencies

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

**Key Insights**:
- Phases A–D are strictly sequential (each blocks the next)
- E unlocks F (beta testing), G (UX/community), and I (hardening) — these can overlap
- H (PDF fidelity) starts after G completes
- I (hardening/launch) gates J (AI & Ecosystem) and K (ATS Intelligence)
- L (Semantic URL) requires both I and K complete
- M is vision-only (depends on J), no current timeline

---

## Execution & Progress Tracking

- **Consolidated Action Plan**: [docs/action-plan.md](docs/action-plan.md)
- **Deployment QA**: [docs/guides/testing/deployment-qa.md](docs/guides/testing/deployment-qa.md)
- **Machine-Readable Structure**: [docs/ROADMAP_STRUCTURE.json](docs/ROADMAP_STRUCTURE.json)
