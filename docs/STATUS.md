# OpenCiVera — Project Status

**Last Updated:** 2026-07-11
**Current Phase:** I — Hardening, QA & Launch Readiness
**Overall Progress:** ~72% (A–F complete; I 60%; G P0 gate 0/5 closed — G-P0-01 implemented, awaiting beta deploy + E2E; J–O pending)

---

## Phase Progress

| Phase | Name | Status | % | ETA |
|-------|------|--------|---|-----|
| A | Platform Foundation | ✅ Complete | 100% | Apr 2026 |
| B | YAML Data Layer | ✅ Complete | 100% | Apr 2026 |
| C | Auth, RBAC & Admin | ✅ Complete | 100% | May 2026 |
| D | Editor Canvas | ✅ Complete | 100% | May 2026 |
| E | UX & Community | ✅ Complete (delivered early) | 100% | May 2026 |
| F | Public Surface & MVP Launch | ✅ Complete (closed 2026-07-03) | 100% | May–Jun 2026 |
| G | Community Beta Testing + P0 Security Entry Gate | ⏳ Planned (P0: 0/5 closed — G-P0-01 implemented, awaiting beta deploy + E2E) | 5% | P0 before beta; program after I |
| I | Hardening, QA & Launch Readiness | 🔄 Active | 60% | Jul 2026 |
| J | AI & Ecosystem | ⏳ Post-launch | 0% | Q3 2026 |
| K | ATS Intelligence | ⏳ Post-launch | 0% | TBD |
| L | Semantic Public Link URL | ⏳ Post-launch | 0% | TBD |
| M | Security, Privacy & Trust | ⏳ Planned | 0% | Jul–Sep 2026 |
| N | Professional Identity Platform | ✦ Vision | 0% | 2027+ |
| O | OpenCV Format Standard & Specification | ⏳ Planned | 0% | TBD (post-G) |

---

## Phase Dependency Graph

```
A → B → C → D → E ── F (Public Surface) ── I (Hardening & Launch) ── G (P0 Gate + Beta)
                     └── M (Security, Privacy & Trust — parallel) ──────┐
                                                                       ├── J (AI) → N (Vision)
                                                                       └── K (ATS) → L (Semantic URL)
```

Phase M's processor, hosting, secret-management, security-header and PDF threat-model
gates must close before launch. Phase G external onboarding remains blocked by its five
P0 security tasks.

Phase O is independent of the A→N chain — it extracts the OpenCV YAML format into a
standalone, externally versioned specification (analogous to OpenAPI), with
OpenCiVera migrating to consume it. It should not start before Phase G's P0 gate
closes, but has no other hard dependency.

---

## Active Sprint: Phase I — Remaining Items

**Completed:**
- [x] Local CI gates green (lint / typecheck / test / build — 187 tests ✓)
- [x] Privacy Policy page, Terms of Service page
- [x] Self-service account deletion (GDPR Art. 17)
- [x] Last-admin deletion safeguard (DB trigger + API guard)
- [x] PDF rendering module (ADR 0014) + draft feature flag
- [x] Apply `20260610000000_pdf_feature_flags.sql` to production (verified 2026-07-09: `pdf_draft_enabled` present and enabled)

**Pending — Deploy QA:**
- [ ] Preview deploy QA complete
- [ ] Production deploy QA complete
- [ ] Auth smoke checks (sign-up, sign-in, reset, verify)
- [ ] Protected route smoke checks
- [ ] Admin panel and audit smoke checks
- [ ] Editor publish / rollback smoke checks

**Pending — Release:**
- [ ] E2E regression suite for critical paths
- [ ] Performance and accessibility checks
- [ ] Security controls and RLS policy validation
- [ ] Observability dashboards and alerting configured
- [ ] Release checklist and rollback playbook prepared
- [ ] Production smoke test protocol executed

---

## Reference

| What | Where |
|------|-------|
| Phase details | [`docs/phases/phase-*.md`](phases/) |
| Architecture decisions (ADRs) | [`docs/adr/`](adr/) |
| Dev setup & patterns | [`docs/guides/development/`](guides/development/) |
| Testing & QA checklists | [`docs/guides/testing/`](guides/testing/) |
| Policy documents | [`docs/guides/policies/`](guides/policies/) |
| Future features | [`docs/guides/features/`](guides/features/) |
| Print CSS audit findings | [`docs/guides/print-css-audit-findings.md`](guides/print-css-audit-findings.md) |
| Phase K plan | [`docs/phases/phase-k-ats-intelligence-plan.md`](phases/phase-k-ats-intelligence-plan.md) |
| Phase L plan | [`docs/phases/phase-l-semantic-url-plan.md`](phases/phase-l-semantic-url-plan.md) |
| Phase M security plan | [`docs/phases/phase-m-security-privacy-trust.md`](phases/phase-m-security-privacy-trust.md) |
| Phase O OpenCV standard plan | [`docs/phases/phase-o-opencv-standard.md`](phases/phase-o-opencv-standard.md) |
| New phase template | [`docs/support/PHASE_TEMPLATE.md`](support/PHASE_TEMPLATE.md) |

---

## Action Log

Cross-referenced fix log for work items tracked outside the phase documents.
Security risks in [security/security-and-risk-plan.md](security/security-and-risk-plan.md).

### Phase G fixes

#### 2026-07-28 — Print CSS fixes for the public CV route (audit follow-up)

- **What:** Consolidated the two conflicting `@media print` blocks in
  `app/resume/resume.css` into one canonical block and fixed every defect from
  the audit below. Conflicts were settled in favour of the value already winning,
  so no unintended visual change rode along.
- **Fixes:** blanket `break-after: avoid-page` replaced with targeted
  `break-inside: avoid` on cards, timeline entries, and list items (page 1 no
  longer near-blank; `.section` deliberately gets none, so tall sections flow
  instead of jumping a page); `.section-title` orphan protection;
  `color-scheme: light !important` on `:root` (the `!important` is required —
  `app/globals.css:15` declares the dark scheme at equal specificity and bundles
  later); `body::before`/`::after` portal decoration hidden; dead top-level
  `@page`, `.language-switcher`, `.contact-list` grid rule, and
  `.timeline::before` background deleted.
- **Result:** both fixtures print in 3 pages instead of 4; rendered PDF 5.2 MB →
  0.2 MB. Everything the audit confirmed working (chrome suppression, Space
  Grotesk, accent colours, single-column collapse, axis suppression) re-verified
  intact.
- **Coverage:** `tests/print-css-contract.test.mjs` (9 assertions). Structural
  only — re-run `scripts/dev/print-css-audit.mjs` and inspect pages after any
  print CSS change.
- **Docs:** [guides/print-css-audit-findings.md](guides/print-css-audit-findings.md)
  (each finding marked Resolved, with after-fix screenshots); `DESIGN.md` print
  override claim corrected and marked verified.
- **Not done:** the `min-height: 1024px` reset listed as a contributing factor
  proved unnecessary once the break rules were correct; left untouched rather
  than adding a no-op rule.

#### 2026-07-28 — Print CSS audit of the public CV route (diagnostic only)

- **What:** Audited the browser print path (`window.print()` via
  `app/components/print-trigger.tsx`) for `/{personSlug}/{publicId}` using a new
  dev-only tool, `scripts/dev/print-css-audit.mjs` (Playwright, devDependency;
  never bundled). Rendered real A4 PDFs with print media emulated across two
  fixtures and three locales.
- **Outcome:** **No code changed** — findings only. Two P1 defects found: every
  CV wastes page 1 (`break-after: avoid-page` at `app/resume/resume.css:1660–1667`
  is almost certainly a typo for `break-inside: avoid`), and every page carries a
  black frame because `color-scheme: dark` is never reset for print. Plus gradient
  bleed from `body::before`, orphaned section headers, mid-entry timeline splits,
  and two confirmed-dead rules.
- **Findings:** [guides/print-css-audit-findings.md](guides/print-css-audit-findings.md)
- **Follow-up:** Fixes are a separate task; suggested order is in §6 of the findings doc.
  Unrelated to the `@react-pdf/renderer` export pipeline (ADR 0014).

#### 2026-07-19 — Beta-tester opt-in at signup + role-gated docs site (ADR 0020)

- **What:** Sign-up gained an optional "I'm joining as a beta-tester" checkbox
  that sets `profiles.is_test_user` at profile INSERT time only
  (`20260719000000_beta_tester_signup_optin.sql`; the `profiles_guard_update`
  boundary fires on UPDATE only, so the INSERT path is unaffected and post-signup
  changes stay admin-only). A new in-app docs site at `/docs` renders
  git-committed Markdown from `content/docs/`: Tutorials for all authenticated
  users, Test Scenarios only when `canViewTestScenarios(actor)` holds
  (`is_test_user` + the `beta_test_scenarios_visible` feature flag, seeded by
  `20260719010000_beta_test_scenarios_flag.sql`). Access is enforced server-side
  on the route (`notFound()`), nav visibility is UX only.
- **Contract:** ADR 0020 (extends ADR 0019, supersedes its "metrics metadata
  only" non-goal for `is_test_user` docs visibility).
- **Follow-up (same day):** admins now see all docs sections unconditionally —
  `canViewTestScenarios()` short-circuits on `isAdminRole(actor.role)` before the
  test-user/flag checks; managers keep the ADR 0020 rule (ADR 0021, extends
  ADR 0020). The docs site also gained a Mintlify-inspired shell
  (`app/components/docs-layout.tsx`): persistent grouped sidebar on every
  `/docs*` page, category eyebrow above the doc title, and a right-rail
  "On this page" H2/H3 outline (`renderMarkdownWithOutline()` emits matching
  heading `id`s), collapsing below the shared 980px breakpoint exported from
  `app-header-navigation.tsx`. `/docs` index is now a welcome panel, not
  category cards.
- **Tests:** `tests/beta-tester-signup-optin.test.mjs`,
  `tests/beta-docs-feature-flag.test.mjs`, `tests/beta-docs-site.test.mjs`,
  `tests/docs-layout.test.mjs`.

#### 2026-07-15 — Published CV export endpoints ignored Saved Version selection (R09)

- **Problem:** `fetchPublishedResumeExportByPublicLink` returned the stored
  snapshot `yaml_content` (full Master Resume) verbatim, while the public web
  view applied the saved-version selection. PDF, ATS `.txt`, ATS `.yaml`,
  CVasCode, and the public OpenCV API v1 all leaked excluded master content.
- **Fix:** the export resolver applies the same selection as the web view via
  `buildPublishedExportContent` (`app/lib/published-export.ts`, pure and
  runtime-tested), backed by the selection core in
  `app/lib/preset-selection.ts`. Selection indexes are raw-domain (the editor
  builds them against raw parsed YAML arrays), so the public view, dashboard
  preview, and every export apply the selection on the raw YAML object
  **before** normalization — one shared code path; schema-unknown extension
  fields survive the export, invalid selections (out-of-range index,
  selected-summary count ≠ 1) are rejected with 404, and the resolver also
  returns the parsed `resume` so export routes never re-parse the snapshot.
- **Contract:** per ADR 0008, "raw" export means no ATS transformations — the
  saved-version selection is always applied; unselected master content is never
  exposed. See ADR 0008 clarification and risk R09.
- **Tests:** `tests/resume-export-contract.test.mjs`,
  `tests/adr-0008-opencv-public-api-contract.test.mjs`.
