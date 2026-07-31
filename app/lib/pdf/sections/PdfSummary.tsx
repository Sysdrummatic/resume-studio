import React from "react";
import { Text } from "@react-pdf/renderer";
import type { ResumeSummaryItem } from "../../resume-schema";
import type { PdfTheme } from "../theme";
import { PdfSectionCard } from "../primitives";
import { estimateTextHeight, planCard } from "../pagination";
import { mainColumnWidth } from "../metrics";

type PdfSummaryProps = {
  summary: ResumeSummaryItem;
  title: string;
  theme: PdfTheme;
};

// Mirrors .summary-text.
export function PdfSummary({ summary, title, theme }: PdfSummaryProps) {
  // Nothing caps a summary's length, and a card that cannot split draws
  // everything past the page edge off the sheet. planCard leaves the printed
  // result untouched for every summary that fits — see ../pagination.
  const pagination = planCard(
    theme,
    estimateTextHeight(
      summary.description,
      theme.typography.sizes.md,
      theme.typography.lineHeight,
      mainColumnWidth(theme) - 2 * theme.layout.cardPadding,
    ),
  );

  return (
    <PdfSectionCard title={title} theme={theme} {...pagination}>
      <Text
        style={{
          fontSize: theme.typography.sizes.md,
          color: theme.colors.text,
          lineHeight: theme.typography.lineHeight,
          textAlign: "justify",
        }}
      >
        {summary.description}
      </Text>
    </PdfSectionCard>
  );
}
