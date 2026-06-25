# Phase E: Public Surface & MVP Launch

**Status**: ⬡ **60% COMPLETE**  
**ETA**: May–Jun 2026  
**Started**: 2026-05-12  
**Core Delivered**: 2026-05-23 (PR4 merged)  

> Making the product ready for real users. Public links, database-backed CV model, PDF export, and first beta testers from the tech writer community.

---

## Overview

Phase E implements the public-facing resume surface with full SEO/AEO support, structured data for search engines, and backward compatibility with legacy URL schemes. This is the MVP launch phase — the moment real users can discover and share their CVs publicly.

### Key Theme
**From internal tool → public platform.** Resume data becomes shareable and discoverable.

---

## Delivered Scope

### Public Route & URL Model

- ✓ **Canonical public route**: `/person-slug/public-id` with SSR/ISR rendering
- ✓ **Public link management**: Users can publish/unpublish from dashboard
- ✓ **Immutable snapshots**: Published CVs are frozen at publication time (stored in `resume_revisions`)
- ✓ **Legacy compatibility route**: `/r/[slug]` redirects or resolves legacy data per [ADR 0004](../adr/0004-public-route-compatibility-policy.md)
- ✓ **Multi-language support**: `?lang=<locale>` parameter with `hreflang` metadata for SEO

### SEO & AEO (Search Engine Optimization)

- ✓ **Canonical URLs**: Prevent duplicate content penalties
- ✓ **OpenGraph metadata**: Title, description, image for social sharing
- ✓ **Twitter Card metadata**: Platform-specific social previews
- ✓ **JSON-LD structured data**: Resume schema for search engines
- ✓ **robots.txt & sitemap.xml**: Guide crawlers to public content
- ✓ **Multilingual SEO**: `hreflang` tags for language variants, canonical handling per locale

### Architecture Decision Records

All Phase E architectural contracts are documented:

- [ADR 0001: CV Publication Model](../adr/0001-cv-publication-model.md) — database model, publish/unpublish, snapshot immutability
- [ADR 0004: Public Route Compatibility & Deprecation](../adr/0004-public-route-compatibility-policy.md) — backward-compatible routing strategy
- [ADR 0005: SEO/AEO, Structured Data, Sitemap, Robots](../adr/0005-seo-aeo-structured-data-policy.md) — metadata and crawler contracts
- [ADR 0007: Publication Analytics & Audit Retention](../adr/0007-publication-analytics-and-audit-retention.md) — view counting and audit logs

---

## Remaining Work (Minor)

### Preparing for beta test launch

- [x] Reorganize documentation for better tracking
- [ ] Create Lukasz Michta's own public CV snapshot
- [ ] Publish on canonical route (live example for new users)
- [ ] Verify SEO metadata renders correctly
- [x] Adjust Landing page to project start
- [ ] Create first login user profile creator
- [x] Make a foundation for profiles information
- [ ] Fix locale creator and workflow
- [ ] Improve the user experience
- [ ] Prepare onboarding materials for beta users (how to use editor, publish, share)
- [ ] Announce private beta sign-ups to tech writer communities

**Timeline**: End of May 2026  
**Owner**: Product team  

### Private Beta User Recruitment

- [ ] Recruit 5 tech writer community members for feedback
- [ ] Onboard beta users (provide sign-up links, guide to editor)
- [ ] Collect feedback on publish flow, public link sharing, PDF export
- [ ] Document learnings in retrospective

**Timeline**: Jun 2026  
**Owner**: Product team  

---

## Implementation Details

### Published CV Data Flow

```
1. User edits Master Resume (EN/PL)
   └─ Stored in `resume_documents` (draft)

2. User clicks "Publish"
   └─ Triggers POST /api/resume/publish
   └─ Creates immutable snapshot in `resume_revisions`
   └─ Creates row in `resume_public_links` with:
      - canonical_public_path (person-slug/public-id)
      - compatibility_public_path (/r/[slug] for legacy)
      - snapshot_id (reference to revision)
      - indexed (boolean, defaults to true)
      - enabled_languages (array: EN, PL, ...)
      - default_locale (EN)

3. Public route GET /person-slug/public-id/:locale
   └─ Fetches snapshot from `resume_revisions` via `resume_public_links`
   └─ Renders with SSR (Next.js)
   └─ Adds SEO metadata (canonical, og:*, robots)
   └─ Adds JSON-LD structured data

4. User views public link
   └─ Increments view counter (if analytics enabled)
   └─ Logs to audit trail

5. User unpublishes
   └─ Sets `resume_public_links.enabled=false`
   └─ Route becomes 404 (noindex)
   └─ Snapshot remains in database (reversible)
```

### File Structure Changes

**New/Modified Files**:
- `app/components/cv-resume-preview.tsx` — public CV render component
- `app/api/resume/publish` — publish endpoint
- `app/api/resume/unpublish` — unpublish endpoint
- `app/(public)/r/[slug]/route.ts` — legacy compatibility resolver
- `app/(public)/[person-slug]/[public-id]/route.ts` — canonical public route
- `app/(public)/[person-slug]/[public-id]/[[...lang]]/page.tsx` — SSR public page
- `app/lib/resume-server.ts` — snapshot fetching helpers (resolveSnapshotLocales, etc.)
- `public/sitemap.xml` — dynamic sitemap generation
- `public/robots.txt` — crawler directives
- `next.config.ts` — metadata generation hooks

---

## Testing & QA Checklist

- [x] Publish creates immutable snapshot
- [x] Unpublish makes route 404/noindex
- [x] Re-publish creates new snapshot (old snapshot unchanged)
- [x] Canonical URL renders with correct SEO metadata
- [x] Legacy `/r/[slug]` resolves or redirects per ADR 0004
- [x] Multi-language URLs show correct content + `hreflang` tags
- [x] JSON-LD structured data is valid (check schema.org)
- [x] Sitemap includes all published links
- [x] robots.txt allows public routes, disallows drafts
- [x] OpenGraph metadata renders in social previews
- [x] Twitter Card metadata renders in platform previews

**Evidence**: Test contracts in [cv-publication-test-contracts.md](../guides/cv-publication-test-contracts.md)

---

## Known Risks & Mitigations

### Risk 1: SEO Metadata Stale After Edit

**Scenario**: User edits their CV, publishes new snapshot. Old links still exist; search engines may index old metadata.

**Mitigation**: Canonical URL points to latest snapshot; old links redirect to canonical. Crawlers eventually reindex.

**ADR**: [ADR 0005: SEO Policy](../adr/0005-seo-aeo-structured-data-policy.md#old-metadata-stale-after-edit)

### Risk 2: Legacy Link Traffic Doesn't Migrate

**Scenario**: Recruiter bookmarked `/r/[slug]` before migration. Link stops working after phase launches.

**Mitigation**: `/r/[slug]` continues to resolve for 90 days, then soft-deprecate. Observability tracks legacy traffic.

**ADR**: [ADR 0004: Compatibility & Deprecation](../adr/0004-public-route-compatibility-policy.md#deprecation-timeline)

### Risk 3: Published Content Can't Be Edited

**Scenario**: User accidentally publishes, wants to add another section.

**Impact**: They can edit Master Resume, but published snapshot remains frozen. Can unpublish and re-publish.

**Mitigation**: Dashboard shows edit-after-publish flow clearly. Snapshots are immutable by design.

**Design**: Documented in [ADR 0006: Saved Version UX](../adr/0006-saved-version-language-ux-contract.md)

---

## Related Documentation

### Architecture Decisions
- [ADR 0001: CV Publication Model](../adr/0001-cv-publication-model.md)
- [ADR 0004: Public Route Compatibility & Deprecation](../adr/0004-public-route-compatibility-policy.md)
- [ADR 0005: SEO/AEO, Structured Data, Sitemap, Robots](../adr/0005-seo-aeo-structured-data-policy.md)
- [ADR 0007: Publication Analytics & Audit Retention](../adr/0007-publication-analytics-and-audit-retention.md)

### Test Contracts
- [CV Publication Test Contracts](../guides/cv-publication-test-contracts.md)
- [SEO/AEO Preview QA Checklist](../guides/seo-aeo-preview-qa-checklist.md)

### Guides
- [Public Route Compatibility Rollout](../guides/public-route-compatibility-rollout.md)
- [Deployment QA Checklist](../guides/deployment-qa.md)

### Execution
- [action-plan.md § Phase E](../action-plan.md#phase-e---public-resume-rendering-and-seqaeo)

---

## Transition to Phase F, G & I

### Phase F Dependency
Phase F (Community Beta Testing) begins once Phase E core delivery is stable — beta testers exercise the public routes and editor end-to-end.

### Phase G Dependency
Phase G (User Experience & Community) depends on Phase E public routes being stable. Both can run in parallel:
- **Phase E**: Public route SSR/metadata finalization
- **Phase G**: User dashboard, analytics, audit logging

### Phase I Dependency
Phase I (Hardening & QA) begins after Phase E core delivery (2026-05-23). Includes:
- Deploy QA for public routes
- Legacy compatibility regression tests
- SEO metadata validation

---

## Success Criteria

✓ **All Phase E deliverables shipped**:
- Public routes with SSR/ISR
- SEO metadata and structured data
- Sitemap and robots
- Legacy compatibility
- Multi-language support

✓ **Remaining work** (minor, non-blocking):
- Founder's demo CV published (marketing)
- Beta user onboarding complete

✓ **Ready to transition to Phase F (beta testing) and Phase I (hardening)** once demo CV + beta collection is done

---

## Phase E Completion Checklist

From [action-plan.md § Phase E](../action-plan.md#phase-e---public-resume-rendering-and-seqaeo):

- [x] Apply indexing controls to robots and headers
- [x] Add canonical URLs and OpenGraph/Twitter metadata
- [x] Add multilingual public CV SEO support with `hreflang`
- [x] Implement SSR public route `/r/[slug]`
- [x] Add structured data (JSON-LD)
- [x] Add sitemap and robots configuration
- [x] Verify compatibility redirects from legacy static routes
- [x] Write post-PR4 ADR backlog (0001–0007)
- [ ] Publish founder's own CV (demo)
- [ ] Private beta user recruitment (5 users)

**Overall**: **95% complete**. Core delivery shipped (2026-05-23); minor work remains.

