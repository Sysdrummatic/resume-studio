/** Structural subset of PdfTheme this module needs; avoids a runtime import. */
type PdfThemeShape = {
  typography: { sizes: Record<string, number> };
  spacing: Record<string, number>;
  layout: { columnGap: number; cardPadding: number; sectionGap: number };
};

/**
 * Per-document CV style settings.
 *
 * ADR 0014 requires the PDF to be the web design *scaled*, never a second
 * design. These settings therefore never introduce new base values: both
 * renderers start from the canonical tokens (`app/resume/resume.css` for the
 * web, `cvBasicDotTheme` for the PDF) and multiply them by the factors below.
 * That keeps `tests/pdf-web-style-parity.test.mjs` meaningful — it still
 * compares the untouched base values — while the two surfaces stay in step
 * because they scale from one shared table.
 */

export type ResumeTextSize = "small" | "medium" | "large";
export type ResumeDensity = "compact" | "normal" | "relaxed";

export type ResumeStyleSettings = {
  textSize: ResumeTextSize;
  density: ResumeDensity;
  sectionDividers: boolean;
  headerPhoto: boolean;
  liveLinkQr: boolean;
};

/**
 * Every default reproduces the CV exactly as it renders without any style
 * settings — a document that has never been styled must look unchanged, so no
 * default may hide an element the renderer normally draws.
 */
export const DEFAULT_RESUME_STYLE: ResumeStyleSettings = {
  textSize: "medium",
  density: "normal",
  sectionDividers: true,
  headerPhoto: true,
  liveLinkQr: true,
};

/** Multiplies every `--font-size-*` token (web) and every font size (PDF). */
export const TEXT_SIZE_SCALE: Record<ResumeTextSize, number> = {
  small: 0.92,
  medium: 1,
  large: 1.1,
};

/** Multiplies every `--space-*` token (web) and every spacing value (PDF). */
export const DENSITY_SCALE: Record<ResumeDensity, number> = {
  compact: 0.82,
  normal: 1,
  relaxed: 1.18,
};

const TEXT_SIZES: ResumeTextSize[] = ["small", "medium", "large"];
const DENSITIES: ResumeDensity[] = ["compact", "normal", "relaxed"];

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/**
 * Accepts anything the database or a YAML import may hold and always returns a
 * complete, valid settings object — style must never be able to break a render.
 */
export function normalizeResumeStyle(input: unknown): ResumeStyleSettings {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ...DEFAULT_RESUME_STYLE };
  }
  const source = input as Record<string, unknown>;
  const textSize = TEXT_SIZES.includes(source.textSize as ResumeTextSize)
    ? (source.textSize as ResumeTextSize)
    : DEFAULT_RESUME_STYLE.textSize;
  const density = DENSITIES.includes(source.density as ResumeDensity)
    ? (source.density as ResumeDensity)
    : DEFAULT_RESUME_STYLE.density;

  return {
    textSize,
    density,
    sectionDividers: asBoolean(source.sectionDividers, DEFAULT_RESUME_STYLE.sectionDividers),
    headerPhoto: asBoolean(source.headerPhoto, DEFAULT_RESUME_STYLE.headerPhoto),
    liveLinkQr: asBoolean(source.liveLinkQr, DEFAULT_RESUME_STYLE.liveLinkQr),
  };
}

export function isDefaultResumeStyle(style: ResumeStyleSettings): boolean {
  return (
    style.textSize === DEFAULT_RESUME_STYLE.textSize &&
    style.density === DEFAULT_RESUME_STYLE.density &&
    style.sectionDividers === DEFAULT_RESUME_STYLE.sectionDividers &&
    style.headerPhoto === DEFAULT_RESUME_STYLE.headerPhoto &&
    style.liveLinkQr === DEFAULT_RESUME_STYLE.liveLinkQr
  );
}

/** Data attributes the CV root carries so `resume.css` can select the variant. */
export function resumeStyleDataAttributes(style: ResumeStyleSettings): Record<string, string> {
  return {
    "data-cv-text-size": style.textSize,
    "data-cv-density": style.density,
    "data-cv-dividers": style.sectionDividers ? "on" : "off",
    "data-cv-header-photo": style.headerPhoto ? "on" : "off",
    "data-cv-live-qr": style.liveLinkQr ? "on" : "off",
  };
}

/**
 * Applies the settings to a PDF theme.
 *
 * Lives here rather than in `pdf/theme.ts` so that file stays a pure table of
 * design values with no imports, and so both renderers read their factors from
 * one module. ADR 0014's rule holds: every `pt(<web pixel value>)` literal in
 * `cvBasicDotTheme` is untouched, so `tests/pdf-web-style-parity.test.mjs`
 * still compares the real base design, and these factors are the same ones
 * `resume.css` applies through its `--*-base` aliases.
 */
export function applyResumeStyleToTheme<T extends PdfThemeShape>(theme: T, style: ResumeStyleSettings): T {
  const text = TEXT_SIZE_SCALE[style.textSize];
  const space = DENSITY_SCALE[style.density];
  if (text === 1 && space === 1) return theme;

  const scaleAll = <V extends Record<string, number>>(values: V, factor: number): V =>
    Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value * factor])) as V;

  return {
    ...theme,
    typography: {
      ...theme.typography,
      sizes: scaleAll(theme.typography.sizes, text),
    },
    spacing: scaleAll(theme.spacing, space),
    layout: {
      ...theme.layout,
      // Page margin is paper geometry, not design rhythm — scaling it would
      // resize the printable area instead of the content's density.
      columnGap: theme.layout.columnGap * space,
      cardPadding: theme.layout.cardPadding * space,
      sectionGap: theme.layout.sectionGap * space,
    },
  };
}
