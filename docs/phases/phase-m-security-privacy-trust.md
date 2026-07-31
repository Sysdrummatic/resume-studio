# Phase M: Security, Privacy & Trust

**Status**: ◯ **PLANNED, NOT STARTED**

**ETA**: 6–8 weeks

**Depends On**: Phase G P0 security entry gates for external beta; individual workstreams may start earlier

**Source of Truth**: [Security and Risk Plan](../security/security-and-risk-plan.md)

> Move OpenCiVera from feature-level security controls to an evidence-backed security,
> privacy, resilience, and trust program suitable for processing personal CV data.

---

## Overview

Phase M contains every non-P0 remediation and assurance item identified by the July
2026 cybersecurity audit, together with the open and residual risks R01–R08 from the
project security register. P0 vulnerabilities remain launch-blocking work in
[Phase G](phase-g-community-beta-testing.md); Phase M builds the durable controls needed
after those immediate defects are closed.

Phase M is independent of PDF work. PDF rendering happens in-process on Netlify and adds
no processor — see [ADR 0015](../adr/0015-vercel-puppeteer-pdf-migration.md). Any future
change to hosting, PDF processing, data residency or processors re-opens the gates below.

### Key Theme

**From security features → verifiable security operations.** Every important control
must have an owner, automated evidence, production verification, monitoring, and a
tested response or recovery path.

---

## Workstream Notes

| Phase M workstream | Note |
| --- | --- |
| Least privilege, RLS/RBAC, CSRF, API hardening | Re-test after any hosting change |
| Logging, monitoring, incident response, backup recovery | Configure for Netlify |
| CSP and security headers | Validate against netlify.toml and proxy.ts |
| PDF privacy/threat model | Snapshot-only data; rendering never leaves the process |
| AI processor governance | Becomes a hard gate before Phase J/K AI processing |

---

## Scope & Deliverables

### M01 — Least-Privilege Supabase and Service-Role Reduction

- [ ] Inventory every `useServiceRole: true` call and record purpose, caller, data scope,
  and replacement decision.
- [ ] Move owner-scoped resume/profile operations to the authenticated user's JWT so RLS
  remains an independent security boundary.
- [ ] Restrict service role to narrowly scoped server-only administrative operations.
- [ ] Remove service-role fallbacks that silently bypass RLS during ordinary auth/profile
  reads unless an explicit, audited recovery contract requires them.
- [ ] Revoke default/public execution on SECURITY DEFINER functions; grant only required
  roles and keep fixed `search_path` discipline.
- [ ] Add migration tests that inspect effective grants, policies, function ownership,
  and anonymous/authenticated access.

**Definition of Done**: every service-role use has a documented justification; owner
flows pass using user JWT; attempts to read another user's private CV fail at both API
and database boundaries.

**Risk mapping**: R02.

### M02 — Live RBAC/RLS Drift Verification

- [ ] Build integration tests against an isolated Supabase project, not only static SQL
  string/contract tests.
- [ ] Seed `admin`, `manager`, `user`, and `recruiter` actors plus cross-owner documents,
  revisions, presets, public links, snapshots, profile flags, and audit logs.
- [ ] Test direct PostgREST and RPC calls that bypass the Next.js routes.
- [ ] Verify owner-only private content, metadata-only staff visibility, recruiter
  separation, manager target restrictions, last-admin protection, and AAL2 policies.
- [ ] Generate a capability-to-RLS matrix and fail CI when code and database permissions
  drift.
- [ ] Run the matrix after every migration touching auth, profiles, RLS, RPC, publication,
  or audit behavior.

**Definition of Done**: a reproducible live test suite proves the four-role access
matrix and is required by CI for security-sensitive migrations.

**Risk mapping**: R02, R08.

### M03 — API, Session, CSRF, and Destructive-Action Hardening

- [ ] Add centralized validation of `Origin`, `Referer` fallback, and `Sec-Fetch-Site`
  for state-changing browser requests.
- [ ] Add request Content-Type and body-size limits before JSON/YAML parsing.
- [ ] Introduce typed schemas and strict unknown-field rejection for API payloads.
- [ ] Require recent authentication and MFA/AAL2 for role/status changes, staff deletion,
  full data export/import, account deletion, and security-setting changes.
- [ ] Prefer host-only `__Host-` auth cookies; remove broad cookie-domain scope unless a
  reviewed cross-subdomain requirement exists.
- [ ] Standardize generic client errors and server-side correlation IDs; never return raw
  Supabase, SQL, RPC, UUID, secret, or internal step details.
- [ ] Add safe URL-scheme allowlists for CV contact links and future remote image fields.
- [ ] Threat-model account recovery, refresh rotation, session revocation, concurrent
  refresh, and inactive-account behavior.

**Definition of Done**: critical state changes reject cross-origin, stale-session, and
insufficient-AAL requests; malformed/oversized payloads are rejected before expensive
processing; internal errors stay server-side.

**Risk mapping**: R02, R06, R08.

### M04 — Browser and HTTP Defense in Depth

- [ ] Deploy Content-Security-Policy in Report-Only mode with violation collection and a
  migration plan that avoids `unsafe-inline`/`unsafe-eval`.
- [ ] Enforce CSP after reviewing reports; include `frame-ancestors`, `object-src`,
  `base-uri`, `form-action`, and tightly scoped connection/image/font sources.
- [ ] Add HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and
  appropriate cross-origin isolation/resource policies.
- [ ] Validate security headers on page, API, error, redirect, preview, and production
  responses on the active hosting platform.
- [ ] Add automated header checks and clickjacking/XSS regression tests.

**Definition of Done**: production responses meet the documented header baseline and
CSP violations are monitored without breaking public CV, auth, export, or PDF flows.

### M05 — Data Import, Export, Publication, and Cache Integrity

- [ ] Make user data import transactional or stage/validate/commit with a tested rollback
  path; never leave partially replaced CV state.
- [ ] Make multi-field admin updates atomic and audit the complete before/after change as
  one operation.
- [ ] Apply strict aggregate limits for imported languages, documents, versions, nested
  items, aliases, string lengths, and parser CPU time.
- [ ] Re-verify ATS text/YAML/CVasCode exports contain no internal metadata, ratings,
  unpublished locales, draft content, or unintended fields.
- [ ] Make unpublish/revoke invalidate CDN caches immediately or use a cache policy whose
  documented maximum exposure window meets the privacy contract.
- [ ] Verify all public/export resolvers are snapshot-only and cannot fall back to current
  drafts or mutable presets.
- [ ] Add abuse controls and cost budgets for PDF and bulk exports.

**Definition of Done**: failed import/admin operations roll back fully; unpublish meets
the documented revocation SLA; export fixtures prove data minimization.

**Risk mapping**: R03.

### M06 — Audit Logging, Security Telemetry, and Alerting

- [ ] Fix `user.deleted` audit ordering/FK behavior so every successful admin deletion
  leaves a durable event.
- [ ] Define and implement a reviewed staff-account deletion procedure that preserves
  audit history without blocking lawful erasure.
- [ ] Fail privileged operations or raise a high-severity alert when mandatory audit
  persistence fails; do not silently discard audit errors.
- [ ] Remove email addresses, access tokens, session IDs, CV content, and other personal
  data from ordinary application logs; define redaction and pseudonymization rules.
- [ ] Implement structured security events for auth abuse, RBAC denial, role/status
  change, export/import, publish/unpublish, deletion, service-role use, and CSP violation.
- [ ] Configure Sentry or equivalent error tracking with server/client coverage, PII
  scrubbing, environment separation, retention, and alert ownership.
- [ ] Add alerts for credential attacks, unusual exports, repeated RLS denials, service
  role anomalies, dependency vulnerabilities, error spikes, and audit-write failures.
- [ ] Make audit logs tamper-resistant, access-controlled, time-synchronized, and covered
  by the documented 365/730-day retention policy.

**Definition of Done**: critical events are observable end-to-end, alerts are tested,
and audit records survive the lifecycle operations they are meant to evidence.

**Risk mapping**: R06, R08.

### M07 — Backup, Recovery, Availability, and Incident Response

- [ ] Document data classification, system inventory, trust boundaries, data-flow map,
  dependencies, RPO, RTO, and service owners.
- [ ] Verify Supabase backup/PITR configuration, retention, encryption, access control,
  geographic location, and deletion behavior.
- [ ] Perform and evidence a restore exercise into an isolated environment, including
  auth/profile/CV/publication consistency checks.
- [ ] Document recovery for accidental deletion, corrupt migration, credential exposure,
  provider outage, malicious admin action, and ransomware-like loss.
- [ ] Create an incident-response playbook with severity levels, containment, evidence
  preservation, processor coordination, user communication, and decision authority.
- [ ] Create a GDPR breach assessment and notification workflow supporting the 72-hour
  supervisory-authority deadline and high-risk user notification.
- [ ] Run a tabletop exercise and one technical restore/credential-rotation drill.
- [ ] Add uptime, latency, error-budget, queue/cost, and public endpoint availability
  monitoring with an on-call escalation path.

**Definition of Done**: restore and incident exercises produce timestamped evidence,
owners, lessons learned, and tracked remediation actions.

### M08 — Processor, Transfer, and Privacy Governance

- [ ] Classify Disify's role, data location, retention, sub-processors, DPA, and transfer
  mechanism; disable the integration until the assessment and privacy disclosures close.
- [ ] Confirm Supabase DPA acceptance and exact production region in organization settings.
- [ ] Re-verify Netlify and Resend DPA/SCC/TIA status and document sub-processor change
  monitoring.
- [ ] Before Phase J/K AI work, perform a separate DPIA and processor assessment covering
  model training/retention, prompts, CV content, data residency, opt-in/opt-out, human
  review, deletion, and automated-decision limitations.
- [ ] Maintain a Record of Processing Activities, lawful-basis register, retention
  schedule, data-flow diagram, and DSR evidence register.
- [ ] Define deletion from backups and processor systems, including documented exceptions
  and maximum residual retention.
- [ ] Evaluate a DPIA for the current platform and require it before high-risk/new-
  technology processing.

**Definition of Done**: no processor receives personal data without an approved record,
contract/transfer basis, privacy disclosure, retention rule, and named owner.

**Risk mapping**: R01, R04, R05.

### M09 — Legal, Policy, and Data-Subject Operations

- [ ] Complete legal review of Terms sections covering liability and governing law before
  paid use.
- [ ] Deliver Polish versions of Privacy Policy and Terms and keep EN/PL parity through a
  documented review process.
- [ ] Resolve Profile modal language inconsistency.
- [ ] Activate the transactional email domain and verify SPF, DKIM, DMARC, bounce handling,
  and deletion/recovery delivery without exposing PII in logs.
- [ ] Test access, rectification, restriction, objection, portability, and erasure requests
  against the published response SLA.
- [ ] Resolve staff-account deletion and audit-retention conflicts with a lawful,
  documented procedure.
- [ ] Review whether active-account indefinite retention remains necessary and proportionate;
  introduce inactivity/archive rules if justified.

**Definition of Done**: published promises match tested operational procedures and each
policy has an owner, review date, locale parity, and evidence trail.

**Risk mapping**: R01, R06.

### M10 — Secure SDLC and Software Supply Chain

- [ ] Add Dependabot or Renovate with rapid SLAs: critical 24 hours, high 72 hours,
  moderate within the next planned release unless risk accepted.
- [ ] Add `npm audit`/OSV scanning, dependency review, CodeQL/SAST, secret scanning, and
  license/SBOM generation to CI.
- [ ] Pin GitHub Actions to reviewed commit SHAs, set minimal workflow permissions, and
  protect production environments with approval gates.
- [ ] Require branch protection, passing checks, signed/reviewed releases, and two-person
  review for auth, RLS, SECURITY DEFINER, service role, processor, and retention changes.
- [ ] Establish a secret inventory, least-privilege access, rotation cadence, emergency
  revocation procedure, and access auditing for Supabase, hosting, email, monitoring, DNS,
  and GitHub.
- [ ] Scan current files and Git history for secrets; rotate any credential that may have
  been exposed.
- [ ] Produce release evidence: dependency report, SBOM, migration review, security test
  results, preview smoke results, and rollback plan.

**Definition of Done**: security gates are automated, blocking, owned, and reproducible;
production changes cannot bypass review and evidence requirements.

### M11 — Independent Assurance and Public Trust

- [ ] Create an OWASP ASVS 5.0 Level 2 target matrix and link each applicable requirement
  to code, configuration, tests, or accepted risk.
- [ ] Commission an independent penetration test covering auth, RLS/RBAC, IDOR, XSS,
  CSRF, SSRF, business logic, public snapshots, imports/exports, and hosting configuration.
- [ ] Remediate all critical/high pentest findings and independently retest them before
  production GO.
- [ ] Publish `/.well-known/security.txt`, a coordinated vulnerability disclosure policy,
  security contact, response targets, and safe-harbor wording.
- [ ] Create a Trust Center covering processors, data residency, encryption, retention,
  deletion, availability, vulnerability handling, and material incident communication.
- [ ] Consider a private bug bounty after pentest remediation and operational monitoring
  are mature.
- [ ] Build a NIST CSF 2.0 Current/Target Profile and quarterly risk review cadence.
- [ ] Evaluate ISO 27001 or SOC 2 only after controls are consistently operated and
  evidence can be produced over time.

**Definition of Done**: independent testing confirms closure of high-impact findings and
public trust statements are accurate, maintainable, and backed by evidence.

**Risk mapping**: R07 and cross-cutting assurance for R01–R08.

### M12 — Encryption and Data-Minimization Architecture Review

- [ ] Verify TLS, database/storage encryption at rest, backup encryption, key ownership,
  support access, and rotation capabilities for every environment and processor.
- [ ] Evaluate envelope/application-layer encryption for private CV YAML and selected
  sensitive fields, including impact on RLS, search, export, backup, recovery, and key loss.
- [ ] Document the decision in an ADR; do not add cryptography without a viable key
  lifecycle and recovery design.
- [ ] Minimize profile, audit, telemetry, export, and processor payloads to the fields
  required for each purpose.
- [ ] Prevent future AI, analytics, or PDF components from receiving full CV content when
  a smaller derived payload is sufficient.

**Definition of Done**: the project has an approved encryption/data-minimization model,
verified provider settings, and a documented residual-risk decision.

---

## Security and Risk Plan Coverage

| Risk | Phase M treatment | Exit condition |
| --- | --- | --- |
| R01 | M08–M09 | Processor/legal/locale/DSR residual gaps closed |
| R02 | M01–M03 | Live four-role RLS/RBAC matrix passes and service-role scope is minimized |
| R03 | M05 | ATS exports pass minimization and leakage fixtures |
| R04 | closed | Rejected in ADR 0015; no processor added, nothing to assess |
| R05 | M08 before J/K | AI DPIA and processor gate complete before any personal data is sent |
| R06 | M03, M06, M09 | Audit deletion and staff-erasure procedures work end-to-end |
| R07 | M11 plus founder actions | Domain/legal/trademark actions have owners and recorded decisions |
| R08 | M02, M06 | Last-admin safeguard and recovery procedures pass live regression tests |

No risk may be marked Mitigated solely because documentation exists. Closure requires
deployed controls, validation evidence, and an explicit residual-risk decision.

---

## Release Gates

### Gate M-A — Required before external beta

- All Phase G P0 security entry gates complete.
- No open critical/high dependency finding affecting reachable production code.
- Live cross-user RLS smoke test passes.

### Gate M-B — Required before production launch

- M01–M10 complete for production-relevant scope.
- No open critical/high security finding without written owner-approved risk acceptance.
- Independent pentest completed; critical/high findings remediated and retested.
- Backup restore, incident tabletop, auth/RBAC, publication revocation, and deletion tests
  completed successfully.
- Processor register, privacy policy, DPA/SCC/TIA records, and production regions verified.
- Monitoring, alerting, on-call, rollback, and breach-notification procedures active.

### Gate M-C — Required before AI processing

- AI DPIA and processor assessment approved.
- Explicit data minimization, retention, deletion, human review, and user-control contracts
  deployed and tested.
- No CV data is used for provider training unless separately, explicitly, and lawfully
  agreed with the user.

---

## Validation

Automated minimum:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run ci
```

Additional required evidence:

- live Supabase RLS/RPC test matrix;
- dependency, SAST, secret, and SBOM reports;
- CSP/header scan and DAST on preview;
- auth abuse and rate-limit tests;
- import rollback and parser resource-limit tests;
- backup restore and credential-rotation drill;
- independent pentest and retest report;
- processor/DPIA/retention review records.

---

## Rollout and Rollback

- Deliver in small PRs grouped by M01–M12; do not combine behavior changes with unrelated
  refactors.
- Put CSP into Report-Only before enforcement and maintain a tested rollback policy.
- Apply RLS/RPC changes through additive migrations with preview/live-role validation.
- Keep a compatibility path during hosting migration, but never roll back to a known
  vulnerable dependency or weakened access policy.
- Feature-flag high-risk imports, exports, PDF rendering, and future AI processing so they
  can be disabled independently during an incident.
- Every production security change must name rollback steps, data-integrity consequences,
  and monitoring signals.

---

## Related Documentation

- [Security and Risk Plan](../security/security-and-risk-plan.md)
- [Phase G: Community Beta Testing](phase-g-community-beta-testing.md)
- [Phase I: Hardening, QA & Launch Readiness](phase-i-hardening-qa.md)
- [Processor Compliance Checklist](../guides/processor-compliance-checklist.md)
- [Privacy-First Admin Access Policy](../guides/policies/privacy-first-admin-access-policy.md)
- [ADR 0010: API Hardening and Resource Protection](../adr/0010-api-hardening-and-resource-protection.md)
- [ADR 0016: Account Data Retention and Deletion](../adr/0016-account-data-retention-and-deletion.md)
- [STATUS.md](../STATUS.md)

---

## Success Criteria

- Phase G P0 gates remain closed with regression coverage.
- Four-role authorization is proven against a live isolated database.
- Service role is exceptional, narrow, documented, and monitored.
- Security headers, CSRF defense, distributed rate limiting, step-up auth, and safe error
  handling are active in production.
- Imports and privileged updates are atomic; publication revocation meets its SLA.
- Audit, monitoring, alerting, backup restore, incident response, and GDPR breach handling
  are tested rather than merely documented.
- Every processor and international transfer has an approved contract, disclosure,
  retention rule, and owner.
- OWASP ASVS Level 2 evidence is complete and an independent pentest has no unresolved
  critical/high finding.
- Trust Center and vulnerability disclosure surfaces accurately reflect real controls.

---

## Phase M Completion Checklist

- [ ] M01 least-privilege/service-role review complete
- [ ] M02 live RBAC/RLS matrix required in CI
- [ ] M03 API/session/CSRF/step-up hardening deployed
- [ ] M04 CSP and security-header baseline enforced
- [ ] M05 import/export/publication integrity controls deployed
- [ ] M06 audit, security telemetry, and alerting operational
- [ ] M07 restore and incident-response exercises passed
- [ ] M08 processor, transfer, RoPA, retention, and DPIA records approved
- [ ] M09 legal/policy/DSR residual gaps closed
- [ ] M10 secure SDLC and supply-chain gates required in CI
- [ ] M11 ASVS evidence and independent pentest/retest complete
- [ ] M12 encryption and data-minimization ADR accepted
- [ ] Production Gate M-B signed off with no unaccepted critical/high risk

**Overall**: ◯ **0% COMPLETE**
