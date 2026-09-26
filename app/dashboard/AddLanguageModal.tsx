"use client";

import { useEffect, useState } from "react";
import type { ResumeUserLocaleRow } from "../lib/resume-server";
import { useAppI18n } from "../components/app-i18n-provider";

interface AddLanguageModalProps {
  existingLanguageCodes: string[];
  onClose: () => void;
  onSuccess: (language: ResumeUserLocaleRow) => void;
  language?: ResumeUserLocaleRow | null;
  isDeleting?: boolean;
  onDelete?: (language: ResumeUserLocaleRow) => Promise<void>;
  onSetDefault?: (language: ResumeUserLocaleRow) => Promise<void>;
}

interface ApiResponse {
  ok?: boolean;
  error?: string;
  language?: ResumeUserLocaleRow;
}

export function AddLanguageModal({
  existingLanguageCodes,
  onClose,
  onSuccess,
  language = null,
  isDeleting = false,
  onDelete,
  onSetDefault,
}: AddLanguageModalProps) {
  const { dictionary } = useAppI18n();
  const labels = dictionary.dashboard.language_modal;
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [shortLabel, setShortLabel] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = Boolean(language);

  useEffect(() => {
    setCode(language?.code || "");
    setLabel(language?.label || "");
    setShortLabel(language?.short_label || "");
    setError("");
  }, [language]);

  function normalizeCode(input: string): string {
    return input.toLowerCase().trim().slice(0, 2);
  }

  function validateForm(): boolean {
    setError("");

    const normalized = normalizeCode(code);
    if (!normalized || normalized.length !== 2) {
      setError(labels.code_length);
      return false;
    }

    if (!/^[a-z]{2}$/.test(normalized)) {
      setError(labels.code_letters);
      return false;
    }

    if (!isEditing && existingLanguageCodes.includes(normalized)) {
      setError(labels.exists);
      return false;
    }

    if (!label.trim()) {
      setError(labels.name_required);
      return false;
    }

    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    const normalized = normalizeCode(code);

    try {
      const response = await fetch("/api/resume/languages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: normalized,
          label: label.trim(),
          shortLabel: shortLabel.trim() || undefined,
          createDocument: true,
          setDefault: false,
        }),
      });

      const result = (await response.json()) as ApiResponse;

      if (!response.ok || result.error || !result.language) {
        setError(result.error || labels.add_failed);
        return;
      }

      onSuccess(result.language);
    } catch {
      setError(labels.network_error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="dashboard-modal" role="dialog" aria-modal="true" aria-label={isEditing ? labels.edit_aria : labels.add_aria}>
      <button
        type="button"
        className="dashboard-modal__backdrop"
        onClick={onClose}
        aria-label={labels.close_aria}
      />
      <div className="dashboard-modal__body dashboard-modal__body--compact">
        <div className="stack">
          <div className="product-surface__eyebrow">{labels.eyebrow}</div>
          <h2 className="dashboard-modal__title">{isEditing ? labels.edit_title : labels.add_title}</h2>
          <p className="dashboard-modal__copy">
            {isEditing ? labels.edit_description : labels.add_description}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="dashboard-modal__form">
          <label>
            <span className="dashboard-modal__field-label">{labels.code}</span>
            <input
              type="text"
              placeholder={labels.code_placeholder}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isLoading || isEditing}
              maxLength={2}
            />
          </label>

          <label>
            <span className="dashboard-modal__field-label">{labels.name}</span>
            <input
              type="text"
              placeholder={labels.name_placeholder}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={isLoading}
            />
          </label>

          <label>
            <span className="dashboard-modal__field-label">{labels.short_label}</span>
            <input
              type="text"
              placeholder={labels.short_placeholder}
              value={shortLabel}
              onChange={(e) => setShortLabel(e.target.value)}
              disabled={isLoading}
              maxLength={4}
            />
          </label>

          {error ? <div className="dashboard-modal__error">{error}</div> : null}

          <div className="dashboard-modal__footer">
            {isEditing && onDelete && language ? (
              <button
                type="button"
                onClick={() => void onDelete(language)}
                disabled={isLoading || isDeleting}
                className="button button--ghost button--danger"
              >
                {isDeleting ? labels.removing : labels.remove}
              </button>
            ) : null}
            {isEditing && onSetDefault && language && !language.is_default ? (
              <button
                type="button"
                onClick={() => void onSetDefault(language)}
                disabled={isLoading}
                className="button button--ghost"
              >
                {labels.set_default}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="button button--ghost"
            >
              {labels.cancel}
            </button>
            <button type="submit" disabled={isLoading} className="button button--primary">
              {isLoading ? (isEditing ? labels.saving : labels.adding) : isEditing ? labels.save : labels.add}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
