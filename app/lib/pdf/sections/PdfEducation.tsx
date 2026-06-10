import React from "react";
import { Text } from "@react-pdf/renderer";
import type { ResumeEducation } from "../../resume-schema";
import type { PdfTheme } from "../theme";
import { PdfSectionCard, PdfTimelineItem } from "../primitives";

type PdfEducationProps = {
  education: ResumeEducation[];
  title: string;
  theme: PdfTheme;
};

export function PdfEducation({ education, title, theme }: PdfEducationProps) {
  return (
    <PdfSectionCard title={title} theme={theme} wrap>
      {education.map((entry, index) => (
        <PdfTimelineItem key={index} period={entry.period} isLast={index === education.length - 1} theme={theme}>
          <Text style={{ fontSize: theme.typography.sizes.body, fontWeight: 700, color: theme.colors.text }}>
            {entry.school}
          </Text>
          {entry.degree ? (
            <Text style={{ fontSize: theme.typography.sizes.md, color: theme.colors.accent, marginTop: 2 }}>
              {entry.degree}
            </Text>
          ) : null}
          {entry.detail ? (
            <Text
              style={{
                fontSize: theme.typography.sizes.md,
                color: theme.colors.text,
                lineHeight: theme.typography.lineHeight,
                marginTop: 2,
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
