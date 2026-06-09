export const ATS_STRIP_SECTIONS = ["interests"] as const;

export const ATS_END_DATE_NOW_TOKENS = ["now", "present", "current", ""] as const;

export const ATS_PERIOD_OPEN_TOKENS = [
  "now",
  "present",
  "current",
  "today",
  "obecnie",
  "teraz",
  "actual",
  "heute",
] as const;

export const ATS_SUMMARY_POSITION_NOISE = ["default", ""] as const;

export const ATS_SECTION_HEADERS = {
  summary: "SUMMARY",
  experience: "WORK EXPERIENCE",
  education: "EDUCATION",
  skills: "SKILLS",
  certifications: "CERTIFICATIONS",
  languages: "LANGUAGES",
} as const;

export const ATS_DATE_OPEN_END = "Present";

export type ATSRuleSeverity = "error" | "warning" | "info";

export type ATSRuleResult = {
  ruleId: string;
  severity: ATSRuleSeverity;
  field: string;
  message: string;
  passed: boolean;
};

export type ATSScoreCategory = "structure" | "skills" | "dates" | "contact" | "metadata";

export type ATSCategoryScore = {
  category: ATSScoreCategory;
  score: number;
  results: ATSRuleResult[];
};

export type ATSScoreResult = {
  globalScore: number;
  categories: ATSCategoryScore[];
  passedCount: number;
  warningCount: number;
  errorCount: number;
};
