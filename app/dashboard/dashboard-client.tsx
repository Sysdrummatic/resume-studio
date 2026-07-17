"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { normalizeResumeDocument } from "../lib/resume-schema";
import type { ResumeDocument, ResumeLocale } from "../lib/resume-schema";
import { applyResumeSelectionToRawDocument, clampResumeSelectionToRawDocument } from "../lib/preset-selection";
import type {
  ResumeDocumentRow,
  ResumePresetRow,
  ResumePresetSelection,
  ResumeUserLocaleRow,
} from "../lib/resume-server";
import { buildPublishedResumeExportUrls, parseCanonicalPublicPath } from "../lib/resume-export";
import { StatusToast, useStatusToast } from "../components/status-toast";
import PublishSavedVersionModal, { type PublishDraft } from "../components/PublishSavedVersionModal";
import { BasicResumeDocument } from "../components/resume-renderer/BasicResumeDocument";
import type { ResumeLanguageOption } from "../components/resume-language-switcher";

type Props = {
  masterResume: ResumeDocumentRow | null;
  initialDocuments: ResumeDocumentRow[];
  languageOptions: ResumeUserLocaleRow[];
  initialPresets: ResumePresetRow[];
  draftPdfEnabled?: boolean;
  dataTransferEnabled?: boolean;
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

// Same raw-domain selection as the public view and exports: the selection
// indexes point at raw YAML arrays, so apply them before normalization.
// The selection is built against the default-locale document; clamp it to the
// previewed document so other language versions render the way publish stores
// them, instead of failing on out-of-range indexes.
function buildPresetResumeDocument(yamlContent: string, selection: ResumePresetSelection): ResumeDocument | null {
  if (!yamlContent || !window.jsyaml) return null;
  try {
    const rawDocument = window.jsyaml.load(yamlContent);
    const clampedSelection = clampResumeSelectionToRawDocument(rawDocument, selection);
    const selectedRaw = clampedSelection ? applyResumeSelectionToRawDocument(rawDocument, clampedSelection) : null;
    return selectedRaw ? normalizeResumeDocument(selectedRaw, "") : null;
  } catch {
    return null;
  }
}

function getFallbackLanguageLabel(locale: string): { label: string; shortLabel: string } {
  if (locale === "en") return { label: "English", shortLabel: "EN" };
  if (locale === "pl") return { label: "Polski", shortLabel: "PL" };
  if (locale === "de") return { label: "Deutsch", shortLabel: "DE" };
  return { label: locale.toUpperCase(), shortLabel: locale.slice(0, 2).toUpperCase() };
}

function buildLanguageOptions(documents: ResumeDocumentRow[], languages: ResumeUserLocaleRow[]): ResumeLanguageOption[] {
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

function formatCountLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
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
  draftPdfEnabled = true,
  onClose,
}: {
  masterResume: ResumeDocumentRow;
  documents: ResumeDocumentRow[];
  languages: ResumeUserLocaleRow[];
  preset: ResumePresetRow;
  draftPdfEnabled?: boolean;
  onClose: () => void;
}) {
  const availableDocuments = documents.length ? documents : [masterResume];
  const initialLocale = availableDocuments.some((document) => document.locale === preset.default_locale)
    ? preset.default_locale
    : masterResume.locale;
  const [activeLocale, setActiveLocale] = useState<ResumeLocale>(initialLocale);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const activeDocument =
    availableDocuments.find((document) => document.locale === activeLocale) ||
    availableDocuments.find((document) => document.locale === masterResume.locale) ||
    masterResume;
  const publicLink = parseCanonicalPublicPath(preset.canonical_public_path);
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
          <div ref={previewContainerRef} className="dashboard-preset-preview">
            <BasicResumeDocument
              locale={activeDocument.locale}
              resume={previewResume}
              languages={cvLanguages}
              onLanguageSelect={setActiveLocale}
              status={preset.is_public ? "public" : "draft"}
              aiGenerated={preset.ai_generated}
              mode="public"
              personSlug={publicLink?.personSlug}
              publicId={publicLink?.publicId}
              draftPdfEnabled={draftPdfEnabled}
              scrollContainerRef={previewContainerRef as React.RefObject<HTMLElement>}
            />
          </div>
        ) : (
          <p className="status status--error">CV preview could not be rendered from the master resume.</p>
        )}
      </div>
    </div>
  );
}

function PresetActionsMenu({
  preset,
  onEdit,
  onTogglePublish,
  onExportText,
  onExportPdf,
  onDelete,
}: {
  preset: ResumePresetRow;
  onEdit: () => void;
  onTogglePublish: () => void;
  onExportText: () => void;
  onExportPdf: () => void;
  onDelete: () => void;
}) {
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && menuRef.current?.contains(event.target)) return;
      if (menuRef.current) menuRef.current.open = false;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && menuRef.current) menuRef.current.open = false;
    }
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function select(action: () => void) {
    if (menuRef.current) menuRef.current.open = false;
    action();
  }

  return (
    <details className="dashboard-preset-menu" ref={menuRef}>
      <summary
        className="button button--ghost button--small button--icon"
        aria-label={`CV Version settings for ${preset.title}`}
        title="CV Version settings"
      >
        <svg className="button__icon" aria-hidden="true" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.08a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </summary>
      <div className="dashboard-preset-menu__panel" role="menu">
        <button type="button" role="menuitem" className="dashboard-preset-menu__item" onClick={() => select(onEdit)}>
          Edit
        </button>
        <button type="button" role="menuitem" className="dashboard-preset-menu__item" onClick={() => select(onTogglePublish)}>
          {preset.is_public ? "Unpublish" : "Publish"}
        </button>
        <button type="button" role="menuitem" className="dashboard-preset-menu__item" onClick={() => select(onExportText)}>
          ATS (TXT)
        </button>
        <button type="button" role="menuitem" className="dashboard-preset-menu__item" onClick={() => select(onExportPdf)}>
          PDF
        </button>
        <hr className="dashboard-preset-menu__separator" />
        <button
          type="button"
          role="menuitem"
          className="dashboard-preset-menu__item dashboard-preset-menu__item--danger"
          aria-label={`Delete CV Version ${preset.title}`}
          onClick={() => select(onDelete)}
        >
          Delete
        </button>
      </div>
    </details>
  );
}

export default function DashboardClient({
  masterResume,
  initialDocuments,
  languageOptions,
  initialPresets,
  draftPdfEnabled = true,
  dataTransferEnabled = true,
}: Props) {
  const [presets, setPresets] = useState(initialPresets);
  const [options, setOptions] = useState<PresetOption[]>([]);
  const [activePreset, setActivePreset] = useState<ResumePresetRow | null>(null);
  const [previewPreset, setPreviewPreset] = useState<ResumePresetRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast, showToast, closeToast } = useStatusToast();
  const [deletingPresetId, setDeletingPresetId] = useState<string | null>(null);
  const [confirmDeletePreset, setConfirmDeletePreset] = useState<ResumePresetRow | null>(null);
  const [publishDraft, setPublishDraft] = useState<PublishDraft | null>(null);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingImport, setPendingImport] = useState<{ fileName: string; yamlContent: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const documents = initialDocuments;
  const languageVersions = languageOptions;

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
  const publishableLocales = (documents.length ? documents : masterResume ? [masterResume] : []).map((doc) => doc.locale);
  const publishedPresetCount = presets.filter((preset) => preset.is_public).length;
  const privatePresetCount = Math.max(0, presets.length - publishedPresetCount);
  const defaultLanguageVersion = languageVersions.find((language) => language.is_default) || null;
  const localeSummary = formatCountLabel(languageVersions.length, "language version");


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
        defaultLocale: defaultLanguageVersion?.code || masterResume.locale,
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

  function copyPublicLink(preset: ResumePresetRow) {
    if (!preset.canonical_public_path) {
      showToast("Publish this CV Version first.", "warning");
      return;
    }
    const url = `${window.location.origin}${preset.canonical_public_path}`;
    navigator.clipboard.writeText(url).then(
      () => showToast("Public link copied to clipboard."),
      () => showToast("Could not copy to clipboard.", "error"),
    );
  }

  function exportText(preset: ResumePresetRow) {
    const exportUrls = buildPublishedResumeExportUrls(preset.canonical_public_path, preset.default_locale);
    if (!exportUrls) {
      showToast("Publish this CV Version before exporting a snapshot.", "warning");
      return;
    }

    window.open(exportUrls.textUrl, "_blank");
    showToast("Preparing published text export...");
  }

  function exportPdf(preset: ResumePresetRow) {
    const exportUrls = buildPublishedResumeExportUrls(preset.canonical_public_path, preset.default_locale);
    if (!exportUrls) {
      showToast("Publish this CV Version before exporting a snapshot PDF.", "warning");
      return;
    }

    window.open(exportUrls.pdfUrl, "_blank");
    showToast("Preparing published PDF export...");
  }

  function exportUserData() {
    window.open("/api/resume/transfer/export", "_blank");
    showToast("Preparing data export...");
  }

  async function handleImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const yamlContent = await file.text();
    setPendingImport({ fileName: file.name, yamlContent });
  }

  async function importUserData() {
    if (!pendingImport) return;
    setIsImporting(true);
    try {
      const response = await fetch("/api/resume/transfer/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yamlContent: pendingImport.yamlContent }),
      });
      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || result.error) {
        showToast(result.error || "Import failed.", "error");
        return;
      }
      showToast("Data imported. Reloading...");
      window.location.reload();
    } catch {
      showToast("Import failed.", "error");
    } finally {
      setIsImporting(false);
      setPendingImport(null);
    }
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

      <section className="card dashboard-panel stack">
        <div className="dashboard-panel__header">
          <div className="dashboard-panel__heading stack">
            <div className="product-surface__eyebrow">Source record</div>
            <h2 className="dashboard-panel__title">Master Resume</h2>
            <p className="dashboard-panel__lead">Start in the master resume when content changes. Create CV versions here only when you need a new public combination of sections, locale, and publish state.</p>
          </div>
          <div className="dashboard-panel__toolbar actions-row">
            <Link className="button button--primary" href="/master-resume">
              Edit master resume
            </Link>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => {
                setActivePreset(null);
                setIsModalOpen(true);
              }}
              disabled={!hasMasterResume}
              title={hasMasterResume ? undefined : "Create your master resume first, then come back to add a CV version."}
            >
              Create CV version
            </button>
            {dataTransferEnabled ? (
              <>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={exportUserData}
                  disabled={!hasMasterResume}
                  title={hasMasterResume ? "Download all your CV data as a single YAML file." : "Create your master resume first."}
                >
                  Export
                </button>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => importFileInputRef.current?.click()}
                  title="Restore CV data from a previously exported YAML file."
                >
                  Import
                </button>
                <input
                  ref={importFileInputRef}
                  type="file"
                  accept=".yaml,.yml"
                  hidden
                  onChange={(event) => void handleImportFileChange(event)}
                />
              </>
            ) : null}
          </div>
        </div>

        <div className="dashboard-source-copy stack">
          <div className="dashboard-source-meta">
            {hasMasterResume && (
              <div className="dashboard-source-meta__row">
                <span className="dashboard-resume-list__badge">MasterCV Saved</span>
                <span className="dashboard-chip">{localeSummary}</span>
                <span className="dashboard-chip">Edited {latestMasterUpdate}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="card dashboard-panel stack">
        <div className="dashboard-panel__header">
          <div className="dashboard-panel__heading stack">
            <div className="product-surface__eyebrow">Public surfaces</div>
            <h2 className="dashboard-panel__title">Your CVs</h2>
            <p className="dashboard-panel__lead">Manage private drafts, published links, and snapshot exports from one list.</p>
          </div>
          <div className="dashboard-panel__chips" aria-label="CV version state summary">
            <span className="dashboard-chip">{presets.length} total</span>
            <span className="dashboard-chip">{publishedPresetCount} published</span>
            <span className="dashboard-chip">{privatePresetCount} private</span>
          </div>
        </div>
        {presets.length === 0 ? (
          <div className="dashboard-empty-state">
            {hasMasterResume ? (
              <>
                <h3>No CV versions yet</h3>
                <p>Create the first public variant from the master resume, then publish locale-specific output from here.</p>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => {
                    setActivePreset(null);
                    setIsModalOpen(true);
                  }}
                >
                  Create CV version
                </button>
              </>
            ) : (
              <>
                <h3>Start with your master resume</h3>
                <p>CV versions are published combinations of your master resume. Fill it in first, then come back to create one.</p>
                <Link className="button button--primary" href="/master-resume">
                  Edit master resume
                </Link>
              </>
            )}
          </div>
        ) : (
          <ul className="dashboard-resume-list">
            {presets.map((preset) => (
              <li key={preset.id}>
                <div className="dashboard-resume-list__main">
                  <div className="dashboard-resume-list__header">
                    <div className="dashboard-resume-list__title-group">
                      <strong className="dashboard-resume-list__title">{preset.title}</strong>
                      <p className="dashboard-resume-list__description">Updated {new Date(preset.updated_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="dashboard-resume-list__badges">
                  <span className={`dashboard-resume-list__badge ${preset.is_public ? "" : "dashboard-resume-list__badge--private"}`}>
                    {preset.is_public ? "Published" : "Private"}
                  </span>
                  <span className={`dashboard-resume-list__badge ${preset.allow_indexing ? "" : "dashboard-resume-list__badge--private"}`}>
                    {preset.allow_indexing ? "Indexable" : "Noindex"}
                  </span>
                </div>
                <div className="dashboard-resume-list__actions">
                  <button type="button" className="button button--primary button--small" onClick={() => setPreviewPreset(preset)}>
                    Open CV
                  </button>
                  {preset.is_public ? (
                    <button type="button" className="button button--ghost button--small" onClick={() => copyPublicLink(preset)}>
                      Copy link
                    </button>
                  ) : null}
                  <PresetActionsMenu
                    preset={preset}
                    onEdit={() => {
                      setActivePreset(preset);
                      setIsModalOpen(true);
                    }}
                    onTogglePublish={() => {
                      if (preset.is_public) {
                        void unpublishPreset(preset);
                      } else {
                        openPublishSavedVersion(preset);
                      }
                    }}
                    onExportText={() => exportText(preset)}
                    onExportPdf={() => exportPdf(preset)}
                    onDelete={() => setConfirmDeletePreset(preset)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {confirmDeletePreset ? (
        <div className="dashboard-modal" role="dialog" aria-modal="true" aria-label="Delete CV Version confirmation">
          <button
            type="button"
            className="dashboard-modal__backdrop"
            onClick={() => setConfirmDeletePreset(null)}
            aria-label="Cancel delete"
          ></button>
          <div className="dashboard-modal__body dashboard-modal__body--compact">
            <h2 className="dashboard-modal__title">Delete CV Version</h2>
            <p className="dashboard-modal__copy">
              This permanently deletes <strong>{confirmDeletePreset.title}</strong>
              {confirmDeletePreset.is_public ? " and takes its public link offline" : ""}. This cannot be undone.
            </p>
            <div className="dashboard-modal__footer">
              <button type="button" className="button" onClick={() => setConfirmDeletePreset(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="button button--danger"
                disabled={deletingPresetId === confirmDeletePreset.id}
                onClick={() => {
                  const preset = confirmDeletePreset;
                  void deletePreset(preset).then(() => setConfirmDeletePreset(null));
                }}
              >
                {deletingPresetId === confirmDeletePreset.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingImport ? (
        <div className="dashboard-modal" role="dialog" aria-modal="true" aria-label="Import data confirmation">
          <button
            type="button"
            className="dashboard-modal__backdrop"
            onClick={() => setPendingImport(null)}
            aria-label="Cancel import"
          ></button>
          <div className="dashboard-modal__body dashboard-modal__body--compact">
            <h2 className="dashboard-modal__title">Import data</h2>
            <p className="dashboard-modal__copy">
              Importing <strong>{pendingImport.fileName}</strong> overwrites your master resume documents and language
              versions, and replaces all private CV versions. Published CV versions and their public links stay
              untouched. This cannot be undone.
            </p>
            <div className="dashboard-modal__footer">
              <button type="button" className="button" onClick={() => setPendingImport(null)}>
                Cancel
              </button>
              <button type="button" className="button button--danger" disabled={isImporting} onClick={() => void importUserData()}>
                {isImporting ? "Importing..." : "Import and replace"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
          documents={documents}
          languages={languageVersions}
          preset={previewPreset}
          draftPdfEnabled={draftPdfEnabled}
          onClose={() => {
            setPreviewPreset(null);
          }}
        />
      ) : null}

      {publishDraft ? (
        <PublishSavedVersionModal
          draft={publishDraft}
          locales={Array.from(new Set(publishableLocales))}
          languageOptions={languageVersions}
          onClose={() => setPublishDraft(null)}
          onPublish={publishPreset}
        />
      ) : null}

    </div>
  );
}
