import type { ResumeDocument } from "../resume-schema";

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

export function buildPdfFilename(resume: ResumeDocument, publicId: string): string {
  const date = new Date().toISOString().split("T")[0];
  const idSegment = publicId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, PUBLIC_ID_SEGMENT_LENGTH) || "draft";
  return `${slugifyName(resume.name)}-${date}-opencivera-${idSegment}.pdf`;
}
