import React from "react";
import { Text, View } from "@react-pdf/renderer";
import type { ResumeContactItem } from "../../resume-schema";
import type { PdfTheme } from "../theme";
import { PdfSectionCard } from "../primitives";
import { sidebarTextWidth, wrapAtBreakPoints } from "../metrics";
import { estimateTextHeight, pageContentHeight, sectionTitleHeight } from "../pagination";
import { splitContactValueForWrapping } from "../../../components/resume-renderer/build-resume-render-model";

type PdfPersonalInfoProps = {
  contact: ResumeContactItem[];
  title: string;
  theme: PdfTheme;
};

// Mirrors .contact-list / .contact-item at the >=1024px breakpoint, where the
// list stacks into a column of label/value pairs.
//
// The pairs themselves stack too. .card is a `container-type: inline-size`
// query container and the sidebar card holds 200.5px of content — the same
// 200.5px on both surfaces, since the shell width is derived from the PDF's
// scale — so `@container (max-width: 220px)` applies and turns .contact-item
// into a column. Laying the label and value out side by side here is what
// pushed long values onto a second line at a break the web never makes.
/**
 * Height of one contact row, from the value's already-decided line count.
 *
 * Cheap and exact enough: wrapAtBreakPoints has done the hard part, so the rows
 * only have to be counted.
 */
function rowHeight(theme: PdfTheme, label: string, wrappedValue: string): number {
  const { components, typography } = theme;
  const width = sidebarTextWidth(theme);

  return (
    estimateTextHeight(label, typography.sizes.base, typography.lineHeightTight, width) +
    components.contactLabelGap +
    wrappedValue.split("\n").length * typography.sizes.contactValue * typography.lineHeightTight +
    components.contactRowGap
  );
}

export function PdfPersonalInfo({ contact, title, theme }: PdfPersonalInfoProps) {
  const { components, typography } = theme;
  const valueWidth = sidebarTextWidth(theme);
  const values = contact.map((item) =>
    wrapAtBreakPoints(
      splitContactValueForWrapping(item.value),
      valueWidth,
      typography.sizes.contactValue,
    ),
  );

  /*
   * The card wraps, but PdfSectionCard binds the title to the first row inside a
   * `wrap={false}` View — and that binding is what a single very long value
   * defeats. A 10 000-character contact wrapped to 417 lines, react-pdf reported
   * an unsplittable View taller than the page, and the tail was drawn off the
   * sheet. Nothing caps a contact value's length, so the binding is dropped
   * whenever the first row cannot fit under the heading; a stranded heading is
   * the lesser of the two failures.
   */
  const bindTitle =
    contact.length === 0 ||
    rowHeight(theme, contact[0].label, values[0]) + sectionTitleHeight(theme, true) <=
      pageContentHeight(theme);

  return (
    // `wrap`, because the schema caps neither the number of contacts nor their
    // length. In a card that cannot split, everything past the page edge is
    // simply not drawn; the rows are direct children so a break lands between
    // two of them.
    <PdfSectionCard title={title} theme={theme} sidebar wrap keepTitleWithFirstChild={bindTitle}>
      {contact.map((item, index) => (
        <View
          key={index}
          style={{
            flexDirection: "column",
            alignItems: "flex-start",
            gap: components.contactLabelGap,
            marginBottom:
              index === contact.length - 1 ? theme.spacing.spaceSm : components.contactRowGap,
          }}
        >
          <Text
            style={{
              fontSize: typography.sizes.base,
              lineHeight: typography.lineHeightTight,
              fontWeight: typography.weights.bold,
              color: theme.colors.muted,
            }}
          >
            {item.label}
          </Text>
          <Text
            style={{
              fontSize: typography.sizes.contactValue,
              lineHeight: typography.lineHeightTight,
              // .contact-list dd inherits --text; only .contact-list a is
              // --accent-dark. Colouring every value accent-dark here painted
              // entries with no link — Location — green in the PDF and black
              // on the web.
              color: item.link ? theme.colors.accentDark : theme.colors.text,
              // `flex: 1` here shared the row's width with the label; on a
              // column axis it would instead stretch the value vertically.
              width: "100%",
            }}
          >
            {/* The same break points the web marks with <wbr>, applied only
                when the value genuinely overflows this column. */}
            {values[index]}
          </Text>
        </View>
      ))}
    </PdfSectionCard>
  );
}
