"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { flushSync } from "react-dom";
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
import PublicationLanguageFields, { validatePublicationLanguages, type PublicationLanguages } from "../components/PublicationLanguageFields";
import { BasicResumeDocument } from "../components/resume-renderer/BasicResumeDocument";
import ResumeLanguageSwitcher, { type ResumeLanguageOption } from "../components/resume-language-switcher";
import { FileText, Globe, LockKeyhole, Plus, ArrowUpRight } from "lucide-react";
import {
  Button,
  buttonClassName,
  Checkbox,
  EmptyState,
  Field,
  Menu,
  MenuItem,
  Modal,
  Panel,
  SearchField,
  SegmentedControl,
  Select,
  StatePill,
  TextInput,
} from "../components/design-system/primitives";
import { normalizeResumeStyle, presetStyleSource, RESUME_TEMPLATE_PALETTES, type ResumeStyleSettings, type ResumeVisualTemplate } from "../lib/resume-style";
import { useAppI18n } from "../components/app-i18n-provider";
import { formatAppMessage } from "../i18n/locale";
import type { AppDictionary } from "../i18n/types";
import {
  summarizeMasterResume,
  filterDashboardPresets,
  getSelectedDashboardPreset,
  mergePreset,
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
  indexingEnabled?: boolean;
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

/**
 * Keeps the last non-null value while a dialog animates out, and counts openings so each one
 * mounts a fresh dialog (its form state starts from the new value, not the previous one).
 */
function useDialogValue<T>(value: T | null) {
  const isOpen = value !== null;
  const [state, setState] = useState({ value, opening: isOpen ? 1 : 0, wasOpen: isOpen });
  if (isOpen !== state.wasOpen || (isOpen && value !== state.value)) {
    setState({
      value: isOpen ? value : state.value,
      opening: state.opening + (isOpen && !state.wasOpen ? 1 : 0),
      wasOpen: isOpen,
    });
  }
  return { value: isOpen ? value : state.value, open: isOpen, key: state.opening };
}

type DocumentWithViewTransition = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> };
};

/**
 * Runs a state change inside a view transition (dashboard.css names the elements for `kind`
 * only while it runs, so route and theme transitions never see them). Without the API or with
 * reduced motion the change applies at once.
 */
let latestViewTransition = 0;

function withViewTransition(kind: "sheet" | "filter", update: () => void) {
  const viewTransitionDocument = document as DocumentWithViewTransition;
  if (
    typeof viewTransitionDocument.startViewTransition !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    update();
    return;
  }
  const root = document.documentElement;
  const run = ++latestViewTransition;
  root.dataset.dashboardVt = kind;
  const transition = viewTransitionDocument.startViewTransition(() => flushSync(update));
  void transition.finished.catch(() => undefined).finally(() => {
    // A newer transition owns the attribute; clearing it here would drop its names mid-animation.
    if (run === latestViewTransition) delete root.dataset.dashboardVt;
  });
}

/** In the one-column layout the detail panel sits below the whole list, so a tap brings it into view. */
function revealDetailOnNarrowScreens() {
  // Same step as the one-column rule in dashboard.css (DESIGN.md breakpoint ladder: 767/768px).
  if (!window.matchMedia("(max-width: 767px)").matches) return;
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.requestAnimationFrame(() =>
    document.getElementById("dashboard-detail")?.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "auto" }),
  );
}

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

type PresetSavePayload = {
  presetId?: string;
  title: string;
  selection: ResumePresetSelection;
  styleSettings: unknown;
  allowIndexing: boolean;
  aiGenerated: boolean;
  /** Set for a published version: saving also replaces the content under its link in these languages. */
  publication?: PublicationLanguages;
};

function PresetModal({
  open,
  masterResume,
  preset,
  options,
  publishableLocales,
  languageOptions,
  indexingEnabled,
  onClose,
  onSave,
}: {
  open: boolean;
  masterResume: ResumeDocumentRow;
  preset: ResumePresetRow | null;
  options: PresetOption[];
  publishableLocales: ResumeLocale[];
  languageOptions: ResumeUserLocaleRow[];
  indexingEnabled: boolean;
  onClose: () => void;
  /** A returned message is shown in the editor, which then stays open. */
  onSave: (payload: PresetSavePayload) => Promise<string | void>;
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
  const [styleEdited, setStyleEdited] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const isPublished = Boolean(preset?.is_public);
  const [publication, setPublication] = useState<PublicationLanguages>(() => {
    const selectedLocales = preset?.published_locales?.length ? preset.published_locales : [preset?.default_locale ?? masterResume.locale];
    const defaultLocale = selectedLocales.includes(preset?.default_locale as ResumeLocale) ? (preset!.default_locale as ResumeLocale) : selectedLocales[0];
    return { selectedLocales, defaultLocale };
  });
  const publicationLocales = Array.from(new Set([...publishableLocales, ...publication.selectedLocales])).sort();
  const submitLabel = isPublished ? labels.update : preset ? labels.save : labels.create;

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
    const invalidPublication = isPublished ? validatePublicationLanguages(publication, dictionary.dashboard.publish_modal) : null;
    if (invalidPublication) {
      setError(invalidPublication);
      return;
    }
    setError("");
    setIsSaving(true);
    try {
      // A rejected save (network failure, etc.) must not strand the button on
      // "Saving..." forever — the user's title/selection stay as entered so
      // they can retry without re-filling the form.
      const result = await saveOrReportError(
        () => onSave({ presetId: preset?.id, title, selection: nextSelection, styleSettings: preset?.style_settings && !styleEdited ? preset.style_settings : styleSettings, allowIndexing, aiGenerated, publication: isPublished ? publication : undefined }),
        "Could not save. Check your connection and try again.",
      );
      if (!result.ok) setError(result.error);
      else if (result.value) setError(result.value);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => onClose()}
      title={preset ? labels.edit_title : labels.create_title}
      size="wide"
      closeLabel={labels.close_aria}
      footer={
        <>
          <Button onClick={onClose}>{labels.cancel}</Button>
          <Button
            variant="primary"
            busy={isSaving}
            onClick={() => void handleSave()}
            title={isPublished ? labels.update_hint : undefined}
          >
            {isSaving ? labels.saving : submitLabel}
          </Button>
        </>
      }
    >
      <div className="dashboard-preset">
        <div className="dashboard-preset__settings">
          <TextInput
            label={labels.title_label}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={labels.title_placeholder}
          />

          <div className="dashboard-preset-style" role="group" aria-label={labels.style_aria}>
            <Select
              label={labels.template}
              value={styleSettings.template}
              onChange={(event) => {
                const template = event.target.value as ResumeVisualTemplate;
                setStyleEdited(true);
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
            </Select>
            <Field label={labels.primary_color}>
              {(control) => (
                <span className="dashboard-preset-style__color">
                  <input
                    {...control}
                    type="color"
                    value={styleSettings.accentColor}
                    onChange={(event) => {
                      setStyleEdited(true);
                      setStyleSettings({ ...styleSettings, accentColor: event.target.value });
                    }}
                  />
                  <code className="ocv-value">{styleSettings.accentColor}</code>
                </span>
              )}
            </Field>
          </div>

          {indexingEnabled ? (
            <Checkbox label={labels.allow_indexing} checked={allowIndexing} onChange={(event) => setAllowIndexing(event.target.checked)} />
          ) : (
            <p className="ocv-meta">{labels.link_only_note}</p>
          )}

          <Checkbox label={labels.ai_generated} checked={aiGenerated} onChange={(event) => setAiGenerated(event.target.checked)} />

          {isPublished ? (
            <section className="dashboard-preset__publication" aria-label={dictionary.dashboard.publish_modal.link_state}>
              <PublicationLanguageFields locales={publicationLocales} languageOptions={languageOptions} value={publication} onChange={setPublication} />
              <p className="ocv-meta">{dictionary.dashboard.publish_modal.active_link}</p>
            </section>
          ) : null}
        </div>

        <div className="dashboard-preset-options">
          {options.map((option) => (
            <fieldset key={option.key} className="dashboard-preset-options__section">
              <legend className="ocv-label">{option.label}</legend>
              {option.items.length === 0 ? (
                <p className="ocv-meta">{labels.no_items}</p>
              ) : (
                option.items.map((item, index) => {
                  const summaryChoiceEnabled = option.key !== "summary" || option.items.length > 1;
                  return (
                    <label key={`${option.key}-${index}`} className="ocv-check">
                      <input
                        className="ocv-check__box"
                        type={option.key === "summary" ? "radio" : "checkbox"}
                        name={option.key === "summary" ? "preset-summary" : undefined}
                        checked={option.key === "summary" && option.items.length === 1 ? true : selection[option.key].includes(index)}
                        disabled={!summaryChoiceEnabled}
                        onChange={() => toggleIndex(option.key, index)}
                      />
                      <span>{item}</span>
                    </label>
                  );
                })
              )}
            </fieldset>
          ))}
        </div>
      </div>

      {error ? (
        <p className="dashboard-error" role="alert">
          {error}
        </p>
      ) : null}
    </Modal>
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
  open = true,
}: {
  masterResume: ResumeDocumentRow;
  documents: ResumeDocumentRow[];
  languages: ResumeUserLocaleRow[];
  preset: ResumePresetRow;
  draftPdfEnabled?: boolean;
  /** Inline: opens the full preview. Dialog: closes it. */
  onClose: () => void;
  /** Renders a small, non-interactive sheet for the dashboard detail panel instead of the dialog. */
  inline?: boolean;
  open?: boolean;
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
  const sourceDocument = availableDocuments.find((document) => document.id === preset.document_id) || masterResume;
  const publicLink = parseCanonicalPublicPath(preset.canonical_public_path);
  const previewResult = useMemo(
    () => buildPresetResumeDocument(activeDocument.yaml_content, preset.selection, {
      translation: activeDocument.locale !== sourceDocument.locale,
    }),
    [activeDocument.yaml_content, activeDocument.locale, sourceDocument.locale, preset.selection],
  );
  const cvLanguages = useMemo(
    () => buildLanguageOptions(availableDocuments, languages, locale),
    [availableDocuments, languages, locale],
  );
  const cvStyle = normalizeResumeStyle(presetStyleSource(preset.style_settings, activeDocument.style_settings));

  const fallbackMessage =
    previewResult.status === "empty"
      ? formatAppMessage(labels.empty_language, {
          language: cvLanguages.find((language) => language.code === activeDocument.locale)?.label || activeDocument.locale.toUpperCase(),
        })
      : labels.render_error;

  if (inline) {
    return (
      <div className="dashboard-library-preview">
        {previewResult.status !== "ok" ? (
          <p className={previewResult.status === "empty" ? "ocv-meta" : "dashboard-error"}>{fallbackMessage}</p>
        ) : (
          <div className="dashboard-thumb">
            {/* ponytail: the real renderer at its natural width, zoomed down; inert, so the button is the only target */}
            <div ref={previewContainerRef} className="dashboard-thumb__page" inert aria-hidden="true">
              <BasicResumeDocument
                locale={activeDocument.locale}
                resume={previewResult.resume}
                status={preset.is_public ? "public" : "draft"}
                aiGenerated={preset.ai_generated}
                mode="public"
                showChrome={false}
                cvStyle={cvStyle}
                scrollContainerRef={previewContainerRef as React.RefObject<HTMLElement>}
              />
            </div>
            <button type="button" className="dashboard-thumb__open" aria-label={labels.open_cv} title={labels.open_cv} onClick={onClose} />
          </div>
        )}
        <p className="ocv-meta">{labels.note}</p>
      </div>
    );
  }

  return (
    <Modal
      open={open}
      onClose={() => onClose()}
      title={labels.aria_label}
      description={preset.title}
      size="wide"
      closeLabel={labels.close_aria}
      footer={<Button onClick={onClose}>{labels.close}</Button>}
    >
      {previewResult.status !== "ok" ? (
        <div className="dashboard-library-preview__fallback">
          <ResumeLanguageSwitcher
            languages={cvLanguages}
            activeLocale={activeLocale}
            ariaLabel={labels.language_aria}
            onSelect={setActiveLocale}
          />
          <p className={previewResult.status === "empty" ? "ocv-meta" : "dashboard-error"}>{fallbackMessage}</p>
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
    </Modal>
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
        className="ocv-icon-btn"
        aria-label={formatAppMessage(labels.settings_aria, { title: preset.title })}
        title={labels.settings_title}
      >
        <svg className="ocv-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.08a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </summary>
      <Menu label={labels.settings_title} role="menu" className="dashboard-preset-menu__panel">
        {!preset.onboarding_test_run_id ? (
          <MenuItem role="menuitem" onClick={() => select(onEdit)}>
            {labels.edit}
          </MenuItem>
        ) : null}
        <MenuItem role="menuitem" onClick={() => select(onTogglePublish)}>
          {preset.is_public ? labels.unpublish : labels.publish}
        </MenuItem>
        <MenuItem role="menuitem" onClick={() => select(onExportText)}>
          ATS (TXT)
        </MenuItem>
        <MenuItem role="menuitem" onClick={() => select(onExportPdf)}>
          PDF
        </MenuItem>
        <hr className="dashboard-preset-menu__separator" />
        <MenuItem
          role="menuitem"
          tone="danger"
          aria-label={formatAppMessage(labels.delete_aria, { title: preset.title })}
          onClick={() => select(onDelete)}
        >
          {labels.delete}
        </MenuItem>
      </Menu>
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
  indexingEnabled = false,
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
  const editorTarget = useMemo(
    () => (isModalOpen && modalDocument ? { document: modalDocument, preset: activePreset } : null),
    [isModalOpen, modalDocument, activePreset],
  );
  const presetDialog = useDialogValue(editorTarget);
  const previewDialog = useDialogValue(previewPreset && masterResume ? previewPreset : null);
  const publishDialog = useDialogValue(publishDraft);
  const deleteDialog = useDialogValue(confirmDeletePreset);
  const importDialog = useDialogValue(pendingImport);

  function openCreatePreset() {
    openPresetEditor(null);
  }

  function openPresetEditor(preset: ResumePresetRow | null) {
    const source = preset ? documents.find((document) => document.id === preset.document_id) : masterResume;
    if (!source) {
      showToast(labels.messages.source_unavailable, "error");
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


  async function savePreset(payload: PresetSavePayload): Promise<string | void> {
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
        defaultLocale: payload.publication?.defaultLocale || activePreset?.default_locale || defaultLanguageVersion?.code || modalDocument.locale,
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
    if (payload.publication) {
      const failure = await republishPreset(result.preset, payload.publication);
      if (failure) return formatAppMessage(labels.messages.saved_not_updated, { reason: failure });
    }
    setIsModalOpen(false);
    setActivePreset(null);
    showToast(payload.publication ? labels.messages.updated : labels.messages.saved);
  }

  async function republishPreset(preset: ResumePresetRow, publication: PublicationLanguages): Promise<string | null> {
    try {
      const response = await fetch(`/api/resume/presets/${encodeURIComponent(preset.id)}/republish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(publication),
      });
      const result = (await response.json()) as PresetApiResponse;
      if (!response.ok || result.error || !result.preset) return result.error || labels.messages.update_failed;
      setPresets((current) => mergePreset(current, result.preset!));
      return null;
    } catch {
      return labels.messages.update_failed;
    }
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
    <div className="dashboard-workspace" data-preview-open={previewDialog.open ? "" : undefined}>
      <StatusToast toast={toast} onClose={closeToast} />
      <header className="dashboard-workspace__heading">
        <div>
          <h1 className="ocv-title">{labels.main.title}</h1>
          <p className="ocv-lead">{labels.main.subtitle}</p>
        </div>
        {hasMasterResume ? (
          <Button
            variant="primary"
            className="dashboard-library__create"
            icon={<Plus className="ocv-icon" strokeWidth={1.75} />}
            onClick={openCreatePreset}
            disabled={!yamlReady}
          >
            {labels.main.create_version}
          </Button>
        ) : null}
      </header>

      <Panel as="section" className="dashboard-master" aria-labelledby="dashboard-master-title">
        <div className="dashboard-master__main">
          <StatePill state="private">{labels.main.private}</StatePill>
          <h2 id="dashboard-master-title" className="ocv-heading">
            {labels.main.master_title}
          </h2>
          <p className="ocv-body dashboard-master__description">{labels.main.master_description}</p>
          <p className="ocv-meta">
            {hasMasterResume ? formatAppMessage(labels.main.saved, { date: latestMasterUpdate }) : labels.main.start_story}
          </p>
          <div className="dashboard-actions">
            <Link className={buttonClassName("primary")} href="/master-resume">
              {labels.main.edit_master}
            </Link>
            {dataTransferEnabled ? (
              <>
                <Button
                  onClick={exportUserData}
                  disabled={!hasMasterResume}
                  title={hasMasterResume ? labels.main.export_title : labels.main.create_master_first}
                >
                  {labels.main.export}
                </Button>
                <Button onClick={() => importFileInputRef.current?.click()} title={labels.main.import_title}>
                  {labels.main.import}
                </Button>
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

        <div className="dashboard-master__facts">
          <div className="dashboard-master__completion">
            <p className="dashboard-split">
              <span className="ocv-label">{labels.main.completion}</span>
              <span className="ocv-value">{masterSummary ? `${masterSummary.completion.percent}%` : hasMasterResume ? "—" : "0%"}</span>
            </p>
            {masterSummary || !hasMasterResume ? (
              <progress aria-label={labels.main.completion} max={100} value={masterSummary?.completion.percent ?? 0} />
            ) : (
              <p className="ocv-meta">{labels.main.reading}</p>
            )}
            <p className="dashboard-split ocv-meta">
              <span>
                {masterSummary
                  ? formatAppMessage(labels.main.completion_summary, {
                      done: Object.values(masterSummary.completion.statuses).filter((status) => status === "ok").length,
                      total: Object.keys(masterSummary.completion.statuses).length,
                    })
                  : labels.main.add_details}
              </span>
              <Link href="/master-resume" className="dashboard-text-link">
                {masterSummary?.completion.next ? labels.main.continue_editing : labels.main.review_content}
                <ArrowUpRight className="ocv-icon" strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </p>
          </div>

          <dl className="dashboard-master__stats" aria-label={labels.main.stats_aria}>
            {(
              [
                [labels.main.roles, masterSummary?.counts.roles, labels.main.roles_note],
                [labels.main.experience, masterSummary?.counts.experience, labels.main.experience_note],
                [labels.main.skills, masterSummary?.counts.skills, labels.main.skills_note],
                [labels.main.courses, masterSummary?.counts.courses, labels.main.courses_note],
              ] as const
            ).map(([label, count, note]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd className="dashboard-master__count">{count ?? (hasMasterResume ? "—" : 0)}</dd>
                <dd className="ocv-meta">{note}</dd>
              </div>
            ))}
          </dl>

          <div className="dashboard-languages">
            <p>
              <span className="ocv-label">{labels.main.cv_languages}</span>
              {masterResume ? (
                <span className="ocv-meta">{formatAppMessage(labels.main.stats_note, { locale: masterResume.locale.toUpperCase() })}</span>
              ) : null}
            </p>
            <ul aria-label={localeSummary}>
              {languageVersions.map((language) => (
                <li key={language.code}>
                  <Link
                    className="dashboard-lang-chip"
                    href="/master-resume?panel=languages"
                    aria-label={formatAppMessage(labels.language_modal.edit_item_aria, { language: language.label })}
                  >
                    <b className="ocv-value">{(language.short_label || language.code).toUpperCase()}</b>
                    {language.is_default ? <span>{labels.language_modal.default_label}</span> : null}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  className="ocv-icon-btn dashboard-lang-add"
                  href="/master-resume?panel=languages"
                  aria-label={labels.language_modal.add_item_aria}
                  title={labels.language_modal.add_item_aria}
                >
                  <Plus className="ocv-icon" strokeWidth={1.75} aria-hidden="true" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {documentError ? (
          <p className="dashboard-error dashboard-master__error" role="alert">
            {documentError}
          </p>
        ) : null}
      </Panel>

      <section className="dashboard-library-section" aria-labelledby="dashboard-library-title">
        <header className="dashboard-library-heading">
          <div>
            <h2 id="dashboard-library-title" className="ocv-heading">
              {labels.library.title}
            </h2>
            <p className="ocv-meta">
              <span className="ocv-value">{presets.length}</span> {labels.library.versions} · <span className="ocv-value">{publishedPresetCount}</span>{" "}
              {labels.library.public} · <span className="ocv-value">{privatePresetCount}</span> {labels.library.private}
            </p>
          </div>
          {presets.length ? (
            <div className="dashboard-library__filters">
              <SearchField
                label={labels.library.search_aria}
                placeholder={labels.library.search_placeholder}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <SegmentedControl<DashboardFilter>
                label={labels.library.filter_aria}
                value={filter}
                onChange={(next) => withViewTransition("filter", () => setFilter(next))}
                options={[
                  { value: "all", label: labels.library.filter_all },
                  { value: "public", label: labels.library.filter_public },
                  { value: "private", label: labels.library.filter_private },
                ]}
              />
            </div>
          ) : null}
        </header>

        {presets.length === 0 ? (
          <EmptyState
            title={hasMasterResume ? labels.library.no_versions : labels.library.start_master}
            action={
              hasMasterResume ? null : (
                <Link className={buttonClassName("primary")} href="/master-resume">
                  {labels.main.edit_master}
                </Link>
              )
            }
          >
            {hasMasterResume ? labels.library.empty_with_master : labels.library.empty_without_master}
          </EmptyState>
        ) : (
          <div className="dashboard-library">
            <div className="dashboard-library__list">
              {visiblePresets.length ? (
                <ul className="dashboard-library-items" aria-label={labels.library.saved_aria}>
                  {visiblePresets.map((preset) => (
                    <li key={preset.id}>
                      <button
                        type="button"
                        className="dashboard-library-item"
                        aria-pressed={selectedPreset?.id === preset.id}
                        onClick={() => {
                          setSelectedPresetId(preset.id);
                          revealDetailOnNarrowScreens();
                        }}
                      >
                        <span className="dashboard-library-item__name">
                          <span className="dashboard-library-item__title">{preset.title}</span>
                          {preset.is_public && preset.canonical_public_path ? (
                            <span className="dashboard-library-item__path ocv-value">{preset.canonical_public_path}</span>
                          ) : null}
                        </span>
                        <StatePill state={preset.is_public ? "public" : "private"}>
                          {preset.is_public ? labels.library.published : labels.library.private_state}
                        </StatePill>
                        <span className="dashboard-library-item__meta ocv-meta">
                          <span className="ocv-value">{preset.default_locale.toUpperCase()}</span>
                          <span aria-hidden="true">·</span>
                          {formatAppMessage(labels.library.updated, { date: new Date(preset.updated_at).toLocaleDateString(locale) })}
                          <span aria-hidden="true">·</span>
                          {indexingEnabled && preset.allow_indexing ? labels.library.indexable : labels.library.noindex}
                          {preset.onboarding_test_run_id ? <span className="dashboard-tag">{labels.library.test}</span> : null}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title={labels.library.no_matches}
                  action={
                    <Button
                      onClick={() =>
                        withViewTransition("filter", () => {
                          setSearch("");
                          setFilter("all");
                        })
                      }
                    >
                      {labels.library.clear_filters}
                    </Button>
                  }
                />
              )}
            </div>

            <Panel as="section" id="dashboard-detail" className="dashboard-library__detail" aria-labelledby={selectedPreset ? "dashboard-detail-title" : undefined}>
              {selectedPreset ? (
                <div key={selectedPreset.id} className="dashboard-detail__body">
                  <header className="dashboard-detail__head">
                    <p className="dashboard-detail__tag">{labels.library.next_title}</p>
                    <h3 id="dashboard-detail-title" className="ocv-subheading">
                      {selectedPreset.title}
                    </h3>
                    <p className="ocv-body">
                      {selectedPreset.is_public ? labels.library.next_published : labels.library.next_private}
                    </p>
                  </header>
                  <div className="dashboard-library__actions">
                    {!selectedPreset.onboarding_test_run_id && !selectedPreset.is_public ? (
                      <Button variant="primary" onClick={() => openPublishSavedVersion(selectedPreset)}>
                        {labels.library.publish}
                      </Button>
                    ) : null}
                    {selectedPreset.is_public ? (
                      <Button variant="primary" onClick={() => copyPublicLink(selectedPreset)}>
                        {labels.library.copy_link}
                      </Button>
                    ) : null}
                    {selectedPreset.onboarding_test_run_id ? (
                      <Link
                        className={buttonClassName("secondary")}
                        href={selectedPreset.canonical_public_path || `/onboarding/test-cv/${selectedPreset.onboarding_test_run_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {labels.library.open_test_cv}
                      </Link>
                    ) : (
                      <Button onClick={() => withViewTransition("sheet", () => setPreviewPreset(selectedPreset))}>
                        {dictionary.dashboard.preview.open_cv}
                      </Button>
                    )}
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
                  {selectedPreset.onboarding_test_run_id ? (
                    <div className="dashboard-test-preview">
                      <FileText className="ocv-icon" strokeWidth={1.5} aria-hidden="true" />
                      <p className="ocv-meta">{labels.library.test_draft}</p>
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
                      onClose={() => withViewTransition("sheet", () => setPreviewPreset(selectedPreset))}
                    />
                  ) : (
                    <p className="ocv-meta">
                      {documentError || (masterResume ? labels.library.loading_preview : labels.library.add_content)}
                    </p>
                  )}
                  {selectedPreset.is_public && selectedPreset.canonical_public_path ? (
                    <p className="dashboard-link-box">
                      <Globe className="ocv-icon" strokeWidth={1.75} aria-hidden="true" />
                      <a className="ocv-value" href={selectedPreset.canonical_public_path} target="_blank" rel="noopener noreferrer">
                        {selectedPreset.canonical_public_path}
                      </a>
                    </p>
                  ) : null}
                  <p className="ocv-meta dashboard-detail__private">
                    <LockKeyhole className="ocv-icon" strokeWidth={1.75} aria-hidden="true" /> {labels.library.master_private}
                  </p>
                </div>
              ) : (
                <EmptyState title={labels.library.no_selected}>{labels.library.choose_version}</EmptyState>
              )}
            </Panel>
          </div>
        )}
      </section>

      {deleteDialog.value ? (
        <Modal
          key={deleteDialog.key}
          open={deleteDialog.open}
          size="small"
          title={labels.delete_modal.title}
          closeLabel={labels.delete_modal.cancel_aria}
          onClose={() => setConfirmDeletePreset(null)}
          footer={
            <>
              <Button onClick={() => setConfirmDeletePreset(null)}>{labels.delete_modal.cancel}</Button>
              <Button
                variant="danger"
                busy={deletingPresetId === deleteDialog.value.id}
                onClick={() => {
                  const preset = deleteDialog.value;
                  if (preset) void deletePreset(preset).then(() => setConfirmDeletePreset(null));
                }}
              >
                {deletingPresetId === deleteDialog.value.id ? labels.delete_modal.deleting : labels.delete_modal.delete}
              </Button>
            </>
          }
        >
          <p className="ocv-body">
            {labels.delete_modal.before_title} <strong>{deleteDialog.value.title}</strong>{" "}
            {deleteDialog.value.is_public ? labels.delete_modal.public_suffix : ""}. {labels.delete_modal.after_title}
          </p>
        </Modal>
      ) : null}

      {importDialog.value ? (
        <Modal
          key={importDialog.key}
          open={importDialog.open}
          size="small"
          title={labels.import_modal.title}
          closeLabel={labels.import_modal.cancel_aria}
          onClose={() => setPendingImport(null)}
          footer={
            <>
              <Button onClick={() => setPendingImport(null)}>{labels.import_modal.cancel}</Button>
              <Button variant="danger" busy={isImporting} onClick={() => void importUserData()}>
                {isImporting ? labels.import_modal.importing : labels.import_modal.action}
              </Button>
            </>
          }
        >
          <p className="ocv-body">
            {labels.import_modal.before_file} <strong className="ocv-value">{importDialog.value.fileName}</strong>{" "}
            {labels.import_modal.explanation}
          </p>
        </Modal>
      ) : null}

      {presetDialog.value ? (
        <PresetModal
          key={presetDialog.key}
          open={presetDialog.open}
          masterResume={presetDialog.value.document}
          preset={presetDialog.value.preset}
          options={options}
          publishableLocales={publishableLocales}
          languageOptions={languageVersions}
          indexingEnabled={indexingEnabled}
          onClose={() => {
            setIsModalOpen(false);
            setActivePreset(null);
          }}
          onSave={savePreset}
        />
      ) : null}

      {previewDialog.value && masterResume ? (
        <PresetPreviewModal
          key={previewDialog.key}
          open={previewDialog.open}
          masterResume={masterResume}
          documents={documents}
          languages={languageVersions}
          preset={previewDialog.value}
          draftPdfEnabled={draftPdfEnabled}
          onClose={() => {
            setPreviewPreset(null);
          }}
        />
      ) : null}

      {publishDialog.value ? (
        <PublishSavedVersionModal
          key={publishDialog.key}
          open={publishDialog.open}
          draft={publishDialog.value}
          locales={
            publishDialog.value.preset.onboarding_test_run_id
              ? [publishDialog.value.preset.default_locale]
              : Array.from(new Set(publishableLocales))
          }
          languageOptions={languageVersions}
          indexingEnabled={indexingEnabled}
          onClose={() => setPublishDraft(null)}
          onPublish={publishPreset}
        />
      ) : null}
    </div>
  );
}
