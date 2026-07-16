# Security and Risk Plan

Tracks security, privacy, and legal-compliance risks for OpenCiVera. Complements
the general execution risk register in `docs/guides/saas-transition-work-plan.md`
(section 10), which covers engineering/delivery risks (migration, SEO, UI
consistency). This document covers risks involving personal data, legal
exposure, and external processors/dependencies with compliance implications.

Risk IDs (R01, R02, ...) are stable references, used from commits, PRs, and other
docs (e.g. `Refs: docs/security/security-and-risk-plan.md R01`).

## Status legend
- Open — not yet addressed
- In Progress — mitigation underway
- Mitigated — primary mitigation shipped; residual gaps tracked separately
- Deferred — intentionally postponed (e.g. post-launch)

---

## R01 — Personal Data Processing Without GDPR-Compliant Policies/Mechanisms
- Category: Privacy / Legal
- Status: Mitigated (residual gaps open)
- Description: OpenCiVera collects and processes personal data (account info, CV
  content including names, contact details, work history) without, until now, a
  public privacy policy, defined retention rules, a data-subject-request process,
  or a self-service erasure mechanism.
- Mitigations: privacy policy page (`app/privacy/page.tsx`), data retention ADR +
  manual DSR runbook + processor compliance checklist, self-service account
  deletion (Art. 17), Terms of Service page.
- Residual gaps: Resend confirmation email shipped inactive pending domain
  registration (tracked in a separate issue); ToS sections 10-11
  (liability/governing law) require legal review before paying customers; Polish
  translation of privacy policy/ToS not yet done; EN/PL language inconsistency in
  Profile modal noted but not fixed.
- Tracking: `feat/privacy-policy-page`, `docs/data-retention-and-dsr-runbook`,
  `feat/account-deletion-gdpr-art17`, `feat/terms-of-service-page`.

## R02 — RBAC/RLS Privilege Boundary Drift Across 4-Role Model
- Category: Security
- Status: Open (audit scoped)
- Description: admin/manager/user/recruiter roles are enforced via RLS +
  capability helpers (`app/lib/rbac.ts`). As features are added, capability
  checks and RLS policies can drift out of sync, creating privilege-escalation or
  data-leakage paths.
- Mitigations: capability-based RBAC implemented (role inheritance PR1-PR5);
  Phase I includes a dedicated read-only "RBAC capability drift" audit.
- Residual gaps: audit not yet executed.
- Tracking: Phase I pre-launch audits (security/RLS contracts; RBAC capability
  drift).

## R03 — ATS Export Data Quality / Leakage
- Category: Data quality / Privacy-adjacent
- Status: Open (fix scoped)
- Description: CV exports intended for external ATS systems currently leak
  internal metadata, use non-standard section headers/skill-rating notation, and
  inconsistently render "now" vs "Present" — sending more, or differently
  formatted, data than intended to third-party systems.
- Mitigations: comprehensive fix scoped (`ats-export-rules.ts`, export functions,
  three export formats, two new endpoints).
- Residual gaps: not yet implemented.
- Tracking: Phase I ATS export correctness audit.

## R04 — Infrastructure/Processor Change: PDF Rendering Migration to Vercel
- Category: Infrastructure / Privacy (new processor)
- Status: Deferred (planned)
- Description: PDF export migration from `@react-pdf/renderer` to
  Puppeteer-on-Vercel (ADR 0014) introduces Vercel as a new infrastructure
  provider processing personal data (CV content) for PDF generation.
- Mitigations: ADR 0014 + migration guide already written.
- Residual gaps: when executed, must (a) add Vercel to
  `processor-compliance-checklist.md`, (b) update `app/privacy/page.tsx` Section
  4 + "Last updated", (c) verify Vercel's DPA/SCC status — same pattern
  established for Netlify/Resend under R01.
- Tracking: ADR 0014.

## R05 — Future AI Sub-Processors for ATS Scoring (Phase K)
- Category: Privacy (future processor)
- Status: Deferred (post-launch)
- Description: Phase K plans AI-based keyword-gap analysis using Gemini Flash or
  Groq, which would process CV content as a new sub-processor.
- Mitigations: explicitly deferred; not yet built.
- Residual gaps: before enabling, repeat processor-compliance-checklist +
  privacy policy update (same pattern as R04).
- Tracking: Phase K (post-launch).

## R06 — Account Deletion Cascade Completeness
- Category: Security / Privacy
- Status: Mitigated (residual gaps open)
- Description: Self-service account deletion (R01 / Art. 17) depends on complete
  cascading deletes across `resume_*` tables and Supabase Storage objects.
  `admin_audit_logs` is confirmed `ON DELETE RESTRICT` (handled by not writing to
  it for self-deletion).
- Mitigations: cascade map verified end-to-end in ADR 0016; `DELETE
  /api/user/account` (PR4, `feat/account-deletion-gdpr-art17`) implements
  self-service deletion via `deleteAuthUserAsService()`.
- Residual gaps: ADR 0016 "Known Gaps" tracks two open items — (1) the
  `user.deleted` audit entry on the admin-mediated path is silently dropped due
  to insert-after-cascade ordering; (2) **`admin_audit_logs.actor_user_id` is
  `ON DELETE RESTRICT`, so an admin/manager account that has ever performed an
  audited action cannot be deleted via the cascade-only process.** `DELETE
  /api/user/account` (PR4) calls `requireRequestActor()` with no role
  restriction, so an admin/manager can invoke self-service deletion on their own
  account and the cascade would fail at the database level if that account is
  `actor_user_id` on any `admin_audit_logs` row — overlaps with R02 (RBAC
  boundary drift). Recommendation: either restrict this route to
  `user`/`recruiter` roles, or handle staff self-deletion as a separate,
  manually-reviewed procedure (per ADR 0016 Known Gap 2).
- Tracking: `docs/adr/0016-account-data-retention-and-deletion.md` ("Known
  Gaps"), `feat/account-deletion-gdpr-art17`, cross-ref R02.
- Note (R08): the specific case of the *last* admin self-deleting (zero-admin
  state) is now blocked by `feat/last-admin-safeguard` (DB trigger + 409 from
  `DELETE /api/user/account`). The `admin_audit_logs.actor_user_id` `ON DELETE
  RESTRICT` gap above remains open for non-last admin/manager accounts.

## R07 — Brand / Legal Entity Registration Incomplete
- Category: Legal / Business
- Status: Open
- Description: OpenCiVera is not yet a registered business entity; the domain is
  not yet registered; EUIPO class 35/42 trademark verification is pending.
- Mitigations: privacy policy names an individual as data controller, which is
  valid under GDPR at current scale.
- Residual gaps: domain registration blocks Resend activation (R01 residual);
  business registration recommended before scaling beyond personal/early-access
  use; EUIPO verification still pending.
- Tracking: none yet — flagged here as the canonical reference.

## R08 — Admin Account Lockout via Self/Admin Deletion
- Category: Security
- Status: Mitigated
- Description: the system could reach a zero-admin state via self-service
  account deletion (`DELETE /api/user/account`, R06) or via the admin-panel
  flow (an admin deleting another admin account, permitted by
  `can_delete_user_account`).
- Mitigations: `supabase/migrations/20260614_prevent_last_admin_deletion.sql`
  adds a `BEFORE DELETE` trigger on `public.profiles`
  (`prevent_last_admin_deletion()` / `is_last_admin()`) that raises an
  exception if the row being deleted is the last `admin` — a path-independent
  backstop for both deletion paths. `DELETE /api/user/account` additionally
  pre-checks `is_last_admin`/`is_only_profile` via RPC for admin callers and
  returns `409 { error: "last_admin" | "only_account" }` before attempting
  deletion.
- Tracking: `feat/last-admin-safeguard`, cross-ref R06.

## R09 — Unselected Master Resume Content Exposed via Public Export Endpoints
- Category: Privacy / Data exposure
- Status: Mitigated
- Description: the publish RPC stores the full Master Resume YAML in
  `resume_published_cv_locales.yaml_content` with the saved-version selection
  stored alongside. The public web view applied the selection at render time,
  but `fetchPublishedResumeExportByPublicLink` (`app/lib/resume-server.ts`)
  returned `yaml_content` verbatim, so every export surface — PDF, ATS `.txt`,
  ATS `.yaml`, CVasCode raw, and the unauthenticated public OpenCV API v1 —
  served experience entries, skills, and summaries the user had deliberately
  excluded from the published CV. This violated ADR 0008 ("Draft/master/private
  data is never exposed through public export endpoints") and the ADR 0003
  privacy-first posture.
- Mitigations: the export resolver now applies the same selection as the web
  view (`buildPublishedExportYamlContent` → `applyResumePresetSelection` in
  `app/lib/preset-selection.ts`) before returning YAML, and returns 404 when
  the snapshot cannot be filtered. Contract tests pin that the resolver never
  returns raw `yaml_content` (`tests/resume-export-contract.test.mjs`,
  `tests/adr-0008-opencv-public-api-contract.test.mjs`).
- Residual gaps: snapshots continue to store full master YAML at rest
  (server-side only, service-role access); filtering at publish time (storing
  the already-selected document) would change the ADR 0008 versioned contract
  and is deliberately not done here.
- Tracking: Phase G fix (`docs/STATUS.md`), cross-ref ADR 0003 / ADR 0008.

---

## Maintenance
Review this document whenever: a new external processor is introduced, a Phase I
audit completes, or a residual gap above is closed. Update the relevant risk's
"Status" and "Residual gaps", and keep `docs/STATUS.md` cross-referenced.

## Delivery Mapping

- Immediate P0 findings from the July 2026 cybersecurity audit are launch-blocking
  entry gates in `docs/phases/phase-g-community-beta-testing.md`.
- All non-P0 remediation, operational assurance, and the open/residual work for
  R01–R08 are planned in `docs/phases/phase-m-security-privacy-trust.md`.
- Phase M may execute in parallel with Phase H. Vercel/PDF processor, secret,
  observability, data-residency, and threat-model gates must close before the Phase H
  production cutover.
- The former Phase M long-term Professional Identity Platform vision is now Phase N so
  that Phase M remains the dedicated Security, Privacy & Trust program.
