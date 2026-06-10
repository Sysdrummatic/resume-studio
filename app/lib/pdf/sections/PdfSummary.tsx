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

export function PdfSummary({ summary, title, theme }: PdfSummaryProps) {
  return (
    <PdfSectionCard title={title} theme={theme}>
      <Text
        style={{
          fontSize: theme.typography.sizes.body,
          color: theme.colors.text,
          lineHeight: theme.typography.lineHeight,
        }}
      >
        {summary.description}
      </Text>
    </PdfSectionCard>
  );
}
