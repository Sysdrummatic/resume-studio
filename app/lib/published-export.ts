import yaml from "js-yaml";
import type { ResumeDocument } from "./resume-schema";
import { normalizeResumeDocument } from "./resume-schema";
import { applyResumeSelectionToRawDocument, normalizeResumePresetSelection } from "./preset-selection";

export type PublishedExportContent = {
  yamlContent: string;
  resume: ResumeDocument;
};

// ADR 0008 / R09: snapshots store the full Master Resume, so the public view
// and every export surface must go through these helpers. The selection is
// applied on the RAW parsed object (single index domain — see
// applyResumeSelectionToRawDocument) so extension fields the schema doesn't
// know survive in yamlContent, and a snapshot whose selection cannot be
// applied faithfully yields null (surfaced as 404). The document is parsed
// exactly once per request — routes consume `resume` instead of re-parsing
// `yamlContent`.
function selectPublishedRawDocument(yamlContent: string, selection: unknown): Record<string, unknown> | null {
  try {
    return applyResumeSelectionToRawDocument(yaml.load(yamlContent), normalizeResumePresetSelection(selection));
  } catch {
    return null;
  }
}

export function buildPublishedResumeDocument(yamlContent: string, selection: unknown): ResumeDocument | null {
  const selectedRaw = selectPublishedRawDocument(yamlContent, selection);
  return selectedRaw ? normalizeResumeDocument(selectedRaw, "") : null;
}

export function buildPublishedExportContent(yamlContent: string, selection: unknown): PublishedExportContent | null {
  const selectedRaw = selectPublishedRawDocument(yamlContent, selection);
  if (!selectedRaw) {
    return null;
  }
  return {
    yamlContent: yaml.dump(selectedRaw),
    resume: normalizeResumeDocument(selectedRaw, ""),
  };
}
