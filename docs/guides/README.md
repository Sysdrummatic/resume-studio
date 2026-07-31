# Implementation Guides & Resources

Guides organized by category. Each section links back to the relevant phase in [docs/STATUS.md](../STATUS.md).

---

## 🏗️ Development Setup & Patterns

For setting up a local environment or understanding code patterns.

- [Local Development Setup](development/local-development.md) — Prerequisites, database setup, running tests
- [Environment Matrix](development/environment-matrix.md) — Env vars across preview/production
- [Responsive UI & Drawer Patterns](development/responsive-ui-and-drawer-patterns.md) — UI component patterns
- [Codex Instructions](../../.codex/instructions.md) — AI-assisted development workflow and team discipline

---

## ✅ Testing, QA & Deployment

For validating features and deploying to production.

- [CV Publication Test Contracts](testing/cv-publication-test-contracts.md) — Define what "published CV" means (linked from Phase F)
- [SEO/AEO QA Checklist](testing/seo-aeo-preview-qa-checklist.md) — Metadata and search engine validation (Phase F)
- [Deployment QA Checklist](testing/deployment-qa.md) — Pre-launch validation (Phase I)

---

## 🏛️ Architecture & Policy

Design decisions, contracts, and implementation policies linked to ADRs.

- [Privacy-First Admin Access Policy](policies/privacy-first-admin-access-policy.md) — Role inheritance and data isolation (Phase C/E, ADR 0003)
- [Publication Analytics & Audit Policy](policies/publication-analytics-audit-policy.md) — View counting and audit trails (Phase E, ADR 0007)
- [Public Route Compatibility Rollout](policies/public-route-compatibility-rollout.md) — Legacy URL deprecation strategy (Phase F, ADR 0004)
- [OpenCV YAML Public Contract Policy](policies/opencv-yaml-public-contract-policy.md) — YAML schema and evolution (Phase B, ADR 0002)
- [OpenCV Public API & Export Surface](policies/opencv-public-api-export-policy.md) — API contracts (Phase B, ADR 0008)

---

## 📚 Features & Roadmap

Future features and detailed implementation plans.

- [AI Demo Resume Generation Plan](features/ai-demo-resume-generation-plan.md) — Fictional CV generation workstream (Phase J)

---

## 📦 Archived Guides

Historical guides (SaaS transition work plan, legacy schema setup, static-site
workflows, and others) were removed from the repository in commit `36209ca`
("docs: Documentation Alignment"). Retrieve them from git history if needed:
`git show 36209ca^:docs/guides/archive/<file>.md`

---

## Quick Links

- **Project Status & Progress**: [docs/STATUS.md](../STATUS.md)
- **Phase-Specific Guides**:
  - Phase B: [phase-b-yaml-data-layer.md](../phases/phase-b-yaml-data-layer.md)
  - Phase C: [phase-c-auth-rbac-admin.md](../phases/phase-c-auth-rbac-admin.md)
  - Phase D: [phase-d-editor-canvas.md](../phases/phase-d-editor-canvas.md)
  - Phase E: [phase-e-ux-community.md](../phases/phase-e-ux-community.md)
  - Phase F: [phase-f-public-surface.md](../phases/phase-f-public-surface.md)
  - Phase G: [phase-g-community-beta-testing.md](../phases/phase-g-community-beta-testing.md)
  - Phase I: [phase-i-hardening-qa.md](../phases/phase-i-hardening-qa.md)
  - Phase J: [phase-j-ai-ecosystem.md](../phases/phase-j-ai-ecosystem.md)
- **Architecture Decisions**: [docs/adr/README.md](../adr/README.md)

