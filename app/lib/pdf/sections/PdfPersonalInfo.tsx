import React from "react";
import { Text, View } from "@react-pdf/renderer";
import type { ResumeContactItem } from "../../resume-schema";
import type { PdfTheme } from "../theme";
import { PdfSectionCard } from "../primitives";

type PdfPersonalInfoProps = {
  contact: ResumeContactItem[];
  title: string;
  theme: PdfTheme;
};

export function PdfPersonalInfo({ contact, title, theme }: PdfPersonalInfoProps) {
  return (
    <PdfSectionCard title={title} theme={theme}>
      {contact.map((item, index) => (
        <View
          key={index}
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            marginBottom: index === contact.length - 1 ? 0 : theme.spacing.xs + 2,
          }}
        >
          <Text style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.muted, width: 52 }}>{item.label}</Text>
          <Text style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.accent, flex: 1 }}>{item.value}</Text>
        </View>
      ))}
    </PdfSectionCard>
  );
}
