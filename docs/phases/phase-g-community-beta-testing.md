# Phase G: Community Beta Testing

**Status**: ◯ **STARTED**
**ETA**: 6 weeks (post Phase F launch prep)
**Depends On**: Phase F (Public Surface & MVP Launch) core delivery; all Phase G P0 security gates below must close before external beta access

> Recruit and run a structured beta program with 5 testers over 4 weeks. Collect feedback via Likert-scale sentiment surveys and GitHub Issues labeling. Goal: validate UX, surface bugs, and gather user testimonials before Phase I hardening work concludes.

---

## Overview

Phase G is the first real-world validation of OpenCiVera with people outside the founding team. Five beta testers from the tech-writer community walk through 5–7 core user journeys over two weeks, with feedback gathered continuously via Typeform and a private Slack/Discord channel and triaged into GitHub Issues. The phase ends with a consolidated sentiment report, a categorized bug/feature backlog, and launch-readiness recommendations feeding into Phase I (hardening).

### Key Theme

**From "it works for us" → "it works for real users."** Structured feedback replaces founder intuition as the primary signal for pre-launch priorities.

### P0 Security Entry Gate — External Beta Blockers

The July 2026 read-only cybersecurity audit identified the following P0 items. They are
part of Phase G because no external tester may receive access until every item is fixed,
tested, deployed to the beta environment, and independently re-verified. Remaining
security, privacy, resilience, and trust work continues in
[Phase M](phase-m-security-privacy-trust.md).

- [x] **G-P0-01 — Eliminate stored XSS in public CV JSON-LD** (verified live and closed
  2026-08-26 — all 6 manual scenarios pass; scenario 5's gap found and fixed same day)
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
  - [x] **Manual/E2E verification executed** 2026-08-26 against the `test` Supabase project
    (`docs/guides/test-scenarios/stored-xss-public-cv-jsonld/stored-xss-public-cv-jsonld.md`),
    published a real CV with the attack payloads via the actual editor UI, then verified
    against the live public page in a separate browser tab:
    - [x] Scenario 1 (`</script><script>...`): `window.__xss_fired` is `undefined`, no
      alert, raw JSON-LD contains the literal escape sequence `</script>`, never
      a literal `</script>`.
    - [x] Scenario 2 (JSON-LD validity): parses via `JSON.parse`, `name` field round-trips
      to the exact original payload.
    - [x] Scenario 3 (`<`, `>`, `&`): all three confirmed escaped in the JSON-LD
      (`<`, `>`, `&`) while rendering as readable plain text in the UI.
    - [x] Scenario 4 (link protocols): `javascript:` and `data:text/html,<script>...`
      contact links render with **no `<a>` tag at all** (plain text) — confirmed by
      enumerating every anchor on the live page; the one `https:` contact link rendered
      as a real, correct `<a href>`.
    - [x] **Scenario 5 (Content Safety Flags) — found broken, fixed and re-verified same
      day.** First pass: saved `<img src=x onerror=alert(1)>` through the actual
      master-resume editor, confirmed via direct DB read that the payload persisted —
      `/admin/audit` showed **zero** flags. Root cause #1 (wiring): `flagSuspiciousResumeContent()`
      was called only from `POST /api/resume/draft`, which had **no caller anywhere in
      `app/`** — the editor's actual save action (both "Save unpublished" and "Save
      MasterCV") calls `POST /api/resume/publish`, which never invoked the detector.
      Fixed by adding the call to `app/api/resume/publish/route.ts`
      (`source: "resume_publish_save"`) and, since it has the identical gap,
      `app/api/resume/transfer/import/route.ts` (`source: "resume_import_save"`) — both
      routes persist user-authored YAML the same way `/api/resume/draft` does.
      Re-testing after that fix still showed zero flags. Root cause #2 (schema drift):
      the live `content_safety_flags` table on **both** `prod` and `test` had a column
      named `matched_snippet`, not `match_hash` as the original migration, the insert
      code, and the `/admin/audit` read code all agree on — so every insert failed
      silently (`flagSuspiciousResumeContent` swallows errors by design, so a user's own
      save is never blocked by a detection/logging failure). Confirmed empty (0 rows) on
      both projects before fixing, so a straight `rename column` was safe. Fix migration:
      `20260826000000_fix_content_safety_flags_column_drift.sql`, applied to both
      projects. Re-verified end-to-end: saved the same payload again, confirmed 3 flags
      recorded (`dangerous_open_tag`, `dangerous_close_tag`, `event_handler_attribute`)
      with correct `match_hash`/`source`, visible in the live `/admin/audit` UI as
      `opencvproject+admin`. Test rows deleted after verification. Regression tests:
      `tests/content-safety-flags-column-fix.test.js`.
    - [x] Scenario 6 (CSP): header confirmed present and correctly scoped
      (`script-src 'self' 'nonce-...' 'strict-dynamic'`, no `unsafe-inline` in
      `script-src`). The "inject via DevTools console" sub-check could not be
      meaningfully performed via automation — Chrome's `Runtime.evaluate` (which both
      browser automation and a human typing into the DevTools console use) is exempt
      from a page's CSP by browser design, regardless of whether the CSP itself is
      correctly configured. Not a finding about the app.
  - Added defense-in-depth beyond the P0 scope: a nonce-based CSP (`script-src 'self'
    'nonce-...' 'strict-dynamic'`) in `proxy.ts`, and server-side detection of
    script-injection attempts (`app/lib/content-safety.ts`) logged to a dedicated
    `content_safety_flags` table (migration `20260713000000_content_safety_flags.sql`, `user_id
    ... on delete cascade` — deliberately not `admin_audit_logs`, whose `on delete
    restrict` would block self-service account deletion for a flagged user), surfaced in
    `/admin/audit` — confirmed reachable from the live editor as of 2026-08-26 (see
    Scenario 5).
  - Not done in this pass: the editor-facing inline "this value looks unsafe" validator —
    deferred to [Phase O](phase-o-opencv-standard.md) (O02) so the ruleset is designed once
    as part of the OpenCV standard rather than ad hoc in this app.

- [x] **G-P0-02 — Patch known vulnerable runtime dependencies** (re-patched 2026-08-25 —
  [#117](https://github.com/Sysdrummatic/plm-resume/issues/117) closed the original round;
  a second round was needed for advisories published after that closure)
  - [x] Next.js `^16.2.11` (target was ≥16.2.6) — confirmed installed.
  - [x] `js-yaml` bumped `^4.3.0` → `^4.3.1` — CVE-2026-59870 (quadratic CPU consumption
    in `!!omap` resolution) affects 4.0.0–4.3.0 and was not covered by the earlier
    merge-key fix; 4.3.1 is outside the vulnerable range. `public/vendor/js-yaml.min.js`
    + `.map` re-copied from `node_modules/js-yaml/dist/` per the CLAUDE.md rule.
  - [x] `nanoid` pinned to `^3.3.18` via `package.json` `overrides` (transitive via
    `postcss` via `next`, previously resolved to a vulnerable `<3.3.18` — GHSA-2v37-7h3g-55p8).
    Stayed on the 3.x line deliberately: `postcss` requires nanoid's CommonJS export,
    which 4.x+ dropped.
  - [x] `npm audit --omit=dev --audit-level=high` — 0 findings (2026-08-25). Remaining
    `npm audit` output is 2 dev-only findings (`@babel/core`, `brace-expansion`, via the
    eslint/typescript-eslint toolchain) — out of scope for this gate's production-audit
    criterion.
  - [x] Full CI (`lint` + `typecheck` + `test`, 436/436) green after both bumps.
    Regression coverage: `tests/user-data-transfer.test.mjs`,
    `tests/vendor-js-yaml.min.js` bundle test (repeated-alias merge-key bomb).

- [x] **G-P0-03 — Close profile flag privilege-boundary gap**
  - [x] Prevent ordinary users from changing `is_test_user`, `is_ocv_staff`, or any future
    privileged profile field through direct PostgREST/profile updates.
  - [x] Change the profile update guard from a denylist to an explicit allowlist of fields
    editable by the profile owner.
  - [x] Add live RLS tests for `user`, `recruiter`, `manager`, and `admin`, including direct
    REST calls that bypass the Next.js UI.

- [x] **G-P0-04 — Enforce production Supabase Auth controls for the Phase G beta surface**
  (split 2026-08-26 — cheap, decision-free fixes closed here; the rest moved to
  [Phase M](phase-m-security-privacy-trust.md) M03/M08, same reasoning as G-P0-05's scope
  split below — [#119](https://github.com/Sysdrummatic/plm-resume/issues/119).
  **Correction 2026-08-25**: `CLAUDE.md` previously described this gate's code-side
  controls as shipped 2026-07-18; direct code inspection found none of it existed — stale
  documentation, not implemented work. Corrected here and in `CLAUDE.md`.)
  - [x] **Fixed, live on both `prod` and `test` (2026-08-26)**: queried the real
    production auth config via the Supabase Management API (`SUPABASE_ACCESS_TOKEN`,
    `PATCH /v1/projects/{ref}/config/auth`) rather than trusting `supabase/config.toml`
    — confirmed the config.toml value (`minimum_password_length = 6`) had drifted from
    what was actually live, and that **`mfa_totp_enroll_enabled` is already `true` in
    production**, contradicting config.toml's `false` and this gate's original note that
    MFA "isn't even enrollable." Raised `password_min_length` 6 → 10 on both projects to
    match the app's own signup/reset policy (user-confirmed before the write). Centralized
    that policy in a new `app/lib/auth-policy.ts` (`NEW_PASSWORD_MIN_LENGTH = 10`, used by
    `signup`/`update-password`) instead of three independently-drifting inline numbers —
    finally makes true the `auth-policy.ts` claim `CLAUDE.md` had fabricated. `signin`'s
    separate, deliberately lower `< 8` pre-flight check was **not** raised to match and now
    has an explanatory comment: it screens an *existing* password before attempting auth,
    and pre-2026-08-26 accounts may have valid passwords shorter than the new minimum —
    raising it would lock out real users before their real password ever reached Supabase.
  - **Deliberately deferred, not a beta blocker**: `password_hibp_enabled` (blocked by
    Supabase plan tier — `402` on the Management API), the `before_user_created` Auth
    Hook, app-side MFA/AAL2 enforcement, and CAPTCHA wiring — all confirmed live
    disabled/missing via the same Management API query, none needed to safely admit a
    handful of known, invited testers. Tracked as explicit, evidence-backed checklist
    items in [Phase M](phase-m-security-privacy-trust.md) M03. The
    `isDisposableEmailAddress()` third-party-API privacy gap (calls
    `https://www.disify.com/api/email` by default) is separately tracked in M08 (Disify
    processor governance), not duplicated here. Also confirmed live and now tracked in
    M03: `security_update_password_require_reauthentication`/`_current_password` are
    both `false`.
  - The manual checklist this gate depended on,
    `docs/security/supabase-production-auth-checklist.md` (referenced in `CLAUDE.md` as
    "21 controls, all unverified until ticked"), **does not exist in the repo** —
    superseded by querying the live config directly via the Management API, which can't
    drift from reality the way a static checklist can.

- [x] **G-P0-05 — Deploy production-grade distributed rate limiting for the Phase G beta
  surface** (implemented, deployed, and live-verified 2026-08-25 —
  [#120](https://github.com/Sysdrummatic/plm-resume/issues/120))
  **Scope note (2026-08-26):** this gate's job is to make it safe to admit a handful of
  known, invited beta testers — not to complete every endpoint in #120's acceptance
  criteria, which is a broader general-hardening pass written during the July audit.
  Closed here against the beta-relevant attack surface (auth abuse, export scraping);
  the remaining #120 scope (below) is regular backlog / Phase M work, not a beta
  blocker.
  - [x] Replaced the in-process `Map` limiter (`app/lib/rate-limit.ts`) with a
    Postgres-backed distributed one: migration
    `20260825000000_distributed_rate_limiting.sql` adds `rate_limit_counters` +
    `check_rate_limit()`, a single atomic `INSERT ... ON CONFLICT` RPC (no
    read-then-write race across instances). Chose Postgres over a new Redis/Upstash
    service — Supabase is already an approved processor, so this needed no new env
    vars, dependency, or processor/privacy review.
  - [x] **Deployed and live-verified on both `prod` and `test`** (2026-08-25): the
    migration was applied manually (MCP had an intermittent local-network DNS issue
    reaching `*.supabase.co` during this session — resolved by retrying), then
    confirmed functionally on each project by calling `check_rate_limit` directly —
    count incremented atomically, 4th call against a limit of 3 correctly returned
    `allowed: false`. Test data cleaned up after.
  - [x] **Found and fixed a live grant bug**: the original migration's
    `revoke all ... from public` only revokes the implicit PUBLIC grant — it does not
    touch Supabase's per-project default privileges, which auto-grant `EXECUTE` on new
    `public`-schema functions to `anon`/`authenticated`/`service_role` by role name at
    creation time. Querying `information_schema.routine_privileges` on prod confirmed
    `anon` and `authenticated` both had live `EXECUTE` on `check_rate_limit` — an RLS
    bypass, since the function is `SECURITY DEFINER` (a client could call it directly
    via PostgREST to poison or read any key, e.g. pre-exhausting another user's
    `signin-email:*` counter as a targeted denial-of-service). Fixed with a new
    migration, `20260825010000_fix_rate_limit_execute_grants.sql`, applied to both
    projects. Re-verified live with `set role anon; select check_rate_limit(...)` —
    now `ERROR: permission denied for function check_rate_limit` on both. Regression
    test: `tests/rate-limit-migration.test.js`.
  - [x] Wired into every endpoint that had a limiter before: PDF export, PDF preview,
    YAML/text/CVasCode export (all missing `Retry-After` before now — added).
  - [x] **New coverage**: `signin` (10/min per IP + 5/min per email — dual-key so
    distributed guessing and single-account brute force are both caught), `signup`
    (5/hour per IP), `reset-password` (10/15min per IP + 3/15min per email),
    `resend-verification` (same as reset). These four had **zero** rate limiting before
    2026-08-25 — `CLAUDE.md`'s claimed `getClientKey`/`rateLimitResponse` helpers do not
    exist anywhere in the code.
  - **Deliberately deferred, not a beta blocker**: token refresh, user data import,
    public OpenCV API read endpoints, account deletion, and destructive/admin actions —
    listed in #120's acceptance criteria, none wired to `rateLimit()` yet. Lower
    practical risk for a beta of ~5 known, invited testers than the auth/export surface
    already covered; tracked as explicit checklist items in
    [Phase M](phase-m-security-privacy-trust.md) M03 (token refresh, account deletion,
    destructive/admin actions) and M05 (user data import, public OpenCV API), not
    re-opened here.
  - [x] `lint` + `typecheck` + `test` (438/438) green. Migration contract tests:
    `tests/rate-limit-migration.test.js` (3 tests on the base migration, 1 on the grant
    fix). No unit test for `rate-limit.ts`'s runtime logic itself — its only local
    import (`./supabase-http`, extensionless) can't be resolved by Node's type-stripping
    outside a bundler, the same pre-existing constraint `CLAUDE.md` documents for
    `email.ts`/`env.ts`; covered instead by the live functional smoke tests above.
  - Not done: per-account/risk-tier limiting beyond IP+email, and security telemetry
    beyond `console.error` on RPC failure.

- [x] **G-P0-06 — XSS audit in PDF export** (audited 2026-08-25 — [#76](https://github.com/Sysdrummatic/plm-resume/issues/76))
  - Distinct vector from G-P0-01: that gate covers stored XSS in the public CV's
    JSON-LD; this one covers the PDF render path
    (`app/lib/pdf/` — `resume-pdf.tsx` was the pre-refactor filename, superseded by
    `CvPdfDocument.tsx` + `sections/*.tsx` — and `app/api/resume/export/pdf/route.ts`).
  - [x] Audited every section component in `app/lib/pdf/sections/` (e.g.
    `PdfSummary.tsx`): database-sourced fields (name, summary, experience, etc.) are
    passed as `<Text>` children, which `@react-pdf/renderer` always renders as literal
    PDF text runs — there is no HTML/markup parser anywhere in the render path for a
    payload to escape into, so no explicit escaping step is needed or possible to bypass.
  - [x] Confirmed no `dangerouslySetInnerHTML`/`innerHTML`-equivalent anywhere under
    `app/lib/pdf/`.
  - [x] Confirmed no `<Link>` elements in any PDF section — contact fields (email,
    phone, profile URLs) render as plain text, so there's no `javascript:`/`data:`
    protocol vector to allowlist (unlike the web view's `sanitizeExternalHref()`).
  - [x] `buildPdfFilename()` (`app/lib/pdf/filename.ts`) strips the CV name down to
    `[a-z0-9\s-]` before it reaches the `Content-Disposition` header — no header/quote
    injection via the filename.
  - JavaScript execution in the render context is moot: PDF export uses
    `@react-pdf/renderer`, which has no browser engine or script execution — see
    ADR 0015.
  - Ref: `docs/security/security-and-risk-plan.md` R06.

**Gate owner**: software_architect + backend_engineer + test_engineer

**Gate decision**: explicit GO/NO-GO recorded in the Phase G baseline report

**Required evidence**: code review, automated regression tests, live preview validation,
clean dependency audit for high/critical production findings, and documented production
Supabase configuration review

### Private Beta User Recruitment

- [x] Beta-tester opt-in at signup (`is_test_user` self-service, INSERT-time only — ADR 0020)
- [x] Role-gated in-app docs site (`/docs`: Tutorials for all, Test Scenarios for beta testers behind `beta_test_scenarios_visible` — ADR 0020)
- [/] Recruit 5 tech writer community members for feedback
- [/] Onboard beta users (provide sign-up links, guide to editor)
- [/] Collect feedback on publish flow, public link sharing, PDF export
- [/] Document learnings in retrospective

**Timeline**: Jun 2026

**Owner**: Product team

---

## Scope

### #97 — Przygotowanie scenariuszy testowania

Adapt `TEST_SCENARIOS.md` for non-technical beta testers.

- Review existing `TEST_SCENARIOS.md`
- Select 5–7 core scenarios (realistic user journeys)
- Rewrite in user-friendly language (no tech jargon)
- Add expected outcomes per scenario
- Prepare a one-page "quick reference" card for Slack/email distribution

**Responsible**: software_architect (scenario completeness), ui_ux_designer (user language & clarity), frontend_engineer (technical edge cases)

**Output**: `docs/guides/beta-testing/BETA_SCENARIOS.md`

### #98 — Pozyskanie 5 beta testerów

Recruit 5 beta testers from the tech-writer community via LinkedIn and existing networks.

- Identify channels (LinkedIn, tech-writer Slack/forums, existing network)
- Prepare recruitment messaging (value prop: lifetime discount, early access, direct founder contact)
- Outreach to candidates (target: tech writers with 3–5+ years experience)
- Screen and confirm commitment (4 weeks, ~5 hrs/week)
- Document contacts and availability

**Responsible**: founder (outreach, relationship building, messaging)

**Output**: `docs/guides/beta-testing/RECRUITMENT_MESSAGE.md` + beta tester tracker

### #99 — Setup kanałów komunikacji

Stand up the feedback infrastructure: Typeform, GitHub Project board, and a private Discord/Slack channel.

- Typeform: structured feedback form (scenario completion, 1–5 sentiment, open feedback)
- GitHub Project board: Feedback → Triaged → In Review → Backlog
- Private Discord/Slack channel for beta testers (async updates, quick questions).
- Pre-create GitHub labels: `sentiment:positive/neutral/negative`, `bug`, `feature-request`, `ux-feedback`, `priority:*`, `beta-tested`
- Tester-facing README on how to submit feedback

**Responsible**: software_architect (GitHub setup, labeling scheme, automation), project_manager (Typeform configuration, channel management)

**Output**: `docs/guides/beta-testing/TESTER_README.md`

### Solo internal testing & QA (no dedicated GitHub issue)

Founder/QA runs all 7 core scenarios solo before opening to external testers, to catch obvious bugs and establish a baseline.

- Execute all 7 core scenarios as a user, not the builder
- Log all blockers, confusing UX points, and unexpected behaviors
- Prepare a baseline report (bugs vs. UX friction), prioritized critical vs. nice-to-have
- Log bugs to GitHub Issues with `bug` + `priority:*` labels
- Optional: record Loom walkthroughs for the longest/most complex scenarios
- Confirm all six P0 security entry gates are closed and the platform is safe for
  external testers (no known data leaks or auth-boundary defects)

**Responsible**: frontend_engineer / founder (execute scenarios, identify bugs), ui_ux_designer (review UX friction)

**Output**: `docs/guides/beta-testing/BASELINE_REPORT.md`

### #100 — Beta tester onboarding & testing window

Onboard the 5 confirmed testers and run the coordinated 4-week testing window (testing in weeks 1–2, feedback review in weeks 3–4).

- 30-minute onboarding calls: product walkthrough + expectations
- Send beta tester kit (scenarios card, Typeform link, Slack invite, FAQ)
- Weekly async check-ins via Slack
- Track scenario-completion percentage per tester
- Optional screen recordings / Loom for reference
- Target: all 5 testers have completed ≥5/7 scenarios by end of week 2, with zero data-loss or security incidents

**Responsible**: founder (onboarding calls, weekly check-ins, relationship management), project_manager (scheduling, kit distribution, progress tracking)

### #101 — Feedback collection & sentiment tracking

Collect feedback continuously across the 4-week window, with daily triage and weekly sentiment reporting.

- Monitor Typeform responses daily (within 12 hours)
- Monitor the private Slack/Discord channel for async feedback
- Triage Typeform submissions into GitHub Issues in daily batches
- Manual labeling: `sentiment:positive/neutral/negative` + `priority:*` + `beta-tested`
- Calculate a running weekly sentiment average (1–5 Likert)
- Identify emerging patterns (e.g., "everyone confused by X")
- Founder responds to critical/blocker feedback within 24 hours

**Responsible**: project_manager (daily triage, labeling, weekly summaries), founder (Slack responses, clarifications)

### #102 — Post-beta review & prioritization

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
| Pre-Week 1 | Setup + solo testing (#97, #98, #99) | Founder + team |
| Week 1–2 | Tester onboarding + testing window (#100) | Founder + project_manager |
| Week 1–4 | Feedback collection & daily triage (#101) | Project manager |
| Week 3–4 | Analysis + prioritization (#102) | Team |

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

## Transition to Phase I

Findings from Phase G (bug severity, UX friction, testimonials) feed directly into:
- **Phase I** (Hardening, QA & Launch Readiness): critical bugs become launch blockers; testimonials support launch marketing
- **Phase M** (Security, Privacy & Trust): non-P0 hardening, GDPR operational controls,
  resilience, monitoring, and assurance

---

## Success Criteria

- 5 confirmed beta testers complete ≥80% of scenarios
- Average sentiment ≥ 3.5/5 across ≥30 feedback items
- All six P0 security entry gates closed before external tester onboarding
- 0 critical security issues found
- Launch-readiness decision documented in `PHASE_G_REPORT.md`
