# ADR 0027: CV Template Families And PDF Layout Variants

Status: Accepted

Date: 2026-11-12

Extends: [ADR 0014](0014-pdf-rendering-architecture.md) (PDF rendering architecture)

## Context

ADR 0014 states that "new CV styles require implementing a `PdfTheme` object only (no
template changes)". That held while every style was the two-column card layout in other
colours. The three templates added after it (`signal-grid`, `atelier-noir`,
`terminal-stack`) change structure on the web (flat sections, a period column, a
full-bleed hero) but their PDF is still the default layout recoloured, and they leave the
861.74px reference box, so the web/PDF parity contract does not cover them.

The template list was also restated in five places (the id type, the palettes, the
normalisation list, the editor selector, the dashboard selector).

New template families (standard, premium, tech, bold) need structures the default PDF
layout cannot express: a single column, a sidebar on the left, sections without a card
surface.

## Decision

1. **One manifest.** `RESUME_TEMPLATES` in `app/lib/resume-style.ts` is the only list of
   templates. Each entry carries `id`, `name`, `labelKey`, `family`, `experienceFit`,
   `bestFor`, `pdfLayout` and `palette`. The id type, the palettes and both selectors derive
   from it. Ids are stored in saved CV versions as JSON, so an entry may be added but never
   renamed or removed.

2. **Three PDF page structures**, selected by `PdfTheme.variant.layout`: `two-column` (the
   original), `two-column-left` (sidebar first) and `single-column` (contact, then the main
   sections, then the former sidebar sections at full width). All three are rendered by
   `app/lib/pdf/templates/TwoColumnTemplate.tsx`.

3. **Paint switches, not second components.** `PdfTheme.variant` also carries `section`
   (`card` | `rule`), `timeline` (`rail` | `stacked`), `meter` (`dots` | `bars` | `none`) and
   `headerAlign` (`left` | `center`). They decide only what is painted.

4. **Geometry stays in numeric tokens.** A flat section is `layout.cardPadding: 0`; a
   timeline without a rail is `components.timelineRailWidth: 0`. `metrics.ts` and
   `pagination.ts` already read those numbers, so the height estimates that decide whether
   an entry may be kept whole follow without a second code path. The only geometry that
   depends on a flag is the column width (`mainColumnWidth`, `sidebarTextWidth`) and the
   section-title rule (`sectionRuleHeight`).

5. **An absent variant is the original design.** `cvBasicDotTheme` declares none, and the
   existing four templates keep their current PDF output.

6. **Text on an accent is computed.** The accent is an arbitrary user hex, so
   `readableTextOn()` picks pure white or pure black by WCAG contrast; one of the two always
   reaches 4.5:1. Themes that paint text on the accent set `colors.onAccent` from it.

7. **New templates stay inside the reference box.** Every template added from here on keeps
   `--resume-max-width`, so ADR 0014's rule (web length × `PX_TO_PT` = PDF length) applies
   to it. The three older templates are not changed; their deviations are recorded in
   `TECH_DEBT.md`.

## Consequences

- ADR 0014's "theme object only" consequence is narrowed: a new style is a manifest entry,
  a CSS block and a `PdfTheme` (tokens plus variant). It still needs no new PDF component.
- A meter drawn as `none` removes no text: the level is never text in any variant, and the
  ATS exports read it from the document.
- Height estimates for `bars` and `none` meters stay on the safe side: they are measured as
  at least as tall as what is drawn.
- `.codex/cv-rendering-unification-meta-prompt.md` ("one target template:
  `sample-two-column`") no longer describes the target state.

## Amendment 2026-11-16: template fonts, a rule between the columns, the professional family

Decision 7 said only that a new template keeps `--resume-max-width`. The comment above the
flat templates in `resume.css` and its test went further: "they keep --resume-max-width,
the CV font and its 400/500/700 weights". The templates designed after it (the
`professional` family first) are defined by their type, so the font part of that rule is
replaced. The reference box is not: it stays as decision 7 states it.

8. **Template fonts.** A flat template may set its text in one family and its name,
   monogram and section titles in another. `CV_FONTS` in `app/lib/resume-style.ts` is the
   only list of families: the name each surface uses, the static files by weight, and the
   files' own metrics. `resume.css` declares the same files with `@font-face` and
   `engine-react-pdf.ts` registers them, so both surfaces break a line in the same place.
   - A text family ships 400, 500 and 700, the three weights the CV uses. A heading family
     ships the one weight it is drawn in, exposed as `typography.headingWeight`; asking it
     for another makes the browser synthesise a weight the PDF cannot draw.
   - No italics. None of the CV's rules needs one, and each would be another file.
   - Files are complete static TTFs. A subset exported by a design tool loads in react-pdf
     but carries no PostScript name, and a document that uses it never finishes rendering.
     Each family's OFL text is in `public/fonts/licenses/`.
   - Everything that measures text before layout takes the theme's text family:
     `measureText()`, `wrapAtBreakPoints()` and `estimateTextHeight()` have a `fontFamily`
     parameter, and `centeringPadding()` / `opticalCentringMargin()` take the font's line
     box and optical centre (`lineHeightNatural`, `headingLineHeightNatural`,
     `headingOpticalCentre`). Space Grotesk's values remain the defaults.
   - The domain boundary holds: a CV font is never one of the Portal's (Geist).

9. **A rule between the columns** is `layout.sidebarRuleWidth`, painted in `colors.border`.
   It is drawn in the column gap (half the gap out as a negative margin, back in as
   padding), so it takes no width from either column and adds no geometry flag.

10. **`header.bleedTop`** lets a header band that bleeds sideways also cover the page's top
    margin, because `.hero` starts at the sheet's edge. The three older templates do not set
    it and keep their output.

11. **The preview shows what the PDF can draw.** A template's web CSS uses only what the PDF
    reproduces. Decoration from a design mockup that react-pdf cannot paint (shadows,
    gradients, generated content, hatching) is left out of the web template too, not kept on
    one surface.

12. **`professional`** joins `standard`, `premium`, `tech` and `bold` as a template family.
    `boardroom` and `executive` are its first two templates.

`FLAT_BASE.layout.columnGap` is now `px(24)`: `.resume-surface--flat .layout` sets a grid
gap of `--space-xl`, which separates the columns as well as the rows, and the PDF had kept
the original 20px.

## Tests

- `tests/resume-style-settings.test.mjs`: a template's fonts reach the PDF theme and the web
  CSS from `CV_FONTS`; every listed file is vendored, declared with `@font-face` and ships
  its licence; the column rule and the header band are the same on both surfaces.
- `tests/pdf-pagination.test.mjs`: every font is a complete static file with a PostScript
  name and the glyphs a Polish CV needs, and its declared metrics are the file's own; text
  is measured with the template's font; the height estimate still covers a rendered entry;
  the column rule rewraps nothing.
- `tests/resume-style-settings.test.mjs`: the manifest is the only list; text on an accent
  is readable at light, dark, saturated and mid-grey accents.
- `tests/pdf-pagination.test.mjs`: column widths per layout, the ruled title height, a
  mirrored sidebar loses and rewraps nothing, every layout and paint variant renders the
  whole CV.
