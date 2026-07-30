import React from "react";
import { Text } from "@react-pdf/renderer";
import type { ResumeEducation } from "../../resume-schema";
import type { PdfTheme } from "../theme";
import { PdfSectionCard, PdfTimelineItem } from "../primitives";
import { planTimelineSection } from "../pagination";

type PdfEducationProps = {
  education: ResumeEducation[];
  title: string;
  theme: PdfTheme;
};

// Mirrors .resume-section--education: h3 (school), .timeline-item__subheading
// (degree) and .timeline-item__detail.
export function PdfEducation({ education, title, theme }: PdfEducationProps) {
  const { components, typography } = theme;
  const pagination = planTimelineSection(
    theme,
    education.map((entry) => [entry.school, entry.degree ?? "", entry.detail ?? ""]),
  );

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
          <Text
            style={{
              fontSize: typography.sizes.md,
              fontWeight: typography.weights.bold,
              lineHeight: typography.lineHeight,
              color: theme.colors.text,
            }}
          >
            {entry.school}
          </Text>
          {entry.degree ? (
            <Text
              style={{
                fontSize: typography.sizes.sm,
                fontWeight: typography.weights.medium,
                lineHeight: typography.lineHeight,
                color: theme.colors.accentDark,
                marginTop: components.timelineItemGap,
                marginBottom: theme.spacing.spaceXs,
              }}
            >
              {entry.degree}
            </Text>
          ) : null}
          {entry.detail ? (
            <Text
              style={{
                fontSize: typography.sizes.sm,
                color: theme.colors.muted,
                lineHeight: typography.lineHeight,
                // .timeline-item__subheading's 8px bottom margin collapses with
                // this rule's 6px top margin on the web; react-pdf does not
                // collapse margins, so only the larger one is applied.
                marginTop: entry.degree ? 0 : components.timelineItemGap,
              }}
            >
              {entry.detail}
            </Text>
          ) : null}
        </PdfTimelineItem>
      ))}
    </PdfSectionCard>
  );
}
