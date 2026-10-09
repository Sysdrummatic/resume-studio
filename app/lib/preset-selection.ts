import { normalizeResumeDocument } from "./resume-schema";

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

function toIndex(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 0 ? value : null;
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }
  return null;
}

function normalizeIndexList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(toIndex).filter((item): item is number => item !== null))).sort(
    (left, right) => left - right,
  );
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

// Legacy documents store summary as plain text (normalizeSummaryItems renders
// it as one default summary entry), so the selection domain treats it as a
// virtual one-element array instead of zero items.
function rawSelectionItems(source: Record<string, unknown>, key: keyof ResumePresetSelection): unknown[] {
  const value = source[key];
  if (Array.isArray(value)) return value;
  if (key === "summary" && typeof value === "string" && value.trim()) return [value];
  return [];
}

// normalizeResumeDocument is the single source of truth for what renders; a
// summary also needs text (an empty entry carrying `default: true` does not count).
export function isRenderableSelectionItem(
  key: keyof ResumePresetSelection,
  item: unknown,
  options: { translation?: boolean } = {},
): boolean {
  if (key === "summary") {
    const normalized = normalizeResumeDocument({ summary: [item] }).summary[0];
    return Boolean(normalized && (normalized.position || normalized.description));
  }
  const normalized = normalizeResumeDocument({ [key]: [item] });
  const entries = normalized[key] as unknown[];
  if (entries.length === 0) return false;
  if (!options.translation || !item || typeof item !== "object" || Array.isArray(item) || !(item as Record<string, unknown>).entry_id) {
    return true;
  }
  if (key === "experience") return normalized.experience.some((row) => Boolean(row.role || row.highlights.length));
  if (key === "education") return normalized.education.some((row) => Boolean(row.degree || row.detail));
  if (key === "courses") return normalized.courses.some((row) => Boolean(row.name));
  return true;
}

export function omitBlankLinkedTranslationSlots<T extends object>(document: T): T {
  const source = document as Record<string, unknown>;
  const visible: Record<string, unknown> = { ...source };
  for (const key of PRESET_SELECTION_KEYS) {
    if (!Array.isArray(source[key])) continue;
    visible[key] = source[key].filter((item: unknown) => {
      if (key === "summary") return isRenderableSelectionItem(key, item);
      if (key === "tech_stack" || key === "interests") return isRenderableSelectionItem(key, item);
      const linked = item && typeof item === "object" && !Array.isArray(item) && Boolean((item as Record<string, unknown>).entry_id);
      return !linked || isRenderableSelectionItem(key, item, { translation: true });
    });
  }
  return visible as T;
}

// Selection indexes are built against one specific document, so a selection
// created on the default-locale document can point past the end of another
// locale's arrays. Clamping keeps only the indexes that exist in the target
// document — it can drop selected entries but never add unselected ones
// (ADR 0008). Returns null when the document is not an object or its selected
// summary cannot satisfy the exactly-one-summary publish invariant.
export function clampResumeSelectionToRawDocument(
  rawDocument: unknown,
  selection: ResumePresetSelection,
  options: { translation?: boolean } = {},
): ResumePresetSelection | null {
  if (!rawDocument || typeof rawDocument !== "object" || Array.isArray(rawDocument)) {
    return null;
  }

  const source = rawDocument as Record<string, unknown>;
  const clamped: ResumePresetSelection = { ...EMPTY_PRESET_SELECTION };
  // Translation templates retain neutral fields in blank linked slots, so
  // translation-aware selection must omit them even though normalizing the
  // row alone would otherwise render company/period, school or year.
  for (const key of PRESET_SELECTION_KEYS) {
    const items = rawSelectionItems(source, key);
    clamped[key] = selection[key].filter((index) =>
      index < items.length && (key === "summary" && typeof source.summary === "string"
        ? Boolean(source.summary.trim())
        : isRenderableSelectionItem(key, items[index], options)));
  }
  if (clamped.summary.length !== 1) {
    return null;
  }
  return clamped;
}

// Selection indexes are RAW-domain: the editor builds them against the raw
// parsed YAML arrays (dashboard buildPresetOptions), before any normalization
// drops empty/invalid records. Every consumer (public view, dashboard preview,
// all exports) must apply the selection on the raw object and only then
// normalize — normalizing first shifts the indexes and can expose entries the
// user never saw as selected. Returns null when the selection cannot be
// applied faithfully: non-object document, any index out of range, or a
// selected-summary count other than exactly one (the publish invariant).
export function applyResumeSelectionToRawDocument(rawDocument: unknown, selection: ResumePresetSelection): Record<string, unknown> | null {
  if (!rawDocument || typeof rawDocument !== "object" || Array.isArray(rawDocument)) {
    return null;
  }

  const source: Record<string, unknown> = { ...(rawDocument as Record<string, unknown>) };
  const summaryIsPlainText = !Array.isArray(source.summary) && rawSelectionItems(source, "summary").length === 1;
  for (const key of PRESET_SELECTION_KEYS) {
    const items = rawSelectionItems(source, key);
    if (selection[key].some((index) => index >= items.length)) {
      return null;
    }
    if (key === "summary" && summaryIsPlainText) {
      // Keep the plain-text summary verbatim; normalization renders it as the
      // single default summary entry.
      if (selection.summary.length !== 1) {
        return null;
      }
      continue;
    }
    source[key] = selectByIndex(items, selection[key]);
  }
  if (!summaryIsPlainText) {
    const selectedSummary = source.summary as unknown[];
    if (selectedSummary.length !== 1) {
      return null;
    }
    source.summary = selectedSummary.map((item, index) =>
      item && typeof item === "object" && !Array.isArray(item) ? { ...(item as Record<string, unknown>), default: index === 0 } : item,
    );
  }
  return source;
}
