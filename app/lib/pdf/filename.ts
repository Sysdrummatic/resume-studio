import { resumeFullName, type ResumeDocument } from "../resume-schema";

const PUBLIC_ID_SEGMENT_LENGTH = 14;
const COMBINING_DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

function slugifyName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFKD")
    .replace(COMBINING_DIACRITICS, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "resume";
}

/** `format` tells apart exports sharing an extension, e.g. ATS YAML vs CVasCode YAML. */
export function buildExportFilename(resume: ResumeDocument, publicId: string, extension: string, format?: string): string {
  const date = new Date().toISOString().split("T")[0];
  const idSegment = publicId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, PUBLIC_ID_SEGMENT_LENGTH) || "draft";
  const formatSegment = format ? `-${format}` : "";
  return `${slugifyName(resumeFullName(resume))}-${date}-opencivera-${idSegment}${formatSegment}.${extension}`;
}

export function buildPdfFilename(resume: ResumeDocument, publicId: string): string {
  return buildExportFilename(resume, publicId, "pdf");
}
