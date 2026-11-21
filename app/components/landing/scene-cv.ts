import type { ResumeDocument } from "../../lib/resume-schema";
import type { SampleResumeLabels } from "../../lib/sample-resume";

/**
 * What the CV sheets of the landing scene print: the public sample CV (Ariana Holt), the same
 * data /resume shows, cut into the entries the mockup's Experience Base holds. Three LiveCVs pick
 * different entries from it (epic #190, issue #290). Pure: no DOM, testable in Node.
 */

export type SceneCvEntry = {
  id: string;
  type: "role" | "edu" | "course" | "skill";
  title: string;
  org?: string;
  when?: string;
  line?: string;
};

export type SceneCvVersionKey = "fe" | "pf" | "ai";

export type SceneCv = {
  name: string;
  contact: string;
  headings: Record<SceneCvEntry["type"], string>;
  entries: SceneCvEntry[];
  versions: Record<SceneCvVersionKey, { title: string; slug: string; picks: string[] }>;
};

/* three LiveCVs built from the same entries; each is published at /profile/slug (as in the mockup) */
export const VERSION_PICKS: Record<SceneCvVersionKey, { slug: string; picks: string[] }> = {
  fe: { slug: "2f1a2877322e46", picks: ["r1", "r2", "e1", "k2", "s1", "s3"] },
  pf: { slug: "9c04be517a3d28", picks: ["r1", "r2", "r3", "e1", "k2", "s2", "s4"] },
  ai: { slug: "e71d3a90c5b64f", picks: ["r1", "r3", "e1", "k1", "s2", "s3"] },
};
export const PROFILE_PATH = "/arianaholt";
export const versionPath = (key: SceneCvVersionKey) => `${PROFILE_PATH}/${VERSION_PICKS[key].slug}`;
export const LIVE_URL = `opencivera.com${versionPath("fe")}`;

/** "2022-03 – obecnie" → "2022 – obecnie": dates shrink to their year, words stay */
const yearOf = (period: string) =>
  period.split("–").map((part) => (/^\d{4}/.test(part.trim()) ? part.trim().slice(0, 4) : part.trim())).join(" – ");
const capitalise = (text: string) => text.charAt(0).toLocaleUpperCase() + text.slice(1);

/** "School, degree" in the sample → title "degree", org "School" */
function splitSchool(school: string, degree: string) {
  if (degree) return { title: degree, org: school };
  const [org, ...rest] = school.split(",");
  return rest.length ? { title: capitalise(rest.join(",").trim()), org: org.trim() } : { title: school, org: undefined };
}

/** "Course name – Provider" → title, org */
function splitCourse(name: string) {
  const [title, org] = name.split(" – ");
  return { title: title.trim(), org: org?.trim() };
}

export function buildSceneCv(
  resume: ResumeDocument,
  labels: SampleResumeLabels,
  titles: Record<SceneCvVersionKey, string>,
): SceneCv {
  const roles = resume.experience.slice(0, 3).map((role, i): SceneCvEntry => ({
    id: `r${i + 1}`,
    type: "role",
    title: role.role,
    org: role.company,
    when: yearOf(role.period),
    line: role.highlights[0],
  }));
  const education = resume.education.slice(0, 2).map((item, i): SceneCvEntry => ({
    id: `e${i + 1}`,
    type: "edu",
    ...splitSchool(item.school, item.degree),
    when: yearOf(item.period).split(" – ").pop(),
  }));
  const courses = resume.courses.slice(0, 3).map((course, i): SceneCvEntry => ({
    id: `k${i + 1}`,
    type: "course",
    ...splitCourse(course.name),
    when: String(course.year),
  }));
  const stack = resume.tech_stack;
  const skillTitles = [
    stack.filter((item) => /TypeScript|React|Node/.test(item)).join(", "),
    stack.filter((item) => /Python|PostgreSQL|Docker/.test(item)).join(", "),
    resume.skills[1]?.name,
    resume.skills[2]?.name,
  ];
  const skills = skillTitles
    .map((title, i): SceneCvEntry | null => (title ? { id: `s${i + 1}`, type: "skill", title } : null))
    .filter((entry): entry is SceneCvEntry => entry !== null);
  const city = resume.contact.find((item) => !item.value.includes("@") && !/^\+?\d/.test(item.value) && !item.link)?.value;
  const email = resume.contact.find((item) => item.value.includes("@"))?.value;

  return {
    name: `${resume.first_name} ${resume.family_name}`.trim(),
    contact: [city, email].filter(Boolean).join("     "),
    headings: {
      role: labels.experience_heading || "Experience",
      edu: labels.education_heading || "Education",
      course: labels.courses_heading || "Courses",
      skill: labels.skills_heading || "Skills",
    },
    entries: [...roles, ...education, ...courses, ...skills],
    versions: {
      fe: { title: titles.fe, ...VERSION_PICKS.fe },
      pf: { title: titles.pf, ...VERSION_PICKS.pf },
      ai: { title: titles.ai, ...VERSION_PICKS.ai },
    },
  };
}

/** the sections of one LiveCV, in CV order, with only the entries that version picked */
export function versionSections(cv: SceneCv, key: SceneCvVersionKey) {
  const picks = cv.versions[key].picks;
  return (["role", "edu", "course", "skill"] as const)
    .map((type) => ({ type, heading: cv.headings[type], entries: cv.entries.filter((e) => e.type === type && picks.includes(e.id)) }))
    .filter((section) => section.entries.length > 0);
}
