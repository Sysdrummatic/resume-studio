import React from "react";
import type { ResumeSkill } from "../../resume-schema";
import type { PdfTheme } from "../theme";
import { PdfMeterItem, PdfMeterList, PdfSectionCard } from "../primitives";
import { estimateMeterListHeight, planCard } from "../pagination";

type PdfSkillsProps = {
  skills: ResumeSkill[];
  title: string;
  theme: PdfTheme;
};

// Mirrors .resume-section--skills: a .meter-list of plain meter items.
export function PdfSkills({ skills, title, theme }: PdfSkillsProps) {
  // Nothing caps how many skills a CV may list; see ../pagination.
  const pagination = planCard(theme, estimateMeterListHeight(theme, skills), true);

  return (
    <PdfSectionCard title={title} theme={theme} sidebar {...pagination}>
      <PdfMeterList theme={theme}>
        {skills.map((skill, index) => (
          <PdfMeterItem
            key={index}
            name={skill.name}
            level={skill.level}
            theme={theme}
            // .resume-section--skills .meter-item__label drops to 400.
            nameWeight={theme.typography.weights.regular}
          />
        ))}
      </PdfMeterList>
    </PdfSectionCard>
  );
}
