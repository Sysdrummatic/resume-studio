"use client";

import { useState } from "react";
import type { ResumeImportResult } from "../lib/resume-import/parse-resume-file";

type ImportReviewModalProps = {
  isOpen: boolean;
  filename: string;
  result: ResumeImportResult | null;
  /** The draft's current name, to guard against overwriting one person's
   * draft with another person's parsed CV (see nameMismatch below). */
  currentName: string;
  onConfirm: () => void;
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

const SECTION_LABELS: Array<{ key: keyof NonNullable<ResumeImportResult["resume"]>; label: string }> = [
  { key: "contact", label: "Contact details" },
  { key: "summary", label: "Summary" },
  { key: "experience", label: "Experience" },
  { key: "education", label: "Education" },
  { key: "skills", label: "Skills" },
  { key: "languages", label: "Languages" },
  { key: "courses", label: "Courses" },
  { key: "interests", label: "Interests" },
];

function describeField(value: unknown): string {
  if (Array.isArray(value)) return `${value.length} ${value.length === 1 ? "entry" : "entries"} found`;
  return "Found";
}

// Best-effort extraction, always shown for review before it touches the
// draft: parsing PDF/DOCX/plain-text CVs is heuristic, never guaranteed
// correct, so nothing here is applied until the user confirms it.
export default function ImportReviewModal({ isOpen, filename, result, currentName, onConfirm, onClose }: ImportReviewModalProps) {
  const [acknowledgedMismatch, setAcknowledgedMismatch] = useState(false);

  if (!isOpen || !result) return null;

  const parsedName = [result.resume.first_name, result.resume.family_name].filter(Boolean).join(" ");
  const nameLabel = { key: "__name" as const, label: "Name" };
  const fields = [
    ...(parsedName ? [nameLabel] : []),
    ...SECTION_LABELS.filter(({ key }) => result.resume[key] !== undefined),
  ];
  const skippedFields = [
    ...(parsedName ? [] : [nameLabel]),
    ...SECTION_LABELS.filter(({ key }) => result.resume[key] === undefined),
  ];

  const nameMismatch = hasNameMismatch(currentName, parsedName);
  const canApply = fields.length > 0 && (!nameMismatch || acknowledgedMismatch);

  return (
    <div className="dashboard-modal" role="dialog" aria-modal="true" aria-label="Review imported CV">
      <button type="button" className="dashboard-modal__backdrop" onClick={onClose} aria-label="Close import review"></button>
      <div className="dashboard-modal__body">
        <h2>Review import</h2>
        <p className="card-lead">
          Parsed <strong>{filename}</strong>. Only the sections below were found — they&apos;ll be added to what&apos;s
          already in your draft. Nothing you&apos;ve already entered is removed or replaced.
        </p>

        {fields.length > 0 ? (
          <ul className="import-review-list">
            {fields.map(({ key, label }) => (
              <li key={key}>
                <span>{label}</span>
                <span className="import-review-list__value">
                  {key === "__name" ? parsedName : describeField(result.resume[key as keyof NonNullable<ResumeImportResult["resume"]>])}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="resume-editor-hint">Nothing usable was found in this file.</p>
        )}

        {skippedFields.length > 0 && fields.length > 0 ? (
          <p className="resume-editor-hint">
            Not found, left as-is: {skippedFields.map(({ label }) => label).join(", ")}.
          </p>
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
            onClick={onConfirm}
            disabled={!canApply}
          >
            Add to draft
          </button>
        </div>
      </div>
    </div>
  );
}
