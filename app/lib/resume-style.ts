/** Structural subset of PdfTheme this module needs; avoids a runtime import. */
type PdfThemeShape = {
  id: string;
  variant?: {
    layout?: "two-column" | "two-column-left" | "single-column";
    section?: "card" | "rule";
    timeline?: "rail" | "stacked";
    meter?: "dots" | "bars" | "none";
    headerAlign?: "left" | "center";
  };
  colors: Record<string, string>;
  typography: {
    sizes: Record<string, number>;
    fontFamily?: string;
    lineHeightNatural?: number;
    headingFontFamily?: string;
    headingWeight?: number;
    headingLineHeightNatural?: number;
    headingOpticalCentre?: number;
  };
  spacing: Record<string, number>;
  layout: {
    columnGap: number;
    cardPadding: number;
    sectionGap: number;
    sidebarPadding?: number;
    sidebarBg?: string;
    sidebarRuleWidth?: number;
  };
  components: Record<string, number | string | undefined>;
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
    bleedTop?: boolean;
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
export type ResumeTemplatePalette = {
  accent: string;
  accentDark: string;
  accentLight: string;
};

export type ResumeTemplateFamily = "standard" | "professional" | "premium" | "tech" | "bold";
export type ResumeExperienceFit = "beginner" | "mid" | "senior";
/** Which PDF page structure renders the template (app/lib/pdf/templates). */
export type ResumePdfLayout = "two-column" | "two-column-left" | "single-column";

type ResumeTemplateDefinition = {
  id: string;
  /** Product name; the editor passes it through its text catalogue. */
  name: string;
  /** Key under `dashboard.labels` in app/i18n/locales. */
  labelKey: string;
  family: ResumeTemplateFamily;
  experienceFit: readonly ResumeExperienceFit[];
  bestFor: string;
  pdfLayout: ResumePdfLayout;
  /**
   * `card`: the original card layout and the three skins built on it.
   * `flat`: templates added under ADR 0027 — no card surface, a ruled section
   * title, a timeline without a rail — which stay inside the reference box and
   * so get a PDF that matches them.
   */
  surface: "card" | "flat";
  palette: ResumeTemplatePalette;
};

/**
 * The only list of CV templates. The id type, the palettes and both selectors
 * (editor, dashboard) derive from it.
 *
 * Saved CV versions store the id as JSON and `normalizeResumeStyle` falls back
 * to the default for an id it does not know, so an entry may be added but never
 * renamed or removed.
 */
export const RESUME_TEMPLATES = [
  {
    id: "sample-two-column",
    name: "Basic",
    labelKey: "template_sample_two_column",
    family: "standard",
    experienceFit: ["beginner", "mid", "senior"],
    bestFor: "Any role and seniority",
    pdfLayout: "two-column",
    surface: "card",
    palette: { accent: "#009c8a", accentDark: "#007d6c", accentLight: "#e6f4f2" },
  },
  {
    id: "signal-grid",
    name: "Signal Grid",
    labelKey: "template_signal_grid",
    family: "standard",
    experienceFit: ["mid", "senior"],
    bestFor: "Product, data, research, engineering",
    pdfLayout: "two-column",
    surface: "card",
    palette: { accent: "#2448e8", accentDark: "#17349f", accentLight: "#e9edff" },
  },
  {
    id: "atelier-noir",
    name: "Atelier Noir",
    labelKey: "template_atelier_noir",
    family: "premium",
    experienceFit: ["senior"],
    bestFor: "Leadership, strategy, creative technology",
    pdfLayout: "two-column",
    surface: "card",
    palette: { accent: "#d7a24a", accentDark: "#93651f", accentLight: "#f8ebd2" },
  },
  {
    id: "terminal-stack",
    name: "Terminal Stack",
    labelKey: "template_terminal_stack",
    family: "tech",
    experienceFit: ["beginner", "mid", "senior"],
    bestFor: "Software engineering, platform, data",
    pdfLayout: "two-column",
    surface: "card",
    palette: { accent: "#00a3a3", accentDark: "#006b70", accentLight: "#dcf2f0" },
  },
  {
    id: "classic-single",
    name: "Classic Single",
    labelKey: "template_classic_single",
    family: "standard",
    experienceFit: ["beginner", "mid", "senior"],
    bestFor: "Any role; conservative employers, public sector, finance",
    pdfLayout: "single-column",
    surface: "flat",
    palette: paletteFrom("#11355c"),
  },
  {
    id: "sidebar-slate",
    name: "Sidebar Slate",
    labelKey: "template_sidebar_slate",
    family: "standard",
    experienceFit: ["mid", "senior"],
    bestFor: "Operations, engineering, consulting; skills-led profiles",
    pdfLayout: "two-column-left",
    surface: "flat",
    palette: paletteFrom("#424953"),
  },
  {
    id: "minimal-light",
    name: "Minimal Light",
    labelKey: "template_minimal_light",
    family: "standard",
    experienceFit: ["beginner", "mid"],
    bestFor: "Early career, academia, design-adjacent roles",
    pdfLayout: "single-column",
    surface: "flat",
    palette: paletteFrom("#4f5375"),
  },
  {
    id: "boardroom",
    name: "Boardroom",
    labelKey: "template_boardroom",
    family: "professional",
    experienceFit: ["mid", "senior"],
    bestFor: "Management, finance, legal, board-level roles",
    pdfLayout: "two-column-left",
    surface: "flat",
    palette: paletteFrom("#b08a4f"),
  },
  {
    id: "executive",
    name: "Executive",
    labelKey: "template_executive",
    family: "professional",
    experienceFit: ["senior"],
    bestFor: "Senior leadership, advisory, academia",
    pdfLayout: "two-column",
    surface: "flat",
    palette: paletteFrom("#1b3a8a"),
  },
] as const satisfies readonly ResumeTemplateDefinition[];

export type ResumeVisualTemplate = (typeof RESUME_TEMPLATES)[number]["id"];

export const RESUME_TEMPLATE_PALETTES = Object.fromEntries(
  RESUME_TEMPLATES.map((template) => [template.id, template.palette]),
) as Record<ResumeVisualTemplate, ResumeTemplatePalette>;

export function getResumeTemplate(id: ResumeVisualTemplate) {
  return RESUME_TEMPLATES.find((template) => template.id === id) ?? RESUME_TEMPLATES[0];
}

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
const VISUAL_TEMPLATES: ResumeVisualTemplate[] = RESUME_TEMPLATES.map((template) => template.id);

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

/** WCAG 2.x relative luminance of a `#rrggbb` colour. */
function relativeLuminance(color: string): number {
  const [red, green, blue] = [1, 3, 5].map((offset) => {
    const channel = Number.parseInt(color.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * The text colour for a surface painted in a user-chosen accent. The accent is
 * an arbitrary hex, so white cannot be assumed. One of pure white and pure
 * black always clears WCAG AA (4.5:1): white does up to a luminance of 0.183,
 * black from 0.175. An off-black would leave mid-greys such as #777777 with
 * neither.
 */
export function readableTextOn(background: string): "#ffffff" | "#000000" {
  return contrastRatio("#ffffff", background) >= contrastRatio("#000000", background) ? "#ffffff" : "#000000";
}

/**
 * The palette a flat template derives from one accent.
 *
 * `accentDark` is a text colour there (periods, roles, links), and it may sit
 * on `accentLight` (a tinted sidebar), so it is darkened until it clears WCAG
 * AA against that. A fixed 25% darkening leaves a pale user accent unreadable.
 */
function paletteFrom(accent: string): ResumeTemplatePalette {
  const accentLight = mixHexColor(accent, "#ffffff", 0.88);
  let accentDark = mixHexColor(accent, "#000000", 0.25);
  for (let weight = 0.3; contrastRatio(accentDark, accentLight) < 4.5 && weight <= 1; weight += 0.05) {
    accentDark = mixHexColor(accent, "#000000", weight);
  }
  return { accent, accentDark, accentLight };
}

function getAccentPalette(template: ResumeVisualTemplate, accentColor: string): ResumeTemplatePalette {
  const defaults = RESUME_TEMPLATE_PALETTES[template];
  if (accentColor === defaults.accent) return defaults;
  if (getResumeTemplate(template).surface === "flat") return paletteFrom(accentColor);
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
    // Only flat templates read it; the older ones keep white on their accent.
    "--on-accent": readableTextOn(palette.accent),
  };
}

/**
 * A saved CV version without its own style (`{}`, the column default) uses its
 * document's style, like the publish trigger
 * (20260926000000_preset_style_inherits_document.sql).
 */
export function presetStyleSource(presetStyle: unknown, documentStyle: unknown): unknown {
  const hasOwnStyle = Boolean(presetStyle) && typeof presetStyle === "object" && Object.keys(presetStyle as object).length > 0;
  return hasOwnStyle ? presetStyle : documentStyle;
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

type CvFont = {
  /** The family name resume.css uses. The key is the name the PDF registers. */
  css: string;
  /** Static files in public/fonts, by weight. */
  files: Readonly<Record<number, string>>;
  unitsPerEm: number;
  ascent: number;
  descent: number;
  lineGap: number;
  capHeight: number;
};

/**
 * Every font a CV may be set in (ADR 0027, "Template fonts").
 *
 * Both surfaces read the same static files: resume.css through @font-face, the
 * PDF through app/lib/pdf/engine-react-pdf.ts. A body family ships 400/500/700,
 * the three weights the CV uses; a heading family ships the one weight it is
 * drawn in. react-pdf picks a file per weight and cannot instance a variable
 * axis, so a weight without a file here does not exist.
 *
 * The metrics are the files' own hhea and OS/2 values, copied, never tuned:
 * react-pdf hangs all leading below the glyphs, and centring text against a
 * sibling needs the font's real line box (see centeringPadding in pdf/theme.ts).
 * tests/pdf-pagination.test.mjs reads them back out of the files.
 */
export const CV_FONTS = {
  SpaceGrotesk: {
    css: "Space Grotesk",
    files: { 400: "SpaceGrotesk-Regular.ttf", 500: "SpaceGrotesk-Medium.ttf", 700: "SpaceGrotesk-Bold.ttf" },
    unitsPerEm: 1000,
    ascent: 984,
    descent: -292,
    lineGap: 0,
    capHeight: 700,
  },
  WorkSans: {
    css: "Work Sans",
    files: { 400: "WorkSans-Regular.ttf", 500: "WorkSans-Medium.ttf", 700: "WorkSans-Bold.ttf" },
    unitsPerEm: 1000,
    ascent: 930,
    descent: -243,
    lineGap: 0,
    capHeight: 660,
  },
  IBMPlexSerif: {
    css: "IBM Plex Serif",
    files: { 400: "IBMPlexSerif-Regular.ttf", 500: "IBMPlexSerif-Medium.ttf", 700: "IBMPlexSerif-Bold.ttf" },
    unitsPerEm: 1000,
    ascent: 1025,
    descent: -275,
    lineGap: 0,
    capHeight: 698,
  },
  Gloock: {
    css: "Gloock",
    files: { 400: "Gloock-Regular.ttf" },
    unitsPerEm: 1000,
    ascent: 975,
    descent: -225,
    lineGap: 0,
    capHeight: 750,
  },
  LibreBaskerville: {
    css: "Libre Baskerville",
    files: { 400: "LibreBaskerville-Regular.ttf" },
    unitsPerEm: 1000,
    ascent: 970,
    descent: -270,
    lineGap: 0,
    capHeight: 770,
  },
} as const satisfies Record<string, CvFont>;

export type CvFontFamily = keyof typeof CV_FONTS;

/** The PDF typography tokens a template's fonts stand for. */
function fontTokens(fonts: { body: CvFontFamily; heading: CvFontFamily }) {
  const body: CvFont = CV_FONTS[fonts.body];
  const heading: CvFont = CV_FONTS[fonts.heading];
  const natural = (font: CvFont) => (font.ascent - font.descent + font.lineGap) / font.unitsPerEm;

  return {
    fontFamily: fonts.body,
    lineHeightNatural: natural(body),
    headingFontFamily: fonts.heading,
    headingWeight: Number(Object.keys(heading.files)[0]),
    headingLineHeightNatural: natural(heading),
    headingOpticalCentre: (heading.ascent - heading.capHeight / 2) / heading.unitsPerEm,
  };
}

/**
 * Web CSS pixels to PDF points: PX_TO_PT in app/lib/pdf/theme.ts, restated so
 * this module keeps no runtime import. tests/resume-style-settings.test.mjs
 * asserts the two agree.
 */
const px = (value: number): number => value * 0.625;

type FlatTemplate = Extract<(typeof RESUME_TEMPLATES)[number], { surface: "flat" }>["id"];

type FlatTemplateTheme = {
  /** Absent: Space Grotesk throughout, like the original template. */
  fonts?: { body: CvFontFamily; heading: CvFontFamily };
  colors: Record<string, string>;
  variant?: NonNullable<PdfThemeShape["variant"]>;
  layout?: Partial<PdfThemeShape["layout"]>;
  components?: Record<string, number | string>;
  header?: NonNullable<PdfThemeShape["header"]>;
};

/*
 * What every flat template shares, mirroring `.resume-surface--flat` in
 * resume.css. A value starting with "@" names a palette colour and is resolved
 * once the user's accent is known — see resolveAccentReferences().
 */
const FLAT_BASE: Required<Omit<FlatTemplateTheme, "header" | "fonts">> = {
  variant: { section: "rule", timeline: "stacked" },
  colors: {
    accent: "@accent",
    accentDark: "@accentDark",
    accentLight: "@accentLight",
    cardBg: "#ffffff",
    pageBg: "#ffffff",
    qrCardBg: "#ffffff",
    onAccent: "@onAccent",
  },
  // .layout gap: --space-xl. It is a grid gap, so it separates the columns too.
  layout: { cardPadding: 0, sectionGap: px(24), columnGap: px(24) },
  components: {
    sectionDotSize: px(12), // .section-dot
    sectionDotHeight: px(4),
    sectionDotRadius: 0,
    sectionRuleWidth: px(1), // .section-title border-bottom
    sectionRuleGap: px(6), // .section-title padding-bottom
    timelineRailWidth: 0, // .timeline padding-left
    timelineContentPaddingX: 0, // .timeline-item__content padding
    timelineContentPaddingY: 0,
  },
};

const FLAT_TEMPLATE_THEMES: Record<FlatTemplate, FlatTemplateTheme> = {
  "classic-single": {
    colors: { text: "#1b1f24", muted: "#5b6470", border: "#d5dae0", pillBg: "#ffffff", meterDotInactive: "#d5dae0" },
    variant: { meter: "none" },
    components: {
      pillPaddingY: px(4),
      pillPaddingX: px(10),
      pillRadius: px(4),
      pillBorderColor: "#d5dae0",
      pillTextColor: "#1b1f24",
    },
    // .hero__title: 16px above a 2px accent rule.
    header: { paddingBottom: px(16), borderBottomColor: "@accent", borderBottomWidth: px(2) },
  },
  "sidebar-slate": {
    colors: { text: "#20242a", muted: "#5d646d", border: "#cfd3d8", pillBg: "#ffffff", meterDotInactive: "#cfd3d8" },
    variant: { meter: "bars" },
    layout: { sidebarPadding: px(16), sidebarBg: "@accentLight" }, // .sidebar padding: --space-md
    components: {
      meterDotSize: px(14), // .meter__dot
      meterDotHeight: px(4),
      meterDotRadius: 0,
      pillPaddingY: px(4),
      pillPaddingX: px(10),
      pillRadius: px(4),
    },
    header: { logoBorderRadius: px(8) },
  },
  "minimal-light": {
    colors: {
      text: "#22232b",
      muted: "#666a78",
      border: "#dcdde4",
      pillBg: "@accentLight",
      meterDotInactive: "#dcdde4",
      rule: "@accentLight",
    },
    variant: { meter: "none", headerAlign: "center" },
    layout: { sectionGap: px(36) }, // .layout gap: --space-xl x 1.5
    components: { sectionDotSize: 0, sectionDotHeight: 0, sectionTitleGap: 0 }, // .section-dot hidden
  },
  boardroom: {
    fonts: { body: "WorkSans", heading: "Gloock" },
    colors: { text: "#1c2333", muted: "#5b6375", border: "#dcd7cc", pillBg: "#ffffff", meterDotInactive: "#dcd7cc" },
    layout: { sidebarPadding: px(16), sidebarBg: "@accentLight" }, // .sidebar padding: --space-md
    components: {
      sectionDotSize: 0, // .section-dot hidden
      sectionDotHeight: 0,
      sectionTitleGap: 0,
      meterDotSize: px(9), // .meter__dot
      meterDotHeight: px(9),
      meterDotRadius: 0,
      pillPaddingY: px(4),
      pillPaddingX: px(10),
      pillRadius: px(2),
      pillBorderColor: "#dcd7cc",
      pillTextColor: "#1c2333",
    },
    // .hero: a navy band from the sheet's top edge, closed by a 4px accent rule.
    header: {
      backgroundColor: "#0f1f3a",
      textColor: "#ffffff",
      roleColor: "#d9dde6",
      logoBackgroundColor: "#0f1f3a",
      logoTextColor: "#ffffff",
      logoBorderColor: "@accent",
      logoBorderWidth: px(1),
      bleed: true,
      bleedTop: true,
      paddingTop: px(28),
      paddingBottom: px(20),
      borderBottomColor: "@accent",
      borderBottomWidth: px(4),
    },
  },
  executive: {
    fonts: { body: "IBMPlexSerif", heading: "LibreBaskerville" },
    colors: { text: "#17181c", muted: "#5a5e66", border: "#d6d8dd", pillBg: "#ffffff", meterDotInactive: "#d6d8dd" },
    variant: { meter: "bars" },
    layout: { sidebarRuleWidth: px(1) }, // .sidebar border-left, drawn in the column gap
    components: {
      sectionDotSize: 0, // .section-dot hidden
      sectionDotHeight: 0,
      sectionTitleGap: 0,
      meterDotSize: px(16), // .meter__dot
      meterDotHeight: px(2),
      meterDotRadius: 0,
      pillPaddingY: px(4),
      pillPaddingX: px(10),
      pillRadius: 0,
      pillBorderColor: "#d6d8dd",
      pillTextColor: "#17181c",
    },
    // .hero__title: 16px above a 1px rule in the text colour; an outlined monogram.
    header: {
      roleColor: "@accentDark",
      logoBackgroundColor: "#ffffff",
      logoTextColor: "#17181c",
      logoBorderColor: "#17181c",
      logoBorderWidth: px(1),
      paddingBottom: px(16),
      borderBottomColor: "#17181c",
      borderBottomWidth: px(1),
    },
  },
};

function applyFlatTemplateToTheme<T extends PdfThemeShape>(theme: T, template: FlatTemplate): T {
  const flat = FLAT_TEMPLATE_THEMES[template];

  return {
    ...theme,
    id: `cv-${template}`,
    variant: { ...FLAT_BASE.variant, ...flat.variant, layout: getResumeTemplate(template).pdfLayout },
    colors: { ...theme.colors, ...FLAT_BASE.colors, ...flat.colors },
    typography: flat.fonts ? { ...theme.typography, ...fontTokens(flat.fonts) } : theme.typography,
    layout: { ...theme.layout, ...FLAT_BASE.layout, ...flat.layout },
    components: { ...theme.components, ...FLAT_BASE.components, ...flat.components },
    header: flat.header,
  };
}

/** Replaces "@accent"-style references with the colours of the active palette. */
function resolveAccentReferences<T extends PdfThemeShape>(theme: T, palette: ResumeTemplatePalette): T {
  if (!theme.variant) return theme;

  const references: Record<string, string> = {
    "@accent": palette.accent,
    "@accentDark": palette.accentDark,
    "@accentLight": palette.accentLight,
    "@onAccent": readableTextOn(palette.accent),
  };
  const resolve = <V extends object>(values: V): V =>
    Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, typeof value === "string" ? (references[value] ?? value) : value]),
    ) as V;

  return {
    ...theme,
    colors: resolve(theme.colors),
    layout: resolve(theme.layout),
    components: resolve(theme.components),
    header: theme.header ? resolve(theme.header) : theme.header,
  };
}

function applyResumeTemplateToTheme<T extends PdfThemeShape>(theme: T, template: ResumeVisualTemplate): T {
  if (template === DEFAULT_RESUME_STYLE.template) return theme;
  if (template in FLAT_TEMPLATE_THEMES) return applyFlatTemplateToTheme(theme, template as FlatTemplate);

  const themes: Record<Exclude<ResumeVisualTemplate, "sample-two-column" | FlatTemplate>, Pick<PdfThemeShape, "id" | "colors"> & { header: NonNullable<PdfThemeShape["header"]> }> = {
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

  const selected = themes[template as Exclude<ResumeVisualTemplate, "sample-two-column" | FlatTemplate>];
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
  const palette = getAccentPalette(normalizedStyle.template, normalizedStyle.accentColor);
  const templateTheme = resolveAccentReferences(applyResumeTemplateToTheme(theme, normalizedStyle.template), palette);
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
      ...(templateTheme.layout.sidebarPadding === undefined
        ? null
        : { sidebarPadding: templateTheme.layout.sidebarPadding * space }),
    },
  };
}
