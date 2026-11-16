import path from "path";
import { Font } from "@react-pdf/renderer";
import { CV_FONTS } from "../resume-style";

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
 *
 * The families and their files are CV_FONTS in ../resume-style, the one table
 * resume.css's @font-face rules are checked against too (ADR 0027, "Template
 * fonts"). A template font must be a complete static file: the subset woff
 * files a design tool exports load, but carry no PostScript name, and a
 * document using one never finishes rendering.
 */
const FONT_DIR = path.join(process.cwd(), "public/fonts");

const FONT_SOURCES = Object.entries(CV_FONTS).flatMap(([family, font]) =>
  Object.entries(font.files).map(([weight, file]) => ({ family, fontWeight: Number(weight), file })),
);

let fontsRegistered = false;

export function registerPdfFonts(): void {
  if (fontsRegistered) {
    return;
  }
  for (const family of Object.keys(CV_FONTS)) {
    Font.register({
      family,
      fonts: FONT_SOURCES.filter((source) => source.family === family).map(({ fontWeight, file }) => ({
        src: path.join(FONT_DIR, file),
        fontWeight,
      })),
    });
  }

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

let fontsLoaded: Promise<void> | null = null;

/**
 * Parses the registered files so their metrics are readable before layout.
 *
 * `Font.register` only records a path; `Font.getFont(...).data` stays null until
 * something loads it, and react-pdf does that after the component tree has been
 * rendered. app/lib/pdf/metrics.ts needs the metrics *during* render — it is how
 * pagination decides what may be kept whole — so the export routes await this
 * first. Idempotent, and the underlying store caches.
 */
export function loadPdfFonts(): Promise<void> {
  registerPdfFonts();

  // ponytail: parses every family once per process, whichever template is
  // exported. Load only the theme's families if cold-start time ever matters.
  fontsLoaded ??= Promise.all(
    FONT_SOURCES.map(({ family, fontWeight }) =>
      Font.load({ fontFamily: family, fontWeight, fontStyle: "normal" }),
    ),
  ).then(() => undefined);

  return fontsLoaded;
}

registerPdfFonts();
