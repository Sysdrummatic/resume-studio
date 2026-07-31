import { opticalCentringMargin, PAGE_MARGIN_PT, type PdfTheme } from "./theme";
import { mainColumnWidth, measureText, sidebarTextWidth } from "./metrics";

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
 * Height of one block of text.
 *
 * Newlines are counted first. A character-count estimate treated `\n` as an
 * ordinary character, so a highlight holding 99 of them estimated 137pt against
 * a real 1760pt — a twelve-fold under-estimate, and the entry was handed
 * `wrap={false}`.
 *
 * Each logical line is then measured with the real font, not an average
 * character width. Space Grotesk runs 0.47em per character in prose but 1.03em
 * for `@`, so any single constant is either useless (an average under-measures
 * `WWW` by 40%) or unusable (the widest glyph over-measures prose by 2.2x and
 * would split ordinary entries).
 *
 * Dividing the measured width by the column still under-counts, because a line
 * ends early whenever the next word does not fit — all-caps text came out 1.1x
 * short that way. A line is therefore assumed to carry only `width - longest
 * word`, which is the worst case for that waste.
 */
export function estimateTextHeight(
  text: string,
  fontSize: number,
  lineHeight: number,
  width: number,
): number {
  const lines = text.split("\n").reduce((total, logical) => {
    const longestWord = logical
      .split(/\s+/)
      .reduce((widest, word) => Math.max(widest, measureText(word, fontSize, true)), 0);

    // A word wider than the column cannot be broken with hyphenation off, so it
    // overflows sideways rather than adding lines; half the column is a floor
    // that keeps the division meaningful instead of exploding.
    const usable = Math.max(width - longestWord, width / 2);

    return total + Math.max(1, Math.ceil(measureText(logical, fontSize, true) / usable));
  }, 0);

  return lines * fontSize * lineHeight;
}

/**
 * One block of text inside a timeline entry, as both the estimator and
 * PdfTimelineBlocks read it.
 *
 * The two used to describe an entry separately: pagination.ts summed bare
 * strings while the section components applied the margins around them. The
 * margins were therefore never counted — an entry with 37 short highlights
 * measured 773.1pt but estimated 735.15pt against a 760.2pt limit, so it was
 * handed `wrap={false}` and its tail was drawn off the sheet. One description,
 * read by both, is the only shape in which that cannot come back.
 */
export type PdfTimelineBlock = {
  text: string;
  fontSize: number;
  fontWeight?: number;
  color?: string;
  marginTop?: number;
  marginBottom?: number;
  /** Rendered as an .item-list row: indented, with a bullet in front. */
  bullet?: boolean;
};

/** The marker PdfTimelineBlocks draws in front of a bullet row. */
export const BULLET = "•";

/** The width text actually gets inside a main-column timeline entry. */
function entryContentWidth(theme: PdfTheme): number {
  const { components } = theme;

  return (
    mainColumnWidth(theme) -
    2 * theme.layout.cardPadding -
    components.timelineRailWidth -
    2 * components.timelineContentPaddingX
  );
}

/** …and what is left of it once a bullet row's indent and marker are taken out. */
function blockTextWidth(theme: PdfTheme, block: PdfTimelineBlock): number {
  const { components } = theme;
  if (!block.bullet) return entryContentWidth(theme);

  return (
    entryContentWidth(theme) -
    components.listIndent -
    measureText(BULLET, block.fontSize) -
    components.listItemGap
  );
}

/**
 * Height of the title row a first entry is bound to, so the limit it is checked
 * against is the space that will actually be left for it.
 */
export function sectionTitleHeight(theme: PdfTheme, sidebar = false): number {
  const { typography, components, spacing } = theme;
  const size = sidebar ? typography.sizes.lgSidebar : typography.sizes.lg;
  const textBox =
    size * typography.lineHeightHeading + opticalCentringMargin(size, typography.lineHeightHeading);

  return Math.max(components.sectionDotSize, textBox) + spacing.spaceSm;
}

/** Tallest a node may be and still be guaranteed a whole page to itself. */
export function pageContentHeight(theme: PdfTheme): number {
  return A4_HEIGHT_PT - 2 * PAGE_MARGIN_PT - 2 * theme.layout.cardPadding;
}

/**
 * Height of one PdfTimelineItem, from the blocks it holds.
 *
 * Everything the item draws is counted: the period row, the content box's own
 * padding, the trailing gap, and — the part that was missing — the margins each
 * block carries. Those margins are small individually (a bullet's is 2.5pt) and
 * decisive in bulk: 37 of them are 90pt, which is most of the 38pt by which the
 * old estimate came in under a real entry that then overflowed its page.
 */
export function estimateTimelineEntryHeight(theme: PdfTheme, blocks: PdfTimelineBlock[]): number {
  const { components, typography } = theme;

  const period = Math.max(
    components.timelinePeriodMinHeight,
    typography.sizes.base * typography.lineHeight,
  );
  // Optional fields arrive as empty strings; PdfTimelineBlocks skips them, and
  // counting them as a line each would push a whole section onto a new page for
  // text that never renders.
  const content = blocks
    .filter((block) => block.text.length > 0)
    .reduce(
      (total, block) =>
        total +
        (block.marginTop ?? 0) +
        (block.marginBottom ?? 0) +
        estimateTextHeight(
          block.text,
          block.fontSize,
          typography.lineHeight,
          blockTextWidth(theme, block),
        ),
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

export type CardPagination = {
  /**
   * Whether the card may split across pages. False — the long-standing default —
   * moves a card that does not fit the space left on the page to the next one
   * whole, which is how every card in this export has always printed. It is only
   * wrong for content taller than a page, where react-pdf does not fall back to
   * splitting: it warns and draws the overflow off the sheet.
   */
  wrap: boolean;
  /** See PdfSectionCard: binding an oversized first child recreates that. */
  keepTitleWithFirstChild: boolean;
};

/**
 * How a card holding one indivisible-looking run of content should paginate.
 *
 * The schema caps neither the length of a summary nor the number of skills,
 * languages, tech-stack entries or interests, so any of those cards can exceed a
 * page. Passing the estimated content height here keeps the printed result
 * unchanged for every CV that fits — the case that is not a bug — and only
 * unlocks splitting for the one that cannot.
 */
export function planCard(theme: PdfTheme, contentHeight: number, sidebar = false): CardPagination {
  const fits = contentHeight + sectionTitleHeight(theme, sidebar) <= pageContentHeight(theme);

  return { wrap: !fits, keepTitleWithFirstChild: fits };
}

/**
 * Height of a sidebar .meter-list (skills, languages).
 *
 * The list lays out as a wrapping row, so two items often share a row; charging
 * every item a row of its own over-estimates, which is the safe direction here.
 */
export function estimateMeterListHeight(
  theme: PdfTheme,
  items: { name: string; note?: string }[],
): number {
  const { components, typography } = theme;
  const width = sidebarTextWidth(theme);

  return items.reduce((total, item) => {
    const label =
      estimateTextHeight(item.name, typography.sizes.base, typography.lineHeightTight, width) +
      (item.note
        ? estimateTextHeight(item.note, typography.sizes.note, typography.lineHeightTight, width)
        : 0);

    return (
      total +
      label +
      components.meterItemGap +
      components.meterDotSize +
      components.meterListRowGap
    );
  }, 0);
}

/** The same, for a sidebar .pill-list (tech stack, interests). */
export function estimatePillListHeight(theme: PdfTheme, items: string[]): number {
  const { components, typography } = theme;
  const width = sidebarTextWidth(theme) - 2 * components.pillPaddingX;

  return items.reduce(
    (total, item) =>
      total +
      estimateTextHeight(item, typography.sizes.base, typography.lineHeight, width) +
      2 * components.pillPaddingY +
      components.pillGap,
    0,
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
 * `entries` is each entry's blocks, in render order — the same arrays the
 * section hands to PdfTimelineBlocks.
 */
export function planTimelineSection(
  theme: PdfTheme,
  entries: PdfTimelineBlock[][],
  sidebar = false,
): TimelinePagination {
  const limit = pageContentHeight(theme);
  const heights = entries.map((blocks) => estimateTimelineEntryHeight(theme, blocks));

  return {
    allowSplit: heights.map((height) => height > limit),
    // The bound node is title *plus* first entry, so the title's own height has
    // to come out of the budget. An entry that fits a page on its own can still
    // overflow once the heading rides along, and that node is not splittable.
    keepTitleWithFirstEntry:
      heights.length === 0 || heights[0] + sectionTitleHeight(theme, sidebar) <= limit,
  };
}
