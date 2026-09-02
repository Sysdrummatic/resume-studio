import type {
  ResumeContactItem,
  ResumeCourse,
  ResumeEducation,
  ResumeExperience,
  ResumeLanguage,
  ResumeSkill,
} from "../resume-schema";
import { ATS_SECTION_HEADERS } from "../ats-export-rules";
import type { ImportedResumeSections, ResumeImportResult } from "./types";
import { extractDateRange, guessLevelFromText, isBulletLine, splitBlankLineBlocks, splitHeadingPair, stripBullet } from "./text-blocks";

type SectionKey = "summary" | "experience" | "education" | "skills" | "courses" | "languages" | "interests";

// Our own ATS .txt export (convertResumeToPlainText) is exact-cased and
// exact-worded — matching it here means the import is a lossless round trip,
// not a heuristic guess.
const ATS_HEADER_TO_SECTION: Record<string, SectionKey> = {
  [ATS_SECTION_HEADERS.summary]: "summary",
  [ATS_SECTION_HEADERS.experience]: "experience",
  [ATS_SECTION_HEADERS.education]: "education",
  [ATS_SECTION_HEADERS.skills]: "skills",
  [ATS_SECTION_HEADERS.certifications]: "courses",
  [ATS_SECTION_HEADERS.languages]: "languages",
};

// A much wider net for CVs we did not generate: common section headings
// across resume templates and languages a user of this app is likely to
// write in. Matched case-insensitively against a whole trimmed line.
const GENERIC_HEADER_ALIASES: Record<SectionKey, string[]> = {
  summary: ["summary", "profile", "about", "about me", "objective", "professional summary", "podsumowanie", "profil"],
  experience: [
    "experience",
    "work experience",
    "employment history",
    "professional experience",
    "work history",
    "doswiadczenie",
    "doświadczenie",
  ],
  education: ["education", "academic background", "wyksztalcenie", "wykształcenie", "edukacja"],
  skills: ["skills", "technical skills", "core competencies", "key skills", "umiejetnosci", "umiejętności"],
  courses: ["certifications", "certificates", "courses", "training", "licenses", "kursy", "certyfikaty"],
  languages: ["languages", "jezyki", "języki"],
  interests: ["interests", "hobbies", "zainteresowania"],
};

function findGenericSectionKey(line: string): SectionKey | null {
  const normalized = line.trim().toLowerCase().replace(/:$/, "");
  if (!normalized || normalized.length > 40) return null;
  for (const [key, aliases] of Object.entries(GENERIC_HEADER_ALIASES) as Array<[SectionKey, string[]]>) {
    if (aliases.includes(normalized)) return key;
  }
  return null;
}

type SplitResult = { preamble: string; sections: Partial<Record<SectionKey, string>> };

function splitIntoSections(text: string, matchHeader: (line: string) => SectionKey | null): SplitResult {
  const lines = text.split("\n");
  const sections: Partial<Record<SectionKey, string>> = {};
  const preambleLines: string[] = [];
  let currentKey: SectionKey | null = null;
  let currentLines: string[] = [];

  function flush() {
    if (currentKey) {
      sections[currentKey] = [...(sections[currentKey] ? [sections[currentKey], ""] : []), ...currentLines].join("\n").trim();
    }
  }

  for (const line of lines) {
    const key = matchHeader(line);
    if (key) {
      flush();
      currentKey = key;
      currentLines = [];
    } else if (currentKey) {
      currentLines.push(line);
    } else {
      preambleLines.push(line);
    }
  }
  flush();

  return { preamble: preambleLines.join("\n").trim(), sections };
}

function isPureDateRangeLine(line: string): boolean {
  const extracted = extractDateRange(line);
  return Boolean(extracted.period) && extracted.rest === "";
}

function toHighlights(lines: string[]): string[] {
  return lines.map((line) => (isBulletLine(line) ? stripBullet(line) : line));
}

// Blank-line blocks, but a block is only a NEW entry when its own first
// line(s) look like a heading — our own ATS export puts a blank line between
// an entry's heading and its bullets (formatPeriodForAts), and some resumes
// put the role/company on one line and the date range alone on the next, so
// either shape must still count as "still the same entry".
function parseExperienceBody(body: string): ResumeExperience[] {
  const entries: ResumeExperience[] = [];

  for (const lines of splitBlankLineBlocks(body).map((block) => block.split("\n").map((line) => line.trim()).filter(Boolean))) {
    if (lines.length === 0) continue;
    const [first, second] = lines;
    const firstIsHeading = first.includes(" | ") || Boolean(extractDateRange(first).period);
    const secondIsBareDate = lines.length > 1 && isPureDateRangeLine(second);

    if (firstIsHeading || secondIsBareDate || entries.length === 0) {
      let role = "";
      let company = "";
      let period = "";
      let rest: string[];
      if (first.includes(" | ")) {
        [role = "", company = "", period = ""] = first.split(" | ").map((part) => part.trim());
        rest = lines.slice(1);
      } else if (secondIsBareDate) {
        period = extractDateRange(second).period;
        [role, company] = splitHeadingPair(first);
        rest = lines.slice(2);
      } else {
        const extracted = extractDateRange(first);
        period = extracted.period;
        [role, company] = splitHeadingPair(extracted.rest);
        rest = lines.slice(1);
      }
      entries.push({ period, company, role, highlights: toHighlights(rest) });
    } else {
      entries[entries.length - 1].highlights.push(...toHighlights(lines));
    }
  }

  return entries.filter((item) => item.company || item.role || item.highlights.length > 0);
}

function parseEducationBody(body: string): ResumeEducation[] {
  // Entries aren't blank-line separated in our own export (formatPeriodForAts
  // keeps education compact) — a new heading line (contains " | ", or a date
  // range) starts a new entry; anything else is that entry's detail line.
  const entries: ResumeEducation[] = [];
  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const looksLikeHeading = line.includes(" | ") || extractDateRange(line).period;
    if (looksLikeHeading || entries.length === 0) {
      let degree = "";
      let school = "";
      let period = "";
      if (line.includes(" | ")) {
        [degree = "", school = "", period = ""] = line.split(" | ").map((part) => part.trim());
      } else {
        const extracted = extractDateRange(line);
        period = extracted.period;
        [degree, school] = splitHeadingPair(extracted.rest);
      }
      entries.push({ period, school, degree, detail: "" });
    } else {
      const last = entries[entries.length - 1];
      last.detail = last.detail ? `${last.detail} ${line}` : line;
    }
  }
  return entries.filter((item) => item.school || item.degree);
}

function parseSkillsBody(body: string): ResumeSkill[] {
  const tokens = body.includes(",") ? body.split(",") : body.split("\n");
  return tokens
    .map((token) => token.replace(/^[-*••]\s*/, "").trim())
    .filter(Boolean)
    .map((name) => ({ name, level: 3 }));
}

function parseCoursesBody(body: string): ResumeCourse[] {
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, yearText] = line.split(" | ").map((part) => part.trim());
      const year = Number.parseInt(yearText || "", 10);
      return { name: name || line, year: Number.isFinite(year) ? year : 0 };
    });
}

function parseLanguagesBody(body: string): ResumeLanguage[] {
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(.+?)\s*[(–-]\s*([^)]+?)\)?\s*$/);
      const name = (match ? match[1] : line).trim();
      const level_text = match ? match[2].trim() : "";
      return { name, level_text, level: guessLevelFromText(level_text) };
    })
    .filter((item) => item.name);
}

function parseInterestsBody(body: string): string[] {
  const tokens = body.includes(",") ? body.split(",") : body.split("\n");
  return tokens.map((token) => token.replace(/^[-*••]\s*/, "").trim()).filter(Boolean);
}

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
const LINKEDIN_RE = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/\S+/i;
const URL_RE = /https?:\/\/\S+/i;

/** Contact detection is regex-only, run over the preamble (everything before
 * the first recognised section) — it never guesses a physical Location,
 * which is too free-form to detect reliably; the user fills that in by hand. */
function extractContact(preamble: string): ResumeContactItem[] {
  const items: ResumeContactItem[] = [];
  const email = preamble.match(EMAIL_RE)?.[0];
  if (email) items.push({ label: "E-mail", value: email, link: `mailto:${email}` });

  const linkedin = preamble.match(LINKEDIN_RE)?.[0];
  if (linkedin) {
    const href = linkedin.startsWith("http") ? linkedin : `https://${linkedin}`;
    items.push({ label: "LinkedIn", value: linkedin.replace(/^https?:\/\//, ""), link: href });
  }

  const phone = preamble.match(PHONE_RE)?.[0];
  if (phone && phone.replace(/\D/g, "").length >= 7) {
    items.push({ label: "Phone", value: phone.trim(), link: `tel:${phone.replace(/[^\d+]/g, "")}` });
  }

  const url = preamble
    .split("\n")
    .map((line) => line.match(URL_RE)?.[0])
    .find((match) => match && !LINKEDIN_RE.test(match));
  if (url) items.push({ label: "Portfolio", value: url.replace(/^https?:\/\//, ""), link: url });

  return items;
}

function guessName(preamble: string): string {
  const firstLine = preamble.split("\n").map((line) => line.trim()).find(Boolean) || "";
  // A name line is short and has no @, digits-heavy phone, or URL in it —
  // otherwise it's more likely a contact line that happens to come first.
  if (!firstLine || firstLine.length > 60 || EMAIL_RE.test(firstLine) || URL_RE.test(firstLine)) return "";
  return firstLine;
}

function buildResult(sourceKind: ResumeImportResult["sourceKind"], preamble: string, sections: Partial<Record<SectionKey, string>>, warnings: string[]): ResumeImportResult {
  const resume: ImportedResumeSections = {};

  const name = guessName(preamble);
  if (name) resume.name = name;

  const contact = extractContact(preamble);
  if (contact.length > 0) resume.contact = contact;

  if (sections.summary) {
    resume.summary = [{ position: "Default", description: sections.summary.replace(/\n+/g, " ").trim(), default: true }];
  }
  if (sections.experience) resume.experience = parseExperienceBody(sections.experience);
  if (sections.education) resume.education = parseEducationBody(sections.education);
  if (sections.skills) resume.skills = parseSkillsBody(sections.skills);
  if (sections.courses) resume.courses = parseCoursesBody(sections.courses);
  if (sections.languages) resume.languages = parseLanguagesBody(sections.languages);
  if (sections.interests) resume.interests = parseInterestsBody(sections.interests);

  const foundSections = Object.keys(sections).length;
  if (foundSections === 0) {
    warnings.push("Could not find any recognisable resume sections (Experience, Education, Skills, ...) in this file.");
  }
  (["summary", "experience", "education", "skills", "languages"] as SectionKey[])
    .filter((key) => !(key in sections))
    .forEach((key) => warnings.push(`No "${key}" section found — that part of the form was left as-is.`));

  return { sourceKind, resume, warnings };
}

export function parsePlainTextResume(rawText: string, sourceKind: "pdf" | "docx" | "txt"): ResumeImportResult {
  const text = rawText.replace(/\r\n/g, "\n").trim();
  if (!text) {
    return { sourceKind, resume: {}, warnings: ["The file had no readable text."] };
  }

  const atsSplit = splitIntoSections(text, (line) => ATS_HEADER_TO_SECTION[line.trim()] ?? null);
  const isAtsRoundTrip = Object.keys(atsSplit.sections).length >= 2;
  if (isAtsRoundTrip) {
    return buildResult(sourceKind, atsSplit.preamble, atsSplit.sections, []);
  }

  const genericSplit = splitIntoSections(text, findGenericSectionKey);
  return buildResult(sourceKind, genericSplit.preamble, genericSplit.sections, []);
}
