import React from "react";
import type { PdfTheme } from "../theme";
import { PdfPillList, PdfSectionCard } from "../primitives";

type PdfInterestsProps = {
  interests: string[];
  title: string;
  theme: PdfTheme;
};

export function PdfInterests({ interests, title, theme }: PdfInterestsProps) {
  return (
    <PdfSectionCard title={title} theme={theme}>
      <PdfPillList items={interests} theme={theme} />
    </PdfSectionCard>
  );
}
