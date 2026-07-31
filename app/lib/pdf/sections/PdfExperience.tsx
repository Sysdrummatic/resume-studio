import React from "react";
import type { ResumeExperience } from "../../resume-schema";
import type { PdfTheme } from "../theme";
import { PdfSectionCard, PdfTimelineBlocks, PdfTimelineItem } from "../primitives";
import { planTimelineSection, type PdfTimelineBlock } from "../pagination";

type PdfExperienceProps = {
  experience: ResumeExperience[];
  title: string;
  theme: PdfTheme;
};

// Mirrors .resume-section--experience: .timeline-item__content h3 (company),
// .timeline-item__subheading (role) and .item-list (highlights).
// Each employer renders inside a PdfTimelineItem (wrap={false}) so it never
// splits across pages; the section card itself wraps between employers.
// One description of an entry's contents, read by both the estimator and the
// renderer. Sizes and margins mirror .timeline-item__content h3,
// .timeline-item__subheading and .item-list li.
export function experienceBlocks(exp: ResumeExperience, theme: PdfTheme): PdfTimelineBlock[] {
  const { components, typography, spacing, colors } = theme;

  return [
    { text: exp.company, fontSize: typography.sizes.md, fontWeight: typography.weights.bold },
    {
      text: exp.role,
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.medium,
      color: colors.accentDark,
      marginTop: components.timelineItemGap,
      marginBottom: spacing.spaceXs,
    },
    ...exp.highlights.map((highlight, index) => ({
      text: highlight,
      fontSize: typography.sizes.base,
      bullet: true,
      marginBottom: index === exp.highlights.length - 1 ? 0 : components.listItemGap,
    })),
  ];
}

export function PdfExperience({ experience, title, theme }: PdfExperienceProps) {
  const entries = experience.map((exp) => experienceBlocks(exp, theme));
  const pagination = planTimelineSection(theme, entries);

  return (
    <PdfSectionCard
      title={title}
      theme={theme}
      wrap
      keepTitleWithFirstChild={pagination.keepTitleWithFirstEntry}
    >
      {experience.map((exp, index) => (
        <PdfTimelineItem
          key={index}
          period={exp.period}
          isLast={index === experience.length - 1}
          theme={theme}
          allowSplit={pagination.allowSplit[index]}
        >
          <PdfTimelineBlocks blocks={entries[index]} theme={theme} />
        </PdfTimelineItem>
      ))}
    </PdfSectionCard>
  );
}
