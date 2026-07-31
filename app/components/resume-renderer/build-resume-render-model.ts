import type { ResumeLocale, ResumeDocument } from "../../lib/resume-schema";
import { getDefaultSummary, getPreviewLabels, normalizeLocale } from "../../lib/resume-schema";
import type { ResumeLanguageOption } from "../resume-language-switcher";

export const DEFAULT_TEMPLATE_ID = "sample-two-column" as const;
export const DEFAULT_THEME_ID = "cv-basic-dot" as const;

export type ResumeRenderMode = "public" | "editor" | "preview" | "pdf";
export type ResumeTemplateId = typeof DEFAULT_TEMPLATE_ID;
export type ResumeThemeId = typeof DEFAULT_THEME_ID;

export type ResumeRendererLabels = {
  languageSwitcher: string;
  summary: string;
  experience: string;
  education: string;
  courses: string;
  personalInfo: string;
  skills: string;
  techStack: string;
  languages: string;
  interests: string;
  publicBadge: string;
  draftBadge: string;
  aiGeneratedBadge: string;
  pdfAction: string;
  atsAction: string;
  pdfExportError: string;
  atsUnavailable: string;
};

export type ResumeRenderAction = {
  label: string;
  href?: string;
  onClick?: () => Promise<void> | void;
  disabled?: boolean;
  disabledReason?: string;
  download?: boolean;
};

export type ResumeRenderChrome = {
  visible: boolean;
  status?: "public" | "draft";
  aiGenerated?: boolean;
  languages?: ResumeLanguageOption[];
  activeLocale: string;
  isBusy?: boolean;
  actions?: {
    pdf?: ResumeRenderAction;
    ats?: ResumeRenderAction;
    atsMenu?: ResumeRenderAction[];
  };
};

export type ResumeRenderConfig = {
  templateId: ResumeTemplateId;
  themeId: ResumeThemeId;
  mode: ResumeRenderMode;
  chrome: ResumeRenderChrome;
};

const DEFAULT_RENDERER_LABELS: ResumeRendererLabels = {
  languageSwitcher: "CV language",
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  courses: "Courses",
  personalInfo: "Personal Info",
  skills: "Skills",
  techStack: "Tech stack",
  languages: "Languages",
  interests: "Interests",
  publicBadge: "Public",
  draftBadge: "Draft",
  aiGeneratedBadge: "AI generated",
  pdfAction: "PDF",
  atsAction: "ATS Ready",
  pdfExportError: "PDF export failed.",
  atsUnavailable: "Available after publish",
};

/**
 * Splits a contact value at the points a reader expects a long address to wrap:
 * before the `@` of an e-mail, and after each `/` of a URL. The caller joins the
 * pieces with `<wbr>`, so the browser only uses them when the value does not fit.
 *
 * Deliberately returns pieces rather than inserting a zero-width space: a ZWSP
 * would survive into the PDF's text layer, and that layer is what ATS parsers
 * read an e-mail address out of. On the web `.contact-list dd` adds
 * `overflow-wrap: break-word`, so a piece too wide even for its own line still
 * breaks rather than escaping the card; the PDF has its own fallback in
 * app/lib/pdf/metrics.ts.
 */
export function splitContactValueForWrapping(value: string): string[] {
  return value
    .split(/(?=@)|(?<=\/)/)
    .filter((part) => part.length > 0);
}

export function buildResumeRendererLabels(
  locale: ResumeLocale,
  overrides: Partial<ResumeRendererLabels> = {},
): ResumeRendererLabels {
  const previewLabels = getPreviewLabels(locale);
  const sanitizedOverrides = Object.fromEntries(
    Object.entries(overrides).filter(([, value]) => value !== undefined),
  ) as Partial<ResumeRendererLabels>;

  return {
    ...DEFAULT_RENDERER_LABELS,
    summary: previewLabels.summary,
    experience: previewLabels.experience,
    education: previewLabels.education,
    courses: previewLabels.courses,
    personalInfo: previewLabels.personalInfo,
    skills: previewLabels.skills,
    techStack: previewLabels.techStack,
    languages: previewLabels.languages,
    interests: previewLabels.interests,
    ...sanitizedOverrides,
  };
}

export function buildResumeRenderConfig(input: {
  mode: ResumeRenderMode;
  activeLocale: string;
  chrome?: Partial<ResumeRenderChrome>;
}): ResumeRenderConfig {
  return {
    templateId: DEFAULT_TEMPLATE_ID,
    themeId: DEFAULT_THEME_ID,
    mode: input.mode,
    chrome: {
      visible: true,
      activeLocale: normalizeLocale(input.activeLocale),
      ...input.chrome,
    },
  };
}

export function getResumeHeroRole(resume: ResumeDocument, roleOverride?: string | null): string {
  const trimmedOverride = String(roleOverride || "").trim();
  if (trimmedOverride) {
    return trimmedOverride;
  }

  const defaultSummary = getDefaultSummary(resume.summary);
  const defaultPosition = defaultSummary?.position.trim() || "";
  if (!defaultPosition || defaultPosition.toLowerCase() === "default") {
    return "";
  }

  return defaultPosition;
}
