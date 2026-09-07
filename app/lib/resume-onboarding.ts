import type { ResumePresetSelection } from "./preset-selection";
import { normalizeResumeDocument, type ResumeDocument } from "./resume-schema";

export const ONBOARDING_SECTIONS = [
  "personal",
  "summary",
  "experience",
  "education",
  "skills",
  "languages",
  "courses",
  "interests",
  "tech-stack",
  "qr-codes",
  "gdpr"
] as const;
export const ONBOARDING_REVIEW_STEP = ONBOARDING_SECTIONS.length + 2;
export const ONBOARDING_PUBLISH_STEP = ONBOARDING_REVIEW_STEP + 1;

export type OnboardingState = {
  status: "pending" | "active" | "paused" | "completed";
  step: number;
  locale: string;
  method: "scratch" | "import";
  ui_language: "en" | "pl";
  first_preset_id: string | null;
  imported: boolean;
};

export type OnboardingProgress = Pick<
  OnboardingState,
  "step" | "locale" | "method" | "ui_language" | "imported"
> & { status: "active" | "paused" };

export function parseOnboardingProgress(value: unknown): OnboardingProgress | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (
    !Number.isInteger(row.step) ||
    Number(row.step) < 0 ||
    Number(row.step) > ONBOARDING_PUBLISH_STEP ||
    typeof row.locale !== "string" ||
    !/^[a-z]{2}$/.test(row.locale) ||
    (row.status !== "active" && row.status !== "paused") ||
    (row.method !== "scratch" && row.method !== "import") ||
    typeof row.imported !== "boolean" ||
    (row.ui_language !== "en" && row.ui_language !== "pl")
  )
    return null;
  return {
    step: Number(row.step),
    locale: row.locale,
    status: row.status,
    method: row.method,
    ui_language: row.ui_language,
    imported: row.imported
  };
}

export function shouldStartOnboarding(state: OnboardingState | null): boolean {
  return state?.status === "pending";
}

type RawArraySection = Exclude<keyof ResumeDocument, "summary" | "first_name" | "family_name" | "brand_initials" | "contact" | "qr_codes" | "gdpr_clause">;

// Selection indexes are raw-domain (see applyResumeSelectionToRawDocument):
// they must line up with the RAW yaml array the publish pipeline filters,
// not the already-filtered ResumeDocument. Probing each raw item alone
// through normalizeResumeDocument reuses its own filter/meaningful rules as
// the single source of truth instead of duplicating them here, and stays
// correct even when called with an already-normalized document (normalizing
// a meaningful item again is a no-op, so every index still comes back
// meaningful) — the pattern the in-editor preview relies on.
function isMeaningfulRawItem(section: RawArraySection, item: unknown): boolean {
  return (normalizeResumeDocument({ [section]: [item] })[section] as unknown[]).length > 0;
}

// A summary entry only counts as meaningful when it has actual text — an
// empty entry that merely carries `default: true` must not out-rank a real,
// filled-in one.
function rawSummaryIndex(source: Record<string, unknown>): number {
  if (typeof source.summary === "string") {
    return normalizeResumeDocument({ summary: source.summary }).summary.length > 0 ? 0 : -1;
  }
  const items = Array.isArray(source.summary) ? source.summary : [];
  const normalized = items.map((item) => normalizeResumeDocument({ summary: [item] }).summary[0] ?? null);
  const hasText = (item: (typeof normalized)[number]) => Boolean(item && (item.position || item.description));
  const defaultIndex = normalized.findIndex((item) => item?.default && hasText(item));
  return defaultIndex >= 0 ? defaultIndex : normalized.findIndex(hasText);
}

export function firstCvSelection(rawDocument: unknown): ResumePresetSelection {
  const source: Record<string, unknown> =
    rawDocument && typeof rawDocument === "object" && !Array.isArray(rawDocument)
      ? (rawDocument as Record<string, unknown>)
      : {};
  const arrayOf = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
  const indexes = (section: RawArraySection, items: unknown[]) =>
    items.flatMap((item, index) => (isMeaningfulRawItem(section, item) ? [index] : []));
  const summaryIndex = rawSummaryIndex(source);
  return {
    summary: summaryIndex >= 0 ? [summaryIndex] : [],
    experience: indexes("experience", arrayOf(source.experience)),
    education: indexes("education", arrayOf(source.education)),
    courses: indexes("courses", arrayOf(source.courses)),
    skills: indexes("skills", arrayOf(source.skills)),
    languages: indexes("languages", arrayOf(source.languages)),
    interests: indexes("interests", arrayOf(source.interests)),
    tech_stack: indexes("tech_stack", arrayOf(source.tech_stack))
  };
}

export function isFirstCvReady(resume: ResumeDocument): boolean {
  return Boolean(
    (resume.first_name.trim() || resume.family_name.trim()) &&
    resume.summary.some((item) => item.position.trim() || item.description.trim())
  );
}
