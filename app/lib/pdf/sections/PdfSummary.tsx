import React from "react";
import { Text } from "@react-pdf/renderer";
import type { ResumeSummaryItem } from "../../resume-schema";
import type { PdfTheme } from "../theme";
import { PdfSectionCard } from "../primitives";

type PdfSummaryProps = {
  summary: ResumeSummaryItem;
  title: string;
  theme: PdfTheme;
};

// Mirrors .summary-text.
export function PdfSummary({ summary, title, theme }: PdfSummaryProps) {
  return (
    <PdfSectionCard title={title} theme={theme}>
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
