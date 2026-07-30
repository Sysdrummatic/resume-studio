import React from "react";
import type { PdfTheme } from "../theme";
import { PdfPillList, PdfSectionCard } from "../primitives";

type PdfTechStackProps = {
  techStack: string[];
  title: string;
  theme: PdfTheme;
};

export function PdfTechStack({ techStack, title, theme }: PdfTechStackProps) {
  return (
    <PdfSectionCard title={title} theme={theme} sidebar>
      <PdfPillList items={techStack} theme={theme} />
    </PdfSectionCard>
  );
}
