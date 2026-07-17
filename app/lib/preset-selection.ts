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

function defaultSummaryIndex(items: unknown[]): number {
  const index = items.findIndex((item) => {
    const row = item && typeof item === "object" && !Array.isArray(item) ? (item as Record<string, unknown>) : {};
    return row.default === true || (typeof row.default === "string" && row.default.toLowerCase() === "true");
  });
  return index >= 0 ? index : 0;
}

// Selection indexes are built against one specific document, so a selection
// created on the default-locale document can point past the end of another
// locale's arrays. Clamping keeps only the indexes that exist in the target
// document — it can drop selected entries but never add unselected ones
// (ADR 0008) — and falls back to the document's default summary when the
// selected summary does not exist. Returns null when the document is not an
// object or has no summary entries to satisfy the exactly-one-summary
// publish invariant.
export function clampResumeSelectionToRawDocument(
  rawDocument: unknown,
  selection: ResumePresetSelection,
): ResumePresetSelection | null {
  if (!rawDocument || typeof rawDocument !== "object" || Array.isArray(rawDocument)) {
    return null;
  }

  const source = rawDocument as Record<string, unknown>;
  const clamped: ResumePresetSelection = { ...EMPTY_PRESET_SELECTION };
  for (const key of PRESET_SELECTION_KEYS) {
    const items = Array.isArray(source[key]) ? (source[key] as unknown[]) : [];
    clamped[key] = selection[key].filter((index) => index < items.length);
  }
  if (clamped.summary.length !== 1) {
    const summaryItems = Array.isArray(source.summary) ? (source.summary as unknown[]) : [];
    if (summaryItems.length === 0) {
      return null;
    }
    clamped.summary = [defaultSummaryIndex(summaryItems)];
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
  for (const key of PRESET_SELECTION_KEYS) {
    const items = Array.isArray(source[key]) ? (source[key] as unknown[]) : [];
    if (selection[key].some((index) => index >= items.length)) {
      return null;
    }
    source[key] = selectByIndex(items, selection[key]);
  }
  const selectedSummary = source.summary as unknown[];
  if (selectedSummary.length !== 1) {
    return null;
  }
  source.summary = selectedSummary.map((item, index) =>
    item && typeof item === "object" && !Array.isArray(item) ? { ...(item as Record<string, unknown>), default: index === 0 } : item,
  );
  return source;
}
