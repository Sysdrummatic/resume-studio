import QRCode from "qrcode";

export type QrMatrix = {
  size: number;
  isDark: (row: number, col: number) => boolean;
};

/**
 * Builds the QR module grid for `text` synchronously (no canvas, no image
 * file) so callers can draw it as plain vector rectangles — identically on
 * the web renderer and in the PDF. Returns null for blank input.
 */
export function buildQrMatrix(text: string): QrMatrix | null {
  const value = text.trim();
  if (!value) return null;
  try {
    const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
    return {
      size: modules.size,
      isDark: (row: number, col: number) => Boolean(modules.data[row * modules.size + col]),
    };
  } catch {
    return null;
  }
}
