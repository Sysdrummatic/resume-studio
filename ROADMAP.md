# OpenCiVera Product Roadmap

> One source of truth for your career. A living link, not a static file.
> Built in public — here's where we're going.

**Updated**: 2026-05-27  
**Overall Progress**: 63% (4 phases complete, 3 in progress)  
**Current Focus**: Phase E (Launch prep) → Phase G (Hardening & QA)  
**Status Note**: Phase E technical core (100% complete as of 2026-05-23); launch prep not yet started. Phase G CI automation complete (187 tests ✓); manual QA pending.  

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

### Phase F: User Experience & Community

**May–Jun 2026** ✓ Complete (Delivered Early)

User dashboard, PDF/ATS export, owner analytics, and audit logging.

- ✓ User dashboard — CV versions, links, analytics
- ✓ PDF export — Bento-style professional format
- ✓ ATS-ready export — Clean text for applicant systems
- ✓ Analytics — View counts and traffic insights
- ✓ Audit logging — Privilege action tracking
- ✓ Recruiter baseline — Public CV access for recruiter role

**Details**: [docs/phases/phase-f-ux-community.md](docs/phases/phase-f-ux-community.md)

---

### Phase G: Hardening, QA & Launch Readiness

**Jun 2026** ◐ 20% In Progress (CI automation done; manual QA pending)

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

**Details**: [docs/phases/phase-g-hardening-qa.md](docs/phases/phase-g-hardening-qa.md)

---

### Phase H: AI & Ecosystem

**Jul–Sep 2026** ◯ Planned (Post-Launch)

AI-assisted CV generation, community themes, integrations, third-party adoption.

- ◯ AI demo CV generation — Fictional but realistic, one-click
- ◯ Job description tailoring — AI-assisted alignment
- ◯ Community themes — Open-source style contributions
- ◯ LinkedIn import — Seed CV from profile
- ◯ GitHub enrichment — Auto-populate tech stack
- ◯ Third-party integrations — OpenCV YAML ecosystem

**Details**: [docs/phases/phase-h-ai-ecosystem.md](docs/phases/phase-h-ai-ecosystem.md)

---

### Phase I: Professional Identity Platform

**2027+** ✦ Vision Only

Verified professional identity, recruiter access, public API, and OpenCiVera as the trusted professional profile standard.

- ✦ Identity verification (LinkedIn + document-based trust)
- ✦ Recruiter panel (search, filter, bookmark candidates)
- ✦ Public API (OpenCV standard for ATS systems)
- ✦ GDPR/Privacy tools (export, delete, consent)
- ✦ Verified badge system (trust signal)
- ✦ Recruiter scheduling (contact + calendar)

**Details**: [docs/PHASES.md § Phase I](docs/PHASES.md#phase-i-professional-identity-platform-vision)

---

## Key Dependencies

```
A (Foundation) 
├─→ B (YAML Data Layer)
│   ├─→ C (Auth + RBAC)
│   │   ├─→ D (Editor)
│   │   │   ├─→ E (Public Surface) ┐
│   │   │   │                       ├─→ G (Hardening) ─→ H (AI) ─→ I (Platform Vision)
│   │   │   └─→ F (UX/Analytics) ┘
```

**Key Insights**:
- Phases A–D are strictly sequential (each blocks the next)
- E and F overlap in parallel (both start after D)
- G starts after E completes (independent of F timing)
- H is post-launch (only starts after G goes live)
- I is vision-only (no current timeline)

---

## Execution & Progress Tracking

- **Consolidated Action Plan**: [docs/action-plan.md](docs/action-plan.md)
- **Deployment QA**: [docs/guides/deployment-qa.md](docs/guides/deployment-qa.md)
- **Machine-Readable Structure**: [docs/ROADMAP_STRUCTURE.json](docs/ROADMAP_STRUCTURE.json)

