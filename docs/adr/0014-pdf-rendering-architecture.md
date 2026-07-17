# ADR 0014: PDF Rendering Architecture

Status: Accepted

Date: 2026-06-10

## Context

PDF export existed as a basic @react-pdf/renderer implementation in CvPdfTemplate.tsx that
did not faithfully reproduce the web layout and lacked extension points for future themes
and templates. Previous render attempts suffered from missing font registration, no
page-break control, and hardcoded styles disconnected from the design token system.

## Decision

1. **Engine abstraction**: Introduce `PdfEngine` interface (`app/lib/pdf/engine.ts`) allowing
   renderer swap (react-pdf → Puppeteer/headless) without touching templates or business logic.

2. **Theme contract**: `PdfTheme` interface (`app/lib/pdf/theme.ts`) as the single source of
   visual truth for PDF. All values derived from `app/resume/resume.css` design tokens.
   New CV styles = new PdfTheme object. Web design changes require a synchronized update
   of `cvBasicDotTheme`.

3. **Section components**: Each resume section is an isolated component in
   `app/lib/pdf/sections/` receiving `(data, theme)`. No global StyleSheet — styles computed
   from theme at render time. Shared card/dot-meter/pill primitives live in
   `app/lib/pdf/primitives.tsx`.

4. **Page-break strategy**: `wrap={false}` per employer block in Experience and per entry in
   Education/Courses. Sidebar cards use `wrap={false}` to prevent mid-card splits. Section
   headers use `minPresenceAhead` so a header is never orphaned at a page bottom while still
   allowing natural inter-employer breaks.

5. **Font embedding**: Space Grotesk Variable TTF embedded at render time from
   `public/fonts/SpaceGrotesk-VariableFont_wght.ttf` (OFL license). Registered for weights
   400 and 700 in `engine-react-pdf.ts`; registration is idempotent and triggered by both
   the engine and the document entry point.

6. **Filename convention**: `{name-slug}-{YYYY-MM-DD}-opencivera-{publicId(14)}.pdf` via
   `buildPdfFilename()` (`app/lib/pdf/filename.ts`). Draft previews use `draft` as the id
   segment. Polish diacritics (including `ł`) are transliterated.

7. **Draft PDF feature flag**: `platform_feature_flags` table in Supabase
   (`20260610000000_pdf_feature_flags.sql`), admin-controlled via RLS, read server-side through
   `isPdfDraftEnabled()` (`app/lib/pdf-feature-flags.ts`). Default: enabled. Fail-open on
   read errors (UX convenience, not a security boundary — auth/role checks remain the gate).
   Future admin panel will expose a toggle UI.

8. **Backward compatibility**: `CvPdfTemplate` remains as a re-export of `CvPdfDocument`.
   All existing route contracts remain valid.

## Consequences

- New CV styles require implementing a `PdfTheme` object only (no template changes).
- Engine swap (e.g. to Puppeteer on Netlify) requires implementing the `PdfEngine`
  interface only.
- Space Grotesk TTF adds ~340KB to the deployment bundle (acceptable).
- Feature flag table is the foundation for a future admin control panel.

## Migration Path to Puppeteer (if needed)

If Netlify Functions cannot handle @react-pdf/renderer due to size limits:
1. Implement `PuppeteerEngine` in `engine-puppeteer.ts`
2. Add `/r/[slug]?mode=pdf` server route (no chrome, print-optimized CSS)
3. Swap the engine export — zero changes elsewhere

## Implementation Checklist

- [x] PdfTheme interface and cvBasicDotTheme defined
- [x] PdfEngine interface and ReactPdfEngine implementation
- [x] Space Grotesk font embedded and registered
- [x] All section components implemented
- [x] TwoColumnTemplate with correct column ratio (2.5 : 1)
- [x] CvPdfDocument as main entry point
- [x] CvPdfTemplate.tsx updated to re-export
- [x] buildPdfFilename() implemented and used in both PDF routes
- [x] platform_feature_flags migration created (apply with `supabase db push`)
- [x] isPdfDraftEnabled() server helper
- [x] BasicResumeDocument updated for DB-driven draft flag
- [x] ADR 0014 added to docs/adr/README.md
- [x] docs/STATUS.md updated
- [x] All tests pass
