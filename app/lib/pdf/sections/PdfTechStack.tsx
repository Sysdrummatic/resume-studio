import React from "react";
import type { PdfTheme } from "../theme";
import { PdfPillList, PdfSectionCard } from "../primitives";
import { estimatePillListHeight, planCard } from "../pagination";

type PdfTechStackProps = {
  techStack: string[];
  title: string;
  theme: PdfTheme;
};

export function PdfTechStack({ techStack, title, theme }: PdfTechStackProps) {
  // Nothing caps how many entries a tech stack may hold; see ../pagination.
  const pagination = planCard(theme, estimatePillListHeight(theme, techStack), true);

  return (
    <PdfSectionCard title={title} theme={theme} sidebar {...pagination}>
      <PdfPillList items={techStack} theme={theme} />
    </PdfSectionCard>
  );
}
