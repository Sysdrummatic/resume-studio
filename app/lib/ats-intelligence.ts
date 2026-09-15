import type { ATSRuleSeverity } from "./ats-export-rules";
import type { ResumeDocument, ResumeExperience } from "./resume-schema";

export type ATSIntelligenceCategoryId = "structure" | "contact" | "experience" | "skills" | "dates";

export type ATSIntelligenceIssue = {
  ruleId: string;
  category: ATSIntelligenceCategoryId;
  severity: ATSRuleSeverity;
  field: string;
  message: string;
};

export type ATSIntelligenceCategory = {
  id: ATSIntelligenceCategoryId;
  label: string;
  score: number;
};

export type ATSKeywordCoverage = {
  score: number;
  matched: string[];
  missing: string[];
};

export type ATSScoreBand = "good" | "warn" | "risk";

export type ATSResumeAnalysis = {
  score: number;
  baseScore: number;
  categories: ATSIntelligenceCategory[];
  issues: ATSIntelligenceIssue[];
  keywordCoverage: ATSKeywordCoverage | null;
};

export type MasterResumeATSInsights = {
  readinessScore: number;
  categories: ATSIntelligenceCategory[];
  issues: ATSIntelligenceIssue[];
  metrics: {
    roleCount: number;
    rolesWithMeasuredImpact: number;
    skillCount: number;
    contactChannelCount: number;
    summaryCount: number;
  };
};

type WeightedRule = {
  ratio: number;
  weight: number;
  issue: ATSIntelligenceIssue;
};

const CATEGORY_WEIGHTS: Record<ATSIntelligenceCategoryId, number> = {
  structure: 20,
  contact: 15,
  experience: 30,
  skills: 20,
  dates: 15,
};

const CATEGORY_LABELS: Record<ATSIntelligenceCategoryId, string> = {
  structure: "Structure",
  contact: "Contact",
  experience: "Experience evidence",
  skills: "Skills",
  dates: "Dates",
};

const STOP_WORDS = new Set([
  "about",
  "and",
  "are",
  "company",
  "candidate",
  "dla",
  "experience",
  "from",
  "have",
  "the",
  "this",
  "that",
  "team",
  "with",
  "work",
  "you",
  "your",
  "or",
  "oraz",
  "się",
  "nasz",
  "nasza",
  "jest",
  "jako",
  "które",
  "praca",
  "pracy",
  "role",
  "will",
]);

const SHORT_TECHNOLOGY_TERMS = new Set(["ai", "bi", "c", "c#", "go", "hr", "ml", "qa", "r", "ui", "ux"]);

function clampRatio(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function getATSScoreBand(score: number): ATSScoreBand {
  if (score >= 80) return "good";
  if (score >= 50) return "warn";
  return "risk";
}

function ratioFor<T>(items: T[], predicate: (item: T) => boolean): number {
  return items.length === 0 ? 0 : items.filter(predicate).length / items.length;
}

function hasMeasuredImpact(entry: ResumeExperience): boolean {
  return entry.highlights.some((highlight) => /(?:\d|%|[$€£])/u.test(highlight));
}

function uniqueSkillNames(document: ResumeDocument): string[] {
  return Array.from(
    new Set(
      [...document.skills.map((skill) => skill.name), ...document.tech_stack]
        .map((name) => name.trim().toLocaleLowerCase())
        .filter(Boolean),
    ),
  );
}

function documentText(document: ResumeDocument): string {
  return [
    document.first_name,
    document.family_name,
    ...document.summary.flatMap((summary) => [summary.position, summary.description]),
    ...document.skills.map((skill) => skill.name),
    ...document.tech_stack,
    ...document.experience.flatMap((entry) => [entry.role, entry.company, ...entry.highlights]),
    ...document.education.flatMap((entry) => [entry.degree, entry.school, entry.detail]),
    ...document.courses.map((course) => course.name),
    ...document.languages.map((language) => language.name),
  ]
    .join(" ")
    .toLocaleLowerCase();
}

function extractKeywords(value: string): string[] {
  const tokens = value.toLocaleLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}+#./-]*/gu) || [];
  return Array.from(
    new Set(
      tokens
        .map((token) => token.replace(/[./-]+$/gu, ""))
        .filter(
          (token) =>
            !STOP_WORDS.has(token) && (token.length >= 3 || SHORT_TECHNOLOGY_TERMS.has(token)),
        ),
    ),
  ).sort();
}

function issue(
  ruleId: string,
  category: ATSIntelligenceCategoryId,
  severity: ATSRuleSeverity,
  field: string,
  message: string,
): ATSIntelligenceIssue {
  return { ruleId, category, severity, field, message };
}

function category(id: ATSIntelligenceCategoryId, rules: WeightedRule[], issues: ATSIntelligenceIssue[]) {
  const earned = rules.reduce((total, rule) => {
    const ratio = clampRatio(rule.ratio);
    if (ratio < 1) issues.push(rule.issue);
    return total + ratio * rule.weight;
  }, 0);
  const available = rules.reduce((total, rule) => total + rule.weight, 0);
  return {
    id,
    label: CATEGORY_LABELS[id],
    score: available === 0 ? 0 : Math.round((earned / available) * 100),
  } satisfies ATSIntelligenceCategory;
}

function buildBaseAnalysis(document: ResumeDocument) {
  const issues: ATSIntelligenceIssue[] = [];
  const summaries = document.summary.filter((summary) => summary.description.trim());
  const experiences = document.experience.filter(
    (entry) => entry.role.trim() || entry.company.trim() || entry.period.trim() || entry.highlights.length > 0,
  );
  const education = document.education.filter(
    (entry) => entry.degree.trim() || entry.school.trim() || entry.period.trim() || entry.detail.trim(),
  );
  const skills = uniqueSkillNames(document);
  const contact = document.contact.filter((item) => item.value.trim());
  const hasEmail = contact.some((item) => /\S+@\S+\.\S+/.test(item.value));
  const hasPhone = contact.some((item) => item.value.replace(/\D/g, "").length >= 7);
  const hasLink = contact.some(
    (item) => /^https?:\/\//i.test(item.link || item.value) || /linkedin|portfolio|github|website/i.test(item.label),
  );
  const narrative = [
    ...summaries.map((summary) => summary.description),
    ...experiences.flatMap((entry) => entry.highlights),
  ]
    .join(" ")
    .toLocaleLowerCase();
  const evidencedSkills = skills.filter((skill) => narrative.includes(skill));
  const datedEntries = [...experiences, ...education];

  const categories = [
    category(
      "structure",
      [
        {
          ratio: summaries.length > 0 ? 1 : 0,
          weight: 25,
          issue: issue("structure.summary", "structure", "error", "summary", "Add a focused professional summary."),
        },
        {
          ratio: experiences.length > 0 ? 1 : 0,
          weight: 30,
          issue: issue("structure.experience", "structure", "error", "experience", "Add relevant work experience."),
        },
        {
          ratio: education.length > 0 ? 1 : 0,
          weight: 20,
          issue: issue("structure.education", "structure", "warning", "education", "Add education or equivalent training."),
        },
        {
          ratio: skills.length > 0 ? 1 : 0,
          weight: 25,
          issue: issue("structure.skills", "structure", "error", "skills", "Add skills relevant to the target role."),
        },
      ],
      issues,
    ),
    category(
      "contact",
      [
        {
          ratio: hasEmail ? 1 : 0,
          weight: 40,
          issue: issue("contact.email", "contact", "error", "contact", "Add a valid e-mail address."),
        },
        {
          ratio: hasPhone ? 1 : 0,
          weight: 27,
          issue: issue("contact.phone", "contact", "warning", "contact", "Add a phone number."),
        },
        {
          ratio: hasLink ? 1 : 0,
          weight: 33,
          issue: issue("contact.link", "contact", "warning", "contact", "Add a portfolio or professional profile link."),
        },
      ],
      issues,
    ),
    category(
      "experience",
      [
        {
          ratio: ratioFor(experiences, (entry) => Boolean(entry.role.trim() && entry.company.trim())),
          weight: 34,
          issue: issue("experience.identity", "experience", "error", "experience", "Give every selected role a clear title and employer."),
        },
        {
          ratio: ratioFor(experiences, (entry) => entry.highlights.length >= 2 && entry.highlights.length <= 5),
          weight: 27,
          issue: issue("experience.highlights", "experience", "warning", "experience", "Use 2–5 focused bullets for every selected role."),
        },
        {
          ratio: ratioFor(experiences, hasMeasuredImpact),
          weight: 27,
          issue: issue("experience.impact", "experience", "warning", "experience", "Add a measurable result to every selected role."),
        },
        {
          ratio: ratioFor(experiences, (entry) => entry.highlights.some((highlight) => highlight.trim().length >= 40)),
          weight: 12,
          issue: issue("experience.evidence", "experience", "info", "experience", "Describe evidence and outcomes, not only responsibilities."),
        },
      ],
      issues,
    ),
    category(
      "skills",
      [
        {
          ratio: skills.length / 5,
          weight: 40,
          issue: issue("skills.depth", "skills", "warning", "skills", "Include at least five relevant skills or tools."),
        },
        {
          ratio: skills.length === 0 ? 0 : evidencedSkills.length / Math.min(skills.length, 5),
          weight: 40,
          issue: issue("skills.evidence", "skills", "warning", "experience", "Demonstrate key skills in the summary or experience bullets."),
        },
        {
          ratio:
            document.skills.length + document.tech_stack.length === 0
              ? 0
              : skills.length / (document.skills.length + document.tech_stack.length),
          weight: 20,
          issue: issue("skills.duplicates", "skills", "info", "skills", "Remove duplicate skill and tool names."),
        },
      ],
      issues,
    ),
    category(
      "dates",
      [
        {
          ratio: ratioFor(datedEntries, (entry) => Boolean(entry.period.trim())),
          weight: 55,
          issue: issue("dates.period", "dates", "error", "experience", "Add a period to every experience and education entry."),
        },
        {
          ratio: ratioFor(datedEntries, (entry) => /(?:19|20)\d{2}/.test(entry.period)),
          weight: 45,
          issue: issue("dates.year", "dates", "warning", "experience", "Use a four-digit year in every period; Present is valid for open roles."),
        },
      ],
      issues,
    ),
  ];

  const baseScore = Math.round(
    categories.reduce((total, item) => total + item.score * CATEGORY_WEIGHTS[item.id], 0) / 100,
  );

  return {
    baseScore,
    categories,
    issues,
    metrics: {
      roleCount: experiences.length,
      rolesWithMeasuredImpact: experiences.filter(hasMeasuredImpact).length,
      skillCount: skills.length,
      contactChannelCount: [hasEmail, hasPhone, hasLink].filter(Boolean).length,
      summaryCount: summaries.length,
    },
  };
}

export function analyzeResumeForAts(document: ResumeDocument, jobDescription = ""): ATSResumeAnalysis {
  const base = buildBaseAnalysis(document);
  const keywords = extractKeywords(jobDescription);
  const keywordCoverage =
    keywords.length < 2
      ? null
      : (() => {
          const documentKeywords = new Set(extractKeywords(documentText(document)));
          const matched = keywords.filter((keyword) => documentKeywords.has(keyword));
          const missing = keywords.filter((keyword) => !documentKeywords.has(keyword));
          return {
            score: Math.round((matched.length / keywords.length) * 100),
            matched,
            missing,
          };
        })();
  const score = keywordCoverage
    ? Math.round(base.baseScore * 0.75 + keywordCoverage.score * 0.25)
    : base.baseScore;

  return {
    score,
    baseScore: base.baseScore,
    categories: base.categories,
    issues: base.issues,
    keywordCoverage,
  };
}

export function analyzeMasterResume(document: ResumeDocument): MasterResumeATSInsights {
  const base = buildBaseAnalysis(document);
  return {
    readinessScore: base.baseScore,
    categories: base.categories,
    issues: base.issues,
    metrics: base.metrics,
  };
}
