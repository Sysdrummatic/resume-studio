import React from "react";
import { Text, View } from "@react-pdf/renderer";
import type { ResumeExperience } from "../../resume-schema";
import type { PdfTheme } from "../theme";
import { PdfSectionCard, PdfTimelineItem } from "../primitives";
import { planTimelineSection } from "../pagination";

type PdfExperienceProps = {
  experience: ResumeExperience[];
  title: string;
  theme: PdfTheme;
};

// Mirrors .resume-section--experience: .timeline-item__content h3 (company),
// .timeline-item__subheading (role) and .item-list (highlights).
// Each employer renders inside a PdfTimelineItem (wrap={false}) so it never
// splits across pages; the section card itself wraps between employers.
export function PdfExperience({ experience, title, theme }: PdfExperienceProps) {
  const { components, typography } = theme;
  const pagination = planTimelineSection(
    theme,
    experience.map((exp) => [exp.company, exp.role, ...exp.highlights]),
  );

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
          <Text
            style={{
              fontSize: typography.sizes.md,
              fontWeight: typography.weights.bold,
              lineHeight: typography.lineHeight,
              color: theme.colors.text,
            }}
          >
            {exp.company}
          </Text>
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
            {exp.role}
          </Text>
          {exp.highlights.map((highlight, highlightIndex) => (
            <View
              key={highlightIndex}
              style={{
                flexDirection: "row",
                paddingLeft: components.listIndent,
                marginBottom: highlightIndex === exp.highlights.length - 1 ? 0 : components.listItemGap,
              }}
            >
              <Text
                style={{
                  fontSize: typography.sizes.base,
                  color: theme.colors.text,
                  lineHeight: typography.lineHeight,
                  marginRight: components.listItemGap,
                }}
              >
                •
              </Text>
              <Text
                style={{
                  fontSize: typography.sizes.base,
                  color: theme.colors.text,
                  flex: 1,
                  lineHeight: typography.lineHeight,
                }}
              >
                {highlight}
              </Text>
            </View>
          ))}
        </PdfTimelineItem>
      ))}
    </PdfSectionCard>
  );
}
