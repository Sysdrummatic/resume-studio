"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { normalizeResumeDocument } from "../lib/resume-schema";
import type { ResumeDocument, ResumeLocale } from "../lib/resume-schema";
import type { ResumeDocumentRow, ResumeLanguageRow, ResumePresetRow, ResumePresetSelection } from "../lib/resume-server";
import { StatusToast, useStatusToast } from "../components/status-toast";
import { BasicResumeDocument } from "../master-resume/resume-live-preview";
import type { ResumeLanguageOption } from "../components/resume-language-switcher";

type Props = {
  masterResume: ResumeDocumentRow | null;
  initialDocuments: ResumeDocumentRow[];
  languageOptions: ResumeLanguageRow[];
  initialPresets: ResumePresetRow[];
};

type PresetOptionKey = keyof ResumePresetSelection;

type PresetOption = {
  key: PresetOptionKey;
  label: string;
  items: string[];
};

type PresetApiResponse = {
  ok?: boolean;
  error?: string;
  preset?: ResumePresetRow;
};

type PublishDraft = {
  preset: ResumePresetRow;
  selectedLocales: ResumeLocale[];
  defaultLocale: ResumeLocale;
  allowIndexing: boolean;
};

const EMPTY_SELECTION: ResumePresetSelection = {
  summary: [],
  experience: [],
  education: [],
  courses: [],
  skills: [],
  interests: [],
  languages: [],
  tech_stack: [],
};

const OPTION_LABELS: Record<PresetOptionKey, string> = {
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  courses: "Courses",
  skills: "Skills",
  interests: "Interests",
  languages: "Languages",
  tech_stack: "Tech stack",
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function itemText(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

function formatOptionItem(key: PresetOptionKey, item: unknown, index: number) {
  const row = asObject(item);
  switch (key) {
    case "summary":
      return itemText(row.position, `Summary ${index + 1}`);
    case "experience":
      return [row.role, row.company].filter((part) => typeof part === "string" && part.trim()).join(" · ") || `Experience ${index + 1}`;
    case "education":
      return [row.school, row.detail].filter((part) => typeof part === "string" && part.trim()).join(" · ") || `Education ${index + 1}`;
    case "courses":
      return [row.year, row.name].filter((part) => String(part ?? "").trim()).join(" · ") || `Course ${index + 1}`;
    case "skills":
    case "languages":
      return itemText(row.name, `${OPTION_LABELS[key]} ${index + 1}`);
    case "interests":
    case "tech_stack":
      return itemText(item, `${OPTION_LABELS[key]} ${index + 1}`);
    default:
      return `Item ${index + 1}`;
  }
}

function getDefaultSummaryIndex(summary: unknown) {
  if (!Array.isArray(summary)) return 0;
  const index = summary.findIndex((item) => {
    const row = asObject(item);
    return row.default === true || (typeof row.default === "string" && row.default.toLowerCase() === "true");
  });
  return index >= 0 ? index : 0;
}

function buildPresetOptions(yamlContent: string): PresetOption[] {
  if (!yamlContent || !window.jsyaml) return [];
  const parsed = asObject(window.jsyaml.load(yamlContent));
  return (Object.keys(OPTION_LABELS) as PresetOptionKey[]).map((key) => ({
    key,
    label: OPTION_LABELS[key],
    items: Array.isArray(parsed[key]) ? parsed[key].map((item, index) => formatOptionItem(key, item, index)) : [],
  }));
}

function createSelectionFromOptions(options: PresetOption[], yamlContent: string): ResumePresetSelection {
  const parsed = window.jsyaml ? asObject(window.jsyaml.load(yamlContent)) : {};
  return options.reduce<ResumePresetSelection>((selection, option) => {
    if (option.key === "summary") {
      return {
        ...selection,
        summary: option.items.length > 0 ? [getDefaultSummaryIndex(parsed.summary)] : [],
      };
    }
    return {
      ...selection,
      [option.key]: option.items.map((_, index) => index),
    };
  }, { ...EMPTY_SELECTION });
}

function normalizeSummarySelection(selection: ResumePresetSelection, options: PresetOption[]): ResumePresetSelection {
  const summaryOption = options.find((option) => option.key === "summary");
  if (!summaryOption || summaryOption.items.length !== 1) {
    return selection;
  }
  return {
    ...selection,
    summary: [0],
  };
}

function selectByIndex<T>(items: T[], indexes: number[]) {
  return indexes.map((index) => items[index]).filter((item): item is T => item !== undefined);
}

function parseResumeYaml(yamlContent: string) {
  if (!yamlContent || !window.jsyaml) return null;
  try {
    return normalizeResumeDocument(window.jsyaml.load(yamlContent), "");
  } catch {
    return null;
  }
}

function buildPresetResumeDocument(yamlContent: string, selection: ResumePresetSelection): ResumeDocument | null {
  const masterDocument = parseResumeYaml(yamlContent);
  if (!masterDocument) return null;

  const selectedSummary = selectByIndex(masterDocument.summary, selection.summary).map((summary, index) => ({
    ...summary,
    default: index === 0,
  }));

  return {
    ...masterDocument,
    summary: selectedSummary,
    experience: selectByIndex(masterDocument.experience, selection.experience),
    education: selectByIndex(masterDocument.education, selection.education),
    courses: selectByIndex(masterDocument.courses, selection.courses),
    skills: selectByIndex(masterDocument.skills, selection.skills),
    interests: selectByIndex(masterDocument.interests, selection.interests),
    languages: selectByIndex(masterDocument.languages, selection.languages),
    tech_stack: selectByIndex(masterDocument.tech_stack, selection.tech_stack),
  };
}

function getFallbackLanguageLabel(locale: string): { label: string; shortLabel: string } {
  if (locale === "en") return { label: "English", shortLabel: "EN" };
  if (locale === "pl") return { label: "Polski", shortLabel: "PL" };
  if (locale === "de") return { label: "Deutsch", shortLabel: "DE" };
  return { label: locale.toUpperCase(), shortLabel: locale.slice(0, 2).toUpperCase() };
}

function buildLanguageOptions(documents: ResumeDocumentRow[], languages: ResumeLanguageRow[]): ResumeLanguageOption[] {
  const metadata = new Map(languages.map((language) => [language.code, language]));
  return documents
    .map((document) => {
      const fallback = getFallbackLanguageLabel(document.locale);
      const language = metadata.get(document.locale);
      return {
        code: document.locale,
        label: language?.label || fallback.label,
        shortLabel: language?.short_label || fallback.shortLabel,
      };
    })
    .sort((left, right) => left.code.localeCompare(right.code));
}

function mergePreset(current: ResumePresetRow[], nextPreset: ResumePresetRow) {
  const exists = current.some((preset) => preset.id === nextPreset.id);
  if (!exists) return [nextPreset, ...current];
  return current.map((preset) => (preset.id === nextPreset.id ? nextPreset : preset));
}

function TrashIcon() {
  return (
    <svg className="button__icon" aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

function PresetModal({
  masterResume,
  preset,
  options,
  onClose,
  onSave,
}: {
  masterResume: ResumeDocumentRow;
  preset: ResumePresetRow | null;
  options: PresetOption[];
  onClose: () => void;
  onSave: (payload: { presetId?: string; title: string; selection: ResumePresetSelection; allowIndexing: boolean; aiGenerated: boolean }) => Promise<void>;
}) {
  const [title, setTitle] = useState(preset?.title || "");
  const [allowIndexing, setAllowIndexing] = useState(preset?.allow_indexing || false);
  const [aiGenerated, setAiGenerated] = useState(preset?.ai_generated || false);
  const [selection, setSelection] = useState<ResumePresetSelection>(
    normalizeSummarySelection(preset?.selection || createSelectionFromOptions(options, masterResume.yaml_content), options),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleIndex(key: PresetOptionKey, index: number) {
    setSelection((current) => {
      if (key === "summary") {
        return { ...current, summary: [index] };
      }
      const set = new Set(current[key]);
      if (set.has(index)) {
        set.delete(index);
      } else {
        set.add(index);
      }
      return {
        ...current,
        [key]: Array.from(set).sort((left, right) => left - right),
      };
    });
  }

  async function handleSave() {
    const nextSelection = normalizeSummarySelection(selection, options);
    if (!title.trim()) {
      setError("CV Version title is required.");
      return;
    }
    if (nextSelection.summary.length !== 1) {
      setError("Select exactly one summary.");
      return;
    }
    setError("");
    setIsSaving(true);
    await onSave({ presetId: preset?.id, title, selection: nextSelection, allowIndexing, aiGenerated });
    setIsSaving(false);
  }

  return (
    <div className="dashboard-modal" role="dialog" aria-modal="true" aria-label="CV Version editor">
      <button type="button" className="dashboard-modal__backdrop" onClick={onClose} aria-label="Close CV Version editor"></button>
      <div className="dashboard-modal__body">
        <div className="section-row">
          <h2>{preset ? "Edit CV Version" : "Create CV Version"}</h2>
          <button type="button" className="button button--ghost button--small" onClick={onClose}>
            Close
          </button>
        </div>

        <label>
          CV Version title
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Frontend Engineer - Acme" />
        </label>

        <label className="checkbox-row">
          <input type="checkbox" checked={allowIndexing} onChange={(event) => setAllowIndexing(event.target.checked)} />
          Allow indexing after publish
        </label>

        <label className="checkbox-row">
          <input type="checkbox" checked={aiGenerated} onChange={(event) => setAiGenerated(event.target.checked)} />
          Mark as AI generated
        </label>

        <div className="dashboard-preset-options">
          {options.map((option) => (
            <section key={option.key} className="dashboard-preset-options__section">
              <h3>{option.label}</h3>
              {option.items.length === 0 ? (
                <p className="card-lead">No items in master resume.</p>
              ) : (
                option.items.map((item, index) => {
                  const summaryChoiceEnabled = option.key !== "summary" || option.items.length > 1;
                  return (
                    <label key={`${option.key}-${index}`} className="checkbox-row">
                      <input
                        type={option.key === "summary" ? "radio" : "checkbox"}
                        name={option.key === "summary" ? "preset-summary" : undefined}
                        checked={option.key === "summary" && option.items.length === 1 ? true : selection[option.key].includes(index)}
                        disabled={!summaryChoiceEnabled}
                        onChange={() => toggleIndex(option.key, index)}
                      />
                      {item}
                    </label>
                  );
                })
              )}
            </section>
          ))}
        </div>

        {error ? <p className="status status--error">{error}</p> : null}

        <div className="actions-row">
          <button type="button" className="button button--primary" onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save CV Version"}
          </button>
          <button type="button" className="button button--ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function PresetPreviewModal({
  masterResume,
  documents,
  languages,
  preset,
  onClose,
}: {
  masterResume: ResumeDocumentRow;
  documents: ResumeDocumentRow[];
  languages: ResumeLanguageRow[];
  preset: ResumePresetRow;
  onClose: () => void;
}) {
  const availableDocuments = documents.length ? documents : [masterResume];
  const initialLocale = availableDocuments.some((document) => document.locale === preset.default_locale)
    ? preset.default_locale
    : masterResume.locale;
  const [activeLocale, setActiveLocale] = useState<ResumeLocale>(initialLocale);
  const activeDocument =
    availableDocuments.find((document) => document.locale === activeLocale) ||
    availableDocuments.find((document) => document.locale === masterResume.locale) ||
    masterResume;
  const previewResume = buildPresetResumeDocument(activeDocument.yaml_content, preset.selection);
  const cvLanguages = buildLanguageOptions(availableDocuments, languages);

  return (
    <div className="dashboard-modal" role="dialog" aria-modal="true" aria-label="CV Version CV preview">
      <button type="button" className="dashboard-modal__backdrop" onClick={onClose} aria-label="Close CV preview"></button>
      <div className="dashboard-modal__body dashboard-modal__body--preview">
        <div className="section-row">
          <h2>{preset.title}</h2>
          <button type="button" className="button button--ghost button--small" onClick={onClose}>
            Close
          </button>
        </div>
        {previewResume ? (
          <div className="dashboard-preset-preview">
            <BasicResumeDocument
              locale={activeDocument.locale}
              resume={previewResume}
              languages={cvLanguages}
              onLanguageSelect={setActiveLocale}
              status={preset.is_public ? "public" : "draft"}
              aiGenerated={preset.ai_generated}
            />
          </div>
        ) : (
          <p className="status status--error">CV preview could not be rendered from the master resume.</p>
        )}
      </div>
    </div>
  );
}

function PublishSavedVersionModal({
  draft,
  locales,
  languageOptions,
  onClose,
  onPublish,
}: {
  draft: PublishDraft;
  locales: ResumeLocale[];
  languageOptions: ResumeLanguageRow[];
  onClose: () => void;
  onPublish: (payload: { preset: ResumePresetRow; selectedLocales: ResumeLocale[]; defaultLocale: ResumeLocale; allowIndexing: boolean }) => Promise<void>;
}) {
  const [selectedLocales, setSelectedLocales] = useState<ResumeLocale[]>(draft.selectedLocales);
  const [defaultLocale, setDefaultLocale] = useState<ResumeLocale>(draft.defaultLocale);
  const [allowIndexing, setAllowIndexing] = useState(draft.allowIndexing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const languageLabel = useMemo(() => {
    const map = new Map(languageOptions.map((item) => [item.code, item.label]));
    return (locale: ResumeLocale) => map.get(locale) || getFallbackLanguageLabel(locale).label;
  }, [languageOptions]);

  function toggleLocale(locale: ResumeLocale) {
    setSelectedLocales((current) => {
      const set = new Set(current);
      if (set.has(locale)) {
        set.delete(locale);
      } else {
        set.add(locale);
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
          <button type="button" className="button button--ghost button--small" onClick={onClose}>
            Close
          </button>
        </div>

        <p className="card-lead">{draft.preset.title}</p>

        <section className="stack">
          <h3>Language Versions</h3>
          {locales.map((locale) => (
            <label key={locale} className="checkbox-row">
              <input type="checkbox" checked={selectedLocales.includes(locale)} onChange={() => toggleLocale(locale)} />
              {languageLabel(locale)}
            </label>
          ))}
        </section>

        <label>
          Default language
          <select value={defaultLocale} onChange={(event) => setDefaultLocale(event.target.value as ResumeLocale)}>
            {selectedLocales.map((locale) => (
              <option key={locale} value={locale}>
                {languageLabel(locale)}
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
          <p className="card-lead">Canonical URL is primary. Legacy /r/[slug] remains compatibility-only.</p>
        </div>

        {error ? <p className="status status--error">{error}</p> : null}

        <div className="actions-row">
          <button type="button" className="button button--primary" onClick={() => void submit()} disabled={isSubmitting}>
            {isSubmitting ? "Publishing..." : "Publish CV Version"}
          </button>
          <button type="button" className="button button--ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardClient({ masterResume, initialDocuments, languageOptions, initialPresets }: Props) {
  const [presets, setPresets] = useState(initialPresets);
  const [options, setOptions] = useState<PresetOption[]>([]);
  const [activePreset, setActivePreset] = useState<ResumePresetRow | null>(null);
  const [previewPreset, setPreviewPreset] = useState<ResumePresetRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast, showToast, closeToast } = useStatusToast();
  const [deletingPresetId, setDeletingPresetId] = useState<string | null>(null);
  const [publishDraft, setPublishDraft] = useState<PublishDraft | null>(null);

  useEffect(() => {
    if (!masterResume) return;
    let retries = 0;
    const timer = window.setInterval(() => {
      if (window.jsyaml || retries > 30) {
        window.clearInterval(timer);
        setOptions(buildPresetOptions(masterResume.yaml_content));
      }
      retries += 1;
    }, 100);

    return () => window.clearInterval(timer);
  }, [masterResume]);

  const hasMasterResume = Boolean(masterResume);
  const latestMasterUpdate = masterResume ? new Date(masterResume.updated_at).toLocaleString() : "Not saved yet";
  const publishableLocales = (initialDocuments.length ? initialDocuments : masterResume ? [masterResume] : []).map((doc) => doc.locale);

  async function savePreset(payload: { presetId?: string; title: string; selection: ResumePresetSelection; allowIndexing: boolean; aiGenerated: boolean }) {
    if (!masterResume) return;
    const response = await fetch(payload.presetId ? `/api/resume/presets/${encodeURIComponent(payload.presetId)}` : "/api/resume/presets", {
      method: payload.presetId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: masterResume.id,
        title: payload.title,
        selection: payload.selection,
        allowIndexing: payload.allowIndexing,
        aiGenerated: payload.aiGenerated,
        defaultLocale: masterResume.locale,
        isPublic: false,
      }),
    });
    const result = (await response.json()) as PresetApiResponse;
    if (!response.ok || result.error || !result.preset) {
      showToast(result.error || "CV Version save failed.", "error");
      return;
    }
    setPresets((current) => mergePreset(current, result.preset!));
    showToast("CV Version saved.");
    setIsModalOpen(false);
    setActivePreset(null);
  }

  async function publishPreset(payload: {
    preset: ResumePresetRow;
    selectedLocales: ResumeLocale[];
    defaultLocale: ResumeLocale;
    allowIndexing: boolean;
  }) {
    const { preset, selectedLocales, defaultLocale, allowIndexing } = payload;
    const response = await fetch(`/api/resume/presets/${encodeURIComponent(preset.id)}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        allowIndexing,
        aiGenerated: preset.ai_generated,
        defaultLocale,
        selectedLocales,
      }),
    });
    const result = (await response.json()) as PresetApiResponse;
    if (!response.ok || result.error || !result.preset) {
      showToast(result.error || "CV Version publish failed.", "error");
      return;
    }
    setPresets((current) => mergePreset(current, result.preset!));
    setPublishDraft(null);
    showToast("CV Version published.");
  }

  async function unpublishPreset(preset: ResumePresetRow) {
    const response = await fetch(`/api/resume/presets/${encodeURIComponent(preset.id)}/unpublish`, {
      method: "POST",
    });
    const result = (await response.json()) as PresetApiResponse;
    if (!response.ok || result.error || !result.preset) {
      showToast(result.error || "CV Version unpublish failed.", "error");
      return;
    }
    setPresets((current) => mergePreset(current, result.preset!));
    showToast("CV Version unpublished.");
  }

  async function deletePreset(preset: ResumePresetRow) {
    setDeletingPresetId(preset.id);
    const response = await fetch(`/api/resume/presets/${encodeURIComponent(preset.id)}`, {
      method: "DELETE",
    });
    const result = (await response.json()) as PresetApiResponse;
    setDeletingPresetId(null);

    if (!response.ok || result.error) {
      showToast(result.error || "CV Version delete failed.", "error");
      return;
    }

    setPresets((current) => current.filter((item) => item.id !== preset.id));
    setPreviewPreset((current) => (current?.id === preset.id ? null : current));
    setActivePreset((current) => (current?.id === preset.id ? null : current));
    showToast("CV Version deleted.", "error");
  }

  function openPublishSavedVersion(preset: ResumePresetRow) {
    const selectedLocales = Array.from(new Set(publishableLocales));
    if (selectedLocales.length === 0) {
      showToast("No language versions available for publish.", "error");
      return;
    }
    const defaultLocale = selectedLocales.includes(preset.default_locale) ? preset.default_locale : selectedLocales[0];
    setPublishDraft({
      preset,
      selectedLocales,
      defaultLocale,
      allowIndexing: preset.allow_indexing,
    });
  }

  const modalOptions = useMemo(() => options, [options]);

  return (
    <div className="stack">
      <StatusToast toast={toast} onClose={closeToast} />

      <section className="card stack">
        <div className="section-row">
          <div>
            <h2>Master Resume</h2>
            <p className="card-lead">English master CV · Updated {latestMasterUpdate}</p>
          </div>
          <div className="actions-row">
            <Link className="button button--primary" href="/master-resume">
              Edit
            </Link>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => {
                setActivePreset(null);
                setIsModalOpen(true);
              }}
              disabled={!hasMasterResume}
            >
              Create CV
            </button>
          </div>
        </div>
      </section>

      <section className="card stack">
        <h2>Your CVs</h2>
        {presets.length === 0 ? (
          <p className="card-lead">No CV Versions yet.</p>
        ) : (
          <ul className="dashboard-resume-list">
            {presets.map((preset) => (
              <li key={preset.id}>
                <div>
                  <strong>{preset.title}</strong>
                  <p>
                    Updated {new Date(preset.updated_at).toLocaleString()}
                    {preset.canonical_public_path ? ` · canonical ${preset.canonical_public_path}` : ""}
                    {preset.compatibility_public_path ? ` · compatibility ${preset.compatibility_public_path}` : ""}
                  </p>
                </div>
                <div className="dashboard-resume-list__actions">
                  <div className="actions-row">
                    <span className={`dashboard-resume-list__badge ${preset.is_public ? "" : "dashboard-resume-list__badge--private"}`}>
                      {preset.is_public ? "Published" : "Private"}
                    </span>
                    <span className={`dashboard-resume-list__badge ${preset.allow_indexing ? "" : "dashboard-resume-list__badge--private"}`}>
                      {preset.allow_indexing ? "Indexable" : "Noindex"}
                    </span>
                    <button type="button" className="button button--ghost button--small" onClick={() => setPreviewPreset(preset)}>
                      Open CV
                    </button>
                    <button
                      type="button"
                      className="button button--ghost button--small"
                      onClick={() => {
                        setActivePreset(preset);
                        setIsModalOpen(true);
                      }}
                    >
                      Edit
                    </button>
                    {preset.is_public ? (
                      <button type="button" className="button button--ghost button--small" onClick={() => void unpublishPreset(preset)}>
                        Unpublish
                      </button>
                    ) : (
                      <button type="button" className="button button--ghost button--small" onClick={() => openPublishSavedVersion(preset)}>
                        Publish
                      </button>
                    )}
                  </div>
                  <div className="dashboard-resume-list__delete-separator">
                    <button
                      type="button"
                      className="button button--ghost button--small button--icon button--danger"
                      aria-label={`Delete CV Version ${preset.title}`}
                      title="Delete CV Version"
                      onClick={() => void deletePreset(preset)}
                      disabled={deletingPresetId === preset.id}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isModalOpen && masterResume ? (
        <PresetModal
          masterResume={masterResume}
          preset={activePreset}
          options={modalOptions}
          onClose={() => {
            setIsModalOpen(false);
            setActivePreset(null);
          }}
          onSave={savePreset}
        />
      ) : null}

      {previewPreset && masterResume ? (
        <PresetPreviewModal
          masterResume={masterResume}
          documents={initialDocuments}
          languages={languageOptions}
          preset={previewPreset}
          onClose={() => {
            setPreviewPreset(null);
          }}
        />
      ) : null}

      {publishDraft ? (
        <PublishSavedVersionModal
          draft={publishDraft}
          locales={Array.from(new Set(publishableLocales))}
          languageOptions={languageOptions}
          onClose={() => setPublishDraft(null)}
          onPublish={publishPreset}
        />
      ) : null}
    </div>
  );
}
