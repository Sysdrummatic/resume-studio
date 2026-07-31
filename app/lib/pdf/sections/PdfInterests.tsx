import React from "react";
import type { PdfTheme } from "../theme";
import { PdfPillList, PdfSectionCard } from "../primitives";
import { estimatePillListHeight, planCard } from "../pagination";

type PdfInterestsProps = {
  interests: string[];
  title: string;
  theme: PdfTheme;
};

export function PdfInterests({ interests, title, theme }: PdfInterestsProps) {
  // Nothing caps how many interests a CV may list; see ../pagination.
  const pagination = planCard(theme, estimatePillListHeight(theme, interests), true);

  return (
    <PdfSectionCard title={title} theme={theme} sidebar {...pagination}>
      <PdfPillList items={interests} theme={theme} />
    </PdfSectionCard>
  );
}
