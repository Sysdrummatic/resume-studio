# ADR 0014: PDF Rendering Architecture

Status: Accepted

Date: 2026-06-10

## Context

PDF export existed as a basic @react-pdf/renderer implementation in CvPdfTemplate.tsx that
did not faithfully reproduce the web layout and lacked extension points for future themes
and templates. Previous render attempts suffered from missing font registration, no
page-break control, and hardcoded styles disconnected from the design token system.

## Decision

1. **Engine**: `@react-pdf/renderer`, registered and loaded in
   `app/lib/pdf/engine-react-pdf.ts`. A `PdfEngine` interface was introduced here to keep a
   renderer swap cheap, and later removed — there is no `engine.ts`. What protects the output
   is not an interface but the parity contract in point 2 and the tests named with it.
   [ADR 0015](0015-vercel-puppeteer-pdf-migration.md) records why the swap it was built for
   (Puppeteer on Vercel) was rejected.

2. **Theme contract**: `PdfTheme` interface (`app/lib/pdf/theme.ts`) as the single source of
   visual truth for PDF. All values derived from `app/resume/resume.css` design tokens.
   New CV styles = new PdfTheme object. Web design changes require a synchronized update
   of `cvBasicDotTheme`.

3. **Section components**: Each resume section is an isolated component in
   `app/lib/pdf/sections/` receiving `(data, theme)`. No global StyleSheet — styles computed
   from theme at render time. Shared card/dot-meter/pill primitives live in
   `app/lib/pdf/primitives.tsx`.

4. **Page-break strategy** (`app/lib/pdf/pagination.ts`, `app/lib/pdf/metrics.ts`): each
   entry renders `wrap={false}` so an employer or a degree is never split. `minPresenceAhead`
   is deliberately **not** used to protect section headings: react-pdf gates that branch on
   `previousElements.length > 0`, and a heading is its card's first child, so it never fires
   at any value. `PdfSectionCard` binds the heading and the first entry into one
   `wrap={false}` node instead, which takes the `shouldSplit && !canWrap` branch and moves
   the section as a whole.

   The exception: `wrap={false}` does not fall back to splitting when a node is taller than a
   page — react-pdf warns and draws the overflow off the sheet. `planTimelineSection()`
   therefore estimates each entry's height and sets `allowSplit` for one that cannot fit, and
   withholds the heading binding when the entry plus the heading would not fit. Heights are
   estimated because react-pdf exposes no measurement API; the estimate counts forced
   newlines separately and measures each line with the real font, and errs tall on purpose.

   **An entry is described once.** `PdfTimelineBlock[]` is built by the section
   (`experienceBlocks()`, `educationBlocks()`, `courseBlocks()`) and handed to *both*
   `planTimelineSection()` and `PdfTimelineBlocks`. Two independent descriptions is what
   caused the estimate to omit every block's margins: 37 short highlights measured 773.1pt
   against a 735.15pt estimate at a 760.2pt limit, so the entry was kept whole and its tail
   left the page. Adding a styled block to an entry means adding it to the array, never to the
   JSX alone. `tests/pdf-pagination.test.mjs` measures a rendered `PdfTimelineItem` — not a
   bare `Text` — through `tests/helpers/pdf-measure.mjs`, which reads the laid-out height back
   out of the PDF's own content stream.

   **Cards with no schema bound.** Nothing caps the length of a summary or the number of
   contacts, skills, languages, tech-stack entries or interests, so any of those cards can
   exceed a page on its own. Each calls `planCard()` with an estimated content height:
   content that fits keeps `wrap={false}` and moves whole to the next page exactly as before —
   the printed result for an ordinary CV is unchanged — and only content that cannot fit any
   page unlocks splitting and drops the heading binding. `PdfPersonalInfo` additionally drops
   the binding for a single over-long contact value, which was the one node that could still
   land inside an unsplittable wrapper.

   **Measurement is linear.** `characterWidths()` shapes a string once and sums glyph
   advances. Measuring a growing prefix per character, as breaking a long token used to,
   cost ~1.9s of blocked event loop for a 64k-character field before rendering even began —
   on a public route whose only other protection is a per-process rate limiter.

5. **Font embedding**: Space Grotesk **static** instances from `public/fonts/`
   (`SpaceGrotesk-{Regular,Medium,Bold}.ttf`, OFL) registered for 400/500/700 in
   `engine-react-pdf.ts`. Not the variable font: `Font.register` picks a file per weight and
   does not instance a variation axis, so every weight embedded the variable file's default
   (Light 300) and the PDF had no bold at all. Registration is idempotent. Export routes must
   `await loadPdfFonts()` before rendering — metrics.ts reads the parsed font, and react-pdf
   only loads it after the tree has rendered. Hyphenation is disabled globally
   (`registerHyphenationCallback`), because the browser does not hyphenate either and
   react-pdf paints a hyphen into the text layer where it breaks.

   **Accepted trade-off — long contact values and ATS extraction.** A contact value too wide
   for the sidebar column is pre-wrapped at the same points the web marks with `<wbr>`
   (`wrapAtBreakPoints()`), which puts a real newline in the text layer: `pdftotext` returns
   `ariana.holt` and `@examplecorp.com` on separate lines and a one-line e-mail regex will not
   match. PDF has no soft break, so the alternatives were worse — a value drawn past the
   column edge where no reader sees it, or react-pdf's hyphenation, which paints a literal `-`
   *into the address* and corrupts it even for a parser that rejoins lines. Pre-wrapping is
   the only option that leaves every character intact, it only applies to a value that could
   not have stayed on one line anyway, and machine-grade extraction is served by
   `/api/resume/export/text` and `/api/resume/export/yaml`, which emit each contact value on
   one unbroken line. `tests/pdf-contact-wrapping.test.mjs` asserts the extracted runs without
   rejoining them, so the cost stays visible.

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

- New CV styles require implementing a `PdfTheme` object only (no template changes), and
  must fit the reference layout box below — anything designed inside it maps onto A4 by
  multiplying every length by `PX_TO_PT`, with no PDF-specific work.
- Space Grotesk static TTFs add ~340KB to the deployment bundle (acceptable).
- Feature flag table is the foundation for a future admin control panel.
- react-pdf has no `box-shadow`. `.section` / `.card` carry a soft one on the web; the PDF
  reproduces them as white cards on the tinted page rather than substituting a border, which
  reads far harder than the shadow it would replace.

## Web/PDF parity contract

`factor = usable A4 width / web layout width` admits **one** declared value, so only one of
the two may be chosen. `PX_TO_PT = 0.625` is the declared one and
`--resume-max-width` follows from it:

```
(595.28pt − 2 × 28.3465pt) / 0.625 = 861.7392px   layout box
861.7392px + 2 × var(--space-lg)   = 901.7392px   shell
```

Declaring both is what broke the export before this contract existed: type was scaled by
0.625 while the shell was set at 1100px, which implies 0.508, and every line in the PDF
broke about 20% early. Two suites hold the contract — `tests/pdf-web-style-parity.test.mjs`
asserts the tokens and the container against `resume.css`, and
`tests/pdf-render-geometry.test.mjs` renders PDFs and measures the operators in the content
stream, because token-level tests passed while the output rendered wrong.

## Implementation Checklist

- [x] PdfTheme interface and cvBasicDotTheme defined
- [x] Font registration and loading in `engine-react-pdf.ts`
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
