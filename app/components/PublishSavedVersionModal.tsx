"use client";

import { useMemo, useState } from "react";
import { Button } from "./design-system/atoms/Button";
import type { ResumeLocale } from "../lib/resume-schema";
import type { ResumePresetRow } from "../lib/resume-server";

function getFallbackLanguageLabel(locale: string): { label: string; shortLabel: string } {
  if (locale === "en") return { label: "English", shortLabel: "EN" };
  if (locale === "pl") return { label: "Polski", shortLabel: "PL" };
  if (locale === "de") return { label: "Deutsch", shortLabel: "DE" };
  return { label: locale.toUpperCase(), shortLabel: locale.slice(0, 2).toUpperCase() };
}

type LanguageMetadata = {
  code: ResumeLocale;
  label: string;
};

export type PublishDraft = {
  preset: ResumePresetRow;
  selectedLocales: ResumeLocale[];
  defaultLocale: ResumeLocale;
  allowIndexing: boolean;
};

type Props = {
  draft: PublishDraft;
  locales: ResumeLocale[];
  languageOptions: LanguageMetadata[];
  onClose: () => void;
  onPublish: (payload: {
    preset: ResumePresetRow;
    selectedLocales: ResumeLocale[];
    defaultLocale: ResumeLocale;
    allowIndexing: boolean;
  }) => Promise<void>;
};

export default function PublishSavedVersionModal({
  draft,
  locales,
  languageOptions,
  onClose,
  onPublish,
}: Props) {
  const [selectedLocales, setSelectedLocales] = useState<ResumeLocale[]>(draft.selectedLocales);
  const [defaultLocale, setDefaultLocale] = useState<ResumeLocale>(draft.defaultLocale);
  const [allowIndexing, setAllowIndexing] = useState(draft.allowIndexing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const languageLabel = useMemo(() => {
    const map = new Map(languageOptions.map((item) => [item.code, item.label]));
    return (locale: ResumeLocale) => map.get(locale) || getFallbackLanguageLabel(locale).label;
  }, [languageOptions]);

  function toggleLocale(nextLocale: ResumeLocale) {
    setSelectedLocales((current) => {
      const set = new Set(current);
      if (set.has(nextLocale)) {
        set.delete(nextLocale);
      } else {
        set.add(nextLocale);
      }
      const next = Array.from(set).sort();
      if (!next.includes(defaultLocale) && next.length > 0) {
        setDefaultLocale(next[0]);
      }
      return next;
    });
  }

  async function submit() {
    if (selectedLocales.length === 0) {
      setError("Select at least one language version.");
      return;
    }
    if (!selectedLocales.includes(defaultLocale)) {
      setError("Default language must be included in selected languages.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    await onPublish({ preset: draft.preset, selectedLocales, defaultLocale, allowIndexing });
    setIsSubmitting(false);
  }

  return (
    <div className="dashboard-modal" role="dialog" aria-modal="true" aria-label="Publish CV Version">
      <button type="button" className="dashboard-modal__backdrop" onClick={onClose} aria-label="Close publish modal"></button>
      <div className="dashboard-modal__body">
        <div className="section-row">
          <h2>Publish CV Version</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <p className="card-lead">{draft.preset.title}</p>

        <section className="stack">
          <h3>Language Versions</h3>
          {locales.map((nextLocale) => (
            <label key={nextLocale} className="checkbox-row">
              <input type="checkbox" checked={selectedLocales.includes(nextLocale)} onChange={() => toggleLocale(nextLocale)} />
              {languageLabel(nextLocale)}
            </label>
          ))}
        </section>

        <label>
          Default language
          <select value={defaultLocale} onChange={(event) => setDefaultLocale(event.target.value as ResumeLocale)}>
            {selectedLocales.map((nextLocale) => (
              <option key={nextLocale} value={nextLocale}>
                {languageLabel(nextLocale)}
              </option>
            ))}
          </select>
        </label>

        <label className="checkbox-row">
          <input type="checkbox" checked={allowIndexing} onChange={(event) => setAllowIndexing(event.target.checked)} />
          Allow indexing for this Published CV
        </label>

        <div className="card stack">
          <strong>Link state after publish</strong>
          <p className="card-lead">Canonical URL is the permanent public link for this version.</p>
        </div>

        {error ? <p className="status status--error">{error}</p> : null}

        <div className="actions-row">
          <Button variant="primary" onClick={() => void submit()} disabled={isSubmitting}>
            {isSubmitting ? "Publishing..." : "Publish CV Version"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
