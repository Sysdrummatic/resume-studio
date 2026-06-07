import yaml from "js-yaml";
import { ResumeDocument } from "./resume-schema";

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

const PRESENT_TOKENS = new Set(["now", "present", "actual", "current", "obecnie", "teraz"]);

function formatDateToken(token: string): string {
  const trimmed = token.trim();
  if (!trimmed) {
    return "";
  }
  if (PRESENT_TOKENS.has(trimmed.toLowerCase())) {
    return "Present";
  }
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (isoMatch) {
    return `${isoMatch[2]}/${isoMatch[1]}`;
  }
  return trimmed;
}

function formatPeriodForAts(period: string): string {
  const parts = period.split(/\s*[–—-]\s*/).filter(Boolean);
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

  const header: string[] = [doc.name.toUpperCase()];
  const contactLine = doc.contact.map((item) => item.value).filter(Boolean).join(" | ");
  if (contactLine) {
    header.push(contactLine);
  }
  sections.push(header.join("\n"));

  const summary = getAtsSummary(doc);
  if (summary) {
    sections.push(["SUMMARY", wrapText(summary).join("\n")].join("\n"));
  }

  if (doc.experience.length > 0) {
    const blocks = doc.experience.map((item) => {
      const heading = [item.role, item.company, formatPeriodForAts(item.period)].filter(Boolean).join(" | ");
      const bullets = item.highlights.map((highlight) => `- ${highlight}`);
      return [heading, ...(bullets.length ? ["", ...bullets] : [])].join("\n");
    });
    sections.push(["WORK EXPERIENCE", blocks.join("\n\n")].join("\n"));
  }

  if (doc.education.length > 0) {
    const blocks = doc.education.map((item) => {
      const heading = [item.school, formatPeriodForAts(item.period)].filter(Boolean).join(" | ");
      return [heading, ...(item.detail ? [item.detail] : [])].join("\n");
    });
    sections.push(["EDUCATION", blocks.join("\n")].join("\n"));
  }

  const skills = getAtsSkills(doc);
  if (skills.length > 0) {
    sections.push(["SKILLS", skills.join(", ")].join("\n"));
  }

  if (doc.courses.length > 0) {
    const lines = doc.courses.map((item) =>
      [item.name, item.year > 0 ? String(item.year) : ""].filter(Boolean).join(" | "),
    );
    sections.push(["CERTIFICATIONS", lines.join("\n")].join("\n"));
  }

  if (doc.languages.length > 0) {
    const lines = doc.languages.map(
      (item) => `${item.name}${item.level_text ? ` (${item.level_text})` : ""}`,
    );
    sections.push(["LANGUAGES", lines.join("\n")].join("\n"));
  }

  return sections.join("\n\n");
}

export function convertResumeToAtsYaml(doc: ResumeDocument): string {
  const atsDoc = {
    name: doc.name,
    summary: getAtsSummary(doc),
    contact: doc.contact.map((item) => ({
      label: item.label,
      value: item.value,
      ...(item.link ? { link: item.link } : {}),
    })),
    experience: doc.experience.map((item) => ({
      role: item.role,
      company: item.company,
      period: formatPeriodForAts(item.period),
      highlights: item.highlights,
    })),
    education: doc.education.map((item) => ({
      school: item.school,
      period: formatPeriodForAts(item.period),
      ...(item.detail ? { detail: item.detail } : {}),
    })),
    skills: getAtsSkills(doc),
    certifications: doc.courses.map((item) => ({
      name: item.name,
      ...(item.year > 0 ? { year: item.year } : {}),
    })),
    languages: doc.languages.map((item) => ({
      name: item.name,
      ...(item.level_text ? { level: item.level_text } : {}),
    })),
  };

  return yaml.dump(atsDoc, { indent: 2, lineWidth: 100, noRefs: true });
}
