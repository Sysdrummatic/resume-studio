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

## Tests

- `tests/resume-style-settings.test.mjs`: the manifest is the only list; text on an accent
  is readable at light, dark, saturated and mid-grey accents.
- `tests/pdf-pagination.test.mjs`: column widths per layout, the ruled title height, a
  mirrored sidebar loses and rewraps nothing, every layout and paint variant renders the
  whole CV.
