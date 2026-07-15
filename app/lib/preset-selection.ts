import type { ResumeDocument } from "./resume-schema";

export type ResumePresetSelection = {
  summary: number[];
  experience: number[];
  education: number[];
  courses: number[];
  skills: number[];
  interests: number[];
  languages: number[];
  tech_stack: number[];
};

export const EMPTY_PRESET_SELECTION: ResumePresetSelection = {
  summary: [],
  experience: [],
  education: [],
  courses: [],
  skills: [],
  interests: [],
  languages: [],
  tech_stack: [],
};

export const PRESET_SELECTION_KEYS = Object.keys(EMPTY_PRESET_SELECTION) as Array<keyof ResumePresetSelection>;

function normalizeIndexList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => Number.parseInt(String(item), 10))
        .filter((item) => Number.isInteger(item) && item >= 0),
    ),
  ).sort((left, right) => left - right);
}

function selectByIndex<T>(items: T[], indexes: number[]): T[] {
  return indexes.map((index) => items[index]).filter((item): item is T => item !== undefined);
}

export function normalizeResumePresetSelection(value: unknown): ResumePresetSelection {
  const source = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return PRESET_SELECTION_KEYS.reduce<ResumePresetSelection>(
    (selection, key) => ({
      ...selection,
      [key]: normalizeIndexList(source[key]),
    }),
    { ...EMPTY_PRESET_SELECTION },
  );
}

export function applyResumePresetSelection(masterDocument: ResumeDocument, selection: ResumePresetSelection): ResumeDocument {
  const selectedSummary = selectByIndex(masterDocument.summary, selection.summary).map((summary, index) => ({
    ...summary,
    default: index === 0,
  }));

  return {
    ...masterDocument,
    summary: selectedSummary,
    experience: selectByIndex(masterDocument.experience, selection.experience),
    education: selectByIndex(masterDocument.education, selection.education),
    courses: selectByIndex(masterDocument.courses, selection.courses),
    skills: selectByIndex(masterDocument.skills, selection.skills),
    interests: selectByIndex(masterDocument.interests, selection.interests),
    languages: selectByIndex(masterDocument.languages, selection.languages),
    tech_stack: selectByIndex(masterDocument.tech_stack, selection.tech_stack),
  };
}
