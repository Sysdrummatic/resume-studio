# Project Documentation

Authoritative guides and architectural decisions for OpenCiVera.

**Canonical source**: [PHASES.md](PHASES.md) — unified phase definitions, status, deliverables, and all documentation links.

---

## 🎯 Product Phases Overview

| Phase | Status | ETA | Guide |
|-------|--------|-----|-------|
| **A** | ✓ Complete | Apr 2026 | [phases/phase-a-platform-foundation.md](phases/phase-a-platform-foundation.md) |
| **B** | ✓ Complete | Apr 2026 | [phases/phase-b-yaml-data-layer.md](phases/phase-b-yaml-data-layer.md) |
| **C** | ✓ Complete | May 2026 | [phases/phase-c-auth-rbac-admin.md](phases/phase-c-auth-rbac-admin.md) |
| **D** | ✓ Complete | May 2026 | [phases/phase-d-editor-canvas.md](phases/phase-d-editor-canvas.md) |
| **E** | ⬡ 50% | May–Jun | [phases/phase-e-public-surface.md](phases/phase-e-public-surface.md) |
| **F** | ✓ Complete | May 2026 | [phases/phase-f-ux-community.md](phases/phase-f-ux-community.md) |
| **G** | ◐ 20% | Jun 2026 | [phases/phase-g-hardening-qa.md](phases/phase-g-hardening-qa.md) |
| **H** | ◯ Planned | Jul–Sep | [phases/phase-h-ai-ecosystem.md](phases/phase-h-ai-ecosystem.md) |
| **I** | ✦ Vision | 2027+ | [PHASES.md](PHASES.md#phase-i-professional-identity-platform-vision) |

---

## 📋 Execution & Progress Tracking

- [Action Plan](action-plan.md) — execution checklist by phase
- [Deployment QA Checklist](guides/testing/deployment-qa.md) — pre-launch validation

---

## 🏛️ Architecture & Policy

- [Architecture Decision Records](adr/README.md) — ADR 0001–0012 (linked from phases)
- [Privacy-First Admin Access](guides/policies/privacy-first-admin-access-policy.md)
- [Public Route Compatibility](guides/policies/public-route-compatibility-rollout.md)
- [CV Publication Test Contracts](guides/testing/cv-publication-test-contracts.md)
- [Publication Analytics & Audit](guides/policies/publication-analytics-audit-policy.md)
- [OpenCV YAML Contract](guides/policies/opencv-yaml-public-contract-policy.md)
- [SEO/AEO QA Checklist](guides/testing/seo-aeo-preview-qa-checklist.md)

---

## 🛠️ Development & Operations

- [Local Development Setup](guides/development/local-development.md)
- [Environment Matrix](guides/development/environment-matrix.md)
- [Custom Codex Instruction](guides/codex-custom-instruction.md)
- [Responsive UI Patterns](guides/development/responsive-ui-and-drawer-patterns.md)

---

## 📚 Features & Backlog

- [AI Demo Resume Generation](guides/features/ai-demo-resume-generation-plan.md)
- [Future Features Backlog](guides/features/future-features-backlog.md)

---

## 📚 All Guides Organized by Category

For a complete index of implementation guides, see [guides/README.md](guides/README.md).

---

## 📦 Archived Guides

Historical documentation. Not needed for current development.

- [SaaS Transition Work Plan](guides/archive/saas-transition-work-plan.md) — historical execution notes
- [Supabase UI Setup](guides/archive/supabase-ui-setup.md) — retired static auth
- [Supabase Schema Setup](guides/archive/phase-c-supabase-schema-setup.md) — Phase C foundation
- [React Transition Guardrails](guides/archive/react-frontend-transition-plan.md) — static → Next.js migration
- [Content Update Workflow](guides/archive/content-update-workflow.md) — retired static site workflow

---

## 📖 How to Use These Docs

1. **For phase status & overview**: [PHASES.md](PHASES.md)
2. **For implementation details**: Phase-specific guide (see table above)
3. **For execution tasks**: [action-plan.md](action-plan.md)
4. **For architecture decisions**: [adr/README.md](adr/README.md)
5. **For roadmap**: [../ROADMAP.md](../ROADMAP.md) or [ROADMAP_STRUCTURE.json](ROADMAP_STRUCTURE.json)
6. **For guides by category**: [guides/README.md](guides/README.md)

---

## 📝 Creating New Phases

When adding a new phase to the product roadmap:

- **[PHASE_CREATION_GUIDE.md](support/PHASE_CREATION_GUIDE.md)** — Step-by-step instructions for creating phase documents
- **[PHASE_TEMPLATE.md](support/PHASE_TEMPLATE.md)** — Template to copy when starting a new phase
- **[PHASE_CREATION_QUICKSTART.md](support/PHASE_CREATION_QUICKSTART.md)** — 5-minute quick reference

All documents explain structure, linking strategy, and best practices. See [support/DOCUMENTATION_ARCHITECTURE.md](support/DOCUMENTATION_ARCHITECTURE.md) for visual reference.
