import { buildQrMatrix } from "../../lib/qr-code";

type Props = {
  value: string;
  size?: number;
  className?: string;
};

// Renders the QR as plain vector rects (no canvas, no image file) so it comes
// out identically on the web preview, the public page and in the PDF export.
export default function QrCodeSvg({ value, size = 130, className }: Props) {
  const matrix = buildQrMatrix(value);
  if (!matrix) return null;
  const cell = size / matrix.size;

  const rects: string[] = [];
  for (let row = 0; row < matrix.size; row++) {
    for (let col = 0; col < matrix.size; col++) {
      if (matrix.isDark(row, col)) rects.push(`M${col * cell},${row * cell}h${cell}v${cell}h${-cell}Z`);
    }
  }

  return (
    <svg className={className} viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-hidden="true">
      <rect x={0} y={0} width={size} height={size} fill="#fff" />
      <path d={rects.join(" ")} fill="#000" />
    </svg>
  );
}
