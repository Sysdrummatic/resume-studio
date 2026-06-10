# Phase G: Vercel + Puppeteer PDF Migration Guide

Operational guide for [ADR 0015](../adr/0015-vercel-puppeteer-pdf-migration.md).

This guide is the implementation reference for the team. It expands on the ADR's
migration phases with concrete steps, commands, and decision points.

---

## Why this migration

The current PDF engine (@react-pdf/renderer) cannot reproduce the web CV layout
because it does not use a browser — it uses a layout engine (Yoga) that does not
support CSS pseudo-elements, CSS Grid, box-shadow, or fluid typography.

Puppeteer solves this by running a real Chromium instance. Vercel enables this by
supporting larger serverless function bundles than Netlify (Netlify Functions cap
at ~50MB unzipped; Vercel Serverless Functions support up to 250MB).

The PdfEngine interface in `app/lib/pdf/engine.ts` was designed for this exact swap.

---

## Phase 1 — Code preparation (on Netlify, before Vercel move)

Complete before touching deployment infrastructure.

### 1.1 Confirm PdfEngine interface is the only entry point

Both PDF endpoints must instantiate the engine through a factory, not directly:

```ts
// app/lib/pdf/engine-factory.ts
import { ReactPdfEngine } from './engine-react-pdf';
import type { PdfEngine } from './engine';

export function createPdfEngine(): PdfEngine {
  if (process.env.PDF_ENGINE === 'puppeteer') {
    // PuppeteerEngine loaded dynamically to avoid importing Chromium in react-pdf contexts
    const { PuppeteerEngine } = require('./engine-puppeteer');
    return new PuppeteerEngine();
  }
  return new ReactPdfEngine();
}
```

Add `PDF_ENGINE` to environment variable templates:
- `.env.development.example` — `PDF_ENGINE=react-pdf`
- `.env.preview.example` — `PDF_ENGINE=puppeteer`
- `.env.production.example` — `PDF_ENGINE=puppeteer`

### 1.2 Add internal PDF render route

Route: `GET /api/resume/pdf-render/[token]`

This route renders the full CV HTML (without chrome) for Puppeteer to screenshot.

Token contract:
- Generated server-side using HMAC-SHA256 with `PDF_RENDER_SECRET` env var.
- Payload: `{ publicId, personSlug, locale, expiresAt }`.
- Max TTL: 60 seconds.
- Route validates token signature and expiry — returns 403 on failure.
- Route renders published CV snapshot only (same source as existing PDF export).
- Route adds `?mode=pdf` which triggers no-chrome rendering in ResumeRenderer.

Add `PDF_RENDER_SECRET` to env templates (min 32 chars random string).

### 1.3 Add print-optimized mode to ResumeRenderer

Add `mode="pdf"` to `ResumeRenderMode` type in `build-resume-render-model.ts`.

When `mode="pdf"`:
- `showChrome={false}` — no language switcher, no export buttons, no sticky hero
- Page background: `#f6f8f8`
- No JavaScript interactions
- CSS: add `.resume-render-mode--pdf` class that enforces print-safe styles

This is a server-rendered page — no client hydration needed. Use `dynamic = 'force-static'`
or a minimal RSC with inline data.

### 1.4 Contract tests for the render route

Add to `tests/resume-export-contract.test.mjs`:
- Token with valid signature and unexpired TTL → 200
- Token with invalid signature → 403
- Token with expired TTL → 403
- Missing token → 403
- Route never serves private draft content (snapshot-only resolver)

---

## Phase 2 — Vercel migration

### 2.1 Add vercel.json

```json
{
  "functions": {
    "app/api/resume/export/pdf/route.ts": {
      "maxDuration": 30
    },
    "app/api/resume/export/pdf/preview/route.ts": {
      "maxDuration": 30
    },
    "app/api/resume/pdf-render/[token]/route.ts": {
      "maxDuration": 10
    }
  }
}
```

`maxDuration: 30` for PDF export routes accounts for Puppeteer cold start + render time.

### 2.2 Environment variables on Vercel

Migrate all variables from Netlify to Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_APP_BASE_URL`
- `PDF_ENGINE=puppeteer` (production and preview)
- `PDF_RENDER_SECRET` (generate fresh, min 32 chars)

### 2.3 Redirect all Netlify rules to vercel.json

Netlify redirects from `netlify.toml` must be ported to `vercel.json`:

```json
{
  "redirects": [
    { "source": "/index.html", "destination": "/", "permanent": true },
    { "source": "/login.html", "destination": "/login", "permanent": true },
    { "source": "/dashboard.html", "destination": "/dashboard", "permanent": true },
    { "source": "/master-resume.html", "destination": "/master-resume", "permanent": true },
    { "source": "/resume.html", "destination": "/resume", "permanent": true },
    { "source": "/user.html", "destination": "/user", "permanent": true },
    { "source": "/r/index.html", "destination": "/resume", "permanent": true }
  ]
}
```

### 2.4 Validation on Vercel preview

Before switching production DNS:
- [ ] All routes resolve: `/login`, `/dashboard`, `/admin`, `/master-resume`, `/user`
- [ ] Public CV route `/{person-slug}/{public-id}` renders correctly
- [ ] Compatibility route `/r/{slug}` redirects to canonical
- [ ] Legacy `.html` redirects work
- [ ] Auth flow complete: signup → verify → signin → signout
- [ ] Publish and unpublish CV version
- [ ] PDF download (react-pdf fallback if Puppeteer not yet wired)
- [ ] ATS export download
- [ ] Admin panel accessible for admin role

---

## Phase 3 — PuppeteerEngine implementation

### 3.1 Dependencies

```bash
npm install @sparticuz/chromium puppeteer-core
```

`@sparticuz/chromium` provides a compressed Chromium binary optimized for serverless.
Do not use the full `puppeteer` package in production — it bundles its own Chromium
which exceeds function size limits.

### 3.2 PuppeteerEngine skeleton

```ts
// app/lib/pdf/engine-puppeteer.ts
import type { PdfEngine, PdfRenderOptions } from './engine';

export class PuppeteerEngine implements PdfEngine {
  async render(_document: never, options: PdfRenderOptions): Promise<Buffer> {
    const chromium = await import('@sparticuz/chromium');
    const puppeteer = await import('puppeteer-core');

    const browser = await puppeteer.launch({
      args: chromium.default.args,
      defaultViewport: chromium.default.defaultViewport,
      executablePath: await chromium.default.executablePath(),
      headless: true,
    });

    try {
      const page = await browser.newPage();
      const token = generatePdfRenderToken(options);
      const url = `${process.env.NEXT_PUBLIC_APP_BASE_URL}/api/resume/pdf-render/${token}`;

      await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });

      const pdfBytes = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '16mm', bottom: '16mm', left: '12mm', right: '12mm' },
      });

      return Buffer.from(pdfBytes);
    } finally {
      await browser.close();
    }
  }
}
```

Note: `_document` parameter is unused by PuppeteerEngine — it renders from the live route.
The parameter exists to satisfy the `PdfEngine` interface contract.

### 3.3 Visual QA checklist

After first working Puppeteer render, verify against web view:
- [ ] Two-column layout (main 2.5fr / sidebar 1fr)
- [ ] Timeline: vertical axis line + teal dots at each position
- [ ] Experience blocks: grey inner background, rounded corners
- [ ] Course tiles: year column + name column, teal-light background
- [ ] Sidebar cards: white background, rounded corners, no mid-card page breaks
- [ ] Section headers: teal dot + text, correct font size
- [ ] Skills/Languages: dot meter (5 dots, filled/unfilled)
- [ ] Tech stack: teal pills with rounded corners
- [ ] Hero: teal initials circle, name, role subtitle
- [ ] Font: Space Grotesk (verify in Acrobat: File → Properties → Fonts)
- [ ] Page background: grey (#f6f8f8), cards: white

---

## Phase 4 — Cleanup

### Keep or remove react-pdf?

Decision point after Phase 3 QA:

**Keep as dev fallback** if:
- Local dev without Chromium is important for contributor DX.
- CI runs without Chromium available.

**Remove** if:
- Maintenance burden of two renderers outweighs DX benefit.
- CI can install @sparticuz/chromium.

If keeping: set `PDF_ENGINE=react-pdf` in `.env.development.example` and document the
visual fidelity gap clearly in the contributing guide.

If removing: delete `engine-react-pdf.ts`, `CvPdfDocument.tsx`, all section components
in `app/lib/pdf/sections/`, and `TwoColumnTemplate.tsx`. Remove `@react-pdf/renderer`
from `package.json`. Update ADR 0014 status to "Superseded by ADR 0015".

### Final documentation updates

- [ ] Update `docs/guides/local-development.md` — add PDF_ENGINE and PDF_RENDER_SECRET to required env vars
- [ ] Update `docs/guides/environment-matrix.md` — add Vercel as deployment target, retire Netlify
- [ ] Update `docs/guides/deployment-qa.md` — replace Netlify-specific steps with Vercel equivalents
- [ ] Update ADR 0014 — change status to "Partially Superseded", link to ADR 0015
- [ ] Update CLAUDE.md — document Vercel as deployment platform

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Chromium bundle exceeds Vercel function limit | Low | High | @sparticuz/chromium is sized for Vercel; verify with `vercel build --prod` size report |
| Internal render route token leaks | Medium | High | Short TTL (60s), HMAC validation, no public exposure |
| Puppeteer cold start degrades UX | Medium | Medium | 3–5s acceptable for async download; add loading indicator on PDF button |
| DNS cutover causes downtime | Low | High | Keep Netlify live until Vercel preview passes full smoke protocol |
| react-pdf removal breaks CI | Low | Medium | Remove only after confirming CI can use @sparticuz/chromium or react-pdf stays as fallback |
