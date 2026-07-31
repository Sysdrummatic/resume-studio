import React from "react";
import { Text, View } from "@react-pdf/renderer";
import type { ResumeDocument } from "../../resume-schema";
import type { PdfTheme } from "../theme";
import { PdfCircle } from "../primitives";

type PdfHeaderProps = {
  resume: ResumeDocument;
  heroRole: string;
  theme: PdfTheme;
};

// Mirrors .hero / .hero__title / .logo-circle / .hero__identity. The export
// chrome (.hero__actions) has no PDF counterpart, as in @media print.
export function PdfHeader({ resume, heroRole, theme }: PdfHeaderProps) {
  const { components, spacing, typography } = theme;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.spaceMd,
        marginBottom: spacing.spaceXl,
      }}
    >
      <PdfCircle
        size={components.logoSize}
        color={theme.colors.accent}
        theme={theme}
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        {/* .logo-circle asks for 'Homemade Apple' first, but that family has no
            @font-face and is not vendored, so the web already falls back to
            Space Grotesk. The PDF matches by using the same fallback. */}
        <Text
          style={{
            color: theme.colors.white,
            fontSize: typography.sizes.logo,
            // Natural, not 1.6: the circle centres this Text, and react-pdf
            // hangs all leading below the glyphs, so a 1.6 box put the initials
            // 3.2pt above the middle. At the natural height the box is the
            // glyphs, and the circle's own centring is correct. No padding is
            // needed here — nothing depends on this Text's height.
            lineHeight: typography.lineHeightNatural,
            fontWeight: typography.weights.bold,
          }}
        >
          {resume.brand_initials || "CV"}
        </Text>
      </PdfCircle>
      {/* flex + minWidth, or a long name and role run past the right margin —
          a flex item defaults to min-width: auto and refuses to shrink below
          its longest line. .hero__identity carries `min-width: 0` for the same
          reason. */}
      <View style={{ flexDirection: "column", gap: spacing.space2xs, flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontSize: typography.sizes.xl,
            // .hero__title h1 — the heading leading, which is what closed the
            // gap to the role below.
            lineHeight: typography.lineHeightHeading,
            fontWeight: typography.weights.bold,
            color: theme.colors.text,
          }}
        >
          {resume.name}
        </Text>
        {heroRole ? (
          <Text
            style={{
              // --role-font-size, which used to happen to equal sizes.base.
              fontSize: typography.sizes.role,
              lineHeight: typography.lineHeight,
              fontWeight: typography.weights.medium,
              color: theme.colors.muted,
            }}
          >
            {heroRole}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
