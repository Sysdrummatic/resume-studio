import React from "react";
import { Path, Svg, Text, View } from "@react-pdf/renderer";
import type { PdfTheme } from "../theme";
import { PX_TO_PT } from "../theme";
import { PdfSectionCard } from "../primitives";
import { estimateQrListHeight, planCard } from "../pagination";
import { buildQrMatrix, buildQrGeometry } from "../../qr-code";
import type { ResumeQrCode } from "../../resume-schema";

type PdfQrCodesProps = {
  qrCodes: ResumeQrCode[];
  title: string;
  theme: PdfTheme;
};

// Mirrors .qr-list / .qr-card / .qr-card figcaption. Geometry comes from the
// one buildQrGeometry() helper the web SVG renderer also draws from — same
// payload, same quiet zone, same module coordinates on both surfaces.
export function PdfQrCodes({ qrCodes, title, theme }: PdfQrCodesProps) {
  const rendered = qrCodes
    .map((item) => {
      const built = buildQrMatrix(item.value);
      if (built.status !== "ok") return null;
      return { item, sizePt: Math.max(1, item.size) * PX_TO_PT, geometry: buildQrGeometry(built.matrix) };
    })
    .filter((entry): entry is { item: ResumeQrCode; sizePt: number; geometry: ReturnType<typeof buildQrGeometry> } => entry !== null);

  const pagination = planCard(
    theme,
    estimateQrListHeight(theme, rendered.map(({ item, sizePt }) => ({ label: item.label, qrSize: sizePt }))),
    true,
  );

  if (rendered.length === 0) return null;

  return (
    <PdfSectionCard title={title} theme={theme} sidebar {...pagination}>
      <View style={{ flexDirection: "column", gap: theme.spacing.spaceSm }}>
        {rendered.map(({ item, sizePt, geometry }, index) => (
          // wrap={false}: a QR card must never split across a page break —
          // half a symbol on each page cannot be scanned.
          <View
            key={`${item.label}-${index}`}
            wrap={false}
            style={{
              alignItems: "center",
              backgroundColor: theme.colors.qrCardBg,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.md,
              padding: theme.spacing.spaceSm,
            }}
          >
            <Svg width={sizePt} height={sizePt} viewBox={`0 0 ${geometry.viewBoxSize} ${geometry.viewBoxSize}`}>
              <Path d={`M0,0h${geometry.viewBoxSize}v${geometry.viewBoxSize}h${-geometry.viewBoxSize}Z`} fill={theme.colors.white} />
              <Path d={geometry.path} fill={theme.colors.text} />
            </Svg>
            {item.label ? (
              <Text
                style={{
                  marginTop: theme.spacing.spaceXs,
                  fontSize: theme.typography.sizes.note,
                  color: theme.colors.muted,
                  lineHeight: theme.typography.lineHeightTight,
                  textAlign: "center",
                }}
              >
                {item.label}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </PdfSectionCard>
  );
}
