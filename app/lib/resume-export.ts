import yaml from "js-yaml";
import { resumeFullName, type ResumeDocument } from "./resume-schema";
import {
  ATS_DATE_OPEN_END,
  ATS_PERIOD_OPEN_TOKENS,
  ATS_SECTION_HEADERS,
  ATS_STRIP_SECTIONS,
  ATS_SUMMARY_POSITION_NOISE,
} from "./ats-export-rules";

type PublicExportPath = {
  personSlug: string;
  publicId: string;
};

type PublishedResumeExportUrls = {
  publicUrl: string;
  textUrl: string;
  pdfUrl: string;
  yamlUrl: string;
  cvacUrl: string;
};

const PRESENT_TOKENS = new Set<string>(ATS_PERIOD_OPEN_TOKENS);
const SUMMARY_POSITION_NOISE = new Set<string>(ATS_SUMMARY_POSITION_NOISE);

function isSummaryPositionNoise(position: string): boolean {
  return SUMMARY_POSITION_NOISE.has(position.trim().toLowerCase());
}

function formatDateToken(token: string): string {
  const trimmed = token.trim();
  if (!trimmed) {
    return "";
  }
  if (PRESENT_TOKENS.has(trimmed.toLowerCase())) {
    return ATS_DATE_OPEN_END;
  }
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (isoMatch) {
    return `${isoMatch[2]}/${isoMatch[1]}`;
  }
  return trimmed;
}

function formatPeriodForAts(period: string): string {
  const parts = period.split(/\s+[–—-]\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "";
  }
  return parts.map(formatDateToken).join(" – ");
}

function getAtsSummary(doc: ResumeDocument): string {
  const entry = doc.summary.find((item) => item.description.trim());
  return entry ? entry.description.trim() : "";
}

function getAtsSkills(doc: ResumeDocument): string[] {
  return [...doc.skills.map((item) => item.name), ...doc.tech_stack].map((item) => item.trim()).filter(Boolean);
}

function wrapText(text: string, maxLength = 88): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [""];
  }

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

export function parseCanonicalPublicPath(path: string | null | undefined): PublicExportPath | null {
  if (!path) {
    return null;
  }

  const trimmed = path.trim();
  const match = trimmed.match(/^\/([^/]+)\/([^/?#]+)$/);
  if (!match) {
    return null;
  }

  return {
    personSlug: decodeURIComponent(match[1]),
    publicId: decodeURIComponent(match[2]),
  };
}

export function buildPublishedResumeExportUrls(
  canonicalPublicPath: string | null | undefined,
  locale: string,
): PublishedResumeExportUrls | null {
  const exportPath = parseCanonicalPublicPath(canonicalPublicPath);
  if (!exportPath || !canonicalPublicPath) {
    return null;
  }

  const encodedPersonSlug = encodeURIComponent(exportPath.personSlug);
  const encodedPublicId = encodeURIComponent(exportPath.publicId);
  const encodedLocale = encodeURIComponent(locale);

  const query = `personSlug=${encodedPersonSlug}&publicId=${encodedPublicId}&lang=${encodedLocale}`;

  return {
    publicUrl: canonicalPublicPath,
    textUrl: `/api/resume/export/text?${query}`,
    pdfUrl: `/api/resume/export/pdf?${query}`,
    yamlUrl: `/api/resume/export/yaml?${query}`,
    cvacUrl: `/api/resume/export/cvac?${query}`,
  };
}

export function convertResumeToPlainText(doc: ResumeDocument): string {
  const sections: string[] = [];

  const header: string[] = [resumeFullName(doc).toUpperCase()];
  const contactLine = doc.contact.map((item) => item.value).filter(Boolean).join(" | ");
  if (contactLine) {
    header.push(contactLine);
  }
  sections.push(header.join("\n"));

  const summary = getAtsSummary(doc);
  if (summary) {
    sections.push([ATS_SECTION_HEADERS.summary, wrapText(summary).join("\n")].join("\n"));
  }

  if (doc.experience.length > 0) {
    const blocks = doc.experience.map((item) => {
      const heading = [item.role, item.company, formatPeriodForAts(item.period)].filter(Boolean).join(" | ");
      const bullets = item.highlights.map((highlight) => `- ${highlight}`);
      return [heading, ...(bullets.length ? ["", ...bullets] : [])].join("\n");
    });
    sections.push([ATS_SECTION_HEADERS.experience, blocks.join("\n\n")].join("\n"));
  }

  if (doc.education.length > 0) {
    const blocks = doc.education.map((item) => {
      const heading = [item.degree, item.school, formatPeriodForAts(item.period)].filter(Boolean).join(" | ");
      return [heading, ...(item.detail ? [item.detail] : [])].join("\n");
    });
    sections.push([ATS_SECTION_HEADERS.education, blocks.join("\n")].join("\n"));
  }

  const skills = getAtsSkills(doc);
  if (skills.length > 0) {
    sections.push([ATS_SECTION_HEADERS.skills, skills.join(", ")].join("\n"));
  }

  if (doc.courses.length > 0) {
    const lines = doc.courses.map((item) =>
      [item.name, item.year > 0 ? String(item.year) : ""].filter(Boolean).join(" | "),
    );
    sections.push([ATS_SECTION_HEADERS.certifications, lines.join("\n")].join("\n"));
  }

  if (doc.languages.length > 0) {
    const lines = doc.languages.map(
      (item) => `${item.name}${item.level_text ? ` (${item.level_text})` : ""}`,
    );
    sections.push([ATS_SECTION_HEADERS.languages, lines.join("\n")].join("\n"));
  }

  return sections.join("\n\n");
}

function stripAtsSections(doc: Record<string, unknown>): Record<string, unknown> {
  const strip = new Set<string>(ATS_STRIP_SECTIONS);
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(doc)) {
    if (strip.has(key)) {
      continue;
    }
    result[key] = value;
  }
  return result;
}

export function convertResumeToAtsYaml(doc: ResumeDocument, locale: string): string {
  void locale;

  const summary = doc.summary
    .filter((item) => item.description.trim())
    .map((item) => (isSummaryPositionNoise(item.position) ? { ...item, position: "" } : item));
  const skills = doc.skills.map((item) => ({ name: item.name }));

  const atsDoc = stripAtsSections({ ...doc, summary, skills });

  return yaml.dump(atsDoc, { indent: 2, lineWidth: 100, noRefs: true });
}

export function getRawYamlSource(yamlContent: string): string {
  return yamlContent;
}
