"use client";

import type { ResumeImportResult } from "../lib/resume-import/parse-resume-file";

type ImportReviewModalProps = {
  isOpen: boolean;
  filename: string;
  result: ResumeImportResult | null;
  isApplying: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

const SECTION_LABELS: Array<{ key: keyof NonNullable<ResumeImportResult["resume"]>; label: string }> = [
  { key: "name", label: "Name" },
  { key: "contact", label: "Contact details" },
  { key: "summary", label: "Summary" },
  { key: "experience", label: "Experience" },
  { key: "education", label: "Education" },
  { key: "skills", label: "Skills" },
  { key: "languages", label: "Languages" },
  { key: "courses", label: "Courses" },
  { key: "interests", label: "Interests" },
];

function describeField(key: string, value: unknown): string {
  if (key === "name") return String(value);
  if (Array.isArray(value)) return `${value.length} ${value.length === 1 ? "entry" : "entries"} found`;
  return "Found";
}

// Best-effort extraction, always shown for review before it touches the
// draft: parsing PDF/DOCX/plain-text CVs is heuristic, never guaranteed
// correct, so nothing here is applied until the user confirms it.
export default function ImportReviewModal({ isOpen, filename, result, isApplying, onConfirm, onClose }: ImportReviewModalProps) {
  if (!isOpen || !result) return null;

  const fields = SECTION_LABELS.filter(({ key }) => result.resume[key] !== undefined);
  const skippedFields = SECTION_LABELS.filter(({ key }) => result.resume[key] === undefined);

  return (
    <div className="dashboard-modal" role="dialog" aria-modal="true" aria-label="Review imported CV">
      <button type="button" className="dashboard-modal__backdrop" onClick={onClose} aria-label="Close import review" disabled={isApplying}></button>
      <div className="dashboard-modal__body">
        <h2>Review import</h2>
        <p className="card-lead">
          Parsed <strong>{filename}</strong>. Only the sections below were found — everything else in your current
          draft stays untouched. Check this over before it replaces those sections.
        </p>

        {fields.length > 0 ? (
          <ul className="import-review-list">
            {fields.map(({ key, label }) => (
              <li key={key}>
                <span>{label}</span>
                <span className="import-review-list__value">{describeField(key, result.resume[key])}</span>
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

        <div className="actions-row">
          <button type="button" className="button button--ghost" onClick={onClose} disabled={isApplying}>
            Cancel
          </button>
          <button type="button" className="button button--primary" onClick={onConfirm} disabled={isApplying || fields.length === 0}>
            {isApplying ? "Applying..." : "Apply to draft"}
          </button>
        </div>
      </div>
    </div>
  );
}
