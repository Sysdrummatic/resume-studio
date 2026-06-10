import React from "react";
import { Text, View } from "@react-pdf/renderer";
import type { ResumeEducation } from "../../resume-schema";
import type { PdfTheme } from "../theme";
import { PdfSectionCard } from "../primitives";

type PdfEducationProps = {
  education: ResumeEducation[];
  title: string;
  theme: PdfTheme;
};

export function PdfEducation({ education, title, theme }: PdfEducationProps) {
  return (
    <PdfSectionCard title={title} theme={theme} wrap minTitlePresenceAhead={48}>
      {education.map((entry, index) => (
        <View key={index} wrap={false} style={{ marginBottom: index === education.length - 1 ? 0 : theme.spacing.md }}>
          <Text style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.muted, marginBottom: 2 }}>
            {entry.period}
          </Text>
          <Text style={{ fontSize: theme.typography.sizes.body, fontWeight: 700, color: theme.colors.text }}>
            {entry.school}
          </Text>
          {entry.degree ? (
            <Text style={{ fontSize: theme.typography.sizes.md, color: theme.colors.accent }}>{entry.degree}</Text>
          ) : null}
          {entry.detail ? (
            <Text
              style={{
                fontSize: theme.typography.sizes.md,
                color: theme.colors.text,
                lineHeight: theme.typography.lineHeight,
              }}
            >
              {entry.detail}
            </Text>
          ) : null}
        </View>
      ))}
    </PdfSectionCard>
  );
}
