import yaml from "js-yaml";
import type { ResumeDocument } from "./resume-schema";
import { normalizeResumeDocument } from "./resume-schema";
import { applyResumeSelectionToRawDocument, normalizeResumePresetSelection, PRESET_SELECTION_KEYS } from "./preset-selection";

export type PublishedExportContent = {
  yamlContent: string;
  resume: ResumeDocument;
};

type SelectedPublishedDocument = {
  selectedRaw: Record<string, unknown>;
  resume: ResumeDocument;
};

function stripPrivateLinkage(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripPrivateLinkage);
  if (!value || typeof value !== "object") return value;
  const source = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(source)
      .filter(([key]) => key !== "entry_id" && key !== "__ocv")
      .map(([key, item]) => [key, stripPrivateLinkage(item)]),
  );
}

function selectedRecordCount(key: (typeof PRESET_SELECTION_KEYS)[number], value: unknown): number | null {
  if (key === "summary" && typeof value === "string") {
    return value.trim() ? 1 : null;
  }
  return Array.isArray(value) ? value.length : null;
}

// ADR 0008 / R09: snapshots store the full Master Resume, so the public view
// and every export surface must go through these helpers. The selection is
// applied on the RAW parsed object (single index domain — see
// applyResumeSelectionToRawDocument) so extension fields the schema doesn't
// know survive in yamlContent, and a snapshot whose selection cannot be
// applied faithfully yields null (surfaced as 404). The document is parsed
// exactly once per request — routes consume `resume` instead of re-parsing
// `yamlContent`.
function selectPublishedDocument(yamlContent: string, selection: unknown): SelectedPublishedDocument | null {
  try {
    const selectedRaw = applyResumeSelectionToRawDocument(yaml.load(yamlContent), normalizeResumePresetSelection(selection));
    if (!selectedRaw) {
      return null;
    }
    const publicRaw = stripPrivateLinkage(selectedRaw) as Record<string, unknown>;
    const resume = normalizeResumeDocument(publicRaw, "");
    // Every selected record must survive normalization: a selected item the
    // schema drops (empty experience row, non-object summary) would make the
    // rendered document diverge from the exported raw yaml — reject instead.
    for (const key of PRESET_SELECTION_KEYS) {
      const rawRecordCount = selectedRecordCount(key, publicRaw[key]);
      if (rawRecordCount === null || resume[key].length !== rawRecordCount) {
        return null;
      }
    }
    return { selectedRaw: publicRaw, resume };
  } catch {
    return null;
  }
}

export function buildPublishedResumeDocument(yamlContent: string, selection: unknown): ResumeDocument | null {
  return selectPublishedDocument(yamlContent, selection)?.resume ?? null;
}

export function buildPublishedExportContent(yamlContent: string, selection: unknown): PublishedExportContent | null {
  const selected = selectPublishedDocument(yamlContent, selection);
  if (!selected) {
    return null;
  }
  return {
    yamlContent: yaml.dump(selected.selectedRaw),
    resume: selected.resume,
  };
}
