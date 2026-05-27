# Phase G: Hardening, QA & Launch Readiness

**Status**: ◐ **60% IN PROGRESS**  
**ETA**: Jun 2026 (target: 2026-06-30)  
**Started**: 2026-05-20  

> Final gate before production. Comprehensive testing, security hardening, observability setup, and pre-launch validation.

---

## Overview

Phase G is the quality and readiness phase. After Phase E–F deliver features, Phase G ensures everything is secure, tested, observable, and ready for production launch. This is the last quality gate before real users access the platform.

### Key Theme
**From MVP → production-ready.** All critical paths tested; security/perf/a11y verified.

---

## Scope & Deliverables

### CI/CD & Build Gates

- [x] **Local CI-equivalent validation**:
  - `npm.cmd run lint` — code style and linting
  - `npm.cmd run typecheck` — TypeScript type safety
  - `npm.cmd test` — unit and integration test suite
  - `npm.cmd run build` — full Next.js build

- [ ] **Preview deploy QA**:
  - Netlify preview builds triggered automatically
  - Smoke test suite runs on preview URL
  - Manual QA on preview before production push

- [ ] **Production deploy QA**:
  - Staging/production environment validation
  - Feature flags or canary release strategy
  - Rollback plan documented and tested

### Infrastructure & Migrations

- [ ] **Supabase migrations applied**:
  - All Phase A–F migrations active
  - New tables and policies in place
  - Backup and recovery procedures tested

- [ ] **Environment variables verified**:
  - All required vars set in preview and production
  - Secrets not committed to repo
  - Rollback procedure documented

### Authentication & Access Control

- [ ] **Auth smoke checks**:
  - Sign-up flow works (email verification)
  - Disposable email blocking enforced
  - Sign-in flow works (password auth)
  - Password reset flow works (email + link)
  - Sign-out clears session
  - Session timeout configured

- [ ] **Protected route verification**:
  - `/dashboard` redirects unauthenticated users
  - `/master-resume` redirects unauthenticated users
  - `/admin` redirects non-admin users
  - Public routes remain public

- [ ] **Role-based access control (RBAC)**:
  - User role can access own CV only
  - Manager role can access assigned users
  - Admin role can access all (metadata-only)
  - Recruiter role can access public links only
  - Role inheritance verified in tests

### Functional Testing

- [ ] **Admin panel and audit**:
  - User list loads and filters work
  - Role assignment functions
  - Account activation/deactivation works
  - Account deletion respects manager restrictions
  - Audit log displays correct entries

- [ ] **Editor publish/rollback**:
  - Publish creates immutable snapshot
  - Rollback restores previous version
  - Language versions publish independently
  - Published CV visible on public route
  - Unpublish makes public route 404/noindex

- [ ] **Netlify deployment**:
  - CI pipeline completes successfully
  - Build artifacts are correct
  - Static assets serve correctly
  - API routes respond correctly
  - Redirects work (legacy `.html` URLs)

- [ ] **Legacy redirect verification**:
  - Old `.html` URLs redirect to new routes
  - Redirect chains don't break
  - SEO metadata correct after redirect
  - 404s for truly deleted pages

### End-to-End Testing

- [ ] **Critical user paths**:
  - New user sign-up → edit CV → publish → view public link
  - Existing user log-in → update CV → republish → view updated public link
  - Admin manages users and views analytics
  - Recruiter signs up and views published CVs
  - User downloads PDF and ATS exports

- [ ] **E2E regression suite**:
  - Run automated E2E tests on preview deploy
  - Identify and fix any regressions
  - Document test coverage and gaps

### Performance & Accessibility

- [ ] **Performance checks**:
  - Lighthouse audit (target: 80+ on all scores)
  - Page load time under 3 seconds
  - Editor doesn't lag on large resumes
  - Dashboard loads quickly (10+ CVs)
  - Public route SSR time under 500ms

- [ ] **Accessibility (a11y) checks**:
  - WCAG 2.1 AA compliance
  - Keyboard navigation works (tab order)
  - Screen reader announcements work
  - Color contrast meets standards
  - Forms have proper labels and ARIA attributes

### Security & RLS Validation

- [ ] **Supabase RLS policies**:
  - Users cannot access other users' CVs
  - Managers cannot access higher-role users
  - Admins have appropriate metadata access
  - Public links don't leak draft content
  - Audit logs enforce role-based visibility

- [ ] **API endpoint security**:
  - All protected endpoints verify authentication
  - All protected endpoints verify authorization
  - No sensitive data in error messages
  - Rate limiting active (Upstash Redis)
  - CORS headers correct

- [ ] **Secret management**:
  - No secrets in environment files
  - Netlify/Supabase secrets correctly configured
  - Database passwords not in logs
  - API keys rotated if exposed

### Observability & Monitoring

- [ ] **Error tracking (Sentry)**:
  - Sentry project configured
  - Frontend errors captured
  - Backend errors captured
  - Alerts for critical errors configured
  - Error dashboard accessible to team

- [ ] **Logging strategy**:
  - Server logs capture important events
  - Audit logs track user actions
  - Debug logs disabled in production
  - Log retention policy defined

- [ ] **Metrics & dashboards**:
  - Page load time metrics
  - API response time metrics
  - Error rate tracking
  - User signup/auth metrics
  - Custom metrics for publish/view events

- [ ] **Alerting**:
  - High error rate alert
  - Deployment failure alert
  - Uptime monitoring configured
  - On-call notification channels set up

### Release & Rollback

- [ ] **Release checklist prepared**:
  - All Phase E–F features in production
  - No critical bugs open
  - Rollback plan documented
  - Communication plan for users
  - Post-launch incident response procedure

- [ ] **Rollback playbook**:
  - Database rollback (previous migration)
  - Code rollback (previous git commit)
  - DNS/routing rollback (if needed)
  - Communication to users
  - Incident post-mortem template

- [ ] **Production smoke test protocol**:
  - Smoke tests run on production after deploy
  - Test results reported to team Slack
  - Any failures trigger incident response
  - Success confirmation before full announcement

---

## Testing Framework

### Automation Layers

```
Unit Tests (Jest/Vitest)
├─ RBAC logic (app/lib/rbac.ts)
├─ Resume validation (app/lib/resume-schema.ts)
├─ Auth helpers (app/lib/auth-*.ts)
└─ Utility functions

Integration Tests (Node test runner)
├─ API endpoint contracts
├─ Database RLS policies
├─ Auth flow end-to-end
└─ Publish/rollback workflows

E2E Tests (Playwright/Puppeteer)
├─ Sign-up → CV edit → publish
├─ Admin user management
├─ Recruiter access patterns
└─ Legacy URL redirects

Manual QA Checklist
├─ Cross-browser testing (Chrome, Firefox, Safari)
├─ Mobile responsiveness
├─ Accessibility screen reader testing
└─ Performance profiling
```

### Test Data

- **User accounts** (pre-created for testing):
  - admin@opencivera.test
  - manager@opencivera.test
  - user@opencivera.test
  - recruiter@opencivera.test

- **Test CVs**:
  - English (EN) full resume
  - Polish (PL) full resume
  - Short resume (edge case)
  - Large resume (10+ sections)

- **Test Data Reset**:
  - Database snapshot before each test run
  - Restore to clean state after

---

## Known Risks & Mitigations

### Risk 1: Production Environment Misconfiguration

**Scenario**: Env var missing or incorrect in production; app crashes on deploy.

**Mitigation**: 
- Pre-deploy checklist verifies all env vars
- Netlify deploy preview runs before production
- Rollback to previous deploy if critical issue

### Risk 2: RLS Policies Don't Match Code Logic

**Scenario**: Code checks RBAC capability, but RLS policy allows unauthorized access.

**Mitigation**:
- Phase G includes SQL alignment verification (task from memory)
- Tests assert both code and RLS behavior
- Manual QA checks cross-user data isolation

### Risk 3: Legacy Redirects Break During Migration

**Scenario**: Old `.html` URLs stop working after domain migration or Netlify config change.

**Mitigation**:
- netlify.toml has explicit redirect rules
- Pre-deploy testing verifies old URLs
- Rollback plan includes redirect config

### Risk 4: Performance Degrades Under Load

**Scenario**: Dashboard slow with 100+ CVs; public route SSR times out.

**Mitigation**:
- Lighthouse audits before launch
- Query optimization (indexes on popular columns)
- ISR cache strategy for public routes
- Load testing on preview deploy

---

## Phase G Execution Plan

### Week 1 (2026-05-27 to 2026-06-02)
- [ ] Finalize deployment QA procedures
- [ ] Set up Sentry and observability
- [ ] Create smoke test suite
- [ ] Begin auth flow testing

### Week 2 (2026-06-03 to 2026-06-09)
- [ ] Complete functional testing (admin, editor, recruiter)
- [ ] Run E2E regression suite
- [ ] Performance and accessibility audits
- [ ] RLS policy validation

### Week 3 (2026-06-10 to 2026-06-16)
- [ ] Security review and hardening
- [ ] Rollback plan testing
- [ ] Release checklist finalization
- [ ] Team readiness review

### Week 4 (2026-06-17 to 2026-06-30)
- [ ] Final production deploy QA
- [ ] Smoke test protocol execution
- [ ] Post-launch support preparation
- [ ] Go-live decision

---

## Related Documentation

### Test Contracts & Guides
- [Deployment QA Checklist](../guides/deployment-qa.md)
- [CV Publication Test Contracts](../guides/cv-publication-test-contracts.md)
- [SEO/AEO Preview QA Checklist](../guides/seo-aeo-preview-qa-checklist.md)

### Architecture Decisions
- [ADR 0010: API Hardening and Resource Protection](../adr/0010-api-hardening-and-resource-protection.md)

### Execution
- [action-plan.md § Phase G](../action-plan.md#phase-g---hardening-qa-and-launch-readiness)

---

## Transition to Phase H

After Phase G launch-readiness gate passes:

1. **Production launch** announced to community
2. **Phase H planning** begins (AI features, post-launch)
3. **Monitoring & on-call** activated for production
4. **Team retrospective** to document learnings

---

## Success Criteria

✓ **All critical paths tested and passing**
✓ **Security and RLS policies validated**
✓ **Performance and accessibility verified**
✓ **Rollback plan documented and tested**
✓ **Observability and alerting configured**
✓ **Team confident in launch**

---

## Phase G Completion Checklist

From [action-plan.md § Phase G](../action-plan.md#phase-g---hardening-qa-and-launch-readiness):

- [x] Local CI-equivalent gates are green
- [ ] Preview deploy QA is complete
- [ ] Production deploy QA is complete
- [ ] Supabase migrations applied
- [ ] Auth smoke checks passed
- [ ] Protected route access controls verified
- [ ] Admin panel and audit functionality verified
- [ ] Editor publish/rollback workflows tested
- [ ] Netlify deployment validated
- [ ] Legacy redirects verified
- [ ] E2E regression suite complete
- [ ] Performance and accessibility checks passed
- [ ] Security and RLS validation complete
- [ ] Observability dashboards and alerting configured
- [ ] Release checklist and rollback playbook prepared
- [ ] Production smoke test protocol executed

**Current Status**: **60% in progress**. Started 2026-05-20; target completion 2026-06-30.

