# Implementation Guides & Resources

Guides organized by category. Each section links back to the relevant phase in [docs/PHASES.md](../PHASES.md).

---

## 🏗️ Development Setup & Patterns

For setting up a local environment or understanding code patterns.

- [Local Development Setup](development/local-development.md) — Prerequisites, database setup, running tests
- [Environment Matrix](development/environment-matrix.md) — Env vars across preview/production
- [Responsive UI & Drawer Patterns](development/responsive-ui-and-drawer-patterns.md) — UI component patterns
- [Custom Codex Instruction](../guides/codex-custom-instruction.md) — AI-assisted development workflow

---

## ✅ Testing, QA & Deployment

For validating features and deploying to production.

- [CV Publication Test Contracts](testing/cv-publication-test-contracts.md) — Define what "published CV" means (linked from Phase E)
- [SEO/AEO QA Checklist](testing/seo-aeo-preview-qa-checklist.md) — Metadata and search engine validation (Phase E)
- [Deployment QA Checklist](testing/deployment-qa.md) — Pre-launch validation (Phase I)

---

## 🏛️ Architecture & Policy

Design decisions, contracts, and implementation policies linked to ADRs.

- [Privacy-First Admin Access Policy](policies/privacy-first-admin-access-policy.md) — Role inheritance and data isolation (Phase C/G, ADR 0003)
- [Publication Analytics & Audit Policy](policies/publication-analytics-audit-policy.md) — View counting and audit trails (Phase G, ADR 0007)
- [Public Route Compatibility Rollout](policies/public-route-compatibility-rollout.md) — Legacy URL deprecation strategy (Phase E, ADR 0004)
- [OpenCV YAML Public Contract Policy](policies/opencv-yaml-public-contract-policy.md) — YAML schema and evolution (Phase B, ADR 0002)
- [OpenCV Public API & Export Surface](policies/opencv-public-api-export-policy.md) — API contracts (Phase B, ADR 0008)

---

## 📚 Features & Roadmap

Future features and detailed implementation plans.

- [AI Demo Resume Generation Plan](features/ai-demo-resume-generation-plan.md) — Fictional CV generation workstream (Phase J)

---

## 📦 Archived Guides

Historical documentation. Not needed for current development. For reference only.

- [Phase I Features Backlog](archive/phase-i-features-backlog.md) — Post-MVP ideas and Phase I vision (2027+)
- [SaaS Transition Work Plan](archive/saas-transition-work-plan.md) — Historical execution notes (2026-05-09)
- [Phase C Supabase Schema Setup](archive/phase-c-supabase-schema-setup.md) — Legacy foundation guide
- [React Frontend Transition Guardrails](archive/react-frontend-transition-plan.md) — Static → Next.js migration notes
- [Content Update Workflow](archive/content-update-workflow.md) — Retired static site workflow
- [Supabase UI Setup](archive/supabase-ui-setup.md) — Retired static auth flow

---

## Quick Links

- **All Phases**: [docs/PHASES.md](../PHASES.md)
- **Phase-Specific Guides**:
  - Phase B: [phase-b-yaml-data-layer.md](../phases/phase-b-yaml-data-layer.md)
  - Phase C: [phase-c-auth-rbac-admin.md](../phases/phase-c-auth-rbac-admin.md)
  - Phase D: [phase-d-editor-canvas.md](../phases/phase-d-editor-canvas.md)
  - Phase E: [phase-e-public-surface.md](../phases/phase-e-public-surface.md)
  - Phase F: [phase-f-community-beta-testing.md](../phases/phase-f-community-beta-testing.md)
  - Phase G: [phase-g-ux-community.md](../phases/phase-g-ux-community.md)
  - Phase H: [phase-h-vercel-puppeteer-pdf.md](../phases/phase-h-vercel-puppeteer-pdf.md)
  - Phase I: [phase-i-hardening-qa.md](../phases/phase-i-hardening-qa.md)
  - Phase J: [phase-j-ai-ecosystem.md](../phases/phase-j-ai-ecosystem.md)
- **Architecture Decisions**: [docs/adr/README.md](../adr/README.md)
- **Execution Checklist**: [docs/action-plan.md](../action-plan.md)

