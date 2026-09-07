import { extractDocxText, extractPdfText } from "./extract-text";
import { parsePlainTextResume } from "./parse-plain-text";
import { parseYamlCv } from "./parse-yaml-cv";
import type { ImportSourceKind, ResumeImportResult } from "./types";

export function detectSourceKind(filename: string, mimeType: string): ImportSourceKind | null {
  const name = filename.toLowerCase();
  if (mimeType === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    return "docx";
  }
  if (name.endsWith(".yaml") || name.endsWith(".yml") || mimeType === "application/x-yaml" || mimeType === "text/yaml") {
    return "yaml";
  }
  if (name.endsWith(".txt") || mimeType === "text/plain") return "txt";
  return null;
}

/** PDF and DOCX have no structure of their own — both reduce to "extract the
 * text, then run the same plain-text heuristics as a .txt upload". YAML is
 * the only format with real structure, so it gets its own parser. */
export async function parseResumeFile(
  buffer: Buffer,
  sourceKind: ImportSourceKind,
): Promise<ResumeImportResult> {
  switch (sourceKind) {
    case "pdf":
      return parsePlainTextResume(await extractPdfText(buffer), "pdf");
    case "docx":
      return parsePlainTextResume(await extractDocxText(buffer), "docx");
    case "txt":
      return parsePlainTextResume(buffer.toString("utf8"), "txt");
    case "yaml":
      return parseYamlCv(buffer.toString("utf8"));
  }
}

export { EXTRACTED_TEXT_MAX_CHARS } from "./extract-text";
export type { ImportSourceKind, ImportedResumeSections, ResumeImportResult } from "./types";
