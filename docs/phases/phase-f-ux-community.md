# Phase F: User Experience & Community

**Status**: ✓ **COMPLETE**  
**ETA**: Jun–Jul 2026  
**Started**: 2026-05-12  
**Delivered**: 2026-05-13 (2 weeks ahead of schedule)  

> Based on beta feedback — onboarding improvements, ATS-ready export, analytics for CV owners, changelog and blog, open standard repo.

---

## Overview

Phase F delivers the user-facing platform features: dashboard for CV management, PDF/ATS export, owner analytics, admin panel enhancements, and the foundation for recruiter access. This phase runs in parallel with Phase E public routes and completes the MVP product experience.

### Key Theme
**From MVP → usable product.** Users can manage, export, and analyze their CVs.

---

## Delivered Scope

### User Dashboard

- ✓ **CV Versions Panel**: List all resume documents (EN/PL with status badges)
  - Published/Private status for each version
  - Canonical and compatibility public links (when published)
  - Copy and Open actions for published links
  - Read-only link state display (no editing from dashboard)

- ✓ **Saved Versions & Public Links Management**: Adjacent to editor
  - Publish/unpublish from `/master-resume` modal
  - Select languages and default locale
  - Set indexability (robots noindex/index)
  - Snapshot isolation verification

- ✓ **Analytics Overview**: View counts and traffic insights
  - Published links with view counts
  - Last viewed timestamps
  - Traffic by language variant
  - No personally identifying recruiter data (privacy-first)

### Export Capabilities

- ✓ **PDF Export**: Bento-style visual resume
  - Downloadable from dashboard
  - Reads Published CV snapshot (not draft)
  - Language selection (EN/PL)
  - Professional typography and formatting
  - Privacy: PDF export only for CV owner

- ✓ **Plain-Text ATS Export**: ATS-ready format
  - Clean, parseable text without formatting
  - Readable by applicant tracking systems
  - Language selection
  - Privacy: ATS export only for CV owner

### Admin Panel Enhancements

- ✓ **Analytics Widgets**:
  - Total published CVs
  - Active public links
  - Total view count
  - User growth metrics

- ✓ **Audit Log Explorer**:
  - Searchable audit trails
  - Filter by user, action, date
  - Privileged action visibility (auth, publish, delete)
  - Privacy-first: staff see metadata only, not private CV content

- ✓ **Recruiter Baseline Workflow**:
  - Recruiter can view published CVs
  - No access to draft or private CVs
  - Basic bookmarking (future enhancement)

### Role Inheritance & Capability Model

- ✓ **Capability-based RBAC**: Replaced string literal checks
  - `user.*` capabilities for user-scoped actions
  - `resume.*_own` capabilities for resume management
  - `admin.*` capabilities for privileged access
  - `recruiter.*` capabilities for recruiter features

- ✓ **Role Inheritance PR1–PR6**:
  - PR1: Capability helpers in `app/lib/rbac.ts`
  - PR2: Admin users API migration to capabilities
  - PR3: Resume API migration to capabilities
  - PR4: UI components updated to use shared helpers
  - PR5: SQL alignment verification
  - PR6: Tests refactored from literal role checks

- ✓ **Least-Privilege Access**: RLS policies enforce role separation
  - Users can only see their own CVs
  - Managers can see assigned users only
  - Admins see all data (metadata-only for MVP)
  - Recruiters see only published public links

---

## Architecture Decision Records

- [ADR 0003: Privacy-First Admin Access](../adr/0003-privacy-first-admin-access.md) — role inheritance model, capability composition
- [ADR 0007: Publication Analytics & Audit Retention](../adr/0007-publication-analytics-and-audit-retention.md) — view counting, audit trails

---

## Implementation Highlights

### Public Link Management in Editor

**Feature**: Users can publish/unpublish CVs from the Master Resume Editor without leaving the flow.

**Implementation**:
- Added `PublishSavedVersionModal` component (shared between editor and dashboard)
- Routes:
  - `GET /api/resume/presets` — fetch user's saved versions and public links
  - `POST /api/resume/presets/{id}/publish` — publish a version
  - `DELETE /api/resume/presets/{id}/unpublish` — unpublish a version
- Security: Owner-scoped endpoints; RLS enforces user isolation

**Testing**: [cv-publication-runtime-contract.test.mjs](../guides/cv-publication-test-contracts.md)

### Analytics Data Collection

**Privacy Contract**: Collect view counts **without** personally identifying recruiters.

**What We Track**:
- Published link ID
- Timestamp of view
- Locale of view
- User agent (aggregated for insights)

**What We Don't Track**:
- Recruiter identity
- Company affiliation
- Recruiter job title or intent

**Implementation**: Audit table with aggregated analytics views.

### Recruiter Role

**Baseline Workflow**:
1. Recruiter signs up with recruiter role
2. Can search published CVs (future feature)
3. Can view public resume pages (canonical + language variants)
4. Cannot access draft or private CVs
5. Cannot modify any CV data

**Future Enhancement**: Bookmarking, saved searches, private notes (Phase I scope).

---

## File Structure Changes

**New/Modified Files**:
- `app/dashboard/page.tsx` — dashboard route
- `app/components/dashboard-client.tsx` — CV versions, links, analytics
- `app/components/publish-saved-version-modal.tsx` — shared publish modal
- `app/api/resume/presets/route.ts` — get user's versions and links
- `app/api/resume/presets/{id}/publish/route.ts` — publish endpoint
- `app/api/resume/presets/{id}/unpublish/route.ts` — unpublish endpoint
- `app/api/resume/export/pdf/route.ts` — PDF export endpoint
- `app/api/resume/export/ats/route.ts` — ATS export endpoint
- `app/admin/analytics-widgets.tsx` — admin analytics dashboard
- `app/admin/audit-explorer.tsx` — searchable audit logs
- `app/lib/rbac.ts` — capability helpers and role inheritance
- `app/lib/auth-types.ts` — capability types
- `app/lib/auth-server.ts` — server-side auth helpers
- `tests/dashboard-presets.test.mjs` — dashboard and link management tests
- `tests/privacy-first-admin-access-contract.test.mjs` — role and privacy tests

---

## Testing & QA Checklist

- [x] Dashboard shows user's CV versions with status badges
- [x] Canonical public links display first; compatibility links show as legacy
- [x] Open/Copy actions work only for published links
- [x] Private (unpublished) versions have no link displayed
- [x] PDF export reads snapshot, not draft
- [x] ATS export is plain text, parseable by systems
- [x] Admin can see analytics widgets (total CVs, active links, views)
- [x] Audit log shows publish/unpublish/export actions
- [x] Recruiter role cannot access draft or private CVs
- [x] RLS policies prevent cross-user data leakage
- [x] Role inheritance tests pass (capabilities, not string literals)
- [x] Privacy-first: audit logs don't expose private content

**Evidence**: Test contracts in [privacy-first-admin-access-contract.test.mjs](../guides/privacy-first-admin-access-policy.md)

---

## Known Risks & Mitigations

### Risk 1: Export Privacy Leak

**Scenario**: Non-owner user (admin, support) exports another user's CV as PDF.

**Mitigation**: All export endpoints check `resume.export_own` capability. Only owner can export their own CV.

**ADR**: [ADR 0003: Privacy-First Admin](../adr/0003-privacy-first-admin-access.md)

### Risk 2: Analytics Reveal Recruiter Identity

**Scenario**: User analyzes view count and IP to identify who viewed their CV.

**Mitigation**: We don't store or expose recruiter IP, company, or identity. View count only; timestamps aggregated by day.

**ADR**: [ADR 0007: Analytics & Audit](../adr/0007-publication-analytics-and-audit-retention.md)

### Risk 3: Capability System Not Enforced in RLS

**Scenario**: Client-side capability check passes, but RLS policy isn't updated to match.

**Mitigation**: Phase G hardening includes SQL alignment verification. Tests assert RLS behavior.

---

## Related Documentation

### Architecture Decisions
- [ADR 0003: Privacy-First Admin Access](../adr/0003-privacy-first-admin-access.md)
- [ADR 0007: Publication Analytics & Audit Retention](../adr/0007-publication-analytics-and-audit-retention.md)

### Test Contracts
- [Privacy-First Admin Access Policy](../guides/privacy-first-admin-access-policy.md)
- [CV Publication Test Contracts](../guides/cv-publication-test-contracts.md)

### Execution
- [action-plan.md § Phase F](../action-plan.md#phase-f---user-panel-and-analytics)

---

## Transition to Phase G

Phase G (Hardening & QA) includes:
- Deploy QA for dashboard and export features
- Privacy and capability system validation
- Performance testing for analytics at scale
- Recruiter workflow smoke tests

---

## Success Criteria

✓ **All Phase F deliverables shipped**:
- User dashboard with CV versions and links
- PDF and ATS export
- Admin analytics and audit logs
- Recruiter role and basic workflow
- Role inheritance capability model

✓ **Completed 2 weeks ahead of schedule** (2026-05-13)

✓ **Ready to transition to Phase G hardening**

---

## Phase F Completion Checklist

From [action-plan.md § Phase F](../action-plan.md#phase-f---user-panel-and-analytics):

- [x] Build user panel for CV and link management
- [x] Add downloadable PDF export
- [x] Add plain text ATS-ready export
- [x] Add owner-facing export controls
- [x] Ensure exports read published snapshots
- [x] Add tests for export privacy and snapshot isolation
- [x] Add role-aware admin dashboard views
- [x] Add analytics widgets (counts, active links, views)
- [x] Add audit log explorer and filtering
- [x] Add recruiter baseline workflow
- [x] Implement role inheritance capability model
- [x] PR1–PR6: Role inheritance PRs merged
- [x] PR6: Tests refactored; full validation green

**Overall**: **100% complete**. All Phase F deliverables shipped; ahead of timeline.

