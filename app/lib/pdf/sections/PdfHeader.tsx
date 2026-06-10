import React from "react";
import { Text, View } from "@react-pdf/renderer";
import type { ResumeDocument } from "../../resume-schema";
import type { PdfTheme } from "../theme";

type PdfHeaderProps = {
  resume: ResumeDocument;
  heroRole: string;
  theme: PdfTheme;
};

export function PdfHeader({ resume, heroRole, theme }: PdfHeaderProps) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing.xl }}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: theme.radii.full,
          backgroundColor: theme.colors.accent,
          justifyContent: "center",
          alignItems: "center",
          marginRight: theme.spacing.lg,
        }}
      >
        {/* Logo font: web uses 'Homemade Apple' (handwritten). PDF uses SpaceGrotesk Bold. */}
        {/* Embed Homemade Apple separately if brand consistency requires it. */}
        <Text style={{ color: theme.colors.white, fontSize: theme.typography.sizes.xl, fontWeight: 700 }}>
          {resume.brand_initials || "CV"}
        </Text>
      </View>
      <View style={{ flexDirection: "column" }}>
        <Text style={{ fontSize: theme.typography.sizes.hero, fontWeight: 700, color: theme.colors.text }}>
          {resume.name}
        </Text>
        {heroRole ? (
          <Text style={{ fontSize: theme.typography.sizes.body, color: theme.colors.muted, marginTop: theme.spacing.xs }}>
            {heroRole}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
