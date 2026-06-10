import React from "react";
import { Text, View } from "@react-pdf/renderer";
import type { ResumeExperience } from "../../resume-schema";
import type { PdfTheme } from "../theme";
import { PdfSectionCard } from "../primitives";

type PdfExperienceProps = {
  experience: ResumeExperience[];
  title: string;
  theme: PdfTheme;
};

// Each employer block is wrap={false} so it never splits across pages.
// The section card itself wraps, allowing natural breaks between employers.
export function PdfExperience({ experience, title, theme }: PdfExperienceProps) {
  return (
    <PdfSectionCard title={title} theme={theme} wrap minTitlePresenceAhead={48}>
      {experience.map((exp, index) => (
        <View key={index} wrap={false} style={{ marginBottom: index === experience.length - 1 ? 0 : theme.spacing.md }}>
          <Text style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.muted, marginBottom: 2 }}>
            {exp.period}
          </Text>
          <Text style={{ fontSize: theme.typography.sizes.body, fontWeight: 700, color: theme.colors.text }}>
            {exp.company}
          </Text>
          <Text style={{ fontSize: theme.typography.sizes.md, color: theme.colors.accent, marginBottom: theme.spacing.xs }}>
            {exp.role}
          </Text>
          {exp.highlights.map((highlight, highlightIndex) => (
            <Text
              key={highlightIndex}
              style={{
                fontSize: theme.typography.sizes.md,
                color: theme.colors.text,
                marginLeft: theme.spacing.sm,
                lineHeight: theme.typography.lineHeight,
              }}
            >
              • {highlight}
            </Text>
          ))}
        </View>
      ))}
    </PdfSectionCard>
  );
}
