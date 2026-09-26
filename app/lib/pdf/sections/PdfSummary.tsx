import React from "react";
import { Text } from "@react-pdf/renderer";
import { splitTextBlocks } from "../../bullet-text";
import type { ResumeSummaryItem } from "../../resume-schema";
import type { PdfTheme } from "../theme";
import { PdfSectionCard } from "../primitives";
import { BULLET, estimateTextHeight, planCard } from "../pagination";
import { mainColumnWidth } from "../metrics";

type PdfSummaryProps = {
  summary: ResumeSummaryItem;
  title: string;
  theme: PdfTheme;
};

// Mirrors .summary-text. "- item" lines print as "• item" lines inside the one
// Text (ponytail: a wrapped bullet does not hang-indent here; give lists their
// own bullet rows like PdfEducation's if summaries with long bullets matter).
function summaryText(description: string): string {
  return splitTextBlocks(description)
    .flatMap((block) => (block.kind === "list" ? block.items.map((item) => `${BULLET} ${item}`) : [block.text]))
    .join("\n");
}

export function PdfSummary({ summary, title, theme }: PdfSummaryProps) {
  const text = summaryText(summary.description);

  // Nothing caps a summary's length, and a card that cannot split draws
  // everything past the page edge off the sheet. planCard leaves the printed
  // result untouched for every summary that fits — see ../pagination.
  const pagination = planCard(
    theme,
    estimateTextHeight(
      text,
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
        {text}
      </Text>
    </PdfSectionCard>
  );
}
