# Phase H: PDF Visual Fidelity — Vercel + Puppeteer Migration

**Status**: ◯ **PLANNED, NOT STARTED**  
**ETA**: Jun–Jul 2026 (after Phase E)  
**Depends On**: Phase E, F completion  

> Eliminate visual fidelity gap in PDF exports. Migrate deployment platform from Netlify to Vercel and swap PDF rendering engine from @react-pdf/renderer to Puppeteer for pixel-perfect output.

---

## Overview

Phase H improves the PDF export experience by switching from a layout-engine-based renderer (react-pdf) to a browser-based renderer (Puppeteer). This produces PDFs visually identical to the web CV view, including all CSS features: pseudo-elements, CSS Grid, box-shadow, and fluid typography.

### Key Theme
**From pixel-approximation → pixel-perfect.** PDF exports match the web layout exactly. Infrastructure moves from Netlify to Vercel to support larger serverless bundles.

---

## Why This Phase?

**Current state (Phase E end)**:
- PDF exports use @react-pdf/renderer (Yoga layout engine)
- Yoga cannot render CSS pseudo-elements, Grid, or complex borders
- Web layout has teal timeline dots (::before), two-column Grid, and shadows
- PDF output does not match web layout — visual fidelity gap

**Solution**:
- Render PDFs from actual browser HTML (Puppeteer + Chromium)
- Move to Vercel (supports larger serverless bundles for Chromium)
- Keep PdfEngine interface unchanged (no refactoring of templates/sections)

**Why Vercel over Netlify?**
- Netlify Functions: 50MB unzipped limit
- Vercel Serverless: 250MB limit + first-class Chromium support
- Move is infrastructure-only (no Next.js code changes needed)

---

## Scope & Deliverables

### Phase 1: Code Preparation (on Netlify)

Before moving infrastructure, wire up the new engine abstraction.

- [ ] **Engine factory**:
  - [ ] Add `app/lib/pdf/engine-factory.ts` that switches engines by `PDF_ENGINE` env var
  - [ ] Default to react-pdf in dev/CI, puppeteer in preview/prod
  - [ ] Both PDF export endpoints use factory (no direct engine imports)

- [ ] **Internal PDF render route**:
  - [ ] Add `GET /api/resume/pdf-render/[token]` route
  - [ ] Route accepts signed HMAC token (60s TTL max)
  - [ ] Route renders CV HTML without chrome (no header, no buttons)
  - [ ] Route validates token signature and expiry (403 on failure)
  - [ ] Route serves published snapshots only (never private draft)

- [ ] **Print-optimized mode**:
  - [ ] Add `mode="pdf"` to `ResumeRenderMode` type
  - [ ] When active: `showChrome=false`, page BG #f6f8f8, CSS print-safe styles
  - [ ] No JavaScript interactions in PDF render mode

- [ ] **Environment variables**:
  - [ ] Add `PDF_ENGINE` to `.env.*.example` (dev: react-pdf, prod: puppeteer)
  - [ ] Add `PDF_RENDER_SECRET` (min 32 chars random, server-side token signing)

- [ ] **Contract tests**:
  - [ ] Valid HMAC token + non-expired TTL → 200 OK
  - [ ] Invalid signature → 403 Forbidden
  - [ ] Expired TTL → 403 Forbidden
  - [ ] Missing token → 403 Forbidden
  - [ ] Route never serves private draft content (snapshot-only)

**Timeline**: ~1 week  
**Blockers**: None (work on Netlify in parallel with Phase E/F)

---

### Phase 2: Vercel Migration

Move infrastructure to Vercel while keeping PDF engine as react-pdf (fallback).

- [ ] **Vercel configuration**:
  - [ ] Add `vercel.json` with `functions` config
  - [ ] Set `maxDuration: 30` for PDF export routes (account for Puppeteer cold start)
  - [ ] Set `maxDuration: 10` for internal render route

- [ ] **Redirect porting**:
  - [ ] Port all Netlify redirects from `netlify.toml` to `vercel.json`
  - [ ] `/index.html` → `/`, `/login.html` → `/login`, etc.
  - [ ] `src` and `destination` syntax matches Vercel format

- [ ] **Environment variable migration**:
  - [ ] Reconfigure all vars in Vercel dashboard (Supabase keys, Sentry DSN, app URL)
  - [ ] **Keep `PDF_ENGINE=react-pdf` on Vercel** (for now; Puppeteer comes in Phase 3)
  - [ ] Document all required vars in deployment guide

- [ ] **Validation on Vercel preview**:
  - [ ] All routes resolve: `/login`, `/dashboard`, `/admin`, `/master-resume`, `/user`
  - [ ] Public CV route `/{person-slug}/{public-id}` renders correctly
  - [ ] Compatibility route `/r/{slug}` redirects to canonical
  - [ ] Legacy `.html` redirects work
  - [ ] Auth flow: signup → verify → signin → signout
  - [ ] Publish and unpublish CV version
  - [ ] PDF download (still react-pdf; visual fidelity limited)
  - [ ] ATS export download (text, YAML)
  - [ ] Admin panel accessible for admin role

- [ ] **Full smoke test on Vercel preview** before DNS cutover

- [ ] **Production smoke test on Vercel** after DNS switch

**Timeline**: ~1–1.5 weeks  
**Rollback**: Keep Netlify live until Vercel preview passes full validation

---

### Phase 3: PuppeteerEngine Implementation

Swap PDF engine to Puppeteer; validate visual output.

- [ ] **Dependencies**:
  - [ ] `npm install @sparticuz/chromium puppeteer-core`
  - [ ] Do NOT use full `puppeteer` package (too large for serverless)

- [ ] **PuppeteerEngine**:
  - [ ] Add `app/lib/pdf/engine-puppeteer.ts`
  - [ ] Launch headless Chromium via @sparticuz/chromium
  - [ ] Navigate to internal render route with signed token
  - [ ] Wait for page to fully render (`waitUntil: 'networkidle0'`)
  - [ ] Generate PDF with A4 format, printBackground, margins (16mm top/bottom, 12mm left/right)
  - [ ] Return Buffer of PDF bytes

- [ ] **Engine factory update**:
  - [ ] Wire `PDF_ENGINE=puppeteer` in Vercel production and preview
  - [ ] Dynamic import of PuppeteerEngine to avoid bundling in react-pdf contexts

- [ ] **Visual QA checklist**:
  - [ ] Two-column layout (main 2.5fr / sidebar 1fr)
  - [ ] Timeline: vertical axis line + teal dots
  - [ ] Experience blocks: grey inner background, rounded corners
  - [ ] Course tiles: correct layout, teal-light background
  - [ ] Sidebar cards: white, rounded, no mid-card breaks
  - [ ] Section headers: teal dot + text, correct font
  - [ ] Skills/Languages: dot meters (5 dots, filled/unfilled)
  - [ ] Tech stack: teal pills with corners
  - [ ] Hero: teal circle initials, name, role
  - [ ] Font: Space Grotesk (verify in Acrobat Properties)
  - [ ] Backgrounds: grey page, white cards

**Timeline**: ~1.5 weeks  
**QA**: Visual comparison (PDF vs. web screenshot, pixel-by-pixel)

---

### Phase 4: Cleanup & Documentation

Final decision on react-pdf; update all references.

- [ ] **Keep or remove react-pdf?**
  - **Keep as fallback**: if local dev without Chromium is valuable, or CI cannot install @sparticuz/chromium
    - Set `PDF_ENGINE=react-pdf` in `.env.development.example`
    - Document visual fidelity gap clearly
  - **Remove**: if maintenance burden outweighs DX benefit
    - Delete `engine-react-pdf.ts`, `CvPdfDocument.tsx`, all section components, `TwoColumnTemplate.tsx`
    - Remove `@react-pdf/renderer` from `package.json`
    - Delete `app/lib/pdf/sections/`, `app/lib/pdf/theme.ts`, etc.

- [ ] **Documentation updates**:
  - [ ] `docs/guides/local-development.md` — add PDF_ENGINE and PDF_RENDER_SECRET to required env vars
  - [ ] `docs/guides/environment-matrix.md` — add Vercel as deployment target, retire Netlify
  - [ ] `docs/guides/deployment-qa.md` — replace Netlify-specific steps with Vercel equivalents
  - [ ] `docs/adr/0014-pdf-rendering-architecture.md` — update status to "Partially Superseded", link to ADR 0015
  - [ ] `CLAUDE.md` — update deployment platform to Vercel

**Timeline**: ~3–5 days

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Chromium bundle exceeds Vercel limit | Low | High | @sparticuz/chromium is sized for Vercel; verify with `vercel build --prod` size report |
| Internal render route token leaks | Medium | High | Short TTL (60s), HMAC validation, no public exposure, rate limiting |
| Puppeteer cold start > 5s | Medium | Medium | 3–5s acceptable for async download; add loading indicator on PDF button |
| DNS cutover causes downtime | Low | High | Keep Netlify live during full Vercel preview validation |
| react-pdf removal breaks CI | Low | Medium | Don't remove until confirming @sparticuz/chromium works in CI, or keep as fallback |
| Vercel preview passes but production fails | Low | Medium | Run full smoke protocol on production immediately after DNS switch |

---

## Security & Auth

### Token Signing

```ts
const token = generatePdfRenderToken({
  publicId, 
  personSlug, 
  locale, 
  expiresAt: Date.now() + 60000 // 60s TTL
});

// HMAC-SHA256 with PDF_RENDER_SECRET env var
// Route validates: signature + expiry
```

### Route Guards

- Must have valid signature (403 on invalid)
- Must not be expired (403 on expired)
- Must render published snapshot only (RLS enforced)
- Must never expose draft/private content

---

## Deployment Consequences

- **Before**: Netlify Functions (50MB limit, no Chromium)
- **After**: Vercel Serverless (250MB limit, Chromium supported)
- **Result**: PDF function bundle ~60–70MB (Chromium + dependencies)
- **Cold start**: ~3–5s on first PDF export (acceptable for async download)
- **Other routes**: Unaffected (no Chromium in non-PDF functions)

---

## Rollback Plan

If Vercel migration causes critical regressions:

1. **Keep Netlify live** during transition
2. **Set `PDF_ENGINE=react-pdf`** if Puppeteer fails
3. **Revert DNS to Netlify** if platform migration has issues
4. **ReactPdfEngine continues** to work on Netlify without Chromium

Trade-off: PDF quality degrades to current react-pdf (visual fidelity gap returns), but feature remains available.

---

## Implementation Checklist

### Phase 1 (Code Prep)
- [ ] engine-factory.ts created + PDF_ENGINE env var switching
- [ ] /api/resume/pdf-render/[token] route implemented with HMAC token validation
- [ ] mode="pdf" added to ResumeRenderMode + print-optimized CSS
- [ ] PDF_ENGINE and PDF_RENDER_SECRET in all .env.*.example files
- [ ] Contract tests for render route (all 5 scenarios passing)

### Phase 2 (Vercel Migration)
- [ ] vercel.json created with function limits
- [ ] netlify.toml redirects ported to vercel.json
- [ ] All env vars reconfigured on Vercel dashboard
- [ ] All routes tested on Vercel preview deploy
- [ ] Full smoke test protocol on Vercel preview passed
- [ ] DNS switched to Vercel
- [ ] Full smoke test protocol on Vercel production passed

### Phase 3 (Puppeteer Engine)
- [ ] @sparticuz/chromium and puppeteer-core installed
- [ ] PuppeteerEngine implemented in app/lib/pdf/engine-puppeteer.ts
- [ ] PDF_ENGINE=puppeteer set in Vercel production/preview env vars
- [ ] Visual QA checklist completed (all items verified)
- [ ] PDF output matches web view at 1:1 pixel fidelity

### Phase 4 (Cleanup)
- [ ] Keep/remove decision made and documented
- [ ] local-development.md, environment-matrix.md, deployment-qa.md updated
- [ ] ADR 0014 status updated to "Partially Superseded"
- [ ] CLAUDE.md updated — Vercel as deployment platform
- [ ] All old Netlify references removed from docs

---

## Related Documentation

### Architecture & Decision
- [ADR 0015: PDF Rendering Migration — Puppeteer on Vercel](../adr/0015-vercel-puppeteer-pdf-migration.md)
- [ADR 0014: PDF Rendering Architecture](../adr/0014-pdf-rendering-architecture.md) (partially superseded)

### Implementation Guide
- [Vercel + Puppeteer PDF Migration Guide](../guides/vercel-puppeteer-pdf-migration.md)

### Deployment
- [Deployment QA Checklist](../guides/testing/deployment-qa.md) (will be updated for Vercel)

### Execution
- [STATUS.md](../STATUS.md)

---

## Success Criteria

✓ **PDF exports are pixel-perfect** — match web CV layout exactly  
✓ **All routes work on Vercel** — preview and production validated  
✓ **Internal render route secured** — HMAC token validation, no data leaks  
✓ **Puppeteer engine functional** — cold start < 5s acceptable  
✓ **Visual QA passed** — all sections render correctly  
✓ **Documentation updated** — Vercel replaces Netlify in all guides  

---

## Transition to Phase I

After Phase H completion:

1. **PDF exports on production** are pixel-perfect
2. **Vercel platform stability** confirmed over 1–2 weeks
3. **Phase I planning begins** — Hardening, QA, launch readiness
4. **Netlify contract** cancelled or demoted to redirects-only

---

## Phase H Status

**Current**: Not started (planned for after Phase E completion)  
**Next step**: Phase E completion → Phase H kickoff  
**Estimated duration**: ~4–5 weeks (Phase 1–4)  
**Team**: Backend (engine factory + render route), DevOps (Vercel setup), QA (visual + smoke tests)
