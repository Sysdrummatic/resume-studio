"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusToast, useStatusToast } from "../components/status-toast";
import type { ResumeDocumentRow, ResumeLanguageRow } from "../lib/resume-server";

type LanguageVersion = ResumeLanguageRow & {
  document: ResumeDocumentRow | null;
};

type Props = {
  initialLanguages: LanguageVersion[];
  initialDefaultLocale: string;
};

type LanguageApiResponse = {
  ok?: boolean;
  error?: string;
  language?: ResumeLanguageRow;
  document?: ResumeDocumentRow | null;
  defaultLocale?: string;
};

const DEFAULT_LABELS = {
  language_switcher: "Language",
  summary_heading: "Summary",
  experience_heading: "Experience",
  education_heading: "Education",
  courses_heading: "Courses",
  personal_info_heading: "Personal Info",
  skills_heading: "Skills",
  tech_stack_heading: "Tech stack",
  languages_heading: "Languages",
  interests_heading: "Interests",
  public_view_badge: "Public view",
  private_view_badge: "Private view",
  draft_view_badge: "Draft",
  ai_generated_badge: "AI generated",
};

function normalizeCode(value: string) {
  return value.trim().toLowerCase().split("-")[0].slice(0, 2);
}

function normalizeShortLabel(value: string, code: string) {
  return (value.trim() || code).toUpperCase().slice(0, 2);
}

function mergeLanguageVersion(current: LanguageVersion[], next: LanguageVersion) {
  const exists = current.some((language) => language.code === next.code);
  if (!exists) {
    return [...current, next].sort((left, right) => left.sort_order - right.sort_order || left.code.localeCompare(right.code));
  }
  return current.map((language) => (language.code === next.code ? next : language));
}

export default function LanguageVersionsClient({ initialLanguages, initialDefaultLocale }: Props) {
  const [languages, setLanguages] = useState(initialLanguages);
  const [defaultLocale, setDefaultLocale] = useState(initialDefaultLocale);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [shortLabel, setShortLabel] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const { toast, showToast, closeToast } = useStatusToast();

  const normalizedCode = useMemo(() => normalizeCode(code), [code]);
  const normalizedShortLabel = useMemo(() => normalizeShortLabel(shortLabel, normalizedCode), [shortLabel, normalizedCode]);
  const existingCodes = useMemo(() => new Set(languages.map((language) => language.code)), [languages]);

  function validateForm() {
    const errors: string[] = [];
    if (!/^[a-z]{2}$/.test(normalizedCode)) {
      errors.push("Use a two-letter language code.");
    }
    if (!label.trim()) {
      errors.push("Language name is required.");
    }
    if (!/^[A-Z]{2}$/.test(normalizedShortLabel)) {
      errors.push("Short label must contain two letters.");
    }
    if (existingCodes.has(normalizedCode)) {
      errors.push("This language already exists. Use the version list below to edit it.");
    }
    return errors;
  }

  async function saveLanguageVersion() {
    const errors = validateForm();
    if (errors.length > 0) {
      setError(errors.join(" "));
      return;
    }

    setError("");
    setIsSaving(true);
    const response = await fetch("/api/resume/languages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: normalizedCode,
        label: label.trim(),
        shortLabel: normalizedShortLabel,
        labels: DEFAULT_LABELS,
        createDocument: true,
      }),
    });
    const payload = (await response.json()) as LanguageApiResponse;
    setIsSaving(false);

    if (!response.ok || payload.error || !payload.language) {
      showToast(payload.error || "Language version save failed.", "error");
      return;
    }

    setLanguages((current) =>
      mergeLanguageVersion(current, {
        ...payload.language!,
        document: payload.document || null,
      }),
    );
    setCode("");
    setLabel("");
    setShortLabel("");
    showToast(existingCodes.has(normalizedCode) ? "Language document prepared." : "Language version created.");
  }

  async function setDefaultLanguage(code: string) {
    const response = await fetch("/api/resume/languages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, setDefault: true }),
    });
    const payload = (await response.json()) as LanguageApiResponse;
    if (!response.ok || payload.error) {
      showToast(payload.error || "Default language update failed.", "error");
      return;
    }
    setDefaultLocale(payload.defaultLocale || code);
    showToast("Default language updated.");
  }

  return (
    <div className="language-versions">
      <StatusToast toast={toast} onClose={closeToast} />

      <section className="language-versions__panel">
        <div>
          <h2>Add language</h2>
          <p className="card-lead">A new version creates language metadata and prepares a resume document for the editor.</p>
        </div>

        <div className="language-versions__form">
          <label>
            Code
            <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="de" maxLength={8} />
          </label>
          <label>
            Language name
            <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Deutsch" />
          </label>
          <label>
            Short label
            <input value={shortLabel} onChange={(event) => setShortLabel(event.target.value)} placeholder={normalizedShortLabel || "DE"} maxLength={4} />
          </label>
        </div>

        {error ? <p className="status status--error">{error}</p> : null}

        <div className="actions-row">
          <button type="button" className="button button--primary" onClick={() => void saveLanguageVersion()} disabled={isSaving}>
            {isSaving ? "Creating..." : "Create version"}
          </button>
          {normalizedCode ? (
            <Link className="button button--ghost" href={`/master-resume?locale=${encodeURIComponent(normalizedCode)}`}>
              Open in editor
            </Link>
          ) : null}
        </div>
      </section>

      <section className="language-versions__panel">
        <div className="section-row">
          <div>
            <h2>Versions</h2>
            <p className="card-lead">{languages.length} configured languages</p>
          </div>
        </div>

        <ul className="language-versions__list">
          {languages.map((language) => (
            <li key={language.code}>
              <div className="language-versions__identity">
                <span>{language.short_label}</span>
                <div>
                  <strong>{language.label}</strong>
                  <p>{language.code}</p>
                </div>
              </div>
              <div className="language-versions__meta">
                <span className={`dashboard-resume-list__badge ${language.document ? "" : "dashboard-resume-list__badge--private"}`}>
                  {language.document?.is_public ? "Public" : language.document ? "Draft" : "No document"}
                </span>
                {language.code === defaultLocale ? <span className="dashboard-resume-list__badge">Default</span> : null}
                {language.document ? <small>Updated {new Date(language.document.updated_at).toLocaleString()}</small> : null}
              </div>
              {language.document ? (
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={() => void setDefaultLanguage(language.code)}
                  disabled={language.code === defaultLocale}
                >
                  Set default
                </button>
              ) : null}
              <Link className="button button--ghost button--small" href={`/master-resume?locale=${encodeURIComponent(language.code)}`}>
                Edit
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
