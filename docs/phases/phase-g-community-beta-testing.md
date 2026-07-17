# Phase G: Community Beta Testing

**Status**: ◯ **STARTED**
**ETA**: 6 weeks (post Phase F launch prep)
**Depends On**: Phase F (Public Surface & MVP Launch) core delivery; all Phase G P0 security gates below must close before external beta access

> Recruit and run a structured beta program with 5 testers over 4 weeks. Collect feedback via Likert-scale sentiment surveys and GitHub Issues labeling. Goal: validate UX, surface bugs, and gather user testimonials before Phase I hardening work concludes.

---

## Overview

Phase G is the first real-world validation of OpenCiVera with people outside the founding team. Five beta testers from the tech-writer community walk through 5–7 core user journeys over two weeks, with feedback gathered continuously via Typeform and a private Slack/Discord channel and triaged into GitHub Issues. The phase ends with a consolidated sentiment report, a categorized bug/feature backlog, and launch-readiness recommendations feeding into Phase H and Phase I (hardening).

### Key Theme

**From "it works for us" → "it works for real users."** Structured feedback replaces founder intuition as the primary signal for pre-launch priorities.

### P0 Security Entry Gate — External Beta Blockers

The July 2026 read-only cybersecurity audit identified the following P0 items. They are
part of Phase G because no external tester may receive access until every item is fixed,
tested, deployed to the beta environment, and independently re-verified. Remaining
security, privacy, resilience, and trust work continues in
[Phase M](phase-m-security-privacy-trust.md), which may run in parallel with Phase H.

- [ ] **G-P0-01 — Eliminate stored XSS in public CV JSON-LD** (implemented, awaiting beta deploy + independent E2E re-verification)
  - Replaced unsafe raw `JSON.stringify` output passed to `dangerouslySetInnerHTML` with
    `safeJsonLdScript()` (`app/lib/jsonld.ts`), which escapes `<`, `>`, `&`, U+2028, and
    U+2029 as `\uXXXX` JSON escapes — output remains valid JSON, `</script>` can no longer
    terminate the containing script element.
  - Added a URL protocol allowlist (`app/lib/safe-url.ts`, `sanitizeExternalHref()`) for the
    one other user-controlled `href` in the public CV render path
    (`resume.contact[].link` in `app/components/resume-renderer/ResumeRenderer.tsx`) —
    `javascript:`/`data:`/unparsable values render as plain text instead of a link.
  - Regression tests cover `</script><script>...`, `<`, `>`, `&`, U+2028, U+2029, and the
    protocol allowlist: `tests/jsonld-safe-serializer.test.mjs`,
    `tests/safe-url-protocol-allowlist.test.mjs`, `tests/cv-public-publicid-route.test.mjs`.
  - Manual/E2E verification scenarios:
    `docs/guides/test-scenarios/stored-xss-public-cv-jsonld/stored-xss-public-cv-jsonld.md`
    (not yet executed — required before this gate can close).
  - Added defense-in-depth beyond the P0 scope: a nonce-based CSP (`script-src 'self'
    'nonce-...' 'strict-dynamic'`) in `proxy.ts`, and server-side detection of
    script-injection attempts (`app/lib/content-safety.ts`) logged to a dedicated
    `content_safety_flags` table (migration `20260713000000_content_safety_flags.sql`, `user_id
    ... on delete cascade` — deliberately not `admin_audit_logs`, whose `on delete
    restrict` would block self-service account deletion for a flagged user) and surfaced
    in `/admin/audit`.
  - Not done in this pass: the editor-facing inline "this value looks unsafe" validator —
    deferred to [Phase O](phase-o-opencv-standard.md) (O02) so the ruleset is designed once
    as part of the OpenCV standard rather than ad hoc in this app.

- [ ] **G-P0-02 — Patch known vulnerable runtime dependencies**
  - Upgrade Next.js from 16.2.3 to a version that fixes the identified proxy/auth bypass
    and Server Components DoS advisories (minimum audited target: 16.2.6).
  - Upgrade `js-yaml` from 4.1.1 to a version that fixes repeated-alias quadratic CPU
    exhaustion (minimum audited target: 4.2.0).
  - Run `npm audit`, full CI, import/export regression tests, and a crafted YAML resource
    exhaustion test before beta rollout.

- [x] **G-P0-03 — Close profile flag privilege-boundary gap**
  - [x] Prevent ordinary users from changing `is_test_user`, `is_ocv_staff`, or any future
    privileged profile field through direct PostgREST/profile updates.
  - [x] Change the profile update guard from a denylist to an explicit allowlist of fields
    editable by the profile owner.
  - [x] Add live RLS tests for `user`, `recruiter`, `manager`, and `admin`, including direct
    REST calls that bypass the Next.js UI.

- [ ] **G-P0-04 — Enforce production Supabase Auth controls at the real boundary**
  - Verify production settings independently of `supabase/config.toml`: confirmed email,
    strong password policy, leaked-password protection, refresh-token rotation, secure
    password change, redirect allowlists, and abuse limits.
  - Enable CAPTCHA/Turnstile for signup, recovery, and other abuse-prone anonymous flows.
  - Require MFA/AAL2 for admin and manager accounts and for privileged RLS/RPC operations.
  - Enforce signup policy in Supabase/Auth Hooks so direct calls to the public Supabase
    Auth endpoint cannot bypass disposable-email and password rules.

- [ ] **G-P0-05 — Deploy production-grade distributed rate limiting**
  - Replace the in-memory limiter with a distributed store suitable for serverless
    deployments.
  - Cover signin, signup, reset/resend, token refresh, imports, exports, PDF rendering,
    public API scraping, and destructive/admin actions.
  - Key limits by trusted client IP, account, action, and risk tier; return `Retry-After`
    and emit security telemetry without logging personal data or credentials.

**Gate owner**: software_architect + backend_engineer + test_engineer

**Gate decision**: explicit GO/NO-GO recorded in the Phase G baseline report

**Required evidence**: code review, automated regression tests, live preview validation,
clean dependency audit for high/critical production findings, and documented production
Supabase configuration review

### Private Beta User Recruitment

- [ ] Recruit 5 tech writer community members for feedback
- [ ] Onboard beta users (provide sign-up links, guide to editor)
- [ ] Collect feedback on publish flow, public link sharing, PDF export
- [ ] Document learnings in retrospective

**Timeline**: Jun 2026

**Owner**: Product team

---

## Scope

### #71 — Przygotowanie scenariuszy testowania

Adapt `TEST_SCENARIOS.md` for non-technical beta testers.

- Review existing `TEST_SCENARIOS.md`
- Select 5–7 core scenarios (realistic user journeys)
- Rewrite in user-friendly language (no tech jargon)
- Add expected outcomes per scenario
- Prepare a one-page "quick reference" card for Slack/email distribution

**Responsible**: software_architect (scenario completeness), ui_ux_designer (user language & clarity), frontend_engineer (technical edge cases)

**Output**: `docs/guides/beta-testing/BETA_SCENARIOS.md`

### #72 — Pozyskanie 5 beta testerów

Recruit 5 beta testers from the tech-writer community via LinkedIn and existing networks.

- Identify channels (LinkedIn, tech-writer Slack/forums, existing network)
- Prepare recruitment messaging (value prop: lifetime discount, early access, direct founder contact)
- Outreach to candidates (target: tech writers with 3–5+ years experience)
- Screen and confirm commitment (4 weeks, ~5 hrs/week)
- Document contacts and availability

**Responsible**: founder (outreach, relationship building, messaging)

**Output**: `docs/guides/beta-testing/RECRUITMENT_MESSAGE.md` + beta tester tracker

### #73 — Setup kanałów komunikacji

Stand up the feedback infrastructure: Typeform, GitHub Project board, and a private Discord/Slack channel.

- Typeform: structured feedback form (scenario completion, 1–5 sentiment, open feedback)
- GitHub Project board: Feedback → Triaged → In Review → Backlog
- Private Discord/Slack channel for beta testers (async updates, quick questions).
- Pre-create GitHub labels: `sentiment:positive/neutral/negative`, `bug`, `feature-request`, `ux-feedback`, `priority:*`, `beta-tested`
- Tester-facing README on how to submit feedback

**Responsible**: software_architect (GitHub setup, labeling scheme, automation), project_manager (Typeform configuration, channel management)

**Output**: `docs/guides/beta-testing/TESTER_README.md`

### #74 — Solo internal testing & QA

Founder/QA runs all 7 core scenarios solo before opening to external testers, to catch obvious bugs and establish a baseline.

- Execute all 7 core scenarios as a user, not the builder
- Log all blockers, confusing UX points, and unexpected behaviors
- Prepare a baseline report (bugs vs. UX friction), prioritized critical vs. nice-to-have
- Log bugs to GitHub Issues with `bug` + `priority:*` labels
- Optional: record Loom walkthroughs for the longest/most complex scenarios
- Confirm all five P0 security entry gates are closed and the platform is safe for
  external testers (no known data leaks or auth-boundary defects)

**Responsible**: frontend_engineer / founder (execute scenarios, identify bugs), ui_ux_designer (review UX friction)

**Output**: `docs/guides/beta-testing/BASELINE_REPORT.md`

### #75 — Beta tester onboarding & testing window

Onboard the 5 confirmed testers and run the coordinated 4-week testing window (testing in weeks 1–2, feedback review in weeks 3–4).

- 30-minute onboarding calls: product walkthrough + expectations
- Send beta tester kit (scenarios card, Typeform link, Slack invite, FAQ)
- Weekly async check-ins via Slack
- Track scenario-completion percentage per tester
- Optional screen recordings / Loom for reference
- Target: all 5 testers have completed ≥5/7 scenarios by end of week 2, with zero data-loss or security incidents

**Responsible**: founder (onboarding calls, weekly check-ins, relationship management), project_manager (scheduling, kit distribution, progress tracking)

### #76 — Feedback collection & sentiment tracking

Collect feedback continuously across the 4-week window, with daily triage and weekly sentiment reporting.

- Monitor Typeform responses daily (within 12 hours)
- Monitor the private Slack/Discord channel for async feedback
- Triage Typeform submissions into GitHub Issues in daily batches
- Manual labeling: `sentiment:positive/neutral/negative` + `priority:*` + `beta-tested`
- Calculate a running weekly sentiment average (1–5 Likert)
- Identify emerging patterns (e.g., "everyone confused by X")
- Founder responds to critical/blocker feedback within 24 hours

**Responsible**: project_manager (daily triage, labeling, weekly summaries), founder (Slack responses, clarifications)

### #77 — Post-beta review & prioritization

After 4 weeks, analyze and categorize all feedback to decide what ships before launch vs. post-launch.

- Final sentiment analysis (average score + distribution)
- Bug categorization: critical (blocks launch) vs. high (pre-launch) vs. medium/low (backlog)
- Cluster feature requests by theme (e.g., "export", "sharing", "onboarding")
- Extract 3–5 testimonials (with permission) for the landing page
- Review success metrics against targets
- Make a green/yellow/red launch-readiness decision
- Thank beta testers (discount/testimonial credit)

**Responsible**: software_architect (bug severity assessment), ui_ux_designer (UX improvement prioritization), founder (pre-launch vs. post-launch decision)

**Output**: `docs/guides/beta-testing/PHASE_G_REPORT.md`

---

## Timeline Overview

| Week | Focus | Owner |
|------|-------|-------|
| Pre-Week 1 | Setup + solo testing (#71–74) | Founder + team |
| Week 1–2 | Tester onboarding + testing window (#75) | Founder + project_manager |
| Week 1–4 | Feedback collection & daily triage (#76) | Project manager |
| Week 3–4 | Analysis + prioritization (#77) | Team |

## Key Metrics

| Metric | Target | Check-in |
|--------|--------|----------|
| Beta testers recruited | 5/5 | By day 3 |
| Avg sentiment score | ≥ 3.5/5 | Weekly |
| Feedback items logged | ≥ 30 | By week 4 |
| Scenario completion | ≥ 80% per tester | Weekly |
| Critical bugs found | < 3 (ideally 0) | By week 2 |
| Launch readiness | Green | Week 4 decision |

---

## Related Documentation

- **Execution**: [STATUS.md](../STATUS.md)
- **Test scenario source**: `TEST_SCENARIOS.md`
- **Beta program docs (created during this phase)**:
  - `docs/guides/beta-testing/BETA_SCENARIOS.md`
  - `docs/guides/beta-testing/RECRUITMENT_MESSAGE.md`
  - `docs/guides/beta-testing/TESTER_README.md`
  - `docs/guides/beta-testing/BASELINE_REPORT.md`
  - `docs/guides/beta-testing/PHASE_G_REPORT.md`

---

## Transition to Phase H and I

Findings from Phase G (bug severity, UX friction, testimonials) feed directly into:
- **Phase H** (PDF Visual Fidelity): PDF quality feedback from testers
- **Phase I** (Hardening, QA & Launch Readiness): critical bugs become launch blockers; testimonials support launch marketing
- **Phase M** (Security, Privacy & Trust): non-P0 hardening, GDPR operational controls,
  resilience, monitoring, and assurance; may execute in parallel with Phase H

---

## Success Criteria

- 5 confirmed beta testers complete ≥80% of scenarios
- Average sentiment ≥ 3.5/5 across ≥30 feedback items
- All five P0 security entry gates closed before external tester onboarding
- 0 critical security issues found
- Launch-readiness decision documented in `PHASE_G_REPORT.md`
