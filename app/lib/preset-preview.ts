import { normalizeResumeDocument, type ResumeDocument } from "./resume-schema";
import {
  applyResumeSelectionToRawDocument,
  clampResumeSelectionToRawDocument,
  type ResumePresetSelection,
} from "./preset-selection";

// Same raw-domain selection as the public view and exports: the selection
// indexes point at raw YAML arrays, so apply them before normalization.
// The selection is built against the default-locale document; clamp it to the
// previewed document so other language versions render the way publish stores
// them, instead of failing on out-of-range indexes.
export type PresetPreviewResult =
  | { status: "ok"; resume: ResumeDocument }
  // ocv-0172: a language version that has no summary yet (e.g. a freshly
  // added, still-empty locale) is a normal, expected state -- not a failure.
  | { status: "empty" }
  | { status: "error" };

export function buildPresetResumeDocument(yamlContent: string, selection: ResumePresetSelection): PresetPreviewResult {
  if (!yamlContent || !window.jsyaml) return { status: "error" };
  try {
    const rawDocument = window.jsyaml.load(yamlContent);
    if (!rawDocument || typeof rawDocument !== "object" || Array.isArray(rawDocument)) {
      return { status: "error" };
    }
    const clampedSelection = clampResumeSelectionToRawDocument(rawDocument, selection);
    if (!clampedSelection) return { status: "empty" };
    const selectedRaw = applyResumeSelectionToRawDocument(rawDocument, clampedSelection);
    if (!selectedRaw) return { status: "error" };
    const resume = normalizeResumeDocument(selectedRaw, "");
    // ocv-0203: the seeded template (public/data/private/resume-en-template.yaml,
    // via buildDefaultResumeYaml) ships one summary entry with blank text, so a
    // freshly created language version always has a summary *element* — the
    // clamp above never returns null for it. The "empty" state has to be
    // decided on meaningful text, not element presence, or a language nobody
    // has written a word in previews as if it were finished.
    const hasSummaryContent = resume.summary.some((item) => item.position.trim() || item.description.trim());
    if (!hasSummaryContent) return { status: "empty" };
    return { status: "ok", resume };
  } catch {
    return { status: "error" };
  }
}
