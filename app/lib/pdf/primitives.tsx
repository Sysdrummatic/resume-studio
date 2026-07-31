import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { centeringPadding, opticalCentringMargin, type PdfTheme } from "./theme";
import { BULLET, type PdfTimelineBlock } from "./pagination";

type PdfCircleProps = {
  size: number;
  color: string;
  theme: PdfTheme;
  style?: React.ComponentProps<typeof View>["style"];
  children?: React.ReactNode;
};

/**
 * A circle flexbox cannot squash.
 *
 * .section-dot, .logo-circle and .meter all carry `flex-shrink: 0` on the web.
 * react-pdf has no counterpart that works: `flexShrink: 0` on a View with a
 * width is ignored, and the section dot still measured 17.12pt beside a title
 * that filled the sidebar. Once the width drops below the height the border
 * radius clamps to width / 2, which leaves a straight segment down each side —
 * the dot stops being round. `minWidth` is the floor react-pdf does honour.
 */
export function PdfCircle({ size, color, theme, style, children }: PdfCircleProps) {
  return (
    <View
      style={{
        width: size,
        minWidth: size,
        height: size,
        borderRadius: theme.radii.full,
        backgroundColor: color,
        ...style,
      }}
    >
      {children}
    </View>
  );
}

type PdfSectionCardProps = {
  title: string;
  theme: PdfTheme;
  /** Sidebar column, where the narrower card takes --font-size-lg-sidebar. */
  sidebar?: boolean;
  wrap?: boolean;
  /**
   * Keep the title and the first child on one page. Pass false only when that
   * child is allowed to split — binding it would then re-create the overflow
   * that `wrap={false}` draws off the sheet. See ./pagination.
   */
  keepTitleWithFirstChild?: boolean;
  children: React.ReactNode;
};

// Mirrors .section / .card plus .section-title. The web card carries no border,
// only `box-shadow: 0 0 25px rgba(0,0,0,.05)`; react-pdf has no shadow, and a
// substitute border reads far harder than the shadow it replaces, so the card
// is defined the same way the web defines it at a glance — white on --bg.
export function PdfSectionCard({
  title,
  theme,
  sidebar = false,
  wrap = false,
  keepTitleWithFirstChild = true,
  children,
}: PdfSectionCardProps) {
  const { typography } = theme;
  const titleSize = sidebar ? typography.sizes.lgSidebar : typography.sizes.lg;
  const [firstChild, ...restChildren] = React.Children.toArray(children);

  /*
   * `minPresenceAhead` used to sit on this row, and it never once fired.
   * react-pdf's shouldBreak() gates that branch on `breakingImprovesPresence`,
   * which is `previousElements.length > 0` — and the title is the card's first
   * child, so it has no previous siblings and can never break on its own. The
   * title stayed put while the first entry moved on, leaving a heading and an
   * empty card fragment at the foot of the page.
   *
   * Binding the two into one `wrap={false}` node uses a different branch,
   * `shouldSplit && !canWrap`, which carries no such guard. react-pdf then finds
   * the card's current fragment has no children left and drops it too, so the
   * whole section moves cleanly. Verified in tests/pdf-render-geometry.test.mjs.
   */
  const titleRow = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.components.sectionTitleGap,
        marginBottom: theme.spacing.spaceSm,
      }}
    >
      <PdfCircle size={theme.components.sectionDotSize} color={theme.colors.accent} theme={theme} />
      <Text
        style={{
          fontSize: titleSize,
          fontWeight: typography.weights.bold,
          letterSpacing: titleSize * 0.01,
          // The literal --line-height-heading, because it also sets the gap
          // between the lines of a heading that wraps. The row is
          // alignItems: center, so the margin below re-centres the glyphs on
          // the dot — react-pdf leaves them off-centre at any line height.
          lineHeight: typography.lineHeightHeading,
          marginBottom: opticalCentringMargin(titleSize, typography.lineHeightHeading),
          color: theme.colors.text,
        }}
      >
        {title}
      </Text>
    </View>
  );

  return (
    <View
      wrap={wrap}
      style={{
        backgroundColor: theme.colors.cardBg,
        borderRadius: theme.radii.lg,
        padding: theme.layout.cardPadding,
      }}
    >
      {keepTitleWithFirstChild ? (
        <View wrap={false}>
          {titleRow}
          {firstChild}
        </View>
      ) : (
        titleRow
      )}
      {keepTitleWithFirstChild ? restChildren : children}
    </View>
  );
}

type PdfTimelineItemProps = {
  period: string;
  isLast: boolean;
  theme: PdfTheme;
  /**
   * Only for an entry too tall to fit on any page. `wrap={false}` does not fall
   * back to splitting — it lets the overflow run off the sheet — so the one
   * entry that cannot fit has to be allowed to break. See ./pagination.
   */
  allowSplit?: boolean;
  children: React.ReactNode;
};

/**
 * Mirrors .timeline / .timeline-item.
 *
 * The web draws one absolutely-positioned axis spanning the whole .timeline and
 * centres each dot on its period line. Here the axis is a per-item segment
 * spanning the full row, including the row's trailing gap, so consecutive rows
 * join into one unbroken line while each item stays independently breakable.
 */
export function PdfTimelineItem({
  period,
  isLast,
  theme,
  allowSplit = false,
  children,
}: PdfTimelineItemProps) {
  const { components, typography } = theme;
  // .timeline-item__period is min-height 28px with the dot at top: 50%.
  const periodLineHeight = Math.max(
    components.timelinePeriodMinHeight,
    typography.sizes.base * typography.lineHeight,
  );
  const dotOuterSize = components.timelineDotSize + components.timelineDotRing * 2;

  return (
    <View wrap={allowSplit} style={{ flexDirection: "row" }}>
      <View style={{ width: components.timelineRailWidth, position: "relative" }}>
        <View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: components.timelineAxisOffset - components.timelineAxisWidth / 2,
            width: components.timelineAxisWidth,
            backgroundColor: theme.colors.border,
          }}
        />
        {/* .timeline-item__period::before is a dot with `box-shadow: 0 0 0 3px
            var(--card-bg)` — a ring outside the dot whose only job is to mask
            the axis running behind it. Expressed here as a card-coloured circle
            with the accent dot centred in it. It was a `borderWidth` before,
            which react-pdf strokes inside the shape and rendered as a visible
            outline the web never draws. */}
        <PdfCircle
          size={dotOuterSize}
          color={theme.colors.cardBg}
          theme={theme}
          style={{
            position: "absolute",
            left: components.timelineAxisOffset - dotOuterSize / 2,
            top: periodLineHeight / 2 - dotOuterSize / 2,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <PdfCircle size={components.timelineDotSize} color={theme.colors.accent} theme={theme} />
        </PdfCircle>
      </View>
      <View style={{ flex: 1, paddingBottom: isLast ? 0 : components.timelineGap }}>
        <Text
          style={{
            fontSize: typography.sizes.base,
            fontWeight: typography.weights.bold,
            color: theme.colors.muted,
            // The dot above is centred on periodLineHeight, so the period's
            // glyphs have to be centred on it too. Padding rather than an
            // explicit height, so the box is periodLineHeight tall without
            // depending on how react-pdf resolves height against padding.
            lineHeight: typography.lineHeightNatural,
            paddingVertical: centeringPadding(typography.sizes.base, periodLineHeight),
            marginBottom: components.timelineItemGap,
          }}
        >
          {period}
        </Text>
        <View
          style={{
            backgroundColor: theme.colors.pageBg,
            borderRadius: theme.radii.md,
            paddingVertical: components.timelineContentPaddingY,
            paddingHorizontal: components.timelineContentPaddingX,
          }}
        >
          {children}
        </View>
      </View>
    </View>
  );
}

type PdfTimelineBlocksProps = {
  blocks: PdfTimelineBlock[];
  theme: PdfTheme;
};

/**
 * The contents of a timeline entry, drawn from the same array ./pagination
 * measures.
 *
 * Every experience, education and course entry used to inline its own JSX, so
 * the margins here and the heights over there were two independent descriptions
 * of one thing — and the estimator's copy left the margins out entirely. Blocks
 * that render nothing are dropped rather than drawn empty, which is what
 * Education's optional degree and detail relied on.
 */
export function PdfTimelineBlocks({ blocks, theme }: PdfTimelineBlocksProps) {
  const { typography } = theme;

  return (
    <>
      {blocks.map((block, index) => {
        if (!block.text) return null;

        const text = (
          <Text
            style={{
              fontSize: block.fontSize,
              fontWeight: block.fontWeight ?? typography.weights.regular,
              color: block.color ?? theme.colors.text,
              lineHeight: typography.lineHeight,
              ...(block.bullet
                ? { flex: 1 }
                : { marginTop: block.marginTop, marginBottom: block.marginBottom }),
            }}
          >
            {block.text}
          </Text>
        );

        if (!block.bullet) return React.cloneElement(text, { key: index });

        return (
          <View
            key={index}
            style={{
              flexDirection: "row",
              paddingLeft: theme.components.listIndent,
              marginTop: block.marginTop,
              marginBottom: block.marginBottom,
            }}
          >
            <Text
              style={{
                fontSize: block.fontSize,
                color: block.color ?? theme.colors.text,
                lineHeight: typography.lineHeight,
                marginRight: theme.components.listItemGap,
              }}
            >
              {BULLET}
            </Text>
            {text}
          </View>
        );
      })}
    </>
  );
}

type PdfDotMeterProps = {
  level: number;
  theme: PdfTheme;
};

// Mirrors .meter / .meter__dot.
export function PdfDotMeter({ level, theme }: PdfDotMeterProps) {
  return (
    <View style={{ flexDirection: "row", gap: theme.components.meterDotGap }}>
      {[1, 2, 3, 4, 5].map((step) => (
        <PdfCircle
          key={step}
          size={theme.components.meterDotSize}
          color={level >= step ? theme.colors.accent : theme.colors.meterDotInactive}
          theme={theme}
        />
      ))}
    </View>
  );
}

type PdfPillListProps = {
  items: string[];
  theme: PdfTheme;
};

// Mirrors .pill-list / .pill-list li.
export function PdfPillList({ items, theme }: PdfPillListProps) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.components.pillGap }}>
      {items.map((item, index) => (
        <View
          key={index}
          style={{
            backgroundColor: theme.colors.pillBg,
            paddingVertical: theme.components.pillPaddingY,
            paddingHorizontal: theme.components.pillPaddingX,
            borderRadius: theme.radii.full,
          }}
        >
          <Text
            style={{
              fontSize: theme.typography.sizes.base,
              fontWeight: theme.typography.weights.medium,
              lineHeight: theme.typography.lineHeight,
              color: theme.colors.accentDark,
            }}
          >
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

type PdfMeterItemProps = {
  name: string;
  note?: string;
  level: number;
  theme: PdfTheme;
  /** .resume-section--skills drops the bold; Languages keeps it. */
  nameWeight?: number;
};

// Mirrors .meter-item.meter-item--plain: label column (name over optional note)
// with the dot meter beneath, laid out by .meter-list as a wrapping row.
export function PdfMeterItem({
  name,
  note,
  level,
  theme,
  nameWeight = theme.typography.weights.bold,
}: PdfMeterItemProps) {
  return (
    <View style={{ flexDirection: "column", gap: theme.components.meterItemGap }}>
      <View style={{ flexDirection: "column" }}>
        <Text
          style={{
            fontSize: theme.typography.sizes.base,
            fontWeight: nameWeight,
            color: theme.colors.text,
            lineHeight: theme.typography.lineHeightTight,
          }}
        >
          {name}
        </Text>
        {note ? (
          <Text
            style={{
              fontSize: theme.typography.sizes.note,
              fontWeight: theme.typography.weights.medium,
              color: theme.colors.muted,
              lineHeight: theme.typography.lineHeightTight,
            }}
          >
            {note}
          </Text>
        ) : null}
      </View>
      <PdfDotMeter level={level} theme={theme} />
    </View>
  );
}

type PdfMeterListProps = {
  theme: PdfTheme;
  children: React.ReactNode;
};

// Mirrors .meter-list: a wrapping row with asymmetric row/column gaps.
export function PdfMeterList({ theme, children }: PdfMeterListProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        rowGap: theme.components.meterListRowGap,
        columnGap: theme.components.meterListColumnGap,
      }}
    >
      {children}
    </View>
  );
}
