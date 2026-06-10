import React from "react";
import { Text, View } from "@react-pdf/renderer";
import type { PdfTheme } from "./theme";

type PdfSectionCardProps = {
  title: string;
  theme: PdfTheme;
  wrap?: boolean;
  minTitlePresenceAhead?: number;
  children: React.ReactNode;
};

export function PdfSectionCard({ title, theme, wrap = false, minTitlePresenceAhead, children }: PdfSectionCardProps) {
  return (
    <View
      wrap={wrap}
      style={{
        backgroundColor: theme.colors.cardBg,
        borderRadius: theme.radii.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <View
        minPresenceAhead={minTitlePresenceAhead}
        style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing.md }}
      >
        <View
          style={{
            width: theme.spacing.sm,
            height: theme.spacing.sm,
            borderRadius: theme.radii.full,
            backgroundColor: theme.colors.accent,
            marginRight: theme.spacing.xs + 2,
          }}
        />
        <Text style={{ fontSize: theme.typography.sizes.lg, fontWeight: 700, color: theme.colors.text }}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

type PdfDotMeterProps = {
  level: number;
  theme: PdfTheme;
};

export function PdfDotMeter({ level, theme }: PdfDotMeterProps) {
  return (
    <View style={{ flexDirection: "row", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((step) => (
        <View
          key={step}
          style={{
            width: 6,
            height: 6,
            borderRadius: theme.radii.full,
            backgroundColor: level >= step ? theme.colors.accent : theme.colors.border,
          }}
        />
      ))}
    </View>
  );
}

type PdfPillListProps = {
  items: string[];
  theme: PdfTheme;
};

export function PdfPillList({ items, theme }: PdfPillListProps) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xs }}>
      {items.map((item, index) => (
        <View
          key={index}
          style={{
            backgroundColor: theme.colors.accentLight,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xs,
            borderRadius: theme.radii.full,
          }}
        >
          <Text style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.accent }}>{item}</Text>
        </View>
      ))}
    </View>
  );
}
