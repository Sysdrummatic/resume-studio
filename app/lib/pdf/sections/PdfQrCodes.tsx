import React from "react";
import { Path, Svg, Text, View } from "@react-pdf/renderer";
import type { PdfTheme } from "../theme";
import { PX_TO_PT } from "../theme";
import { PdfSectionCard } from "../primitives";
import { estimateQrListHeight, planCard } from "../pagination";
import { buildQrMatrix } from "../../qr-code";
import type { ResumeQrCode } from "../../resume-schema";

type PdfQrCodesProps = {
  qrCodes: ResumeQrCode[];
  title: string;
  theme: PdfTheme;
};

// Same vector construction as QrCodeSvg (the web renderer) — one Path of
// unit squares, so the PDF and the web page draw the identical code.
function qrPath(value: string, sizePt: number): string | null {
  const matrix = buildQrMatrix(value);
  if (!matrix) return null;
  const cell = sizePt / matrix.size;
  const parts: string[] = [];
  for (let row = 0; row < matrix.size; row++) {
    for (let col = 0; col < matrix.size; col++) {
      if (matrix.isDark(row, col)) parts.push(`M${col * cell},${row * cell}h${cell}v${cell}h${-cell}Z`);
    }
  }
  return parts.join(" ");
}

// Mirrors .qr-list / .qr-card / .qr-card figcaption.
export function PdfQrCodes({ qrCodes, title, theme }: PdfQrCodesProps) {
  const rendered = qrCodes
    .map((item) => ({ item, sizePt: Math.max(1, item.size) * PX_TO_PT, d: qrPath(item.value, Math.max(1, item.size) * PX_TO_PT) }))
    .filter((entry) => entry.d);

  const pagination = planCard(
    theme,
    estimateQrListHeight(theme, rendered.map(({ item, sizePt }) => ({ label: item.label, qrSize: sizePt }))),
    true,
  );

  if (rendered.length === 0) return null;

  return (
    <PdfSectionCard title={title} theme={theme} sidebar {...pagination}>
      <View style={{ flexDirection: "column", gap: theme.spacing.spaceSm }}>
        {rendered.map(({ item, sizePt, d }, index) => (
          <View
            key={`${item.label}-${index}`}
            style={{
              alignItems: "center",
              backgroundColor: theme.colors.qrCardBg,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.md,
              padding: theme.spacing.spaceSm,
            }}
          >
            <Svg width={sizePt} height={sizePt} viewBox={`0 0 ${sizePt} ${sizePt}`}>
              <Path d={`M0,0h${sizePt}v${sizePt}h${-sizePt}Z`} fill={theme.colors.white} />
              <Path d={d as string} fill={theme.colors.text} />
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
