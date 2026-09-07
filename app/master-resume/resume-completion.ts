import type { ResumeDocument } from "../lib/resume-schema";

export type SectionStatus = "ok" | "warn";

/**
 * Weights sum to 100 and are ordered by how much a recruiter-facing CV depends
 * on the section, so the headline percentage moves most when the sections that
 * actually matter get filled in.
 */
const SECTION_WEIGHTS: Record<string, number> = {
  personal: 20,
  summary: 15,
  experience: 25,
  education: 8,
  skills: 12,
  languages: 8,
  courses: 4,
  interests: 2,
  "tech-stack": 3,
  "qr-codes": 3,
};

function hasText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * A section counts as complete only when it carries usable content — an array
 * of blank rows (which `defaultResumeDocument` seeds) is not progress.
 */
function isSectionComplete(id: string, resume: ResumeDocument): boolean {
  switch (id) {
    case "personal":
      return (hasText(resume.first_name) || hasText(resume.family_name)) && resume.contact.some((item) => hasText(item.value));
    case "summary":
      return resume.summary.some((item) => hasText(item.position) && hasText(item.description));
    case "experience":
      return resume.experience.some((item) => hasText(item.company) && hasText(item.role));
    case "education":
      return resume.education.some((item) => hasText(item.school));
    case "skills":
      return resume.skills.some((item) => hasText(item.name));
    case "languages":
      return resume.languages.some((item) => hasText(item.name));
    case "courses":
      return resume.courses.some((item) => hasText(item.name));
    case "interests":
      return resume.interests.some(hasText);
    case "tech-stack":
      return resume.tech_stack.some(hasText);
    case "qr-codes":
      return resume.qr_codes.some((item) => hasText(item.label));
    default:
      // `publishing` holds document metadata, not CV content, so it is not scored.
      return false;
  }
}

export type ResumeCompletion = {
  percent: number;
  statuses: Record<string, SectionStatus>;
  /** Highest-value unfinished section, for the "do this next" nudge. */
  next: { id: string; weight: number } | null;
};

export function computeResumeCompletion(resume: ResumeDocument): ResumeCompletion {
  const statuses: Record<string, SectionStatus> = {};
  let earned = 0;
  let next: { id: string; weight: number } | null = null;

  for (const [id, weight] of Object.entries(SECTION_WEIGHTS)) {
    const complete = isSectionComplete(id, resume);
    statuses[id] = complete ? "ok" : "warn";
    if (complete) {
      earned += weight;
      continue;
    }
    if (!next || weight > next.weight) next = { id, weight };
  }

  return { percent: Math.round(earned), statuses, next };
}
