"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { normalizeResumeDocument } from "../lib/resume-schema";
import type { ResumeLocale } from "../lib/resume-schema";
import { buildPresetResumeDocument, saveOrReportError } from "../lib/preset-preview";
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
import ResumeLanguageSwitcher, { type ResumeLanguageOption } from "../components/resume-language-switcher";
import { FileText, LockKeyhole, Plus, Search, ArrowUpRight } from "lucide-react";
import { normalizeResumeStyle, presetStyleSource, RESUME_TEMPLATE_PALETTES, type ResumeStyleSettings, type ResumeVisualTemplate } from "../lib/resume-style";
import { useAppI18n } from "../components/app-i18n-provider";
import { formatAppMessage } from "../i18n/locale";
import type { AppDictionary } from "../i18n/types";
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
  docsUrl?: string;
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

const PRESET_OPTION_KEYS: PresetOptionKey[] = [
  "summary",
  "experience",
  "education",
  "courses",
  "skills",
  "interests",
  "languages",
  "tech_stack",
];

const PRESET_TEMPLATE_OPTIONS: Array<{ value: ResumeVisualTemplate; labelKey: string }> = [
  { value: "sample-two-column", labelKey: "template_sample_two_column" },
  { value: "signal-grid", labelKey: "template_signal_grid" },
  { value: "atelier-noir", labelKey: "template_atelier_noir" },
  { value: "terminal-stack", labelKey: "template_terminal_stack" },
];

type DashboardLabels = AppDictionary["dashboard"];

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function itemText(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

function formatOptionItem(
  key: PresetOptionKey,
  item: unknown,
  index: number,
  labels: DashboardLabels["option_labels"],
) {
  const row = asObject(item);
  const number = index + 1;
  switch (key) {
    case "summary":
      return itemText(row.position, formatAppMessage(labels.summary_item, { number }));
    case "experience":
      return [row.role, row.company].filter((part) => typeof part === "string" && part.trim()).join(" · ") || formatAppMessage(labels.experience_item, { number });
    case "education":
      return [row.school, row.detail].filter((part) => typeof part === "string" && part.trim()).join(" · ") || formatAppMessage(labels.education_item, { number });
    case "courses":
      return [row.year, row.name].filter((part) => String(part ?? "").trim()).join(" · ") || formatAppMessage(labels.course_item, { number });
    case "skills":
    case "languages":
      return itemText(row.name, `${labels[key]} ${number}`);
    case "interests":
    case "tech_stack":
      return itemText(item, `${labels[key]} ${number}`);
    default:
      return formatAppMessage(labels.item, { number });
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

function buildPresetOptionsFromDocument(
  parsed: Record<string, unknown>,
  labels: DashboardLabels["option_labels"],
): PresetOption[] {
  return PRESET_OPTION_KEYS.map((key) => ({
    key,
    label: labels[key],
    items: Array.isArray(parsed[key]) ? parsed[key].map((item, index) => formatOptionItem(key, item, index, labels)) : [],
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

function getFallbackLanguageLabel(locale: string, displayLocale: string): { label: string; shortLabel: string } {
  const label = new Intl.DisplayNames([displayLocale], { type: "language" }).of(locale) || locale.toUpperCase();
  return { label, shortLabel: locale.slice(0, 2).toUpperCase() };
}

function buildLanguageOptions(
  documents: ResumeDocumentRow[],
  languages: ResumeUserLocaleRow[],
  displayLocale: string,
): ResumeLanguageOption[] {
  const metadata = new Map(languages.map((language) => [language.code, language]));
  return documents
    .map((document) => {
      const fallback = getFallbackLanguageLabel(document.locale, displayLocale);
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
  onSave: (payload: { presetId?: string; title: string; selection: ResumePresetSelection; styleSettings: ResumeStyleSettings; allowIndexing: boolean; aiGenerated: boolean }) => Promise<void>;
}) {
  const { dictionary } = useAppI18n();
  const labels = dictionary.dashboard.preset_editor;
  const [title, setTitle] = useState(preset?.title || "");
  const [allowIndexing, setAllowIndexing] = useState(preset?.allow_indexing || false);
  const [aiGenerated, setAiGenerated] = useState(preset?.ai_generated || false);
  const [selection, setSelection] = useState<ResumePresetSelection>(
    normalizeSummarySelection(preset?.selection || createSelectionFromOptions(options, masterResume.yaml_content), options),
  );
  const [styleSettings, setStyleSettings] = useState<ResumeStyleSettings>(
    normalizeResumeStyle(presetStyleSource(preset?.style_settings, masterResume.style_settings)),
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
      setError(labels.title_required);
      return;
    }
    if (nextSelection.summary.length !== 1) {
      setError(labels.summary_required);
      return;
    }
    setError("");
    setIsSaving(true);
    try {
      // A rejected save (network failure, etc.) must not strand the button on
      // "Saving..." forever — the user's title/selection stay as entered so
      // they can retry without re-filling the form.
      const result = await saveOrReportError(
        () => onSave({ presetId: preset?.id, title, selection: nextSelection, styleSettings, allowIndexing, aiGenerated }),
        "Could not save. Check your connection and try again.",
      );
      if (!result.ok) setError(result.error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="dashboard-modal" role="dialog" aria-modal="true" aria-label={labels.aria_label}>
      <button type="button" className="dashboard-modal__backdrop" onClick={onClose} aria-label={labels.close_aria}></button>
      <div className="dashboard-modal__body">
        <div className="section-row">
          <h2>{preset ? labels.edit_title : labels.create_title}</h2>
          <button type="button" className="button button--ghost button--small" onClick={onClose}>
            {labels.close}
          </button>
        </div>

        <label>
          {labels.title_label}
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={labels.title_placeholder} />
        </label>

        <label className="checkbox-row">
          <input type="checkbox" checked={allowIndexing} onChange={(event) => setAllowIndexing(event.target.checked)} />
          {labels.allow_indexing}
        </label>

        <div className="dashboard-preset-style" aria-label={labels.style_aria}>
          <label>
            {labels.template}
            <select
              value={styleSettings.template}
              onChange={(event) => {
                const template = event.target.value as ResumeVisualTemplate;
                setStyleSettings({
                  ...styleSettings,
                  template,
                  accentColor: RESUME_TEMPLATE_PALETTES[template].accent,
                });
              }}
            >
              {PRESET_TEMPLATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{labels[option.labelKey]}</option>
              ))}
            </select>
          </label>
          <label className="dashboard-preset-style__color">
            {labels.primary_color}
            <span>
              <input
                type="color"
                value={styleSettings.accentColor}
                aria-label={labels.primary_color}
                onChange={(event) => setStyleSettings({ ...styleSettings, accentColor: event.target.value })}
              />
              <code>{styleSettings.accentColor}</code>
            </span>
          </label>
        </div>

        <label className="checkbox-row">
          <input type="checkbox" checked={aiGenerated} onChange={(event) => setAiGenerated(event.target.checked)} />
          {labels.ai_generated}
        </label>

        <div className="dashboard-preset-options">
          {options.map((option) => (
            <section key={option.key} className="dashboard-preset-options__section">
              <h3>{option.label}</h3>
              {option.items.length === 0 ? (
                <p className="card-lead">{labels.no_items}</p>
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
            {isSaving ? labels.saving : labels.save}
          </button>
          <button type="button" className="button button--ghost" onClick={onClose}>
            {labels.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PresetPreviewModal({
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
  const { locale, dictionary } = useAppI18n();
  const labels = dictionary.dashboard.preview;
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
    () => buildLanguageOptions(availableDocuments, languages, locale),
    [availableDocuments, languages, locale],
  );
  const cvStyle = normalizeResumeStyle(presetStyleSource(preset.style_settings, activeDocument.style_settings));

  return (
    <div
      className={inline ? "dashboard-library-preview" : "dashboard-modal"}
      role={inline ? undefined : "dialog"}
      aria-modal={inline ? undefined : true}
      aria-label={labels.aria_label}
    >
      {!inline ? (
        <button
          type="button"
          className="dashboard-modal__backdrop"
          onClick={onClose}
          aria-label={labels.close_aria}
        ></button>
      ) : null}
      <div
        className={inline ? "dashboard-library-preview__body" : "dashboard-modal__body dashboard-modal__body--preview"}
      >
        <div className="section-row">
          <h2>{preset.title}</h2>
          {!inline ? (
            <button type="button" className="button button--ghost button--small" onClick={onClose}>
              {labels.close}
            </button>
          ) : null}
        </div>
        {inline ? (
          <p className="dashboard-library-preview__note">
            {labels.note}
          </p>
        ) : null}
        {previewResult.status !== "ok" ? (
          <div className="dashboard-library-preview__fallback">
            <ResumeLanguageSwitcher
              languages={cvLanguages}
              activeLocale={activeLocale}
              ariaLabel="Switch CV version language"
              onSelect={setActiveLocale}
            />
            <p className={previewResult.status === "empty" ? "dashboard-library-preview__note" : "status status--error"}>
              {previewResult.status === "empty"
                ? `This CV version has no content in ${cvLanguages.find((language) => language.code === activeDocument.locale)?.label || activeDocument.locale.toUpperCase()} yet. Add it in your Experience Base, or switch to a language you've filled in.`
                : "CV preview could not be rendered from the Experience Base."}
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
  const { dictionary } = useAppI18n();
  const labels = dictionary.dashboard.actions;
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
        aria-label={formatAppMessage(labels.settings_aria, { title: preset.title })}
        title={labels.settings_title}
      >
        <svg className="button__icon" aria-hidden="true" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.08a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </summary>
      <div className="dashboard-preset-menu__panel" role="menu">
        {!preset.onboarding_test_run_id ? <button type="button" role="menuitem" className="dashboard-preset-menu__item" onClick={() => select(onEdit)}>
          {labels.edit}
        </button> : null}
        <button type="button" role="menuitem" className="dashboard-preset-menu__item" onClick={() => select(onTogglePublish)}>
          {preset.is_public ? labels.unpublish : labels.publish}
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
          aria-label={formatAppMessage(labels.delete_aria, { title: preset.title })}
          onClick={() => select(onDelete)}
        >
          {labels.delete}
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
  const { locale, dictionary } = useAppI18n();
  const labels = dictionary.dashboard;
  const [presets, setPresets] = useState(initialPresets);
  const [options, setOptions] = useState<PresetOption[]>([]);
  const [modalDocument, setModalDocument] = useState<ResumeDocumentRow | null>(null);
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
          setDocumentError(labels.messages.reader_failed);
          return;
        }
        try {
          const parsed = asObject(window.jsyaml.load(masterResume.yaml_content));
          setOptions(buildPresetOptionsFromDocument(parsed, labels.option_labels));
          setMasterSummary(summarizeMasterResume(normalizeResumeDocument(parsed, "")));
        } catch {
          setDocumentError(labels.messages.master_read_failed);
        }
      }
      retries += 1;
    }, 100);

    return () => window.clearInterval(timer);
  }, [labels.messages.master_read_failed, labels.messages.reader_failed, labels.option_labels, masterResume]);

  const hasMasterResume = Boolean(masterResume);
  const latestMasterUpdate = masterResume ? new Date(masterResume.updated_at).toLocaleString(locale) : labels.messages.not_saved;
  const publishableLocales = (documents.length ? documents : masterResume ? [masterResume] : []).map((doc) => doc.locale);
  const publishedPresetCount = presets.filter((preset) => preset.is_public).length;
  const privatePresetCount = Math.max(0, presets.length - publishedPresetCount);
  const defaultLanguageVersion = languageVersions.find((language) => language.is_default) || null;
  const localeSummary = formatAppMessage(labels.messages.language_versions, { count: languageVersions.length });
  const visiblePresets = filterDashboardPresets(presets, search, filter);
  const selectedPreset = getSelectedDashboardPreset(visiblePresets, selectedPresetId);

  function openCreatePreset() {
    openPresetEditor(null);
  }

  function openPresetEditor(preset: ResumePresetRow | null) {
    const source = preset ? documents.find((document) => document.id === preset.document_id) : masterResume;
    if (!source) {
      showToast("The source document for this CV version is unavailable. Reload the page to try again.", "error");
      return;
    }
    if (!window.jsyaml) {
      showToast("The document reader is still loading. Try again in a moment.", "error");
      return;
    }
    try {
      setOptions(buildPresetOptionsFromDocument(asObject(window.jsyaml.load(source.yaml_content)), labels.option_labels));
    } catch {
      showToast("Your Experience Base could not be read. Open the editor to review it.", "error");
      return;
    }
    setModalDocument(source);
    setActivePreset(preset);
    setIsModalOpen(true);
  }


  async function savePreset(payload: { presetId?: string; title: string; selection: ResumePresetSelection; styleSettings: ResumeStyleSettings; allowIndexing: boolean; aiGenerated: boolean }) {
    if (!modalDocument) return;
    const response = await fetch(payload.presetId ? `/api/resume/presets/${encodeURIComponent(payload.presetId)}` : "/api/resume/presets", {
      method: payload.presetId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: modalDocument.id,
        title: payload.title,
        selection: payload.selection,
        styleSettings: payload.styleSettings,
        allowIndexing: payload.allowIndexing,
        aiGenerated: payload.aiGenerated,
        defaultLocale: activePreset?.default_locale || defaultLanguageVersion?.code || modalDocument.locale,
        isPublic: false,
      }),
    });
    const result = (await response.json()) as PresetApiResponse;
    if (!response.ok || result.error || !result.preset) {
      showToast(
        result.error || labels.messages.save_failed,
        "error",
        result.docsUrl ? { href: result.docsUrl, label: "Learn more" } : undefined,
      );
      return;
    }
    setPresets((current) => mergePreset(current, result.preset!));
    setSelectedPresetId(result.preset.id);
    setSearch("");
    setFilter("all");
    showToast(labels.messages.saved);
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
      showToast(
        result.error || labels.messages.publish_failed,
        "error",
        result.docsUrl ? { href: result.docsUrl, label: "Learn more" } : undefined,
      );
      return;
    }
    setPresets((current) => mergePreset(current, result.preset!));
    setSelectedPresetId(result.preset.id);
    setSearch("");
    setFilter("all");
    setPublishDraft(null);
    showToast(labels.messages.published);
  }

  async function unpublishPreset(preset: ResumePresetRow) {
    const response = await fetch(`/api/resume/presets/${encodeURIComponent(preset.id)}/unpublish`, {
      method: "POST",
    });
    const result = (await response.json()) as PresetApiResponse;
    if (!response.ok || result.error || !result.preset) {
      showToast(result.error || labels.messages.unpublish_failed, "error");
      return;
    }
    setPresets((current) => mergePreset(current, result.preset!));
    setSelectedPresetId(result.preset.id);
    setSearch("");
    setFilter("all");
    showToast(labels.messages.unpublished);
  }

  async function deletePreset(preset: ResumePresetRow) {
    setDeletingPresetId(preset.id);
    const response = await fetch(`/api/resume/presets/${encodeURIComponent(preset.id)}`, {
      method: "DELETE",
    });
    const result = (await response.json()) as PresetApiResponse;
    setDeletingPresetId(null);

    if (!response.ok || result.error) {
      showToast(result.error || labels.messages.delete_failed, "error");
      return;
    }

    setPresets((current) => current.filter((item) => item.id !== preset.id));
    setPreviewPreset((current) => (current?.id === preset.id ? null : current));
    setActivePreset((current) => (current?.id === preset.id ? null : current));
    showToast(labels.messages.deleted, "error");
  }

  function copyPublicLink(preset: ResumePresetRow) {
    if (!preset.canonical_public_path) {
      showToast(labels.messages.publish_first, "warning");
      return;
    }
    const url = `${window.location.origin}${preset.canonical_public_path}`;
    navigator.clipboard.writeText(url).then(
      () => showToast(labels.messages.link_copied),
      () => showToast(labels.messages.copy_failed, "error"),
    );
  }

  function exportText(preset: ResumePresetRow) {
    const exportUrls = buildPublishedResumeExportUrls(preset.canonical_public_path, preset.default_locale);
    if (!exportUrls) {
      showToast(labels.messages.publish_before_text, "warning");
      return;
    }

    window.open(exportUrls.textUrl, "_blank");
    showToast(labels.messages.preparing_text);
  }

  function exportPdf(preset: ResumePresetRow) {
    const exportUrls = buildPublishedResumeExportUrls(preset.canonical_public_path, preset.default_locale);
    if (!exportUrls) {
      showToast(labels.messages.publish_before_pdf, "warning");
      return;
    }

    window.open(exportUrls.pdfUrl, "_blank");
    showToast(labels.messages.preparing_pdf);
  }

  function exportUserData() {
    window.open("/api/resume/transfer/export", "_blank");
    showToast(labels.messages.preparing_data);
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
        showToast(result.error || labels.messages.import_failed, "error");
        return;
      }
      showToast(labels.messages.import_success);
      window.location.reload();
    } catch {
      showToast(labels.messages.import_failed, "error");
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
      showToast(labels.messages.no_languages, "error");
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

  return (
    <div className="dashboard-workspace">
      <StatusToast toast={toast} onClose={closeToast} />
      <header className="dashboard-workspace__heading">
        <div>
          <h1>{labels.main.title}</h1>
          <p>{labels.main.subtitle}</p>
        </div>
      </header>

      <section className="dashboard-master" aria-labelledby="dashboard-master-title">
        <div className="dashboard-master__main">
          <div className="dashboard-master__title">
            <span className="dashboard-document-icon">
              <FileText size={22} aria-hidden="true" />
            </span>
            <div>
              <h2 id="dashboard-master-title">
                {labels.main.master_title}{" "}
                <span className="dashboard-state">
                  <LockKeyhole size={12} aria-hidden="true" /> {labels.main.private}
                </span>
              </h2>
              <p>{hasMasterResume ? formatAppMessage(labels.main.saved, { date: latestMasterUpdate }) : labels.main.start_story}</p>
            </div>
          </div>
          <p>{labels.main.master_description}</p>
          <div className="actions-row">
            <Link className="button button--primary" href="/master-resume">
              {labels.main.edit_master}
            </Link>
            {dataTransferEnabled ? (
              <>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={exportUserData}
                  disabled={!hasMasterResume}
                  title={hasMasterResume ? labels.main.export_title : labels.main.create_master_first}
                >
                  {labels.main.export}
                </button>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => importFileInputRef.current?.click()}
                  title={labels.main.import_title}
                >
                  {labels.main.import}
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
            <span>{labels.main.completion}</span>
            <strong>{masterSummary ? `${masterSummary.completion.percent}%` : hasMasterResume ? "—" : "0%"}</strong>
          </div>
          {masterSummary || !hasMasterResume ? (
            <progress aria-label={labels.main.completion} max={100} value={masterSummary?.completion.percent ?? 0} />
          ) : (
            <p>{labels.main.reading}</p>
          )}
          <p>
            {masterSummary
              ? formatAppMessage(labels.main.completion_summary, {
                  done: Object.values(masterSummary.completion.statuses).filter((status) => status === "ok").length,
                  total: Object.keys(masterSummary.completion.statuses).length,
                })
              : labels.main.add_details}
          </p>
          <Link href="/master-resume" className="dashboard-text-link">
            {masterSummary?.completion.next ? labels.main.continue_editing : labels.main.review_content}
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
        {documentError ? (
          <p className="status status--error" role="alert">
            {documentError}
          </p>
        ) : null}
        <dl className="dashboard-master__stats" aria-label={labels.main.stats_aria}>
          {(
            [
              [labels.main.roles, masterSummary?.counts.roles, labels.main.roles_note],
              [labels.main.experience, masterSummary?.counts.experience, labels.main.experience_note],
              [labels.main.skills, masterSummary?.counts.skills, labels.main.skills_note],
              [labels.main.courses, masterSummary?.counts.courses, labels.main.courses_note],
              [labels.main.cv_languages, languageVersions.length, localeSummary],
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
            {formatAppMessage(labels.main.stats_note, { locale: masterResume.locale.toUpperCase() })}
          </p>
        ) : null}
      </section>

      <section aria-labelledby="dashboard-library-title">
        <div className="dashboard-library-heading">
          <h2 id="dashboard-library-title">{labels.library.title}</h2>
          <p>
            <strong>{presets.length}</strong> {labels.library.versions} <span>·</span> <strong>{publishedPresetCount}</strong> {labels.library.public}{" "}
            <span>·</span> <strong>{privatePresetCount}</strong> {labels.library.private}
          </p>
        </div>
        {presets.length === 0 ? (
          <div className="dashboard-empty-state">
            <h3>{hasMasterResume ? labels.library.no_versions : labels.library.start_master}</h3>
            <p>
              {hasMasterResume
                ? labels.library.empty_with_master
                : labels.library.empty_without_master}
            </p>
            {hasMasterResume ? (
              <button type="button" className="button button--primary" onClick={openCreatePreset} disabled={!yamlReady}>
                {labels.main.create_version}
              </button>
            ) : (
              <Link className="button button--primary" href="/master-resume">
                {labels.main.edit_master}
              </Link>
            )}
          </div>
        ) : (
          <div className="dashboard-library">
            <div className="dashboard-library__list">
              <div className="dashboard-library__create">
                <button
                  type="button"
                  className="button button--primary"
                  onClick={openCreatePreset}
                  disabled={!hasMasterResume || !yamlReady}
                  title={!hasMasterResume ? labels.main.create_master_first : undefined}
                >
                  <Plus size={15} aria-hidden="true" /> {labels.main.create_version}
                </button>
              </div>
              <div className="dashboard-library__filters">
                <label className="dashboard-search">
                  <Search size={16} aria-hidden="true" />
                  <input
                    type="search"
                    aria-label={labels.library.search_aria}
                    placeholder={labels.library.search_placeholder}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
                <div className="dashboard-filter" role="group" aria-label={labels.library.filter_aria}>
                  {(
                    [
                      ["all", labels.library.filter_all],
                      ["public", labels.library.filter_public],
                      ["private", labels.library.filter_private],
                    ] as const
                  ).map(([value, label]) => (
                    <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {visiblePresets.length ? (
                <ul className="dashboard-library-items" aria-label={labels.library.saved_aria}>
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
                          <small>{formatAppMessage(labels.library.updated, { date: new Date(preset.updated_at).toLocaleDateString(locale) })}</small>
                          <span className="dashboard-library-item__badges">
                            <span className={`dashboard-state${preset.is_public ? " dashboard-state--public" : ""}`}>
                              {preset.is_public ? labels.library.published : labels.library.private_state}
                            </span>
                            <span className="dashboard-state">{preset.default_locale.toUpperCase()}</span>
                            {preset.onboarding_test_run_id ? <span className="dashboard-state">{labels.library.test}</span> : null}
                          </span>
                          <small>{preset.allow_indexing ? labels.library.indexable : labels.library.noindex}</small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="dashboard-library-empty">
                  <p>{labels.library.no_matches}</p>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => {
                      setSearch("");
                      setFilter("all");
                    }}
                  >
                    {labels.library.clear_filters}
                  </button>
                </div>
              )}
            </div>
            <div className="dashboard-library__detail">
              {selectedPreset ? (
                <>
                  <div className="dashboard-library__actions">
                    <p>
                      <LockKeyhole size={13} aria-hidden="true" /> {labels.library.master_private}
                    </p>
                    <div className="actions-row">
                      {selectedPreset.onboarding_test_run_id ? (
                        <Link
                          className="button button--ghost"
                          href={selectedPreset.canonical_public_path || `/onboarding/test-cv/${selectedPreset.onboarding_test_run_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {labels.library.open_test_cv}
                        </Link>
                      ) : (
                        <button type="button" className="button button--ghost" onClick={() => setPreviewPreset(selectedPreset)}>
                          {dictionary.dashboard.preview.open_cv}
                        </button>
                      )}
                      {!selectedPreset.onboarding_test_run_id ? (
                        <button
                          type="button"
                          className={`button ${selectedPreset.is_public ? "button--ghost" : "button--primary"}`}
                          onClick={() => openPublishSavedVersion(selectedPreset)}
                        >
                          {selectedPreset.is_public ? labels.library.publish_again : labels.library.publish}
                        </button>
                      ) : null}
                      {selectedPreset.is_public ? (
                        <button
                          type="button"
                          className="button button--primary"
                          onClick={() => copyPublicLink(selectedPreset)}
                        >
                          {labels.library.copy_link}
                        </button>
                      ) : null}
                      <PresetActionsMenu
                        preset={selectedPreset}
                        onEdit={() => openPresetEditor(selectedPreset)}
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
                  </div>
                  {selectedPreset.onboarding_test_run_id ? (
                    <div className="dashboard-test-preview">
                      <FileText size={40} aria-hidden="true" />
                      <h3>{selectedPreset.title}</h3>
                      <p>{labels.library.test_draft}</p>
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
                          ? labels.library.loading_preview
                          : labels.library.add_content)}
                    </p>
                  )}
                </>
              ) : (
                <div className="dashboard-library-empty">
                  <h3>{labels.library.no_selected}</h3>
                  <p>{labels.library.choose_version}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {confirmDeletePreset ? (
        <div className="dashboard-modal" role="dialog" aria-modal="true" aria-label={labels.delete_modal.aria_label}>
          <button
            type="button"
            className="dashboard-modal__backdrop"
            onClick={() => setConfirmDeletePreset(null)}
            aria-label={labels.delete_modal.cancel_aria}
          ></button>
          <div className="dashboard-modal__body dashboard-modal__body--compact">
            <h2 className="dashboard-modal__title">{labels.delete_modal.title}</h2>
            <p className="dashboard-modal__copy">
              {labels.delete_modal.before_title} <strong>{confirmDeletePreset.title}</strong>{" "}
              {confirmDeletePreset.is_public ? labels.delete_modal.public_suffix : ""}. {labels.delete_modal.after_title}
            </p>
            <div className="dashboard-modal__footer">
              <button type="button" className="button" onClick={() => setConfirmDeletePreset(null)}>
                {labels.delete_modal.cancel}
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
                {deletingPresetId === confirmDeletePreset.id ? labels.delete_modal.deleting : labels.delete_modal.delete}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingImport ? (
        <div className="dashboard-modal" role="dialog" aria-modal="true" aria-label={labels.import_modal.aria_label}>
          <button
            type="button"
            className="dashboard-modal__backdrop"
            onClick={() => setPendingImport(null)}
            aria-label={labels.import_modal.cancel_aria}
          ></button>
          <div className="dashboard-modal__body dashboard-modal__body--compact">
            <h2 className="dashboard-modal__title">{labels.import_modal.title}</h2>
            <p className="dashboard-modal__copy">
              {labels.import_modal.before_file} <strong>{pendingImport.fileName}</strong> {labels.import_modal.explanation}
            </p>
            <div className="dashboard-modal__footer">
              <button type="button" className="button" onClick={() => setPendingImport(null)}>
                {labels.import_modal.cancel}
              </button>
              <button
                type="button"
                className="button button--danger"
                disabled={isImporting}
                onClick={() => void importUserData()}
              >
                {isImporting ? labels.import_modal.importing : labels.import_modal.action}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isModalOpen && modalDocument ? (
        <PresetModal
          masterResume={modalDocument}
          preset={activePreset}
          options={options}
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
