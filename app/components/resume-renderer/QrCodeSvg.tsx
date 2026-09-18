import { buildQrMatrix, buildQrGeometry } from "../../lib/qr-code";

/** http(s) only — a QR encoding a mailto/tel/plain value gets a description, not a link. */
function safeHttpHref(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

type Props = {
  value: string;
  size?: number;
  className?: string;
};

// Renders the QR as plain vector rects (no canvas, no image file), from the
// one geometry helper the PDF section also draws from, so the two can never
// disagree on the payload. The SVG itself is aria-hidden: an accessible text
// equivalent for the encoded value renders alongside it (see ResumeRenderer).
export default function QrCodeSvg({ value, size = 130, className }: Props) {
  const built = buildQrMatrix(value);
  if (built.status !== "ok") return null;
  const geometry = buildQrGeometry(built.matrix);

  return (
    <svg
      className={className}
      viewBox={`0 0 ${geometry.viewBoxSize} ${geometry.viewBoxSize}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      role="img"
      aria-hidden="true"
    >
      <rect x={0} y={0} width={geometry.viewBoxSize} height={geometry.viewBoxSize} fill="#fff" />
      <path d={geometry.path} fill="#000" />
    </svg>
  );
}

/** The accessible text alternative for a QR's encoded value — a real link for
 * safe http(s) values, a plain description otherwise. */
export function QrCodeAccessibleText({ value }: { value: string }) {
  const safeLink = safeHttpHref(value);
  if (safeLink) {
    return (
      <a href={safeLink} target="_blank" rel="noreferrer noopener" className="qr-card__link">
        {value}
      </a>
    );
  }
  return <span className="qr-card__value sr-only">{value}</span>;
}
