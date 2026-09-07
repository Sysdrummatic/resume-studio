import type { ResumeDocument } from "../resume-schema";

export type ImportSourceKind = "pdf" | "docx" | "yaml" | "txt";

/**
 * Only the sections a parser actually found data for are present — the
 * import review step (and the merge on confirm) treats a missing key as
 * "leave this section alone", never as "clear it". See parse-resume-file.ts.
 */
export type ImportedResumeSections = Partial<ResumeDocument>;

export type ResumeImportResult = {
  sourceKind: ImportSourceKind;
  resume: ImportedResumeSections;
  /** Human-readable notes surfaced in the review modal, e.g. "Could not find an education section." */
  warnings: string[];
};
