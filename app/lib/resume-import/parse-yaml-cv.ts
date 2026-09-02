import yaml from "js-yaml";
import {
  normalizeResumeDocument,
  RESUME_REQUIRED_KEYS,
  type ResumeContactItem,
  type ResumeCourse,
  type ResumeEducation,
  type ResumeExperience,
  type ResumeLanguage,
  type ResumeSkill,
} from "../resume-schema";
import type { ImportedResumeSections, ResumeImportResult } from "./types";
import { guessLevelFromText } from "./text-blocks";

// Mirrors the merge-key-bomb defence already used for the account-transfer
// YAML importer (GHSA-h67p-54hq-rp68) — see app/lib/user-data-transfer.ts.
// `maxTotalMergeKeys` isn't in @types/js-yaml's LoadOptions, hence the cast.
const YAML_LOAD_OPTIONS = { maxTotalMergeKeys: 50 } as yaml.LoadOptions;

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
}

/** Reads the first present key from `aliases`, case-sensitively — callers
 * pass every casing variant they want to accept (YAML CVs in the wild don't
 * agree on snake_case vs camelCase). */
function pick(source: Record<string, unknown>, aliases: string[]): unknown {
  for (const key of aliases) {
    if (source[key] !== undefined) return source[key];
  }
  return undefined;
}

function pickText(source: Record<string, unknown>, aliases: string[]): string {
  return asText(pick(source, aliases));
}

function looksLikeOpenCiVeraSchema(source: Record<string, unknown>): boolean {
  const matches = RESUME_REQUIRED_KEYS.filter((key) => key in source).length;
  return matches >= 4;
}

// --- JSON Resume (https://jsonresume.org/schema/) -------------------------
// The most widely used open CV schema with a YAML-friendly shape; its own
// hallmark is a `basics` object plus top-level `work`/`education` arrays.

function looksLikeJsonResume(source: Record<string, unknown>): boolean {
  return asObject(source.basics) !== null || Array.isArray(source.work) || Array.isArray(source.education);
}

function mapJsonResumeWork(items: unknown[]): ResumeExperience[] {
  return items.map((item) => {
    const row = asObject(item) ?? {};
    const start = pickText(row, ["startDate"]);
    const end = pickText(row, ["endDate"]) || (start ? "Present" : "");
    const highlights = asArray(row.highlights).map(asText).filter(Boolean);
    return {
      period: [start, end].filter(Boolean).join(" – "),
      company: pickText(row, ["name", "company"]),
      role: pickText(row, ["position", "title", "role"]),
      highlights: highlights.length > 0 ? highlights : [pickText(row, ["summary"])].filter(Boolean),
    };
  });
}

function mapJsonResumeEducation(items: unknown[]): ResumeEducation[] {
  return items.map((item) => {
    const row = asObject(item) ?? {};
    const start = pickText(row, ["startDate"]);
    const end = pickText(row, ["endDate"]) || (start ? "Present" : "");
    const degree = [pickText(row, ["studyType"]), pickText(row, ["area"])].filter(Boolean).join(" ");
    const score = pickText(row, ["score"]);
    return {
      period: [start, end].filter(Boolean).join(" – "),
      school: pickText(row, ["institution", "school"]),
      degree,
      detail: score ? `Score: ${score}` : "",
    };
  });
}

function mapJsonResumeSkills(items: unknown[]): ResumeSkill[] {
  return items.map((item) => {
    const row = asObject(item) ?? {};
    return { name: pickText(row, ["name"]), level: guessLevelFromText(pickText(row, ["level"])) };
  });
}

function mapJsonResumeLanguages(items: unknown[]): ResumeLanguage[] {
  return items.map((item) => {
    const row = asObject(item) ?? {};
    const level_text = pickText(row, ["fluency", "level"]);
    return { name: pickText(row, ["language", "name"]), level_text, level: guessLevelFromText(level_text) };
  });
}

function mapJsonResumeCertificates(items: unknown[]): ResumeCourse[] {
  return items.map((item) => {
    const row = asObject(item) ?? {};
    const date = pickText(row, ["date"]);
    const year = Number.parseInt(date.slice(0, 4), 10);
    return { name: pickText(row, ["name", "title"]), year: Number.isFinite(year) ? year : 0 };
  });
}

function mapJsonResumeContact(basics: Record<string, unknown>): ResumeContactItem[] {
  const items: ResumeContactItem[] = [];
  const location = asObject(basics.location);
  const city = location ? pickText(location, ["city", "region"]) : "";
  if (city) items.push({ label: "Location", value: city });

  const phone = pickText(basics, ["phone"]);
  if (phone) items.push({ label: "Phone", value: phone, link: `tel:${phone.replace(/[^\d+]/g, "")}` });

  const email = pickText(basics, ["email"]);
  if (email) items.push({ label: "E-mail", value: email, link: `mailto:${email}` });

  const profiles = asArray(basics.profiles);
  const linkedin = profiles.find((profile) => /linkedin/i.test(pickText(asObject(profile) ?? {}, ["network"])));
  const linkedinUrl = linkedin ? pickText(asObject(linkedin) ?? {}, ["url"]) : "";
  if (linkedinUrl) items.push({ label: "LinkedIn", value: linkedinUrl.replace(/^https?:\/\//, ""), link: linkedinUrl });

  const url = pickText(basics, ["url", "website"]);
  if (url) items.push({ label: "Portfolio", value: url.replace(/^https?:\/\//, ""), link: url });

  return items;
}

function mapJsonResume(source: Record<string, unknown>): ResumeImportResult {
  const basics = asObject(source.basics) ?? {};
  const resume: ImportedResumeSections = {};

  const name = pickText(basics, ["name"]);
  if (name) resume.name = name;

  const contact = mapJsonResumeContact(basics);
  if (contact.length > 0) resume.contact = contact;

  const summaryText = pickText(basics, ["summary"]);
  if (summaryText) {
    resume.summary = [{ position: pickText(basics, ["label"]) || "Default", description: summaryText, default: true }];
  }

  const work = mapJsonResumeWork(asArray(source.work));
  if (work.length > 0) resume.experience = work;

  const education = mapJsonResumeEducation(asArray(source.education));
  if (education.length > 0) resume.education = education;

  const skills = mapJsonResumeSkills(asArray(source.skills));
  if (skills.length > 0) resume.skills = skills;

  const languages = mapJsonResumeLanguages(asArray(source.languages));
  if (languages.length > 0) resume.languages = languages;

  const interests = asArray(source.interests).map((item) => pickText(asObject(item) ?? {}, ["name"])).filter(Boolean);
  if (interests.length > 0) resume.interests = interests;

  const certificates = mapJsonResumeCertificates(asArray(source.certificates));
  if (certificates.length > 0) resume.courses = certificates;

  return { sourceKind: "yaml", resume, warnings: ["Recognised this as a JSON Resume-style CV; fields not in that schema were left as-is."] };
}

// --- Generic fallback -------------------------------------------------
// An unrecognised YAML shape: guess the usual field names, case-insensitively,
// via the same alias list a hand-written "my-cv.yaml" is likely to use.

const KEY_ALIASES = {
  name: ["name", "full_name", "fullname", "fullName"],
  email: ["email", "e-mail", "mail"],
  phone: ["phone", "telephone", "mobile"],
  linkedin: ["linkedin", "linkedin_url"],
  website: ["website", "url", "portfolio", "site"],
  location: ["location", "city", "address"],
  summary: ["summary", "about", "objective", "profile"],
  experience: ["experience", "work", "jobs", "employment"],
  education: ["education", "studies"],
  skills: ["skills", "competencies"],
  languages: ["languages"],
  interests: ["interests", "hobbies"],
};

function findKeyCaseInsensitive(source: Record<string, unknown>, aliases: string[]): unknown {
  const lowerAliases = new Set(aliases.map((alias) => alias.toLowerCase()));
  for (const key of Object.keys(source)) {
    if (lowerAliases.has(key.toLowerCase())) return source[key];
  }
  return undefined;
}

function mapGenericExperience(items: unknown[]): ResumeExperience[] {
  return items.map((item) => {
    const row = asObject(item) ?? {};
    const start = asText(findKeyCaseInsensitive(row, ["start", "start_date", "from"]));
    const end = asText(findKeyCaseInsensitive(row, ["end", "end_date", "to"])) || (start ? "Present" : "");
    const highlights = asArray(findKeyCaseInsensitive(row, ["highlights", "achievements", "bullets"])).map(asText).filter(Boolean);
    return {
      period: [start, end].filter(Boolean).join(" – "),
      company: asText(findKeyCaseInsensitive(row, ["company", "employer", "organization"])),
      role: asText(findKeyCaseInsensitive(row, ["role", "title", "position"])),
      highlights,
    };
  });
}

function mapGenericEducation(items: unknown[]): ResumeEducation[] {
  return items.map((item) => {
    const row = asObject(item) ?? {};
    const start = asText(findKeyCaseInsensitive(row, ["start", "start_date", "from"]));
    const end = asText(findKeyCaseInsensitive(row, ["end", "end_date", "to"])) || (start ? "Present" : "");
    return {
      period: [start, end].filter(Boolean).join(" – "),
      school: asText(findKeyCaseInsensitive(row, ["school", "institution", "university"])),
      degree: asText(findKeyCaseInsensitive(row, ["degree", "field", "study"])),
      detail: asText(findKeyCaseInsensitive(row, ["detail", "notes"])),
    };
  });
}

function mapGenericSkills(value: unknown): ResumeSkill[] {
  return asArray(value).map((item) => {
    if (typeof item === "string") return { name: item, level: 3 };
    const row = asObject(item) ?? {};
    return { name: asText(findKeyCaseInsensitive(row, ["name"])), level: 3 };
  });
}

function mapGenericLanguages(value: unknown): ResumeLanguage[] {
  return asArray(value).map((item) => {
    if (typeof item === "string") return { name: item, level_text: "", level: 3 };
    const row = asObject(item) ?? {};
    const level_text = asText(findKeyCaseInsensitive(row, ["level", "fluency", "proficiency"]));
    return { name: asText(findKeyCaseInsensitive(row, ["name", "language"])), level_text, level: guessLevelFromText(level_text) };
  });
}

function mapGenericContact(source: Record<string, unknown>): ResumeContactItem[] {
  const items: ResumeContactItem[] = [];
  const contactBlock = asObject(findKeyCaseInsensitive(source, ["contact", "contacts"])) ?? source;

  const location = asText(findKeyCaseInsensitive(contactBlock, KEY_ALIASES.location));
  if (location) items.push({ label: "Location", value: location });

  const phone = asText(findKeyCaseInsensitive(contactBlock, KEY_ALIASES.phone));
  if (phone) items.push({ label: "Phone", value: phone, link: `tel:${phone.replace(/[^\d+]/g, "")}` });

  const email = asText(findKeyCaseInsensitive(contactBlock, KEY_ALIASES.email));
  if (email) items.push({ label: "E-mail", value: email, link: `mailto:${email}` });

  const linkedin = asText(findKeyCaseInsensitive(contactBlock, KEY_ALIASES.linkedin));
  if (linkedin) items.push({ label: "LinkedIn", value: linkedin.replace(/^https?:\/\//, ""), link: linkedin.startsWith("http") ? linkedin : `https://${linkedin}` });

  const website = asText(findKeyCaseInsensitive(contactBlock, KEY_ALIASES.website));
  if (website) items.push({ label: "Portfolio", value: website.replace(/^https?:\/\//, ""), link: website.startsWith("http") ? website : `https://${website}` });

  return items;
}

function parseGenericYamlCv(source: Record<string, unknown>): ResumeImportResult {
  const resume: ImportedResumeSections = {};
  const warnings = ["This YAML did not match a known CV schema — fields were matched by common key names on a best-effort basis."];

  const name = asText(findKeyCaseInsensitive(source, KEY_ALIASES.name));
  if (name) resume.name = name;

  const contact = mapGenericContact(source);
  if (contact.length > 0) resume.contact = contact;

  const summary = asText(findKeyCaseInsensitive(source, KEY_ALIASES.summary));
  if (summary) resume.summary = [{ position: "Default", description: summary, default: true }];

  const experience = mapGenericExperience(asArray(findKeyCaseInsensitive(source, KEY_ALIASES.experience)));
  if (experience.length > 0) resume.experience = experience;

  const education = mapGenericEducation(asArray(findKeyCaseInsensitive(source, KEY_ALIASES.education)));
  if (education.length > 0) resume.education = education;

  const skills = mapGenericSkills(findKeyCaseInsensitive(source, KEY_ALIASES.skills));
  if (skills.length > 0) resume.skills = skills;

  const languages = mapGenericLanguages(findKeyCaseInsensitive(source, KEY_ALIASES.languages));
  if (languages.length > 0) resume.languages = languages;

  const interests = asArray(findKeyCaseInsensitive(source, KEY_ALIASES.interests)).map(asText).filter(Boolean);
  if (interests.length > 0) resume.interests = interests;

  if (Object.keys(resume).length === 0) {
    warnings.push("Could not find any recognisable CV fields in this file.");
  }

  return { sourceKind: "yaml", resume, warnings };
}

export function parseYamlCv(rawYaml: string): ResumeImportResult {
  let parsed: unknown;
  try {
    parsed = yaml.load(rawYaml, YAML_LOAD_OPTIONS);
  } catch {
    return { sourceKind: "yaml", resume: {}, warnings: ["This file is not valid YAML."] };
  }

  const source = asObject(parsed);
  if (!source) {
    return { sourceKind: "yaml", resume: {}, warnings: ["This YAML file does not contain a CV record."] };
  }

  if (looksLikeOpenCiVeraSchema(source)) {
    return { sourceKind: "yaml", resume: normalizeResumeDocument(source), warnings: [] };
  }

  if (looksLikeJsonResume(source)) {
    return mapJsonResume(source);
  }

  return parseGenericYamlCv(source);
}
