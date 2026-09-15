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
import { FileText, LockKeyhole, Plus, Search, Check, ArrowUpRight } from "lucide-react";
import { normalizeResumeStyle } from "../lib/resume-style";
import {
  summarizeMasterResume,
  filterDashboardPresets,
  getSelectedDashboardPreset,
  type DashboardFilter,
} from "./dashboard-model";
import "./dashboard.css";

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

function buildPresetOptionsFromDocument(parsed: Record<string, unknown>): PresetOption[] {
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
type PresetPreviewResult =
  | { status: "ok"; resume: ResumeDocument }
  // ocv-0172: a language version that has no summary yet (e.g. a freshly
  // added, still-empty locale) is a normal, expected state -- not a failure.
  | { status: "empty" }
  | { status: "error" };

function buildPresetResumeDocument(yamlContent: string, selection: ResumePresetSelection): PresetPreviewResult {
  if (!yamlContent || !window.jsyaml) return { status: "error" };
  try {
    const rawDocument = window.jsyaml.load(yamlContent);
    if (!rawDocument || typeof rawDocument !== "object" || Array.isArray(rawDocument)) {
      return { status: "error" };
    }
    const clampedSelection = clampResumeSelectionToRawDocument(rawDocument, selection);
    if (!clampedSelection) return { status: "empty" };
    const selectedRaw = applyResumeSelectionToRawDocument(rawDocument, clampedSelection);
    if (!selectedRaw) return { status: "error" };
    return { status: "ok", resume: normalizeResumeDocument(selectedRaw, "") };
  } catch {
    return { status: "error" };
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
  inline = false,
}: {
  masterResume: ResumeDocumentRow;
  documents: ResumeDocumentRow[];
  languages: ResumeUserLocaleRow[];
  preset: ResumePresetRow;
  draftPdfEnabled?: boolean;
  onClose: () => void;
  inline?: boolean;
}) {
  const availableDocuments = useMemo(() => (documents.length ? documents : [masterResume]), [documents, masterResume]);
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
  const previewResult = useMemo(
    () => buildPresetResumeDocument(activeDocument.yaml_content, preset.selection),
    [activeDocument.yaml_content, preset.selection],
  );
  const cvLanguages = useMemo(
    () => buildLanguageOptions(availableDocuments, languages),
    [availableDocuments, languages],
  );
  const cvStyle = normalizeResumeStyle(activeDocument.style_settings);

  return (
    <div
      className={inline ? "dashboard-library-preview" : "dashboard-modal"}
      role={inline ? undefined : "dialog"}
      aria-modal={inline ? undefined : true}
      aria-label="CV Version CV preview"
    >
      {!inline ? (
        <button
          type="button"
          className="dashboard-modal__backdrop"
          onClick={onClose}
          aria-label="Close CV preview"
        ></button>
      ) : null}
      <div
        className={inline ? "dashboard-library-preview__body" : "dashboard-modal__body dashboard-modal__body--preview"}
      >
        <div className="section-row">
          <h2>{preset.title}</h2>
          <button type="button" className="button button--ghost button--small" onClick={onClose}>
            {inline ? "Open CV" : "Close"}
          </button>
        </div>
        {inline ? (
          <p className="dashboard-library-preview__note">
            Selected content from your current Master Resume. Published links and exports use the last publication.
          </p>
        ) : null}
        {previewResult.status !== "ok" ? (
          <div className="dashboard-library-preview__fallback">
            {cvLanguages.length > 1 ? (
              <div className="actions-row">
                {cvLanguages.map((language) => (
                  <button
                    key={language.code}
                    type="button"
                    className={`button button--small ${language.code === activeLocale ? "button--primary" : "button--ghost"}`}
                    onClick={() => setActiveLocale(language.code)}
                  >
                    {language.label}
                  </button>
                ))}
              </div>
            ) : null}
            <p className={previewResult.status === "empty" ? "dashboard-library-preview__note" : "status status--error"}>
              {previewResult.status === "empty"
                ? `This CV version has no content in ${cvLanguages.find((language) => language.code === activeDocument.locale)?.label || activeDocument.locale.toUpperCase()} yet. Add it in your Master Resume, or switch to a language you've filled in.`
                : "CV preview could not be rendered from the master resume."}
            </p>
          </div>
        ) : (
          <div ref={previewContainerRef} className="dashboard-preset-preview">
            <BasicResumeDocument
              locale={activeDocument.locale}
              resume={previewResult.resume}
              languages={cvLanguages}
              onLanguageSelect={setActiveLocale}
              status={preset.is_public ? "public" : "draft"}
              aiGenerated={preset.ai_generated}
              mode="public"
              personSlug={publicLink?.personSlug}
              publicId={publicLink?.publicId}
              draftPdfEnabled={draftPdfEnabled}
              cvStyle={cvStyle}
              scrollContainerRef={previewContainerRef as React.RefObject<HTMLElement>}
            />
          </div>
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
        {!preset.onboarding_test_run_id ? <button type="button" role="menuitem" className="dashboard-preset-menu__item" onClick={() => select(onEdit)}>
          Edit
        </button> : null}
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
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<DashboardFilter>("all");
  const [yamlReady, setYamlReady] = useState(false);
  const [documentError, setDocumentError] = useState("");
  const [masterSummary, setMasterSummary] = useState<ReturnType<typeof summarizeMasterResume> | null>(null);
  const documents = initialDocuments;
  const languageVersions = languageOptions;

  useEffect(() => {
    if (!masterResume) return;
    let retries = 0;
    const timer = window.setInterval(() => {
      if (window.jsyaml || retries > 30) {
        window.clearInterval(timer);
        const ready = Boolean(window.jsyaml);
        setYamlReady(ready);
        if (!ready) {
          setDocumentError("The document reader could not load. Reload the page to try again.");
          return;
        }
        try {
          const parsed = asObject(window.jsyaml.load(masterResume.yaml_content));
          setOptions(buildPresetOptionsFromDocument(parsed));
          setMasterSummary(summarizeMasterResume(normalizeResumeDocument(parsed, "")));
        } catch {
          setDocumentError("Your Master Resume could not be read. Open the editor to review it.");
        }
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
  const visiblePresets = filterDashboardPresets(presets, search, filter);
  const selectedPreset = getSelectedDashboardPreset(visiblePresets, selectedPresetId);

  function openCreatePreset() {
    setActivePreset(null);
    setIsModalOpen(true);
  }


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
    setSelectedPresetId(result.preset.id);
    setSearch("");
    setFilter("all");
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
    setSelectedPresetId(result.preset.id);
    setSearch("");
    setFilter("all");
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
    setSelectedPresetId(result.preset.id);
    setSearch("");
    setFilter("all");
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
    if (preset.onboarding_test_run_id) {
      setPublishDraft({ preset, selectedLocales: [preset.default_locale], defaultLocale: preset.default_locale, allowIndexing: false });
      return;
    }
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
    <div className="dashboard-workspace">
      <StatusToast toast={toast} onClose={closeToast} />
      <header className="dashboard-workspace__heading">
        <div>
          <h1>Dashboard</h1>
          <p>Your experience in one place. A CV for every opportunity.</p>
        </div>
        <button
          type="button"
          className="button button--primary"
          onClick={openCreatePreset}
          disabled={!hasMasterResume || !yamlReady}
          title={!hasMasterResume ? "Create your master resume first." : undefined}
        >
          <Plus size={16} aria-hidden="true" /> Create CV version
        </button>
      </header>

      <section className="dashboard-master" aria-labelledby="dashboard-master-title">
        <div className="dashboard-master__main">
          <div className="dashboard-master__title">
            <span className="dashboard-document-icon">
              <FileText size={22} aria-hidden="true" />
            </span>
            <div>
              <h2 id="dashboard-master-title">
                Master Resume{" "}
                <span className="dashboard-state">
                  <LockKeyhole size={12} aria-hidden="true" /> Private
                </span>
              </h2>
              <p>{hasMasterResume ? `Saved ${latestMasterUpdate}` : "Start your career story here."}</p>
            </div>
          </div>
          <p>All your experience. One source for your tailored CVs.</p>
          <div className="actions-row">
            <Link className="button button--primary" href="/master-resume">
              Edit master resume
            </Link>
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
        <div className="dashboard-master__completion">
          <div>
            <span>Master Resume completion</span>
            <strong>{masterSummary ? `${masterSummary.completion.percent}%` : hasMasterResume ? "—" : "0%"}</strong>
          </div>
          {masterSummary || !hasMasterResume ? (
            <progress aria-label="Master Resume completion" max={100} value={masterSummary?.completion.percent ?? 0} />
          ) : (
            <p>Reading your saved content…</p>
          )}
          <p>
            {masterSummary
              ? `${Object.values(masterSummary.completion.statuses).filter((status) => status === "ok").length} of ${Object.keys(masterSummary.completion.statuses).length} sections have content.`
              : "Add your details to build your Master Resume."}
          </p>
          <Link href="/master-resume" className="dashboard-text-link">
            {masterSummary?.completion.next ? "Continue editing" : "Review your content"}
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
        {documentError ? (
          <p className="status status--error" role="alert">
            {documentError}
          </p>
        ) : null}
        <dl className="dashboard-master__stats" aria-label="Master Resume content statistics">
          {(
            [
              ["Professional roles", masterSummary?.counts.roles, "Profile variants"],
              ["Experience entries", masterSummary?.counts.experience, "Employment history"],
              ["Skills", masterSummary?.counts.skills, "Available for your CVs"],
              ["Courses", masterSummary?.counts.courses, "Courses and certificates"],
              ["CV languages", languageVersions.length, localeSummary],
            ] as const
          ).map(([label, count, note]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{count ?? (hasMasterResume ? "—" : 0)}</dd>
              <small>{note}</small>
            </div>
          ))}
        </dl>
        {masterResume ? (
          <p className="dashboard-master__stats-note">
            Content counts: {masterResume.locale.toUpperCase()} Master Resume. Translations are counted separately under
            CV languages.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="dashboard-library-title">
        <div className="dashboard-library-heading">
          <h2 id="dashboard-library-title">Your CVs</h2>
          <p>
            <strong>{presets.length}</strong> versions <span>·</span> <strong>{publishedPresetCount}</strong> public{" "}
            <span>·</span> <strong>{privatePresetCount}</strong> private
          </p>
        </div>
        {presets.length === 0 ? (
          <div className="dashboard-empty-state">
            <h3>{hasMasterResume ? "No CV versions yet" : "Start with your master resume"}</h3>
            <p>
              {hasMasterResume
                ? "Choose content from your Master Resume to create your first tailored CV."
                : "Add your experience, then create a version to share."}
            </p>
            {hasMasterResume ? (
              <button type="button" className="button button--primary" onClick={openCreatePreset} disabled={!yamlReady}>
                Create CV version
              </button>
            ) : (
              <Link className="button button--primary" href="/master-resume">
                Edit master resume
              </Link>
            )}
          </div>
        ) : (
          <div className="dashboard-library">
            <div className="dashboard-library__list">
              <div className="dashboard-library__filters">
                <label className="dashboard-search">
                  <Search size={16} aria-hidden="true" />
                  <input
                    type="search"
                    aria-label="Search CV versions"
                    placeholder="Search CV versions…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
                <div className="dashboard-filter" role="group" aria-label="Filter CV versions">
                  {(
                    [
                      ["all", "All"],
                      ["public", "Public"],
                      ["private", "Private"],
                    ] as const
                  ).map(([value, label]) => (
                    <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {visiblePresets.length ? (
                <ul className="dashboard-library-items" aria-label="Saved CV versions">
                  {visiblePresets.map((preset) => (
                    <li key={preset.id}>
                      <button
                        type="button"
                        className={`dashboard-library-item${selectedPreset?.id === preset.id ? " is-selected" : ""}`}
                        aria-pressed={selectedPreset?.id === preset.id}
                        onClick={() => setSelectedPresetId(preset.id)}
                      >
                        <span className="dashboard-document-icon">
                          <FileText size={25} aria-hidden="true" />
                        </span>
                        <span className="dashboard-library-item__content">
                          <strong>{preset.title}</strong>
                          <small>Updated {new Date(preset.updated_at).toLocaleDateString()}</small>
                          <span className="dashboard-library-item__badges">
                            <span className={`dashboard-state${preset.is_public ? " dashboard-state--public" : ""}`}>
                              {preset.is_public ? "Published" : "Private"}
                            </span>
                            <span className="dashboard-state">{preset.default_locale.toUpperCase()}</span>
                            {preset.onboarding_test_run_id ? <span className="dashboard-state">Test</span> : null}
                          </span>
                          <small>{preset.allow_indexing ? "Indexable" : "Noindex"}</small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="dashboard-library-empty">
                  <p>No matching CVs.</p>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => {
                      setSearch("");
                      setFilter("all");
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
              <div className="dashboard-library__create">
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={openCreatePreset}
                  disabled={!hasMasterResume || !yamlReady}
                >
                  <Plus size={15} aria-hidden="true" /> Create CV version
                </button>
              </div>
            </div>
            <div className="dashboard-library__detail">
              {selectedPreset ? (
                <>
                  {selectedPreset.onboarding_test_run_id ? (
                    <div className="dashboard-test-preview">
                      <FileText size={40} aria-hidden="true" />
                      <h3>{selectedPreset.title}</h3>
                      <p>This CV uses a separate onboarding test draft.</p>
                      <Link
                        className="button button--primary"
                        href={
                          selectedPreset.canonical_public_path ||
                          `/onboarding/test-cv/${selectedPreset.onboarding_test_run_id}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open test CV
                      </Link>
                    </div>
                  ) : masterResume && yamlReady ? (
                    <PresetPreviewModal
                      key={selectedPreset.id}
                      inline
                      masterResume={masterResume}
                      documents={documents}
                      languages={languageVersions}
                      preset={selectedPreset}
                      draftPdfEnabled={draftPdfEnabled}
                      onClose={() => setPreviewPreset(selectedPreset)}
                    />
                  ) : (
                    <p className="dashboard-library-empty">
                      {documentError ||
                        (masterResume
                          ? "Loading CV preview…"
                          : "Open your Master Resume to add content for this version.")}
                    </p>
                  )}
                  <section className="dashboard-next" aria-label="Next steps for selected CV">
                    <div className="dashboard-next__heading">
                      <div>
                        <h3>What can you do next?</h3>
                        <p>
                          {selectedPreset.is_public
                            ? "Share the published CV, or review your selection before publishing it again."
                            : "Review this version, then choose which languages to publish."}
                        </p>
                      </div>
                      <PresetActionsMenu
                        preset={selectedPreset}
                        onEdit={() => {
                          setActivePreset(selectedPreset);
                          setIsModalOpen(true);
                        }}
                        onTogglePublish={() => {
                          if (selectedPreset.is_public) {
                            void unpublishPreset(selectedPreset);
                          } else {
                            openPublishSavedVersion(selectedPreset);
                          }
                        }}
                        onExportText={() => exportText(selectedPreset)}
                        onExportPdf={() => exportPdf(selectedPreset)}
                        onDelete={() => setConfirmDeletePreset(selectedPreset)}
                      />
                    </div>
                    <ol className="dashboard-next__steps">
                      <li data-complete="true">
                        <span>
                          <Check size={13} aria-hidden="true" />
                        </span>
                        <div>
                          <strong>Choose content</strong>
                          <small>Your saved selection</small>
                        </div>
                      </li>
                      <li
                        data-complete={selectedPreset.is_public}
                        aria-current={selectedPreset.is_public ? undefined : "step"}
                      >
                        <span>{selectedPreset.is_public ? <Check size={13} aria-hidden="true" /> : "2"}</span>
                        <div>
                          <strong>{selectedPreset.is_public ? "Published" : "Review and publish"}</strong>
                          <small>
                            {selectedPreset.is_public
                              ? "A public link is available"
                              : "Check the content and languages"}
                          </small>
                        </div>
                      </li>
                      <li aria-current={selectedPreset.is_public ? "step" : undefined}>
                        <span>3</span>
                        <div>
                          <strong>Share your CV</strong>
                          <small>Send the link when ready</small>
                        </div>
                      </li>
                    </ol>
                    <div className="dashboard-next__actions">
                      <p>
                        <LockKeyhole size={13} aria-hidden="true" /> Your Master Resume stays private.
                      </p>
                      <div className="actions-row">
                        {!selectedPreset.onboarding_test_run_id ? (
                          <button
                            type="button"
                            className="button button--ghost"
                            disabled={!hasMasterResume || !yamlReady}
                            onClick={() => {
                              setActivePreset(selectedPreset);
                              setIsModalOpen(true);
                            }}
                          >
                            Edit selection
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className={`button ${selectedPreset.is_public ? "button--ghost" : "button--primary"}`}
                          onClick={() => openPublishSavedVersion(selectedPreset)}
                        >
                          {selectedPreset.is_public ? "Publish again" : "Publish"}
                        </button>
                        {selectedPreset.is_public ? (
                          <button
                            type="button"
                            className="button button--primary"
                            onClick={() => copyPublicLink(selectedPreset)}
                          >
                            Copy link
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </section>
                </>
              ) : (
                <div className="dashboard-library-empty">
                  <h3>No CV selected</h3>
                  <p>Choose a version from the library or clear the filters.</p>
                </div>
              )}
            </div>
          </div>
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
              <button
                type="button"
                className="button button--danger"
                disabled={isImporting}
                onClick={() => void importUserData()}
              >
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
          locales={
            publishDraft.preset.onboarding_test_run_id
              ? [publishDraft.preset.default_locale]
              : Array.from(new Set(publishableLocales))
          }
          languageOptions={languageVersions}
          onClose={() => setPublishDraft(null)}
          onPublish={publishPreset}
        />
      ) : null}
    </div>
  );
}
