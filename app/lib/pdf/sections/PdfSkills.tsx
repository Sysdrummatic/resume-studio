import React from "react";
import { Text, View } from "@react-pdf/renderer";
import type { ResumeSkill } from "../../resume-schema";
import type { PdfTheme } from "../theme";
import { PdfDotMeter, PdfSectionCard } from "../primitives";

type PdfSkillsProps = {
  skills: ResumeSkill[];
  title: string;
  theme: PdfTheme;
};

export function PdfSkills({ skills, title, theme }: PdfSkillsProps) {
  return (
    <PdfSectionCard title={title} theme={theme}>
      {skills.map((skill, index) => (
        <View key={index} style={{ marginBottom: index === skills.length - 1 ? 0 : theme.spacing.sm }}>
          <Text style={{ fontSize: theme.typography.sizes.md, color: theme.colors.text, marginBottom: 2 }}>
            {skill.name}
          </Text>
          <PdfDotMeter level={skill.level} theme={theme} />
        </View>
      ))}
    </PdfSectionCard>
  );
}
