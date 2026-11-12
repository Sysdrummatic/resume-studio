# OpenCiVera — Project Status

**Last Updated:** 2026-11-12
**Current Phase:** G — Community Beta Testing (P0 gate closed, recruitment next); SEO T16–T19 running in parallel
**Overall Progress:** ~85% (A–F, I and M complete; G P0 security gate 6/6 closed, beta program not started; J–O pending)

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
| G | Community Beta Testing + P0 Security Entry Gate | 🔄 P0 gate closed (6/6, G-P0-01…06); beta recruitment/run not started ([#98](https://github.com/Sysdrummatic/resume-studio/issues/98)–[#102](https://github.com/Sysdrummatic/resume-studio/issues/102)) | ~35% | After I |
| I | Hardening, QA & Launch Readiness | ✅ Complete (umbrella [#216](https://github.com/Sysdrummatic/resume-studio/issues/216) closed 2026-10-21; last hardening PR #270 merged 2026-11-03) | 100% | Nov 2026 |
| SEO | SEO, AI Visibility & Discoverability (T00–T20) | 🔄 T00–T15 and T20 closed; T16–T19 open | ~80% | Q4 2026 |
| J | AI & Ecosystem | ⏳ Post-launch | 0% | TBD |
| K | ATS Intelligence | ⏳ Post-launch (PR [#162](https://github.com/Sysdrummatic/resume-studio/pull/162) open since 2026-09-15, not merged) | ~10% | TBD |
| L | Semantic Public Link URL | ⏳ Post-launch | 0% | TBD |
| M | Security, Privacy & Trust | ✅ Complete (closed with PR #276, 2026-11-06: rate limiting, auth boundary, env separation); MFA/CAPTCHA deliberately deferred to [#275](https://github.com/Sysdrummatic/resume-studio/issues/275) | 100% | Nov 2026 |
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

Phase M is closed and Phase G's six P0 security tasks are closed, so external beta
onboarding is no longer blocked by security gates.

Phase O is independent of the A→N chain — it extracts the OpenCV YAML format into a
standalone, externally versioned specification (analogous to OpenAPI), with
OpenCiVera migrating to consume it. It should not start before Phase G's P0 gate
closes (now met), but has no other hard dependency.

---

## Phase I — Closed

Phase I is complete; the delivered hardening work is listed below. Its Deploy QA / Release checklists in [phase-i-hardening-qa.md](phases/phase-i-hardening-qa.md) are not ticked there, so reconcile that doc with this status.


**Delivered:**
- [x] Local CI gates green (lint / typecheck / test / build)
- [x] Reusable Playwright preview smoke runner for public routes and anonymous protected-route redirects
- [x] Privacy Policy page, Terms of Service page
- [x] Self-service account deletion (GDPR Art. 17)
- [x] Last-admin deletion safeguard (DB trigger + API guard)
- [x] PDF rendering module (ADR 0014) + draft feature flag
- [x] Apply `20260610000000_pdf_feature_flags.sql` to production (verified 2026-07-09)
- [x] Release and rollback runbook ([release-and-rollback.md](runbooks/release-and-rollback.md), 2026-10-21)
- [x] Production smoke protocol ([production-smoke-protocol.md](runbooks/production-smoke-protocol.md), 2026-10-21; written, not yet executed)
- [x] RLS validation: live cross-account tests (`npm run test:rls`, in CI) and the anonymous-access fixes found by them ([incident](incidents/2026-10-21-anon-target-user-access.md))
- [x] API authorization audit; deactivated accounts lose DB-level staff access (#263, migration on test and prod 2026-11-03)
- [x] Environment readiness gate (#159) and prod/test environment separation ([environment-separation.md](runbooks/environment-separation.md), #273)
- [x] Production dependency advisories remediated (#157)
- [x] Distributed rate limiting with trusted client IP (#272, G-P0-05)
- [x] Supabase Auth boundary controls ([supabase-auth-production-checklist.md](runbooks/supabase-auth-production-checklist.md), #274)
- [x] Private pages `noindex` instead of robots block (#269); header touch targets and min text size (#268)

---

## Open GitHub Work (snapshot 2026-11-12)

23 open issues, 1 open PR.

| Area | Open items | Note |
|------|-----------|------|
| Phase M leftovers | [#271](https://github.com/Sysdrummatic/resume-studio/issues/271) integration tracker (phase closed, sub-work merged via #276, issue still open — close it); [#275](https://github.com/Sysdrummatic/resume-studio/issues/275) TOTP UI, MFA at sign-in, AAL2 in RLS, CAPTCHA | #275 deferred by owner (low); `assert_staff_aal2()` exists on test only — drift to reconcile |
| SEO | [#234](https://github.com/Sysdrummatic/resume-studio/issues/234) GSC/Bing verification (high), [#233](https://github.com/Sysdrummatic/resume-studio/issues/233) mobile, [#235](https://github.com/Sysdrummatic/resume-studio/issues/235) AI-visibility content, [#236](https://github.com/Sysdrummatic/resume-studio/issues/236) re-measurement | #233 partly fixed by #254/#268; indexing of user CVs deliberately paused (ADR 0001/0005) |
| Landing / UX | [#190](https://github.com/Sysdrummatic/resume-studio/issues/190), [#191](https://github.com/Sysdrummatic/resume-studio/issues/191), [#189](https://github.com/Sysdrummatic/resume-studio/issues/189) (app i18n, ADR 0022), [#209](https://github.com/Sysdrummatic/resume-studio/issues/209), [#206](https://github.com/Sysdrummatic/resume-studio/issues/206), [#90](https://github.com/Sysdrummatic/resume-studio/issues/90), [#89](https://github.com/Sysdrummatic/resume-studio/issues/89), [#87](https://github.com/Sysdrummatic/resume-studio/issues/87) | No activity since 2026-09-15 except #206 |
| Beta bugs | [#173](https://github.com/Sysdrummatic/resume-studio/issues/173) Saved Versions filter can revert default CV (high), [#166](https://github.com/Sysdrummatic/resume-studio/issues/166), [#176](https://github.com/Sysdrummatic/resume-studio/issues/176) | #173 is the only high |
| Beta program | [#98](https://github.com/Sysdrummatic/resume-studio/issues/98)–[#102](https://github.com/Sysdrummatic/resume-studio/issues/102) | Recruitment, channels, window, feedback, review |
| Phase K | [#161](https://github.com/Sysdrummatic/resume-studio/issues/161) + PR [#162](https://github.com/Sysdrummatic/resume-studio/pull/162) | PR stale since 2026-09-15; master has moved on (language parity, QR codes), rebase before review |
| CV templates | [#277](https://github.com/Sysdrummatic/resume-studio/issues/277) integration branch `ocv-0277-nowe-szablony-cv` | New template families (standard / premium / tech / bold); discovery done, approach and lineup awaiting decision |

Closed since the last STATUS update (2026-10-22): SEO T12b–T15 and T20 (#250, #232, #231, #237), Phase I umbrella #216 and gate #159, ATS badge bug #171, and the Phase M security PRs (#272–#276).

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
Security risks tracked in `docs/security/security-and-risk-plan.md` in the private `OpenCiVera-Project` repo.

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
