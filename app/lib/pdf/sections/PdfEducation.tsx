import React from "react";
import type { ResumeEducation } from "../../resume-schema";
import type { PdfTheme } from "../theme";
import { PdfSectionCard, PdfTimelineBlocks, PdfTimelineItem } from "../primitives";
import { planTimelineSection, type PdfTimelineBlock } from "../pagination";

type PdfEducationProps = {
  education: ResumeEducation[];
  title: string;
  theme: PdfTheme;
};

// Mirrors .resume-section--education: h3 (school), .timeline-item__subheading
// (degree) and .timeline-item__detail. One description of the entry, read by
// both the estimator and the renderer — see ../pagination.
function educationBlocks(entry: ResumeEducation, theme: PdfTheme): PdfTimelineBlock[] {
  const { components, typography, spacing, colors } = theme;

  return [
    { text: entry.school, fontSize: typography.sizes.md, fontWeight: typography.weights.bold },
    {
      text: entry.degree ?? "",
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.medium,
      color: colors.accentDark,
      marginTop: components.timelineItemGap,
      marginBottom: spacing.spaceXs,
    },
    {
      text: entry.detail ?? "",
      fontSize: typography.sizes.sm,
      color: colors.muted,
      // .timeline-item__subheading's 8px bottom margin collapses with this
      // rule's 6px top margin on the web; react-pdf does not collapse margins,
      // so only the larger one is applied.
      marginTop: entry.degree ? 0 : components.timelineItemGap,
    },
  ];
}

export function PdfEducation({ education, title, theme }: PdfEducationProps) {
  const entries = education.map((entry) => educationBlocks(entry, theme));
  const pagination = planTimelineSection(theme, entries);

  return (
    <PdfSectionCard
      title={title}
      theme={theme}
      wrap
      keepTitleWithFirstChild={pagination.keepTitleWithFirstEntry}
    >
      {education.map((entry, index) => (
        <PdfTimelineItem
          key={index}
          period={entry.period}
          isLast={index === education.length - 1}
          theme={theme}
          allowSplit={pagination.allowSplit[index]}
        >
          <PdfTimelineBlocks blocks={entries[index]} theme={theme} />
        </PdfTimelineItem>
      ))}
    </PdfSectionCard>
  );
}
