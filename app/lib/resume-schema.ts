import { splitProfileName } from "./profile-name";

export type ResumeContactItem = {
  label: string;
  value: string;
  link?: string;
};

export type ResumeSummaryItem = {
  position: string;
  description: string;
  default: boolean;
};

export type ResumeQrCode = {
  label: string;
  image: string;
  size: number;
};

export type ResumeSkill = {
  name: string;
  level: number;
};

export type ResumeLanguage = {
  name: string;
  level_text: string;
  level: number;
};

export type ResumeExperience = {
  period: string;
  company: string;
  role: string;
  highlights: string[];
};

export type ResumeEducation = {
  period: string;
  school: string;
  degree: string;
  detail: string;
};

export type ResumeCourse = {
  year: number;
  name: string;
};

export type ResumeDocument = {
  brand_initials: string;
  first_name: string;
  family_name: string;
  summary: ResumeSummaryItem[];
  contact: ResumeContactItem[];
  qr_codes: ResumeQrCode[];
  skills: ResumeSkill[];
  tech_stack: string[];
  languages: ResumeLanguage[];
  interests: string[];
  experience: ResumeExperience[];
  education: ResumeEducation[];
  courses: ResumeCourse[];
  /**
   * Free text, rendered verbatim as a small footer on the CV. Common on the
   * Polish job market, usually left empty for English CVs — the editor offers
   * a one-click standard PL wording, but this is not an enum: a cleared value
   * must stay cleared, never re-defaulted on reload.
   */
  gdpr_clause: string;
};

export type ResumeRevisionItem = {
  id: string;
  revision_number: number;
  change_note: string | null;
  created_at: string;
  created_by: string | null;
};

export type ResumeLocale = string;

export const RESUME_REQUIRED_KEYS: Array<keyof ResumeDocument> = [
  "brand_initials",
  "first_name",
  "family_name",

  "summary",
  "contact",
  "qr_codes",
  "skills",
  "tech_stack",
  "languages",
  "interests",
  "experience",
  "education",
  "courses",
  "gdpr_clause",
];

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asInt(value: unknown, fallback = 0): number {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampLevel(value: unknown, fallback = 3): number {
  return Math.max(1, Math.min(5, asInt(value, fallback)));
}

// Initials come from the first letter of the first name and the first letter
// of the first word of the family name, so a compound surname ("Kowalska
// Nowak") only ever contributes its first term.
export function initialsFromNameParts(firstName: string, familyName: string): string {
  const letters = (value: string) => asText(value).replace(/[^a-zA-Z]/g, "");
  const firstInitial = letters(firstName).slice(0, 1);
  const familyFirstWord = asText(familyName).split(/\s+/).filter(Boolean)[0] || "";
  const familyInitial = letters(familyFirstWord).slice(0, 1);
  if (firstInitial && familyInitial) return `${firstInitial}${familyInitial}`.toUpperCase();
  if (firstInitial) return letters(firstName).slice(0, 2).toUpperCase();
  return familyInitial.toUpperCase();
}

export function defaultResumeDocument(fullName = ""): ResumeDocument {
  const { firstName, lastName } = splitProfileName(fullName);
  return {
    brand_initials: initialsFromNameParts(firstName, lastName),
    first_name: firstName,
    family_name: lastName,
    summary: [{ position: "", description: "", default: true }],
    contact: [
      { label: "Location", value: "" },
      { label: "Phone", value: "", link: "" },
      { label: "E-mail", value: "", link: "" },
      { label: "LinkedIn", value: "", link: "" },
      { label: "Portfolio", value: "", link: "" },
    ],
    qr_codes: [],
    skills: [{ name: "", level: 3 }],
    tech_stack: [""],
    languages: [{ name: "", level_text: "", level: 3 }],
    interests: [""],
    experience: [{ period: "", company: "", role: "", highlights: [""] }],
    education: [{ period: "", school: "", degree: "", detail: "" }],
    courses: [{ year: 0, name: "" }],
    gdpr_clause: "",
  };
}

export function resumeFullName(doc: Pick<ResumeDocument, "first_name" | "family_name">): string {
  return [doc.first_name, doc.family_name].map(asText).filter(Boolean).join(" ");
}

/**
 * Upgrades a raw, still-parsed YAML object that predates the first/family
 * name split (only a legacy `name` key) into the new shape, in place of the
 * `name` key — preserving every other field verbatim, including anything the
 * schema doesn't know about. Used at write time (publish/draft) so a
 * never-resaved legacy document doesn't fail RESUME_REQUIRED_KEYS validation
 * the first time its owner saves again; normalizeResumeDocument() covers the
 * read path the same way for in-memory use.
 */
export function migrateLegacyResumeYamlFields(source: Record<string, unknown>): Record<string, unknown> {
  if (typeof source.first_name === "string" || typeof source.family_name === "string") {
    return source;
  }
  if (typeof source.name !== "string") {
    return source;
  }
  const { firstName, lastName } = splitProfileName(source.name);
  const rest = Object.fromEntries(Object.entries(source).filter(([key]) => key !== "name"));
  return { ...rest, first_name: firstName, family_name: lastName };
}

export function normalizeLocale(value: unknown): ResumeLocale {
  const normalized = String(value ?? "en")
    .trim()
    .toLowerCase()
    .split("-")[0];
  return /^[a-z]{2}$/.test(normalized) ? normalized : "en";
}

export function normalizeResumeDocument(value: unknown, fallbackName = ""): ResumeDocument {
  const source = asObject(value);
  const fallback = defaultResumeDocument(fallbackName);

  let firstName = asText(source.first_name);
  let familyName = asText(source.family_name);
  if (!firstName && !familyName && typeof source.name === "string") {
    // Legacy documents predating the first/family name split carried a
    // single `name` field — best-effort split it on first read so old data
    // keeps working without a backfill migration.
    const legacy = splitProfileName(source.name);
    firstName = legacy.firstName;
    familyName = legacy.lastName;
  }
  if (!firstName && !familyName) {
    firstName = fallback.first_name || "New User";
    familyName = fallback.family_name;
  }

  return {
    brand_initials: asText(source.brand_initials) || initialsFromNameParts(firstName, familyName),
    first_name: firstName,
    family_name: familyName,
    summary: normalizeSummaryItems(source.summary),
    contact: asArray(source.contact)
      .map((item) => {
        const row = asObject(item);
        return {
          label: asText(row.label),
          value: asText(row.value),
          link: asText(row.link) || undefined,
        };
      })
      .filter((row) => row.label && row.value),
    qr_codes: asArray(source.qr_codes)
      .map((item) => {
        const row = asObject(item);
        return {
          label: asText(row.label),
          image: asText(row.image),
          size: Math.max(1, asInt(row.size, 130)),
        };
      })
      .filter((row) => row.label || row.image),
    skills: asArray(source.skills)
      .map((item) => {
        const row = asObject(item);
        if (typeof item === "string") {
          return { name: asText(item), level: 3 };
        }
        return {
          name: asText(row.name),
          level: clampLevel(row.level, 3),
        };
      })
      .filter((row) => row.name),
    tech_stack: asArray(source.tech_stack).map(asText).filter(Boolean),
    languages: asArray(source.languages)
      .map((item) => {
        if (typeof item === "string") {
          return { name: asText(item), level_text: "", level: 3 };
        }
        const row = asObject(item);
        return {
          name: asText(row.name),
          level_text: asText(row.level_text),
          level: clampLevel(row.level, 3),
        };
      })
      .filter((row) => row.name),
    interests: asArray(source.interests).map(asText).filter(Boolean),
    experience: asArray(source.experience)
      .map((item) => {
        if (typeof item === "string") {
          return { period: "", company: asText(item), role: "", highlights: [] };
        }
        const row = asObject(item);
        return {
          period: asText(row.period),
          company: asText(row.company),
          role: asText(row.role),
          highlights: asArray(row.highlights).map(asText).filter(Boolean),
        };
      })
      .filter((row) => row.period || row.company || row.role || row.highlights.length > 0),
    education: asArray(source.education)
      .map((item) => {
        if (typeof item === "string") {
          return { period: "", school: asText(item), degree: "", detail: "" };
        }
        const row = asObject(item);
        return {
          period: asText(row.period),
          school: asText(row.school),
          degree: asText(row.degree),
          detail: asText(row.detail),
        };
      })
      .filter((row) => row.period || row.school || row.degree || row.detail),
    courses: asArray(source.courses)
      .map((item) => {
        if (typeof item === "string") {
          return { year: 0, name: asText(item) };
        }
        const row = asObject(item);
        return {
          year: Math.max(0, asInt(row.year, 0)),
          name: asText(row.name),
        };
      })
      .filter((row) => row.name),
    gdpr_clause: asText(source.gdpr_clause),
  };
}

function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.trim().toLowerCase() === "true";
  return false;
}

function normalizeSummaryItems(value: unknown): ResumeSummaryItem[] {
  if (typeof value === "string") {
    const description = asText(value);
    return description ? [{ position: "Default", description, default: true }] : [];
  }

  return asArray(value)
    .map((item) => {
      const row = asObject(item);
      return {
        position: asText(row.position),
        description: asText(row.description),
        default: asBoolean(row.default),
      };
    })
    .filter((row) => row.position || row.description || row.default);
}

export function getDefaultSummary(summary: ResumeSummaryItem[]): ResumeSummaryItem | null {
  const defaults = summary.filter((item) => item.default);
  return defaults.length === 1 ? defaults[0] : null;
}

const RESUME_ARRAY_KEYS = new Set<keyof ResumeDocument>([
  "summary",
  "contact",
  "qr_codes",
  "skills",
  "tech_stack",
  "languages",
  "interests",
  "experience",
  "education",
  "courses",
]);

export function validateResumeDocument(value: unknown): { valid: boolean; errors: string[] } {
  const source = asObject(value);
  const errors: string[] = [];

  RESUME_REQUIRED_KEYS.forEach((key) => {
    if (!(key in source)) {
      errors.push(`Missing required key "${key}".`);
      return;
    }
    const valueAtKey = source[key];
    const shouldBeArray = RESUME_ARRAY_KEYS.has(key);
    if (shouldBeArray && !Array.isArray(valueAtKey)) {
      errors.push(`Key "${key}" must be an array.`);
    }
    if (!shouldBeArray && typeof valueAtKey !== "string") {
      errors.push(`Key "${key}" must be a string.`);
    }
  });

  if (!asText(source.first_name) && !asText(source.family_name)) {
    errors.push('Field "first_name" or "family_name" must not be empty.');
  }

  asArray(source.summary).forEach((item, index) => {
    const row = asObject(item);
    if (typeof row.position !== "string") {
      errors.push(`summary[${index}].position must be a string.`);
    }
    if (typeof row.description !== "string") {
      errors.push(`summary[${index}].description must be a string.`);
    }
    if (typeof row.default !== "boolean" && typeof row.default !== "string") {
      errors.push(`summary[${index}].default must be a boolean or string boolean.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

export type ResumePreviewLabels = {
  summary: string;
  experience: string;
  education: string;
  courses: string;
  personalInfo: string;
  skills: string;
  techStack: string;
  languages: string;
  interests: string;
};

export const PREVIEW_LABELS: Record<string, ResumePreviewLabels> = {
  en: {
    summary: "Summary",
    experience: "Experience",
    education: "Education",
    courses: "Courses",
    personalInfo: "Personal Info",
    skills: "Skills",
    techStack: "Tech stack",
    languages: "Languages",
    interests: "Interests",
  },
  pl: {
    summary: "Podsumowanie",
    experience: "Doswiadczenie",
    education: "Edukacja",
    courses: "Kursy",
    personalInfo: "Dane osobowe",
    skills: "Umiejetnosci",
    techStack: "Stack technologiczny",
    languages: "Jezyki",
    interests: "Zainteresowania",
  },
};

export function getPreviewLabels(locale: ResumeLocale): ResumePreviewLabels {
  return PREVIEW_LABELS[normalizeLocale(locale)] || PREVIEW_LABELS.en;
}
