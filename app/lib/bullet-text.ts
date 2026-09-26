// A bullet marker is a dash/bullet/asterisk followed by whitespace (or nothing),
// so "-5% cost" and "*.ts files" are not mistaken for one.
const MARKER = /^\s*[-–•*](?:\s+|$)/;

export function isBulletLine(line: string): boolean {
  return MARKER.test(line);
}

export function stripBulletMarker(line: string): string {
  return line.replace(MARKER, "").trim();
}

/** One string per non-empty line, markers removed — the shape `highlights` is stored in. */
export function parseBulletLines(text: string): string[] {
  return text.split("\n").map(stripBulletMarker).filter(Boolean);
}

export type TextBlock = { kind: "paragraph"; text: string } | { kind: "list"; items: string[] };

/**
 * Splits free text into paragraphs and bullet lists. Text with no bullet line
 * comes back as its one original paragraph, so prose renders exactly as before.
 */
export function splitTextBlocks(text: string): TextBlock[] {
  const lines = text.split("\n");
  if (!lines.some(isBulletLine)) return [{ kind: "paragraph", text }];

  const blocks: TextBlock[] = [];
  for (const raw of lines) {
    if (!raw.trim()) continue;

    if (isBulletLine(raw)) {
      const item = stripBulletMarker(raw);
      if (!item) continue;
      const last = blocks[blocks.length - 1];
      if (last?.kind === "list") last.items.push(item);
      else blocks.push({ kind: "list", items: [item] });
    } else {
      blocks.push({ kind: "paragraph", text: raw.trim() });
    }
  }
  return blocks;
}

/**
 * Enter on a bullet line starts the next bullet; Enter on an empty bullet ends
 * the list. Null when the caret's line is not a bullet (plain Enter applies).
 */
export function continueBulletList(
  value: string,
  start: number,
  end: number,
): { value: string; caret: number } | null {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const line = value.slice(lineStart, start);
  const marker = /^(\s*)([-–•*])(?:\s+|$)/.exec(line);
  if (!marker) return null;

  if (!stripBulletMarker(line)) {
    return { value: value.slice(0, lineStart) + value.slice(end), caret: lineStart };
  }

  const insert = `\n${marker[1]}${marker[2]} `;
  return { value: value.slice(0, start) + insert + value.slice(end), caret: start + insert.length };
}
