import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeMasterResume,
  analyzeResumeForAts,
} from "../app/lib/ats-intelligence.ts";
import {
  applyResumeSelectionToRawDocument,
  normalizeResumePresetSelection,
} from "../app/lib/preset-selection.ts";

function strongResume() {
  return {
    brand_initials: "AH",
    first_name: "Ariana",
    family_name: "Holt",
    summary: [
      {
        position: "Senior Product Manager",
        description:
          "Product leader using analytics, customer research and delivery discipline to grow B2B platforms.",
        default: true,
      },
    ],
    contact: [
      { label: "E-mail", value: "ariana@example.com" },
      { label: "Phone", value: "+48 600 000 000" },
      { label: "LinkedIn", value: "linkedin.com/in/ariana", link: "https://linkedin.com/in/ariana" },
    ],
    skills: [
      { name: "Product strategy", level: 5 },
      { name: "Analytics", level: 5 },
      { name: "Customer research", level: 4 },
      { name: "Roadmapping", level: 5 },
      { name: "Stakeholder management", level: 4 },
    ],
    tech_stack: ["SQL", "Jira"],
    languages: [{ name: "English", level_text: "C2", level: 5 }],
    interests: [],
    experience: [
      {
        period: "2022-01 – Present",
        company: "Northstar Labs",
        role: "Senior Product Manager",
        highlights: [
          "Led product strategy and roadmapping for a B2B analytics platform used by 12,000 teams.",
          "Combined SQL analysis with customer research to increase activation by 24%.",
          "Aligned engineering and stakeholder groups, reducing delivery lead time by 18 days.",
        ],
      },
    ],
    education: [
      {
        period: "2014 – 2018",
        school: "Warsaw University of Technology",
        degree: "BSc Computer Science",
        detail: "Product and data systems",
      },
    ],
    courses: [],
    qr_codes: [],
    gdpr_clause: "",
  };
}

test("a complete selected CV earns a strong deterministic readiness score", () => {
  const result = analyzeResumeForAts(strongResume());

  assert.equal(result.score >= 85, true);
  assert.equal(result.baseScore, result.score);
  assert.equal(result.keywordCoverage, null);
  assert.equal(result.categories.length, 5);
  assert.equal(result.issues.some((issue) => issue.severity === "error"), false);
});

test("Master CV exposes content-library counters instead of pretending to be one application", () => {
  const result = analyzeMasterResume(strongResume());

  assert.deepEqual(result.metrics, {
    roleCount: 1,
    rolesWithMeasuredImpact: 1,
    skillCount: 7,
    contactChannelCount: 3,
    summaryCount: 1,
  });
  assert.equal(result.readinessScore >= 85, true);
});

test("open roles using Present remain ATS-readable when the period contains a year", () => {
  const result = analyzeResumeForAts(strongResume());

  assert.equal(result.issues.some((issue) => issue.ruleId === "dates.year"), false);
});

test("Saved Version analysis sees only content selected from the Master CV", () => {
  const master = strongResume();
  master.experience.unshift({
    period: "",
    company: "Example Company",
    role: "",
    highlights: ["Helped the team."],
  });
  const selection = normalizeResumePresetSelection({
    summary: [0],
    experience: [0],
    education: [0],
    skills: [0],
    tech_stack: [],
    languages: [],
    interests: [],
    courses: [],
  });
  const selectedRaw = applyResumeSelectionToRawDocument(master, selection);
  assert.notEqual(selectedRaw, null);

  const masterResult = analyzeResumeForAts(master);
  const selectedResult = analyzeResumeForAts(selectedRaw);

  assert.equal(selectedRaw.experience.length, 1);
  assert.equal(selectedRaw.skills.length, 1);
  assert.equal(selectedResult.score < masterResult.score, true);
  assert.equal(selectedResult.issues.some((issue) => issue.ruleId === "experience.identity"), true);
});

test("keyword coverage is optional, unique and resistant to repetition", () => {
  const resume = strongResume();
  const concise = analyzeResumeForAts(resume, "Product strategy, analytics, Kubernetes and Python");
  const stuffed = analyzeResumeForAts(
    resume,
    "Product product product strategy, analytics analytics, Kubernetes and Python",
  );

  assert.notEqual(concise.keywordCoverage, null);
  assert.notEqual(stuffed.keywordCoverage, null);
  assert.deepEqual(stuffed.keywordCoverage, concise.keywordCoverage);
  assert.deepEqual(concise.keywordCoverage?.matched, ["analytics", "product", "strategy"]);
  assert.deepEqual(concise.keywordCoverage?.missing, ["kubernetes", "python"]);
  assert.equal(concise.score < concise.baseScore, true);
});

test("keyword matching uses complete terms instead of substrings", () => {
  const resume = strongResume();
  resume.tech_stack.push("JavaScript");

  const result = analyzeResumeForAts(resume, "Java and JavaScript");

  assert.deepEqual(result.keywordCoverage?.matched, ["javascript"]);
  assert.deepEqual(result.keywordCoverage?.missing, ["java"]);
});

test("keyword matching supports short technology names and sentence punctuation", () => {
  const resume = strongResume();
  resume.tech_stack.push("AI", "Go", "C#", "C++", "Node.js");

  const result = analyzeResumeForAts(resume, "AI, Go, C#, C++ and Node.js.");

  assert.deepEqual(result.keywordCoverage?.matched, ["ai", "c#", "c++", "go", "node.js"]);
  assert.deepEqual(result.keywordCoverage?.missing, []);
});

test("weak documents return concrete field-level guidance", () => {
  const weak = {
    brand_initials: "",
    first_name: "",
    family_name: "",
    summary: [],
    contact: [],
    qr_codes: [],
    skills: [],
    tech_stack: [],
    languages: [],
    interests: [],
    experience: [],
    education: [],
    courses: [],
    gdpr_clause: "",
  };
  const result = analyzeResumeForAts(weak);

  assert.equal(result.score < 50, true);
  assert.equal(result.issues.some((issue) => issue.field === "contact"), true);
  assert.equal(result.issues.some((issue) => issue.field === "experience"), true);
  assert.equal(result.issues.some((issue) => issue.field === "skills"), true);
});
