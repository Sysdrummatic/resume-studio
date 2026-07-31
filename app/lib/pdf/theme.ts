export interface PdfTheme {
  id: string;
  colors: {
    accent: string;
    accentDark: string;
    accentLight: string;
    text: string;
    muted: string;
    cardBg: string;
    border: string;
    pageBg: string;
    white: string;
    pillBg: string;
    meterDotInactive: string;
  };
  typography: {
    fontFamily: string;
    sizes: {
      note: number;
      role: number;
      contactValue: number;
      sm: number;
      base: number;
      md: number;
      lg: number;
      lgSidebar: number;
      logo: number;
      xl: number;
    };
    weights: {
      regular: number;
      medium: number;
      bold: number;
    };
    lineHeight: number;
    lineHeightTight: number;
    lineHeightNatural: number;
    lineHeightHeading: number;
  };
  spacing: {
    space2xs: number;
    spaceXs: number;
    spaceSm: number;
    spaceMd: number;
    spaceLg: number;
    spaceXl: number;
  };
  radii: {
    md: number;
    lg: number;
    full: number;
  };
  layout: {
    pageMargin: number;
    columnGap: number;
    mainColumnFlex: number;
    sideColumnFlex: number;
    cardPadding: number;
    sectionGap: number;
  };
  components: {
    logoSize: number;
    sectionDotSize: number;
    sectionTitleGap: number;
    timelineGap: number;
    timelineRailWidth: number;
    timelineAxisOffset: number;
    timelineDotSize: number;
    timelineDotRing: number;
    timelineAxisWidth: number;
    timelineItemGap: number;
    timelinePeriodMinHeight: number;
    timelineContentPaddingY: number;
    timelineContentPaddingX: number;
    listIndent: number;
    listItemGap: number;
    contactRowGap: number;
    contactLabelGap: number;
    meterListRowGap: number;
    meterListColumnGap: number;
    meterItemGap: number;
    meterDotSize: number;
    meterDotGap: number;
    pillGap: number;
    pillPaddingY: number;
    pillPaddingX: number;
  };
}

/**
 * Web CSS pixels -> PDF points. The one scale in this export.
 *
 * react-pdf lays out in PostScript points (72/inch), the browser in CSS pixels
 * (96/inch), so a literal conversion is 0.75. This is not that: it is a design
 * scale, and it governs the page width as strictly as it governs type. 0.625
 * puts the inherited body size on 10pt, the print-CV convention.
 *
 * Picking it fixes the width of the web layout the PDF can mirror — see
 * REFERENCE_LAYOUT_PX, and change `--resume-max-width` with it or the export
 * silently goes back to breaking lines in the wrong places.
 *
 * Nothing here may be hand-tuned: the PDF is the web design scaled, not a
 * second design. Enforced by tests/pdf-web-style-parity.test.mjs.
 */
export const PX_TO_PT = 0.625;

const pt = (px: number): number => px * PX_TO_PT;

/** A4 in points, as @react-pdf/layout defines it. */
export const A4_WIDTH_PT = 595.28;

/** 1cm. The only print-domain constant here; it surrounds content, never holds any. */
export const PAGE_MARGIN_PT = 28.3465;

/**
 * The web layout width the PDF mirrors, in CSS pixels — derived, never chosen.
 *
 * `s = usable A4 width / web layout width` has one equation and two unknowns,
 * so exactly one of them may be declared. Declaring both is what broke this
 * export: theme.ts fixed s at 0.625 while resume.css independently fixed the
 * shell at 1100px, which implies s = 0.508. Type was scaled by one factor and
 * the column it wraps inside by another, so every line broke ~20% early and no
 * amount of tuning could reconcile them.
 *
 * PX_TO_PT is the declared value; this is what falls out. resume.css must set
 * `--resume-max-width` to this plus its own two `--space-lg` gutters, and
 * tests/pdf-web-style-parity.test.mjs fails if it drifts.
 *
 * The practical consequence: any CV design that fits this box maps onto A4 by
 * multiplying every length by PX_TO_PT. Nothing about a new style needs
 * PDF-specific thought.
 */
export const REFERENCE_LAYOUT_PX = (A4_WIDTH_PT - 2 * PAGE_MARGIN_PT) / PX_TO_PT;

/**
 * Space Grotesk's own line height: (ascent - descent + lineGap) / unitsPerEm,
 * read from the vendored statics as (984 + 292 + 0) / 1000.
 */
const FONT_LINE_HEIGHT = 1.276;

/** Space Grotesk again: ascent and cap height over unitsPerEm. */
const FONT_ASCENT = 0.984;
const FONT_CAP_HEIGHT = 0.7;

/** Where the glyphs' optical centre sits below the top of their own line box. */
const OPTICAL_CENTRE = FONT_ASCENT - FONT_CAP_HEIGHT / 2;

/**
 * The half-leading react-pdf omits.
 *
 * CSS splits a line box's leading evenly above and below the glyphs. react-pdf
 * puts the baseline at `box top + ascent`, so all of it falls below and the
 * glyphs ride high by (lineHeight - 1.276) / 2 of the font size — 3.2pt for the
 * 20pt hero initials, which is why they sat above the middle of their circle,
 * and 2.8pt for a section heading, which is why its dot looked low.
 *
 * Anywhere a Text is centred against a sibling or a fixed box, set
 * `lineHeight: typography.lineHeightNatural` so the Text's box hugs its glyphs,
 * then add this as vertical padding to restore the intended box height. The
 * result is the CSS distribution: same height, glyphs in the middle.
 */
export const centeringPadding = (fontSize: number, boxHeight: number): number =>
  (boxHeight - fontSize * FONT_LINE_HEIGHT) / 2;

/**
 * The same correction for text that has to keep a real `lineHeight`.
 *
 * centeringPadding() assumes the box is taller than the glyphs, so it can pad
 * both sides. A heading cannot use it: its line height is 1.15, below the font's
 * own 1.276, and the padding would have to be negative. Its line height also has
 * to stay literal, because it sets the spacing between the lines of a wrapped
 * heading — which is the whole point of lowering it.
 *
 * So the box keeps its line height and this goes on the bottom instead: the
 * margin box grows (or shrinks, for a line height above 1.268) until its centre
 * lands on the glyphs' optical centre, which is what a centred flex row aligns.
 */
export const opticalCentringMargin = (fontSize: number, lineHeight: number): number =>
  fontSize * (2 * OPTICAL_CENTRE - lineHeight);

// Every value below is `pt(<the web pixel value>)`, so a diff against
// resume.css is mechanical. Comments name the CSS token or selector it mirrors.
export const cvBasicDotTheme: PdfTheme = {
  id: "cv-basic-dot",
  colors: {
    accent: "#009c8a", // --accent
    accentDark: "#007d6c", // --accent-dark
    accentLight: "#e6f4f2", // --accent-light
    text: "#1b1b1b", // --text
    muted: "#6d6d6d", // --muted
    cardBg: "#ffffff", // --card-bg
    border: "#e3e6e8", // --border
    pageBg: "#f6f8f8", // --bg
    white: "#ffffff",
    pillBg: "#e8f5f3", // .pill-list li / .meter-item
    meterDotInactive: "#d1dad8", // .meter__dot
  },
  typography: {
    fontFamily: "SpaceGrotesk",
    sizes: {
      note: pt(13.6), // .meter-item__note — 0.85rem
      role: pt(22), // --role-font-size @>=1024
      contactValue: pt(14.4), // --contact-value-font-size — 0.9rem @>=1024
      sm: pt(16), // --font-size-sm
      base: pt(16), // --font-size-base
      md: pt(17.6), // --font-size-md
      lg: pt(28), // --font-size-lg — 1.75rem
      lgSidebar: pt(18), // --font-size-lg-sidebar @>=1024 — 1.125rem
      logo: pt(32), // --logo-font-size @>=1024
      xl: pt(44), // --font-size-xl @>=1024
    },
    // Space Grotesk ships no 600 instance and react-pdf cannot instance a
    // variable axis, so resume.css uses only these three weights.
    weights: {
      regular: 400,
      medium: 500,
      bold: 700,
    },
    // react-pdf measures a Text's box from a lineHeight set on that Text; an
    // inherited one is only applied when painting, so a Page-level value made
    // stacked text overlap. Every Text sets one of these explicitly.
    lineHeight: 1.6, // .resume-view-page
    lineHeightTight: 1.25, // --line-height-tight
    lineHeightHeading: 1.15, // --line-height-heading
    lineHeightNatural: FONT_LINE_HEIGHT, // pair with centeringPadding()
  },
  spacing: {
    space2xs: pt(4),
    spaceXs: pt(8),
    spaceSm: pt(12),
    spaceMd: pt(16),
    spaceLg: pt(20),
    spaceXl: pt(24),
  },
  radii: {
    md: pt(12), // --radius-md
    lg: pt(18), // --radius-lg
    full: 999,
  },
  layout: {
    pageMargin: PAGE_MARGIN_PT,
    columnGap: pt(20), // .layout gap — --space-lg
    mainColumnFlex: 2.5, // .layout grid-template-columns
    sideColumnFlex: 1,
    cardPadding: pt(20), // .section / .card padding @>=768 — --space-lg
    sectionGap: pt(20), // .main-column / .sidebar gap — --space-lg
  },
  components: {
    logoSize: pt(96), // --logo-size @>=1024
    sectionDotSize: pt(30), // .section-dot
    sectionTitleGap: pt(12), // .section-title gap — --space-sm
    timelineGap: pt(20), // .timeline gap
    // .timeline padding-left = axis offset + content gap; the rail column in
    // the PDF spans the same distance.
    timelineRailWidth: pt(14 + 20),
    timelineAxisOffset: pt(14), // --timeline-axis-offset @>=768
    timelineDotSize: pt(14), // --timeline-dot-size @>=768
    timelineDotRing: pt(3), // .timeline-item__period::before ring
    timelineAxisWidth: pt(3), // .timeline::before width
    timelineItemGap: pt(6), // .timeline-item gap
    timelinePeriodMinHeight: pt(28), // .timeline-item__period min-height
    timelineContentPaddingY: pt(12), // .timeline-item__content padding
    timelineContentPaddingX: pt(16),
    listIndent: pt(18), // .item-list padding-left
    listItemGap: pt(4), // .item-list li margin-bottom
    contactRowGap: pt(10), // .contact-list gap (column axis @>=1024)
    // .contact-item under @container (max-width: 220px), which is the state the
    // sidebar card is always in: 200.5px of content, both here and on the web.
    contactLabelGap: pt(2),
    meterListRowGap: pt(8), // .meter-list gap
    meterListColumnGap: pt(16),
    meterItemGap: pt(6), // .meter-item gap
    meterDotSize: pt(10), // .meter__dot
    meterDotGap: pt(5), // .meter gap
    pillGap: pt(8), // .pill-list gap
    pillPaddingY: pt(6), // .pill-list li padding
    pillPaddingX: pt(14),
  },
};
