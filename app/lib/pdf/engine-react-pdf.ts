import path from "path";
import { Font } from "@react-pdf/renderer";

/**
 * Static instances, not the variable font the browser uses.
 *
 * `Font.register` resolves a weight by picking a registered file; it does not
 * instance a variation axis. Pointing every weight at
 * SpaceGrotesk-VariableFont_wght.ttf embedded that file's default instance —
 * Light (300) — for all of them, so the PDF had no bold at all and its body
 * text sat a weight below the web. Selecting a named instance via
 * `postscriptName` loads correctly but crashes fontkit's glyf subsetter during
 * embedding, so static files are the only working route.
 *
 * These are the upstream statics built from the same source as the variable
 * font; their metrics match its 400/500/700 instances to within rounding.
 */
const FONT_DIR = path.join(process.cwd(), "public/fonts");

const FONT_WEIGHT_SOURCES = [
  { fontWeight: 400 as const, file: "SpaceGrotesk-Regular.ttf" },
  { fontWeight: 500 as const, file: "SpaceGrotesk-Medium.ttf" },
  { fontWeight: 700 as const, file: "SpaceGrotesk-Bold.ttf" },
];

let fontsRegistered = false;

export function registerPdfFonts(): void {
  if (fontsRegistered) {
    return;
  }
  Font.register({
    family: "SpaceGrotesk",
    fonts: FONT_WEIGHT_SOURCES.map(({ fontWeight, file }) => ({
      src: path.join(FONT_DIR, file),
      fontWeight,
    })),
  });

  /**
   * The browser never hyphenates: `hyphens` is not set anywhere in resume.css,
   * so its initial `manual` applies and only an explicit soft hyphen breaks a
   * word. react-pdf does the opposite — with no callback registered
   * @react-pdf/textkit falls back to `hyphen` with the en-US pattern set and
   * offers a break inside every word, whatever the document's language. It
   * split Polish on English rules (Odpowiedzial-ność, Warsza-wa) and, worse,
   * broke contact values mid-token (sys-drum-mat-ic@gmail.com).
   *
   * Returning the word whole is textkit's own `defaultHyphenate`, which is only
   * reachable by registering it.
   */
  Font.registerHyphenationCallback((word) => [word]);

  fontsRegistered = true;
}

registerPdfFonts();
