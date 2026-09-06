"use client";

import { useState } from "react";
import type { ResumeImportResult } from "../lib/resume-import/parse-resume-file";
import type {
  ResumeContactItem,
  ResumeCourse,
  ResumeEducation,
  ResumeExperience,
  ResumeLanguage,
  ResumeSkill,
  ResumeSummaryItem,
} from "../lib/resume-schema";
import type { ImportedResumeSections } from "../lib/resume-import/types";

type ImportReviewModalProps = {
  isOpen: boolean;
  filename: string;
  result: ResumeImportResult | null;
  /** The draft's current name, to guard against overwriting one person's
   * draft with another person's parsed CV (see nameMismatch below). */
  currentName: string;
  onConfirm: (selected: ImportedResumeSections) => void;
  onClose: () => void;
};

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

// A different name is the strongest signal this is the wrong person's file
// entirely — block the overwrite by default rather than silently replacing
// one person's draft with another's, and require an explicit opt-in. Only a
// pure name comparison, so it stays a plain, unit-testable function rather
// than logic buried inside the component.
export function hasNameMismatch(currentName: string, parsedName: string): boolean {
  return Boolean(currentName.trim()) && Boolean(parsedName.trim()) && normalizeName(currentName) !== normalizeName(parsedName);
}

// Every one of these is a list on ResumeDocument — the only sections that can
// be expanded into individually-checkable entries. Scalar fields (name,
// brand_initials, gdpr_clause) have nothing to expand, and mergeImportedResume
// already only fills those when the draft's own value is blank, so they're
// reviewed but not selectable.
type SectionKey = "contact" | "summary" | "experience" | "education" | "skills" | "languages" | "courses" | "interests";

const SECTION_LABELS: Array<{ key: SectionKey; label: string }> = [
  { key: "contact", label: "Contact details" },
  { key: "summary", label: "Summary" },
  { key: "experience", label: "Experience" },
  { key: "education", label: "Education" },
  { key: "skills", label: "Skills" },
  { key: "languages", label: "Languages" },
  { key: "courses", label: "Courses" },
  { key: "interests", label: "Interests" },
];

/** One boolean per parsed entry in that section, in the same order. Everything
 * starts checked — reviewing and deselecting a few entries is less friction
 * than opting every entry back in. */
type ImportSelection = Partial<Record<SectionKey, boolean[]>>;

// A native-schema round trip fills in every field via normalizeResumeDocument,
// including an empty array for a section the source file simply doesn't
// have — checking `.length > 0` (not just "is the key present") is what
// keeps an empty section from being reviewed as a pointless, expandable but
// empty "0 of 0 selected" row.
export function isSectionFound(resume: ImportedResumeSections, key: SectionKey): boolean {
  return (resume[key]?.length ?? 0) > 0;
}

function buildDefaultSelection(resume: ImportedResumeSections): ImportSelection {
  const selection: ImportSelection = {};
  for (const { key } of SECTION_LABELS) {
    const items = resume[key];
    if (items) selection[key] = items.map(() => true);
  }
  return selection;
}

/** Keeps only the checked entries of each list section; every other field
 * (scalars, and any list the user never touched) passes through unchanged. */
export function filterSelectedImportSections(resume: ImportedResumeSections, selection: ImportSelection): ImportedResumeSections {
  const next: ImportedResumeSections = { ...resume };
  for (const { key } of SECTION_LABELS) {
    const items = resume[key];
    const flags = selection[key];
    if (!items || !flags) continue;
    (next as Record<SectionKey, unknown[]>)[key] = items.filter((_, index) => flags[index]);
  }
  return next;
}

function joinMeta(parts: Array<string | number | null | undefined>): string {
  return parts.filter((part) => part !== undefined && part !== null && part !== "").join(" · ");
}

// One line per entry shape, mirroring the card title/meta split the human
// editor already uses for these same record types.
function describeImportItem(key: SectionKey, item: unknown): { title: string; meta: string } {
  switch (key) {
    case "experience": {
      const entry = item as ResumeExperience;
      return { title: entry.role || "Untitled role", meta: joinMeta([entry.company, entry.period]) };
    }
    case "education": {
      const entry = item as ResumeEducation;
      return { title: entry.degree || "Untitled degree", meta: joinMeta([entry.school, entry.period]) };
    }
    case "skills": {
      const entry = item as ResumeSkill;
      return { title: entry.name || "Untitled skill", meta: "" };
    }
    case "languages": {
      // Proficiency isn't shown here — checking the language still carries its
      // whole record (level included) into the draft, this is display-only.
      const entry = item as ResumeLanguage;
      return { title: entry.name || "Untitled language", meta: "" };
    }
    case "courses": {
      // Same as languages: the year still travels with the course when
      // checked, it's just not shown as a separate meta line here.
      const entry = item as ResumeCourse;
      return { title: entry.name || "Untitled course", meta: "" };
    }
    case "contact": {
      const entry = item as ResumeContactItem;
      return { title: entry.label, meta: entry.value };
    }
    case "summary": {
      const entry = item as ResumeSummaryItem;
      return { title: entry.position || "Untitled summary", meta: entry.default ? "Default" : "" };
    }
    case "interests":
      return { title: String(item), meta: "" };
  }
}

// Best-effort extraction, always shown for review before it touches the
// draft: parsing PDF/DOCX/plain-text CVs is heuristic, never guaranteed
// correct, so nothing here is applied until the user confirms it.
export default function ImportReviewModal({ isOpen, filename, result, currentName, onConfirm, onClose }: ImportReviewModalProps) {
  const [acknowledgedMismatch, setAcknowledgedMismatch] = useState(false);
  const [selection, setSelection] = useState<ImportSelection>({});
  const [reviewedResult, setReviewedResult] = useState<ResumeImportResult | null>(null);

  // A fresh parse means fresh review state — otherwise a mismatch
  // acknowledgement or deselected entries from a previous file would silently
  // carry over into the next one. Adjusting state during render (the pattern
  // React recommends over an effect for this) avoids an extra render with
  // stale selection before it catches up.
  if (result !== reviewedResult) {
    setReviewedResult(result);
    setSelection(result ? buildDefaultSelection(result.resume) : {});
    setAcknowledgedMismatch(false);
  }

  if (!isOpen || !result) return null;

  const parsedName = [result.resume.first_name, result.resume.family_name].filter(Boolean).join(" ");
  const sections = SECTION_LABELS.filter(({ key }) => isSectionFound(result.resume, key));
  const hasAnyField = Boolean(parsedName) || sections.length > 0;
  const skippedLabels = [
    ...(parsedName ? [] : ["Name"]),
    ...SECTION_LABELS.filter(({ key }) => !isSectionFound(result.resume, key)).map(({ label }) => label),
  ];

  const nameMismatch = hasNameMismatch(currentName, parsedName);
  const hasSelectedContent = Boolean(parsedName) || sections.some(({ key }) => (selection[key] || []).some(Boolean));
  const canApply = hasAnyField && hasSelectedContent && (!nameMismatch || acknowledgedMismatch);

  function toggleItem(key: SectionKey, index: number, checked: boolean) {
    setSelection((current) => {
      const flags = [...(current[key] ?? [])];
      flags[index] = checked;
      return { ...current, [key]: flags };
    });
  }

  function handleConfirm() {
    onConfirm(filterSelectedImportSections(result!.resume, selection));
  }

  return (
    <div className="dashboard-modal" role="dialog" aria-modal="true" aria-label="Review imported CV">
      <button type="button" className="dashboard-modal__backdrop" onClick={onClose} aria-label="Close import review"></button>
      <div className="dashboard-modal__body">
        <h2>Review import</h2>
        <p className="card-lead">
          Parsed <strong>{filename}</strong>. Expand a section to pick which entries to add — nothing you&apos;ve
          already entered is removed or replaced.
        </p>

        {hasAnyField ? (
          <ul className="import-review-list">
            {parsedName ? (
              <li className="import-review-row">
                <span>Name</span>
                <span className="import-review-list__value">{parsedName}</span>
              </li>
            ) : null}
            {sections.map(({ key, label }) => {
              const items = result.resume[key] ?? [];
              const flags = selection[key] ?? [];
              const selectedCount = flags.filter(Boolean).length;

              return (
                <li key={key}>
                  <details className="import-review-section">
                    <summary className="import-review-section__summary">
                      <span className="import-review-section__label">{label}</span>
                      <span className="import-review-list__value">
                        {selectedCount} of {items.length} selected
                      </span>
                    </summary>
                    <ul className="import-review-section__items">
                      {items.map((item, index) => {
                        const { title, meta } = describeImportItem(key, item);
                        return (
                          <li key={index}>
                            <label className="checkbox-row">
                              <input
                                type="checkbox"
                                checked={Boolean(flags[index])}
                                onChange={(event) => toggleItem(key, index, event.target.checked)}
                              />
                              <span className="import-review-section__item-label">
                                <span className="import-review-section__item-title">{title}</span>
                                {meta ? <span className="import-review-list__value">{meta}</span> : null}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="resume-editor-hint">Nothing usable was found in this file.</p>
        )}

        {skippedLabels.length > 0 && hasAnyField ? (
          <p className="resume-editor-hint">Not found, left as-is: {skippedLabels.join(", ")}.</p>
        ) : null}

        {result.warnings.length > 0 ? (
          <ul className="import-review-warnings">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}

        {nameMismatch ? (
          <div className="import-review-mismatch">
            <p>
              This file looks like it&apos;s for <strong>{parsedName}</strong>, but the current draft is for{" "}
              <strong>{currentName}</strong>. Adding it will mix {parsedName}&apos;s experience, education, and other
              details into {currentName}&apos;s draft.
            </p>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={acknowledgedMismatch}
                onChange={(event) => setAcknowledgedMismatch(event.target.checked)}
              />
              Add anyway, even though the names don&apos;t match
            </label>
          </div>
        ) : null}

        <div className="actions-row">
          <button type="button" className="button button--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={`button ${nameMismatch ? "button--danger" : "button--primary"}`}
            onClick={handleConfirm}
            disabled={!canApply}
          >
            Add to draft
          </button>
        </div>
      </div>
    </div>
  );
}
