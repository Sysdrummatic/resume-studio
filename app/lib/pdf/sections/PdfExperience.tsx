import React from "react";
import { Text, View } from "@react-pdf/renderer";
import type { ResumeExperience } from "../../resume-schema";
import type { PdfTheme } from "../theme";
import { PdfSectionCard, PdfTimelineItem } from "../primitives";

type PdfExperienceProps = {
  experience: ResumeExperience[];
  title: string;
  theme: PdfTheme;
};

// Each employer renders inside a PdfTimelineItem (wrap={false}) so it never
// splits across pages; the section card itself wraps between employers.
export function PdfExperience({ experience, title, theme }: PdfExperienceProps) {
  return (
    <PdfSectionCard title={title} theme={theme} wrap>
      {experience.map((exp, index) => (
        <PdfTimelineItem key={index} period={exp.period} isLast={index === experience.length - 1} theme={theme}>
          <Text style={{ fontSize: theme.typography.sizes.body, fontWeight: 700, color: theme.colors.text }}>
            {exp.company}
          </Text>
          <Text
            style={{
              fontSize: theme.typography.sizes.md,
              color: theme.colors.accent,
              marginTop: 2,
              marginBottom: exp.highlights.length > 0 ? theme.spacing.xs + 2 : 0,
            }}
          >
            {exp.role}
          </Text>
          {exp.highlights.map((highlight, highlightIndex) => (
            <View key={highlightIndex} style={{ flexDirection: "row", marginBottom: 3 }}>
              <Text style={{ fontSize: theme.typography.sizes.md, color: theme.colors.text, marginRight: 6 }}>•</Text>
              <Text
                style={{
                  fontSize: theme.typography.sizes.md,
                  color: theme.colors.text,
                  flex: 1,
                  lineHeight: theme.typography.lineHeight,
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
