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

export function PdfSectionCard({ title, theme, wrap = false, minTitlePresenceAhead = 60, children }: PdfSectionCardProps) {
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
        <Text style={{ fontSize: theme.typography.sizes.xl, fontWeight: 700, color: theme.colors.text }}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

type PdfTimelineItemProps = {
  period: string;
  isLast: boolean;
  theme: PdfTheme;
  children: React.ReactNode;
};

// Mirrors the web .timeline structure: accent dot with a card-colored ring on a
// vertical axis, period label, and a tinted rounded content block. The axis is a
// per-item segment (not one absolutely-positioned line) so it survives page breaks;
// inter-item spacing is paddingBottom on the content column, which the rail spans,
// keeping the line visually continuous.
export function PdfTimelineItem({ period, isLast, theme, children }: PdfTimelineItemProps) {
  return (
    <View wrap={false} style={{ flexDirection: "row" }}>
      <View style={{ width: 28 }}>
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: theme.radii.full,
            backgroundColor: theme.colors.accent,
            borderWidth: 2.5,
            borderColor: theme.colors.cardBg,
            marginLeft: 2,
          }}
        />
        <View style={{ width: 2, flex: 1, marginLeft: 7, marginTop: 2, backgroundColor: theme.colors.border }} />
      </View>
      <View style={{ flex: 1, paddingBottom: isLast ? 0 : theme.spacing.lg }}>
        <Text
          style={{
            fontSize: theme.typography.sizes.md,
            fontWeight: 700,
            color: theme.colors.muted,
            marginBottom: theme.spacing.xs,
          }}
        >
          {period}
        </Text>
        <View
          style={{
            backgroundColor: theme.colors.timelineItemBg,
            borderRadius: theme.radii.md,
            padding: theme.spacing.md,
          }}
        >
          {children}
        </View>
      </View>
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
