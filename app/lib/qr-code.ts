import QRCode from "qrcode";

// Shared domain limits, enforced everywhere a QR code is read, written or
// rendered — normalization, import, the editor and the public/PDF export
// path. HTML min/max/maxLength attributes alone are UX only, never the
// actual guard.
export const QR_CODE_LIMITS = {
  /** How many QR entries a single CV may carry. */
  maxCount: 6,
  /** Characters; keeps a generated code dense enough to still be scannable. */
  maxValueLength: 300,
  /** Pixels; below this a printed code is not reliably scannable. */
  minSize: 60,
  /** Pixels; safe upper bound for both the web sidebar and the PDF column. */
  maxSize: 400,
  defaultSize: 130,
} as const;

export function clampQrSize(size: number): number {
  return Math.min(QR_CODE_LIMITS.maxSize, Math.max(QR_CODE_LIMITS.minSize, size));
}

export type QrMatrix = {
  size: number;
  isDark: (row: number, col: number) => boolean;
};

export type QrBuildResult =
  | { status: "ok"; matrix: QrMatrix }
  | { status: "blank" }
  | { status: "invalid" }
  | { status: "too_long" };

/**
 * Builds the QR module grid for `text` synchronously (no canvas, no image
 * file). "Blank", "too long" and "the generator rejected this text" are
 * distinct outcomes — collapsing them into one null used to make an editor
 * error look identical to "nothing entered yet".
 */
export function buildQrMatrix(text: string): QrBuildResult {
  const value = text.trim();
  if (!value) return { status: "blank" };
  if (value.length > QR_CODE_LIMITS.maxValueLength) return { status: "too_long" };
  try {
    const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
    return {
      status: "ok",
      matrix: {
        size: modules.size,
        isDark: (row: number, col: number) => Boolean(modules.data[row * modules.size + col]),
      },
    };
  } catch {
    return { status: "invalid" };
  }
}

export type QrGeometry = {
  /** The full square side, in module units, including the quiet zone on every edge. */
  viewBoxSize: number;
  /** One combined path of unit squares, already offset into the quiet zone. */
  path: string;
};

// A QR code's quiet zone (the blank margin scanners rely on to find the
// symbol) is conventionally 4 modules on every side.
const QUIET_ZONE_MODULES = 4;

/**
 * The one geometry builder both the web SVG and the PDF section draw from,
 * so they can never disagree on the payload, the quiet zone or the
 * coordinate system.
 */
export function buildQrGeometry(matrix: QrMatrix): QrGeometry {
  const viewBoxSize = matrix.size + QUIET_ZONE_MODULES * 2;
  const parts: string[] = [];
  for (let row = 0; row < matrix.size; row++) {
    for (let col = 0; col < matrix.size; col++) {
      if (!matrix.isDark(row, col)) continue;
      const x = col + QUIET_ZONE_MODULES;
      const y = row + QUIET_ZONE_MODULES;
      parts.push(`M${x},${y}h1v1h-1Z`);
    }
  }
  return { viewBoxSize, path: parts.join(" ") };
}
