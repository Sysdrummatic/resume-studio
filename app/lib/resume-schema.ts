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
  detail: string;
};

export type ResumeCourse = {
  year: number;
  name: string;
};

export type ResumeDocument = {
  brand_initials: string;
  name: string;
  role: string;
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
};

export type ResumeRevisionItem = {
  id: string;
  revision_number: number;
  change_note: string | null;
  created_at: string;
  created_by: string | null;
};

export type ResumeLocale = "en" | "pl";

export const RESUME_REQUIRED_KEYS: Array<keyof ResumeDocument> = [
  "brand_initials",
  "name",
  "role",
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

function initialsFromName(name: string): string {
  const words = asText(name)
    .split(/\s+/)
    .map((word) => word.replace(/[^a-zA-Z]/g, ""))
    .filter(Boolean);

  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function defaultResumeDocument(name = ""): ResumeDocument {
  const safeName = asText(name);
  return {
    brand_initials: initialsFromName(safeName),
    name: safeName,
    role: "",
    summary: [],
    contact: [],
    qr_codes: [],
    skills: [],
    tech_stack: [],
    languages: [],
    interests: [],
    experience: [],
    education: [],
    courses: [],
  };
}

export function normalizeLocale(value: unknown): ResumeLocale {
  const normalized = String(value ?? "en")
    .trim()
    .toLowerCase()
    .split("-")[0];
  return normalized === "pl" ? "pl" : "en";
}

export function normalizeResumeDocument(value: unknown, fallbackName = ""): ResumeDocument {
  const source = asObject(value);
  const fallback = defaultResumeDocument(fallbackName);

  const name = asText(source.name) || fallback.name || "New User";
  return {
    brand_initials: asText(source.brand_initials) || initialsFromName(name),
    name,
    role: asText(source.role),
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
          return { period: "", school: asText(item), detail: "" };
        }
        const row = asObject(item);
        return {
          period: asText(row.period),
          school: asText(row.school),
          detail: asText(row.detail),
        };
      })
      .filter((row) => row.period || row.school || row.detail),
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

export function validateResumeDocument(value: unknown): { valid: boolean; errors: string[] } {
  const source = asObject(value);
  const errors: string[] = [];

  RESUME_REQUIRED_KEYS.forEach((key) => {
    if (!(key in source)) {
      errors.push(`Missing required key "${key}".`);
      return;
    }
    const valueAtKey = source[key];
    const shouldBeArray =
      key === "summary" ||
      key === "contact" ||
      key === "qr_codes" ||
      key === "skills" ||
      key === "tech_stack" ||
      key === "languages" ||
      key === "interests" ||
      key === "experience" ||
      key === "education" ||
      key === "courses";
    if (shouldBeArray && !Array.isArray(valueAtKey)) {
      errors.push(`Key "${key}" must be an array.`);
    }
    if (!shouldBeArray && typeof valueAtKey !== "string") {
      errors.push(`Key "${key}" must be a string.`);
    }
  });

  if (!asText(source.name)) {
    errors.push('Field "name" must not be empty.');
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

export const PREVIEW_LABELS: Record<
  ResumeLocale,
  {
    summary: string;
    experience: string;
    education: string;
    courses: string;
    personalInfo: string;
    skills: string;
    techStack: string;
    languages: string;
    interests: string;
  }
> = {
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
