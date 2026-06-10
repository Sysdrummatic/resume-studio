import React from "react";
import { Text, View } from "@react-pdf/renderer";
import type { ResumeLanguage } from "../../resume-schema";
import type { PdfTheme } from "../theme";
import { PdfDotMeter, PdfSectionCard } from "../primitives";

type PdfLanguagesProps = {
  languages: ResumeLanguage[];
  title: string;
  theme: PdfTheme;
};

export function PdfLanguages({ languages, title, theme }: PdfLanguagesProps) {
  return (
    <PdfSectionCard title={title} theme={theme}>
      {languages.map((language, index) => (
        <View key={index} style={{ marginBottom: index === languages.length - 1 ? 0 : theme.spacing.sm }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
            <Text style={{ fontSize: theme.typography.sizes.md, color: theme.colors.text }}>{language.name}</Text>
            {language.level_text ? (
              <Text style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.muted }}>
                {language.level_text}
              </Text>
            ) : null}
          </View>
          <PdfDotMeter level={language.level} theme={theme} />
        </View>
      ))}
    </PdfSectionCard>
  );
}
