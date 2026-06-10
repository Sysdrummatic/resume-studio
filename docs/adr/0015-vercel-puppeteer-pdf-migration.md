# ADR 0015: PDF Rendering Migration — Puppeteer on Vercel

Status: Planned

Date: 2026-06-10

Supersedes (partially): [ADR 0014](0014-pdf-rendering-architecture.md)

## Context

ADR 0014 established @react-pdf/renderer as the initial PDF engine behind a PdfEngine
interface abstraction. This was a deliberate tradeoff: react-pdf works within Netlify's
50MB serverless function size limit but cannot faithfully reproduce the web CV layout
because it does not use a browser rendering engine.

The web CV layout relies on CSS features unavailable in react-pdf's Yoga-based layout
engine: CSS pseudo-elements (::before, ::after) for timeline axis and dots, CSS Grid
for two-column layout, box-shadow, fluid typography with clamp(), and complex border-radius
behavior across page breaks.

The PdfEngine interface in app/lib/pdf/engine.ts was designed from the start to allow
engine replacement without touching templates, sections, or business logic. This ADR
defines the migration path to Puppeteer on Vercel, which renders PDFs from the actual
browser-rendered HTML — producing pixel-perfect output identical to the web view.

## Decision

1. **Migrate deployment from Netlify to Vercel.**
   Vercel supports larger serverless function bundles and has first-class support for
   Playwright/Puppeteer via @vercel/og infrastructure and edge runtime exclusions.
   The migration is infrastructure-only: no Next.js code changes are required beyond
   environment variable reconfiguration.

2. **Add PuppeteerEngine implementing PdfEngine interface.**
   A new `app/lib/pdf/engine-puppeteer.ts` implements the existing `PdfEngine` interface.
   The engine spins up a headless Chromium instance, navigates to a dedicated server-side
   render route, waits for the CV to fully render, and calls `page.pdf({ format: 'A4' })`.

3. **Add a dedicated PDF render route.**
   A new Next.js route `/api/resume/pdf-render/[token]` serves the CV HTML without chrome
   (no header, no export buttons, no sticky hero) in a print-optimized mode. This route
   is internal — only callable from the Puppeteer engine with a short-lived signed token.
   It must never be publicly accessible without a valid token.

4. **Keep ReactPdfEngine as fallback.**
   `engine-react-pdf.ts` remains in the codebase. The active engine is selected by
   environment variable `PDF_ENGINE=puppeteer|react-pdf`. Default in production: `puppeteer`.
   Default in local dev and CI: `react-pdf` (no Chromium dependency in dev environment).

5. **No changes to CvPdfDocument, section components, or TwoColumnTemplate.**
   These remain as the react-pdf implementation and are not used by PuppeteerEngine.
   PuppeteerEngine renders from the live web route, not from react-pdf components.

6. **Filename convention unchanged.**
   `buildPdfFilename()` from `app/lib/pdf/filename.ts` continues to generate
   `{name-slug}-{YYYY-MM-DD}-opencivera-{publicId}.pdf`.

## Migration Path

### Phase 1 — Preparation (before Vercel migration)
- Ensure `PdfEngine` interface is stable and used by both PDF export endpoints.
- Add `PDF_ENGINE` env var support to engine factory.
- Add `/api/resume/pdf-render/[token]` internal route with signed token validation.
- Add print-optimized CSS mode (`mode=pdf` on ResumeRenderer) that hides chrome.
- Write contract tests for the render route (auth, token expiry, no-chrome mode).

### Phase 2 — Vercel migration
- Add `vercel.json` configuration.
- Remove `netlify.toml` or reduce to redirects-only.
- Reconfigure environment variables in Vercel dashboard.
- Validate all existing routes, redirects, and Supabase connections on Vercel preview.
- Run full smoke test protocol.

### Phase 3 — PuppeteerEngine implementation
- Add `@sparticuz/chromium` and `puppeteer-core` to dependencies.
- Implement `PuppeteerEngine` in `app/lib/pdf/engine-puppeteer.ts`.
- Wire `PDF_ENGINE` env var to engine factory in `app/lib/pdf/engine-factory.ts`.
- Update both PDF export endpoints to use engine factory instead of direct ReactPdfEngine.
- Run visual QA: compare PDF output to web view screenshot at 1:1.

### Phase 4 — Cleanup
- Evaluate whether `@react-pdf/renderer` should be kept as dev fallback or removed.
- Update ADR 0014 status to "Superseded" and link to ADR 0015.
- Archive `CvPdfDocument.tsx` and section components if react-pdf is fully removed.

## Security Considerations

The internal PDF render route must:
- Require a short-lived HMAC-signed token (max 60s TTL) generated server-side.
- Never be callable without a valid token — return 403 on missing or expired token.
- Never expose private draft content — render only from published snapshots.
- Rate-limit token generation alongside existing PDF export rate limits.

## Deployment Consequences

- Netlify Functions → Vercel Serverless Functions (Node.js runtime).
- `@netlify/plugin-nextjs` removed; `vercel.json` added.
- Chromium binary adds ~50–70MB to the PDF function bundle — within Vercel's limits.
- Cold start for PDF export increases to ~3–5s on first invocation (acceptable for async download).
- All other routes remain unaffected (no Chromium in non-PDF functions).

## Rollback Plan

If Vercel migration introduces regressions:
1. Re-enable Netlify deployment from `main` branch.
2. Set `PDF_ENGINE=react-pdf` env var.
3. ReactPdfEngine continues to work on Netlify without Chromium.

PDF quality degrades to current react-pdf output, but the feature remains available.

## Consequences

- Pixel-perfect PDF output matching web view — eliminates visual fidelity gap.
- Future CV styles and themes automatically appear correctly in PDF without extra work.
- Chromium dependency in production — managed by @sparticuz/chromium for serverless.
- Internal render route requires careful security hardening (signed tokens).
- Development environment uses react-pdf fallback — visual parity only verifiable on Vercel preview.

## Implementation Checklist

- [ ] PdfEngine interface confirmed stable in app/lib/pdf/engine.ts
- [ ] PDF_ENGINE env var and engine factory added
- [ ] Internal render route /api/resume/pdf-render/[token] implemented with token validation
- [ ] print-optimized mode added to ResumeRenderer (mode="pdf", no chrome)
- [ ] Contract tests for internal render route
- [ ] vercel.json configured
- [ ] Environment variables reconfigured on Vercel
- [ ] All routes and redirects validated on Vercel preview
- [ ] Full smoke test protocol on Vercel preview
- [ ] @sparticuz/chromium and puppeteer-core added to dependencies
- [ ] PuppeteerEngine implemented and tested
- [ ] engine-factory.ts wires PDF_ENGINE env var
- [ ] Visual QA: PDF output matches web view
- [ ] ADR 0014 status updated to "Partially Superseded"
- [ ] Netlify cleanup or demotion to redirects-only
