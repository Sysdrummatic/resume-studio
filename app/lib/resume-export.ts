import { ResumeDocument, getPreviewLabels } from "./resume-schema";

type PublicExportPath = {
  personSlug: string;
  publicId: string;
};

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

export function convertResumeToPlainText(doc: ResumeDocument, locale: string): string {
  const labels = getPreviewLabels(locale);
  const lines: string[] = [];

  lines.push(doc.name.toUpperCase());
  if (doc.brand_initials) lines.push(`(${doc.brand_initials})`);
  lines.push("");

  if (doc.contact.length > 0) {
    lines.push(doc.contact.map((item) => `${item.label}: ${item.value}`).join(" | "));
    lines.push("");
  }

  if (doc.summary.length > 0) {
    lines.push(`--- ${labels.summary.toUpperCase()} ---`);
    doc.summary.forEach((item) => {
      if (item.position) lines.push(item.position);
      lines.push(...wrapText(item.description));
      lines.push("");
    });
  }

  if (doc.experience.length > 0) {
    lines.push(`--- ${labels.experience.toUpperCase()} ---`);
    doc.experience.forEach((item) => {
      lines.push(`${item.period} | ${item.company}`);
      lines.push(item.role);
      item.highlights.forEach((highlight) => lines.push(`- ${highlight}`));
      lines.push("");
    });
  }

  if (doc.education.length > 0) {
    lines.push(`--- ${labels.education.toUpperCase()} ---`);
    doc.education.forEach((item) => {
      lines.push(`${item.period} | ${item.school}`);
      lines.push(item.detail);
      lines.push("");
    });
  }

  if (doc.skills.length > 0 || doc.tech_stack.length > 0) {
    lines.push(`--- ${labels.skills.toUpperCase()} ---`);
    if (doc.skills.length > 0) {
      lines.push(doc.skills.map((item) => `${item.name} (${item.level}/5)`).join(", "));
    }
    if (doc.tech_stack.length > 0) {
      lines.push(`${labels.techStack}: ${doc.tech_stack.join(", ")}`);
    }
    lines.push("");
  }

  if (doc.languages.length > 0) {
    lines.push(`--- ${labels.languages.toUpperCase()} ---`);
    lines.push(doc.languages.map((item) => `${item.name}${item.level_text ? ` (${item.level_text})` : ""}`).join(", "));
    lines.push("");
  }

  if (doc.courses.length > 0) {
    lines.push(`--- ${labels.courses.toUpperCase()} ---`);
    doc.courses.forEach((item) => {
      lines.push(`${item.year > 0 ? `${item.year}: ` : ""}${item.name}`);
    });
    lines.push("");
  }

  if (doc.interests.length > 0) {
    lines.push(`--- ${labels.interests.toUpperCase()} ---`);
    lines.push(doc.interests.join(", "));
    lines.push("");
  }

  return lines.join("\n");
}
