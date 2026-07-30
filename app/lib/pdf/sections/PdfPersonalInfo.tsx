import React from "react";
import { Text, View } from "@react-pdf/renderer";
import type { ResumeContactItem } from "../../resume-schema";
import type { PdfTheme } from "../theme";
import { PdfSectionCard } from "../primitives";

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
export function PdfPersonalInfo({ contact, title, theme }: PdfPersonalInfoProps) {
  const { components, typography } = theme;

  return (
    <PdfSectionCard title={title} theme={theme} sidebar>
      <View
        style={{
          flexDirection: "column",
          gap: components.contactRowGap,
          marginBottom: theme.spacing.spaceSm,
        }}
      >
        {contact.map((item, index) => (
          <View
            key={index}
            style={{ flexDirection: "column", alignItems: "flex-start", gap: components.contactLabelGap }}
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
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    </PdfSectionCard>
  );
}
