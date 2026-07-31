# Changelog

All notable changes to this project are documented in this file, grouped by
year, month, and day. See [docs/adr](docs/adr/README.md) for the architectural
reasoning behind larger changes.

## 2026

### July

#### 2026-07-31

- **fix:** PDF export no longer draws the tail of a long employer entry off the
  sheet. The page-break estimator summed only an entry's text while the section
  components applied the margins around it, so the margins were never counted:
  an entry with 37 short highlights laid out at 773.1pt against a 735.15pt
  estimate and was kept whole at a 760.2pt page limit. Sections now build one
  `PdfTimelineBlock[]` (`experienceBlocks`/`educationBlocks`/`courseBlocks`) and
  hand it to both `planTimelineSection()` and the new `PdfTimelineBlocks`
  renderer, so the estimate cannot omit what the renderer draws.
- **fix:** A single over-long contact value no longer lands inside an
  unsplittable wrapper. `PdfSectionCard` binds the section title to the first
  row in a `wrap={false}` View; `PdfPersonalInfo` now drops that binding when the
  first row cannot fit under the heading (`app/lib/pdf/sections/PdfPersonalInfo.tsx`).
- **fix:** Summary, Skills, Languages, Tech Stack and Interests cards could be
  drawn past the page edge, since the schema caps neither text length nor record
  count. Each now calls `planCard()`: content that fits keeps `wrap={false}` and
  prints exactly as before, and only content taller than a page unlocks
  splitting.
- **fix:** Measuring a long field was quadratic — `font.layout()` re-run for
  every growing prefix, ~1.9s of blocked event loop for a 64k-character value
  before rendering began, on a public route protected only by a per-process rate
  limiter. `characterWidths()` (`app/lib/pdf/metrics.ts`) shapes the string once
  and sums glyph advances; `fill()` adds part widths instead of re-measuring the
  line.
- **fix:** Deleted the dead `grid-template-columns` on `.timeline-item` in the
  print block — the element computes to `display: flex` and print does not change
  that, so the rule never applied. `tests/print-css-contract.test.mjs` now guards
  both this and the `.contact-list` case.
- **docs:** [ADR 0014](docs/adr/0014-pdf-rendering-architecture.md) records the
  single-description rule for timeline entries, the `planCard()` contract for
  unbounded cards, and the **accepted trade-off** on long contact values: a
  wrapped e-mail is two lines in the text layer, so `pdftotext` returns
  `ariana.holt` / `@examplecorp.com` and a one-line regex will not match it. PDF
  has no soft break, the alternatives (invisible overflow, or react-pdf's
  hyphenation painting a literal `-` into the address) are worse, and
  `/api/resume/export/text` and `/api/resume/export/yaml` serve machine-grade
  extraction on one unbroken line.
- **docs:** Corrected the print CSS audit, which described the printed timeline
  as a two-column period/content grid; it prints as a period-over-content stack
  and always did. Dropped the retired Phase H from the `docs/STATUS.md` progress
  line.
- **test:** `tests/pdf-pagination.test.mjs` measures a rendered
  `PdfTimelineItem`, not a bare `Text` — reconstructing the component in the test
  is what let the missing margins through. The height is read back out of the
  PDF's own content stream (`tests/helpers/pdf-measure.mjs`), and
  `tests/helpers/ts-extension-resolve.mjs` gained a JSX transpile hook (via the
  existing `typescript` dev-dependency) so a `.tsx` component can be imported at
  all. `tests/pdf-contact-wrapping.test.mjs` asserts the extracted text runs
  **without** rejoining them, so the ATS trade-off stays visible rather than
  masked.
- **chore:** Restored `next-env.d.ts` to the non-dev `./.next/types/routes.d.ts`
  path, which `next build` regenerates anyway.

> Rendered content streams for the EN and PL sample CVs are byte-identical
> before and after this day's PDF work — no visual or functional change.

### June

#### 2026-06-30

- **feat:** Master Resume editor language versions now live as tabs in-place,
  instead of a page-header switcher. The YAML Editor pane shows a tab strip
  above the textarea (`"{Language} (default)"` for the default locale), and the
  Human-Friendly Editor shows a compact `[CODE] [edit]` row above the "Core"
  section. Both surfaces share one in-memory state, so switching tabs never
  discards unsaved edits in another language version.
- **feat:** All of a user's configured language versions load into memory at
  editor start, each as an independent buffer (parsed resume + raw YAML + dirty
  flag), via the new `useMultiLocaleResumeDocuments` hook
  (`app/master-resume/use-multi-locale-resume-documents.ts`).
- **feat:** A single `[Languages]` button (next to "Download YAML") and the HFE
  `[edit]` button both open the same language-version management modal,
  extracted to `app/master-resume/language-version-modal.tsx`.
- **feat:** "Save MasterCV" and "Save unpublished" now save every language
  version with unsaved changes in one click (not just the active tab), with
  partial-success/failure reporting in the status toast.
- **fix:** Rollback to a prior revision and HFE field edits no longer race —
  rollback now guards against overwriting edits made to the same locale while
  the rollback request was in flight, and HFE inputs are disabled while a
  save/rollback is in progress.
- **fix:** A failed per-locale document fetch during editor bootstrap (expired
  token, RLS denial, transient server error) no longer silently falls back to a
  blank document; the affected language version is marked as failed-to-load and
  excluded from "Save MasterCV" until the page is reloaded.
- **docs:** Added [ADR 0017](docs/adr/0017-multi-locale-master-resume-editor-tabs.md)
  documenting the multi-locale buffer architecture and the decisions above.
- **refactor:** Removed the page-header locale switcher
  (`.resume-editor-shell__locale-switch`) from `editor-canvas-client.tsx`; its
  responsibility moved entirely into the new `LocaleTabStrip` component.
