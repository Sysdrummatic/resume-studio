import { A4_WIDTH_PT, PAGE_MARGIN_PT, type PdfTheme } from "./theme";

/**
 * Where a timeline section is allowed to break.
 *
 * react-pdf offers two controls and neither means what its name suggests on
 * first reading, so both were being used wrongly:
 *
 *  - `wrap={false}` keeps a node whole. If the node is taller than a page it
 *    does not fall back to splitting — it warns, renders the whole node on one
 *    page and lets the overflow run off the sheet. The text stays in the PDF's
 *    text layer, so an ATS still reads it, but a reader never sees it.
 *  - `minPresenceAhead` cannot strand-proof a section title at all. react-pdf
 *    only consults it when `previousElements.length > 0`, and a title is its
 *    card's first child, so the branch never runs — whatever the value. The
 *    title is bound to its first entry with `wrap={false}` instead; see
 *    PdfSectionCard.
 *
 * The remaining fix needs to know how tall an entry is before it is laid out,
 * and react-pdf exposes no measurement API, so the heights below are estimated.
 */

/** A4 in points, the other half of A4_WIDTH_PT. */
export const A4_HEIGHT_PT = 841.89;

/**
 * Space Grotesk averages close to 0.50em per character of prose — 57 characters
 * fit in 290pt at 10pt, measured against a real render. 0.55 is used here so the
 * estimate runs about 10% tall on purpose: over-estimating splits an entry that
 * would have fitted, which is cosmetic, while under-estimating pushes content
 * off the page.
 */
const AVERAGE_CHAR_WIDTH = 0.55;

function estimateTextHeight(text: string, fontSize: number, lineHeight: number, width: number): number {
  const charsPerLine = Math.max(1, Math.floor(width / (fontSize * AVERAGE_CHAR_WIDTH)));
  const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
  return lines * fontSize * lineHeight;
}

/** The width text actually gets inside a main-column timeline entry. */
function entryTextWidth(theme: PdfTheme): number {
  const { layout, components } = theme;
  const columns = layout.mainColumnFlex + layout.sideColumnFlex;
  const mainColumn =
    ((A4_WIDTH_PT - 2 * PAGE_MARGIN_PT - layout.columnGap) * layout.mainColumnFlex) / columns;

  return (
    mainColumn -
    2 * layout.cardPadding -
    components.timelineRailWidth -
    2 * components.timelineContentPaddingX -
    // Only the highlight list is indented, but subtracting it everywhere keeps
    // the estimate on the tall side.
    components.listIndent
  );
}

/** Tallest an entry may be and still be guaranteed a whole page to itself. */
function maxEntryHeight(theme: PdfTheme): number {
  return A4_HEIGHT_PT - 2 * PAGE_MARGIN_PT - 2 * theme.layout.cardPadding;
}

/**
 * Rough height of one PdfTimelineItem, from the text it holds.
 *
 * Every block is measured at `sizes.md`, the largest of the sizes an entry uses,
 * which adds to the deliberate over-estimate above.
 */
export function estimateTimelineEntryHeight(theme: PdfTheme, texts: string[]): number {
  const { components, typography } = theme;
  const width = entryTextWidth(theme);

  const period = Math.max(
    components.timelinePeriodMinHeight,
    typography.sizes.base * typography.lineHeight,
  );
  // Optional fields arrive as empty strings; they render nothing, and counting
  // them as a line each would push a whole section onto a new page for nothing.
  const content = texts
    .filter((text) => text.length > 0)
    .reduce(
      (total, text) =>
        total + estimateTextHeight(text, typography.sizes.md, typography.lineHeight, width),
      0,
    );

  return (
    period +
    components.timelineItemGap +
    2 * components.timelineContentPaddingY +
    content +
    components.timelineGap
  );
}

export type TimelinePagination = {
  /** Per entry: may it split across pages, because it cannot fit on one. */
  allowSplit: boolean[];
  /**
   * Whether the title may be bound to the first entry. False when that entry is
   * itself allowed to split — binding it would put an oversized node inside a
   * `wrap={false}` one, which is the case that draws content off the sheet. A
   * section whose very first entry is longer than a page can still strand its
   * heading; losing the entry's tail is the worse of the two.
   */
  keepTitleWithFirstEntry: boolean;
};

/**
 * `entries` is each entry's text blocks, in render order.
 */
export function planTimelineSection(theme: PdfTheme, entries: string[][]): TimelinePagination {
  const limit = maxEntryHeight(theme);
  const allowSplit = entries.map((texts) => estimateTimelineEntryHeight(theme, texts) > limit);

  return { allowSplit, keepTitleWithFirstEntry: !allowSplit[0] };
}
