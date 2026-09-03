import type {
  ResumeContactItem,
  ResumeCourse,
  ResumeDocument,
  ResumeEducation,
  ResumeExperience,
  ResumeSummaryItem,
} from "../resume-schema";
import type { ImportedResumeSections } from "./types";

function isBlank(value: string | null | undefined): boolean {
  return !value || !value.trim();
}

function dropBlank<T>(items: T[], isEmpty: (item: T) => boolean): T[] {
  return items.filter((item) => !isEmpty(item));
}

function mergeContact(current: ResumeContactItem[], imported: ResumeContactItem[]): ResumeContactItem[] {
  const filledLabels = new Set(current.filter((item) => !isBlank(item.value)).map((item) => item.label));
  const additions = imported.filter((item) => !isBlank(item.value) && !filledLabels.has(item.label));
  return [...current, ...additions];
}

function mergeSummary(current: ResumeSummaryItem[], imported: ResumeSummaryItem[]): ResumeSummaryItem[] {
  const kept = dropBlank(current, (item) => isBlank(item.position) && isBlank(item.description));
  const hasDefault = kept.some((item) => item.default);
  // A fresh draft has no default summary yet, so the first imported entry
  // may keep it; any import into a draft that already has one must not —
  // multiple defaults is a state getDefaultSummary() treats as "none set".
  const additions = imported.map((item, index) => ({ ...item, default: item.default && !hasDefault && index === 0 }));
  return [...kept, ...additions];
}

function mergeStringList(current: string[], imported: string[]): string[] {
  const kept = dropBlank(current, isBlank);
  const existing = new Set(kept.map((item) => item.trim().toLowerCase()));
  const additions = imported.filter((item) => !isBlank(item) && !existing.has(item.trim().toLowerCase()));
  return [...kept, ...additions];
}

function mergeExperience(current: ResumeExperience[], imported: ResumeExperience[]): ResumeExperience[] {
  const kept = dropBlank(current, (item) => isBlank(item.company) && isBlank(item.role) && item.highlights.every(isBlank));
  return [...kept, ...imported];
}

function mergeEducation(current: ResumeEducation[], imported: ResumeEducation[]): ResumeEducation[] {
  const kept = dropBlank(current, (item) => isBlank(item.school) && isBlank(item.degree) && isBlank(item.detail));
  return [...kept, ...imported];
}

function mergeByName<T extends { name: string }>(current: T[], imported: T[]): T[] {
  const kept = dropBlank(current, (item) => isBlank(item.name));
  const existing = new Set(kept.map((item) => item.name.trim().toLowerCase()));
  const additions = imported.filter((item) => !isBlank(item.name) && !existing.has(item.name.trim().toLowerCase()));
  return [...kept, ...additions];
}

function mergeCourses(current: ResumeCourse[], imported: ResumeCourse[]): ResumeCourse[] {
  const kept = dropBlank(current, (item) => isBlank(item.name));
  return [...kept, ...imported];
}

/**
 * Adds imported content to the draft instead of replacing it: list fields
 * (experience, education, ...) get the new entries appended after the
 * existing ones (dropping only placeholder-blank rows a fresh draft starts
 * with), and single-value fields (name, contact per label) fill in only
 * where the draft is currently empty. Nothing the user already typed is
 * ever discarded by an import.
 */
export function mergeImportedResume(current: ResumeDocument, imported: ImportedResumeSections): ResumeDocument {
  const next: ResumeDocument = { ...current };

  if (imported.first_name && isBlank(current.first_name)) next.first_name = imported.first_name;
  if (imported.family_name && isBlank(current.family_name)) next.family_name = imported.family_name;
  if (imported.brand_initials && isBlank(current.brand_initials)) next.brand_initials = imported.brand_initials;
  if (imported.gdpr_clause && isBlank(current.gdpr_clause)) next.gdpr_clause = imported.gdpr_clause;

  if (imported.contact) next.contact = mergeContact(current.contact, imported.contact);
  if (imported.summary) next.summary = mergeSummary(current.summary, imported.summary);
  if (imported.experience) next.experience = mergeExperience(current.experience, imported.experience);
  if (imported.education) next.education = mergeEducation(current.education, imported.education);
  if (imported.skills) next.skills = mergeByName(current.skills, imported.skills);
  if (imported.languages) next.languages = mergeByName(current.languages, imported.languages);
  if (imported.courses) next.courses = mergeCourses(current.courses, imported.courses);
  if (imported.interests) next.interests = mergeStringList(current.interests, imported.interests);
  if (imported.tech_stack) next.tech_stack = mergeStringList(current.tech_stack, imported.tech_stack);

  return next;
}
