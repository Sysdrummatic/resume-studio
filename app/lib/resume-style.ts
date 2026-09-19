/** Structural subset of PdfTheme this module needs; avoids a runtime import. */
type PdfThemeShape = {
  id: string;
  colors: Record<string, string>;
  typography: { sizes: Record<string, number> };
  spacing: Record<string, number>;
  layout: { columnGap: number; cardPadding: number; sectionGap: number };
  header?: {
    backgroundColor?: string;
    textColor?: string;
    roleColor?: string;
    logoBackgroundColor?: string;
    logoTextColor?: string;
    logoBorderColor?: string;
    logoBorderWidth?: number;
    logoBorderRadius?: number;
    bleed?: boolean;
    paddingTop?: number;
    paddingBottom?: number;
    borderBottomColor?: string;
    borderBottomWidth?: number;
  };
};

/**
 * CV presentation settings. Master documents use this as their default; saved
 * CV versions store the same shape independently on their preset row.
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
export type ResumeVisualTemplate = "sample-two-column" | "signal-grid" | "atelier-noir" | "terminal-stack";

export type ResumeTemplatePalette = {
  accent: string;
  accentDark: string;
  accentLight: string;
};

export const RESUME_TEMPLATE_PALETTES: Record<ResumeVisualTemplate, ResumeTemplatePalette> = {
  "sample-two-column": { accent: "#009c8a", accentDark: "#007d6c", accentLight: "#e6f4f2" },
  "signal-grid": { accent: "#2448e8", accentDark: "#17349f", accentLight: "#e9edff" },
  "atelier-noir": { accent: "#d7a24a", accentDark: "#93651f", accentLight: "#f8ebd2" },
  "terminal-stack": { accent: "#00a3a3", accentDark: "#006b70", accentLight: "#dcf2f0" },
};

export type ResumeStyleSettings = {
  template: ResumeVisualTemplate;
  accentColor: string;
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
  template: "sample-two-column",
  accentColor: RESUME_TEMPLATE_PALETTES["sample-two-column"].accent,
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
const VISUAL_TEMPLATES: ResumeVisualTemplate[] = ["sample-two-column", "signal-grid", "atelier-noir", "terminal-stack"];

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9a-f]{3}$/.test(trimmed)) {
    return `#${trimmed.slice(1).split("").map((part) => `${part}${part}`).join("")}`;
  }
  return null;
}

function mixHexColor(color: string, target: string, targetWeight: number): string {
  const channels = (value: string) => [1, 3, 5].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
  const sourceChannels = channels(color);
  const targetChannels = channels(target);
  const mixed = sourceChannels.map((source, index) => Math.round(source + (targetChannels[index] - source) * targetWeight));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function getAccentPalette(template: ResumeVisualTemplate, accentColor: string): ResumeTemplatePalette {
  const defaults = RESUME_TEMPLATE_PALETTES[template];
  if (accentColor === defaults.accent) return defaults;
  return {
    accent: accentColor,
    accentDark: mixHexColor(accentColor, "#000000", 0.25),
    accentLight: mixHexColor(accentColor, "#ffffff", 0.88),
  };
}

export function resumeStyleCssVariables(style: ResumeStyleSettings): Record<string, string> {
  const palette = getAccentPalette(style.template, style.accentColor);
  return {
    "--accent": palette.accent,
    "--accent-dark": palette.accentDark,
    "--accent-light": palette.accentLight,
  };
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
  const template = VISUAL_TEMPLATES.includes(source.template as ResumeVisualTemplate)
    ? (source.template as ResumeVisualTemplate)
    : DEFAULT_RESUME_STYLE.template;
  const accentColor = normalizeHexColor(source.accentColor) || RESUME_TEMPLATE_PALETTES[template].accent;
  const textSize = TEXT_SIZES.includes(source.textSize as ResumeTextSize)
    ? (source.textSize as ResumeTextSize)
    : DEFAULT_RESUME_STYLE.textSize;
  const density = DENSITIES.includes(source.density as ResumeDensity)
    ? (source.density as ResumeDensity)
    : DEFAULT_RESUME_STYLE.density;

  return {
    template,
    accentColor,
    textSize,
    density,
    sectionDividers: asBoolean(source.sectionDividers, DEFAULT_RESUME_STYLE.sectionDividers),
    headerPhoto: asBoolean(source.headerPhoto, DEFAULT_RESUME_STYLE.headerPhoto),
    liveLinkQr: asBoolean(source.liveLinkQr, DEFAULT_RESUME_STYLE.liveLinkQr),
  };
}

export function isDefaultResumeStyle(style: ResumeStyleSettings): boolean {
  return (
    style.template === DEFAULT_RESUME_STYLE.template &&
    style.accentColor === DEFAULT_RESUME_STYLE.accentColor &&
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
    "data-cv-template": style.template,
    "data-cv-text-size": style.textSize,
    "data-cv-density": style.density,
    "data-cv-dividers": style.sectionDividers ? "on" : "off",
    "data-cv-header-photo": style.headerPhoto ? "on" : "off",
    "data-cv-live-qr": style.liveLinkQr ? "on" : "off",
  };
}

function applyResumeTemplateToTheme<T extends PdfThemeShape>(theme: T, template: ResumeVisualTemplate): T {
  if (template === DEFAULT_RESUME_STYLE.template) return theme;

  const themes: Record<Exclude<ResumeVisualTemplate, "sample-two-column">, Pick<PdfThemeShape, "id" | "colors"> & { header: NonNullable<PdfThemeShape["header"]> }> = {
    "signal-grid": {
      id: "cv-signal-grid",
      colors: {
        accent: "#2448e8", accentDark: "#17349f", accentLight: "#e9edff", text: "#15201c", muted: "#63706b",
        cardBg: "#ffffff", border: "#ccd6d1", pageBg: "#ffffff", pillBg: "#fbfcfb", meterDotInactive: "#dfe4e1", qrCardBg: "#ffffff",
      },
      header: { logoBackgroundColor: "#d7ef66", logoTextColor: "#15201c", logoBorderColor: "#15201c", logoBorderWidth: 0.625, logoBorderRadius: 0 },
    },
    "atelier-noir": {
      id: "cv-atelier-noir",
      colors: {
        accent: "#d7a24a", accentDark: "#93651f", accentLight: "#f8ebd2", text: "#25222a", muted: "#726e76",
        cardBg: "#fbf9f5", border: "#ddd7cd", pageBg: "#fbf9f5", pillBg: "#fbf9f5", meterDotInactive: "#c8c2ba", qrCardBg: "#fbf9f5",
      },
      header: {
        backgroundColor: "#25232b", textColor: "#ffffff", roleColor: "#d9d3c8", logoBackgroundColor: "#2c2933", logoTextColor: "#d7a24a",
        logoBorderColor: "#d7a24a", logoBorderWidth: 0.625, logoBorderRadius: 24.375, bleed: true, paddingTop: 31.25, paddingBottom: 21.25,
        borderBottomColor: "#d7a24a", borderBottomWidth: 1.875,
      },
    },
    "terminal-stack": {
      id: "cv-terminal-stack",
      colors: {
        accent: "#00a3a3", accentDark: "#006b70", accentLight: "#dcf2f0", text: "#13262e", muted: "#5c727b",
        cardBg: "#fbfcfd", border: "#cad7da", pageBg: "#fbfcfd", pillBg: "#fbfcfd", meterDotInactive: "#c8d4d8", qrCardBg: "#fbfcfd",
      },
      header: {
        backgroundColor: "#10252d", textColor: "#ffffff", roleColor: "#82e4da", logoBackgroundColor: "#163a44", logoTextColor: "#82e4da",
        logoBorderColor: "#48bbb8", logoBorderWidth: 0.625, logoBorderRadius: 0, bleed: true, paddingTop: 28.75, paddingBottom: 18.75,
        borderBottomColor: "#00a3a3", borderBottomWidth: 1.875,
      },
    },
  };

  const selected = themes[template as Exclude<ResumeVisualTemplate, "sample-two-column">];
  if (!selected) return theme;
  return { ...theme, id: selected.id, colors: { ...theme.colors, ...selected.colors }, header: selected.header };
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
  const normalizedStyle = normalizeResumeStyle(style);
  const templateTheme = applyResumeTemplateToTheme(theme, normalizedStyle.template);
  const palette = getAccentPalette(normalizedStyle.template, normalizedStyle.accentColor);
  const defaultAccent = RESUME_TEMPLATE_PALETTES[normalizedStyle.template].accent;
  const header = templateTheme.header
    ? {
        ...templateTheme.header,
        logoTextColor: templateTheme.header.logoTextColor === defaultAccent ? palette.accent : templateTheme.header.logoTextColor,
        logoBorderColor: templateTheme.header.logoBorderColor === defaultAccent ? palette.accent : templateTheme.header.logoBorderColor,
        borderBottomColor: templateTheme.header.borderBottomColor === defaultAccent ? palette.accent : templateTheme.header.borderBottomColor,
      }
    : templateTheme.header;
  const styledTheme = {
    ...templateTheme,
    colors: {
      ...templateTheme.colors,
      accent: palette.accent,
      accentDark: palette.accentDark,
      accentLight: palette.accentLight,
    },
    header,
  };
  const text = TEXT_SIZE_SCALE[normalizedStyle.textSize];
  const space = DENSITY_SCALE[normalizedStyle.density];
  if (text === 1 && space === 1) {
    return (normalizedStyle.accentColor === RESUME_TEMPLATE_PALETTES[normalizedStyle.template].accent ? templateTheme : styledTheme) as T;
  }

  const scaleAll = <V extends Record<string, number>>(values: V, factor: number): V =>
    Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value * factor])) as V;

  return {
    ...styledTheme,
    typography: {
      ...templateTheme.typography,
      sizes: scaleAll(templateTheme.typography.sizes, text),
    },
    spacing: scaleAll(templateTheme.spacing, space),
    layout: {
      ...templateTheme.layout,
      // Page margin is paper geometry, not design rhythm — scaling it would
      // resize the printable area instead of the content's density.
      columnGap: templateTheme.layout.columnGap * space,
      cardPadding: templateTheme.layout.cardPadding * space,
      sectionGap: templateTheme.layout.sectionGap * space,
    },
  };
}
