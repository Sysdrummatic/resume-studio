import React from "react";
import type { ResumeLanguage } from "../../resume-schema";
import type { PdfTheme } from "../theme";
import { PdfMeterItem, PdfMeterList, PdfSectionCard } from "../primitives";

type PdfLanguagesProps = {
  languages: ResumeLanguage[];
  title: string;
  theme: PdfTheme;
};

// Mirrors .resume-section--languages: the same .meter-list as skills, with the
// proficiency label stacked under the name as .meter-item__note.
export function PdfLanguages({ languages, title, theme }: PdfLanguagesProps) {
  return (
    <PdfSectionCard title={title} theme={theme} sidebar>
      <PdfMeterList theme={theme}>
        {languages.map((language, index) => (
          <PdfMeterItem
            key={index}
            name={language.name}
            note={language.level_text || undefined}
            level={language.level}
            theme={theme}
          />
        ))}
      </PdfMeterList>
    </PdfSectionCard>
  );
}
