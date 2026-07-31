import { Font } from "@react-pdf/renderer";
import { A4_WIDTH_PT, PAGE_MARGIN_PT, type PdfTheme } from "./theme";

/**
 * Text measurement and column geometry, shared by everything that has to know
 * how wide something will be before react-pdf lays it out.
 */

/**
 * Space Grotesk's widest glyph, `@`, over unitsPerEm.
 *
 * Only used when the font has not been parsed yet — see loadPdfFonts(). Treating
 * every character as the widest one over-estimates prose by more than two times,
 * which would split entries that fit comfortably; that is the harmless direction
 * to fail in, and it beats silently returning to a guess that under-measures.
 */
const WIDEST_GLYPH = 1.026;

function pdfFont(bold: boolean) {
  return (
    Font.getFont({
      fontFamily: "SpaceGrotesk",
      fontWeight: bold ? 700 : 400,
      fontStyle: "normal",
    })?.data ?? null
  );
}

/** Advance width of `text` at `fontSize`, in points. */
export function measureText(text: string, fontSize: number, bold = false): number {
  const font = pdfFont(bold);
  if (!font) return text.length * fontSize * WIDEST_GLYPH;

  return (font.layout(text).advanceWidth / font.unitsPerEm) * fontSize;
}

/**
 * Advance width of every code point in `text`, in points — one shaping pass.
 *
 * Breaking a long token used to measure a fresh, one-character-longer prefix per
 * step, so shaping cost grew with the square of the token: 64k characters took
 * ~1.9s of blocked event loop before react-pdf had drawn anything, on a route
 * whose only other protection is a per-process rate limiter. Shaping once and
 * adding up glyph advances is linear.
 *
 * A glyph can cover several code points (a ligature, a base plus a combining
 * mark). Its whole advance is charged to the first of them and the rest measure
 * zero, so this array stays aligned with `Array.from(text)` and any prefix sum
 * is exact at a cluster boundary — the only place a break may land anyway.
 */
export function characterWidths(text: string, fontSize: number, bold = false): number[] {
  const font = pdfFont(bold);
  if (!font) return Array.from(text, () => fontSize * WIDEST_GLYPH);

  const { glyphs, positions } = font.layout(text);
  const scale = fontSize / font.unitsPerEm;
  const widths: number[] = [];

  glyphs.forEach((glyph: { codePoints?: number[] }, index: number) => {
    widths.push(positions[index].xAdvance * scale);
    const covered = Math.max(glyph.codePoints?.length ?? 1, 1);
    for (let extra = 1; extra < covered; extra += 1) widths.push(0);
  });

  return widths;
}

/** Width of the main column's card, inside the page margins. */
export function mainColumnWidth(theme: PdfTheme): number {
  const { layout } = theme;
  const columns = layout.mainColumnFlex + layout.sideColumnFlex;

  return (
    ((A4_WIDTH_PT - 2 * PAGE_MARGIN_PT - layout.columnGap) * layout.mainColumnFlex) / columns
  );
}

/** Text width inside a sidebar card — what a contact value has to fit into. */
export function sidebarTextWidth(theme: PdfTheme): number {
  const { layout } = theme;
  const columns = layout.mainColumnFlex + layout.sideColumnFlex;
  const column =
    ((A4_WIDTH_PT - 2 * PAGE_MARGIN_PT - layout.columnGap) * layout.sideColumnFlex) / columns;

  return column - 2 * layout.cardPadding;
}

/**
 * Breaks `value` onto as few lines as fit `width`, splitting only at the points
 * `parts` marks.
 *
 * The web gets the same break points from `<wbr>`, which costs nothing when the
 * value fits. The PDF has no equivalent: react-pdf's hyphenation callback does
 * offer break opportunities, but it paints a hyphen at the break — a rendered
 * `ariana.holt-` / `@example.com`, in the text layer as well as on the page,
 * which is worse for an ATS than the overflow it replaces. A newline only
 * appears here when the value could not have stayed on one line anyway.
 *
 * The trade-off this makes, deliberately: a wrapped value is two lines in the
 * PDF's text layer too, so `pdftotext` returns `ariana.holt` / `@examplecorp.com`
 * and a naive one-line e-mail regex will not match it. There is no third option
 * — PDF has no soft break — so the choice is between a value a reader cannot see
 * and a value an unsophisticated parser has to rejoin. Layout wins here because
 * machine-grade extraction is not this surface's job: `/api/resume/export/text`
 * and `/api/resume/export/yaml` exist for that and emit every contact value on
 * one unbroken line. Values that fit — the overwhelming majority — are untouched
 * and extract as a single token. See tests/pdf-contact-wrapping.test.mjs, which
 * pins the split shape without rejoining the lines.
 */
export function wrapAtBreakPoints(parts: string[], width: number, fontSize: number): string {
  return fill(parts, width, fontSize)
    .flatMap((line) => (measureText(line, fontSize) <= width ? [line] : rescue(line, width, fontSize)))
    .join("\n");
}

/**
 * Greedy: keep adding parts while the line still fits.
 *
 * Each part is measured once and the widths added, rather than re-measuring the
 * growing line — that was quadratic. Adding widths ignores kerning across a part
 * boundary, which is never positive, so the running total is at worst a hair
 * wide and the line breaks a hair early. Never the other way round.
 */
function fill(parts: string[], width: number, fontSize: number): string[] {
  const lines: string[] = [];
  let current = "";
  let currentWidth = 0;

  for (const part of parts) {
    const partWidth = measureText(part, fontSize);

    if (current && currentWidth + partWidth > width) {
      lines.push(current);
      current = part;
      currentWidth = partWidth;
    } else {
      current += part;
      currentWidth += partWidth;
    }
  }

  if (current) lines.push(current);
  return lines;
}

/**
 * A line still wider than the column would be broken by react-pdf itself, and it
 * paints a hyphen where it breaks — inside the address, in the text layer.
 *
 * First choice is punctuation the value already contains, so breaking after one
 * adds nothing. A slug like `aleksandrawisniewskakowalczyk` has none, so the last
 * resort is a hard cut: no hyphen, which is what `overflow-wrap: break-word`
 * gives the same value on the web.
 */
function rescue(line: string, width: number, fontSize: number): string[] {
  return fill(line.split(/(?<=[.\-_])/).filter(Boolean), width, fontSize).flatMap((piece) =>
    measureText(piece, fontSize) <= width ? [piece] : hardBreak(piece, width, fontSize),
  );
}

function hardBreak(token: string, width: number, fontSize: number): string[] {
  const characters = Array.from(token);
  const widths = characterWidths(token, fontSize);
  const pieces: string[] = [];
  let start = 0;
  let used = 0;

  characters.forEach((_character, index) => {
    const advance = widths[index] ?? 0;

    if (index > start && used + advance > width) {
      pieces.push(characters.slice(start, index).join(""));
      start = index;
      used = 0;
    }

    used += advance;
  });

  if (start < characters.length) pieces.push(characters.slice(start).join(""));
  return pieces;
}
