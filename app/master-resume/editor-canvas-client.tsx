"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { StatusToast, useStatusToast } from "../components/status-toast";
import ResumeLivePreview from "./resume-live-preview";
import type { ResumeEditorStyle } from "./resume-live-preview";
import type {
  ResumeContactItem,
  ResumeCourse,
  ResumeDocument,
  ResumeEducation,
  ResumeExperience,
  ResumeLanguage,
  ResumeLocale,
  ResumeQrCode,
  ResumeRevisionItem,
  ResumeSkill,
  ResumeSummaryItem,
} from "../lib/resume-schema";
import type { ResumePresetRow } from "../lib/resume-server";
import { defaultResumeDocument, normalizeResumeDocument, validateResumeDocument } from "../lib/resume-schema";

type ResumeDocumentRow = {
  id: string;
  locale: ResumeLocale;
  title: string;
  yaml_content: string;
  schema_version: number;
  is_public: boolean;
  allow_indexing: boolean;
  ai_generated: boolean;
  updated_at: string;
};

type ApiDocumentResponse = {
  ok?: boolean;
  error?: string;
  actor?: {
    userId: string;
    displayName: string;
    role: string;
  };
  locale?: ResumeLocale;
  document?: ResumeDocumentRow;
  revisions?: ResumeRevisionItem[];
};

type ResumeLanguageMetadata = {
  code: ResumeLocale;
  label: string;
  short_label: string;
  sort_order?: number;
};

type ApiLanguagesResponse = {
  ok?: boolean;
  error?: string;
  languages?: ResumeLanguageMetadata[];
};
type ApiLanguagePostResponse = {
  ok?: boolean;
  error?: string;
  language?: ResumeLanguageMetadata;
};

type ApiPresetsResponse = {
  ok?: boolean;
  error?: string;
  presets?: ResumePresetRow[];
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

type EditorTab = "yaml" | "human";

const TEMPLATE_PATH = "/data/private/resume-en-template.yaml";
const EDITOR_STYLES: Array<{ code: ResumeEditorStyle; label: string }> = [
  { code: "basic", label: "basic" },
  { code: "empty", label: "pusty" },
];

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


function hasYamlRuntime(): boolean {
  return typeof window !== "undefined" && typeof window.jsyaml?.load === "function" && typeof window.jsyaml?.dump === "function";
}

function parseYamlToResumeDocument(yamlContent: string, fallbackName: string): ResumeDocument {
  if (!hasYamlRuntime()) {
    throw new Error("YAML runtime is not loaded.");
  }
  const parsed = window.jsyaml?.load(yamlContent);
  return normalizeResumeDocument(parsed, fallbackName);
}

function serializeResumeToYaml(resume: ResumeDocument): string {
  if (!hasYamlRuntime()) {
    throw new Error("YAML runtime is not loaded.");
  }
  return window.jsyaml!.dump(resume, {
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
    quotingType: '"',
  });
}

function normalizeYamlForEditor(yamlContent: string, fallbackName: string): { resume: ResumeDocument; yamlContent: string; migrated: boolean } {
  if (!hasYamlRuntime()) {
    throw new Error("YAML runtime is not loaded.");
  }

  const parsed = window.jsyaml?.load(yamlContent);
  const source = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  const resume = normalizeResumeDocument(parsed, fallbackName);
  const shouldMigrateYaml = !Array.isArray(source.summary);

  return {
    resume,
    yamlContent: shouldMigrateYaml ? serializeResumeToYaml(resume) : yamlContent,
    migrated: shouldMigrateYaml,
  };
}

async function fetchText(path: string) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.text();
}

function getFallbackLanguageLabel(locale: string): { label: string; shortLabel: string } {
  if (locale === "en") return { label: "English", shortLabel: "EN" };
  if (locale === "pl") return { label: "Polski", shortLabel: "PL" };
  if (locale === "de") return { label: "Deutsch", shortLabel: "DE" };
  return { label: locale.toUpperCase(), shortLabel: locale.slice(0, 2).toUpperCase() };
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
  languageOptions: ResumeLanguageMetadata[];
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
          <button type="button" className="button button--ghost button--small" onClick={onClose}>
            Close
          </button>
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

export default function EditorCanvasClient() {
  const searchParams = useSearchParams();
  const [locale, setLocale] = useState<ResumeLocale>(searchParams.get("locale") || "en");
  const [languageOptions, setLanguageOptions] = useState<ResumeLanguageMetadata[]>([
    { code: "en", label: "English", short_label: "EN" },
    { code: "pl", label: "Polski", short_label: "PL" },
  ]);
  const [editorTab, setEditorTab] = useState<EditorTab>("yaml");
  const [selectedStyle, setSelectedStyle] = useState<ResumeEditorStyle>("basic");
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const { toast, showToast, closeToast } = useStatusToast();
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [newLanguageCode, setNewLanguageCode] = useState("");
  const [newLanguageLabel, setNewLanguageLabel] = useState("");
  const [newLanguageShortLabel, setNewLanguageShortLabel] = useState("");
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  const [editingLanguageCode, setEditingLanguageCode] = useState<ResumeLocale | null>(null);
  const [defaultLocale, setDefaultLocale] = useState<ResumeLocale>("en");

  const [actor, setActor] = useState<{ userId: string; displayName: string; role: string } | null>(null);
  const [documentRow, setDocumentRow] = useState<ResumeDocumentRow | null>(null);
  const [resume, setResume] = useState<ResumeDocument>(defaultResumeDocument(""));
  const [yamlPanel, setYamlPanel] = useState("");
  const [changeNote, setChangeNote] = useState("Publish update");
  const [allowIndexing, setAllowIndexing] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [revisions, setRevisions] = useState<ResumeRevisionItem[]>([]);
  const [presets, setPresets] = useState<ResumePresetRow[]>([]);
  const [isPresetsLoading, setIsPresetsLoading] = useState(true);
  const [presetsError, setPresetsError] = useState("");
  const [publishDraft, setPublishDraft] = useState<PublishDraft | null>(null);
  const [activePresetActionId, setActivePresetActionId] = useState<string | null>(null);

  const validation = useMemo(() => validateResumeDocument(resume), [resume]);
  const normalizedNewLanguageCode = useMemo(() => newLanguageCode.trim().toLowerCase().split("-")[0].slice(0, 2), [newLanguageCode]);
  const normalizedNewLanguageShortLabel = useMemo(
    () => (newLanguageShortLabel.trim() || normalizedNewLanguageCode).toUpperCase().slice(0, 2),
    [newLanguageShortLabel, normalizedNewLanguageCode],
  );
  const publishableLocales = useMemo(() => {
    const next = Array.from(new Set(languageOptions.map((language) => language.code)));
    if (documentRow?.locale && !next.includes(documentRow.locale)) {
      next.unshift(documentRow.locale);
    }
    return next;
  }, [documentRow?.locale, languageOptions]);

  const loadPresets = useCallback(async () => {
    setIsPresetsLoading(true);
    setPresetsError("");

    try {
      const response = await fetch("/api/resume/presets");
      const payload = (await response.json()) as ApiPresetsResponse;
      if (!response.ok || payload.error) {
        const message = payload.error || "Saved Version list could not be loaded.";
        setPresets([]);
        setPresetsError(message);
        showToast(message, "warning");
        return;
      }

      setPresets(Array.isArray(payload.presets) ? payload.presets : []);
    } catch {
      const message = "Saved Version list could not be loaded.";
      setPresets([]);
      setPresetsError(message);
      showToast(message, "warning");
    } finally {
      setIsPresetsLoading(false);
    }
  }, [showToast]);


  const loadLocaleDocument = useCallback(
    async (nextLocale: ResumeLocale) => {
      setIsLoading(true);
      showToast("Loading YAML editor...");

      try {
        const response = await fetch(`/api/resume/document?locale=${encodeURIComponent(nextLocale)}`);
        const payload = (await response.json()) as ApiDocumentResponse;
        const loadedActor = payload.actor || null;

        if (loadedActor) {
          setActor(loadedActor);
        }

        if (payload.document) {
          setDocumentRow(payload.document);
          setAllowIndexing(payload.document.allow_indexing);
          setAiGenerated(payload.document.ai_generated);
        }
        setRevisions(payload.revisions || []);

        let nextYamlPanel = payload.document?.yaml_content || "";
        const nextStatus = payload.document ? "Resume document loaded." : "Template YAML loaded.";
        if (!nextYamlPanel) {
          nextYamlPanel = await fetchText(TEMPLATE_PATH);
        }

        try {
          const normalized = normalizeYamlForEditor(nextYamlPanel, loadedActor?.displayName || "");
          nextYamlPanel = normalized.yamlContent;
          setResume(normalized.resume);
          showToast(normalized.migrated ? `${nextStatus} Legacy summary migrated to list format.` : nextStatus);
        } catch (error) {
          setResume(defaultResumeDocument(loadedActor?.displayName || ""));
          showToast(`Failed to parse YAML: ${error instanceof Error ? error.message : "unknown error"}`, "error");
        }

        setYamlPanel(nextYamlPanel);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Unable to load YAML editor.", "error");
      } finally {
        setIsLoading(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    let mounted = true;

    async function init() {
      let retries = 0;
      while (!hasYamlRuntime() && retries < 40) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        retries += 1;
      }
      if (!mounted) return;
      if (!hasYamlRuntime()) {
        showToast("YAML parser is unavailable. Reload the page.", "error");
        setIsLoading(false);
        return;
      }
      await loadLocaleDocument(locale);
    }

    void init();
    return () => {
      mounted = false;
    };
  }, [loadLocaleDocument, locale, showToast]);

  useEffect(() => {
    let mounted = true;

    async function loadLanguages() {
      try {
        const response = await fetch("/api/resume/languages?withDocuments=true");
        const payload = (await response.json()) as ApiLanguagesResponse;
        if (mounted && payload.languages?.length) {
          setLanguageOptions(payload.languages.sort((left, right) => (left.sort_order ?? 999) - (right.sort_order ?? 999) || left.code.localeCompare(right.code)));
        }
      } catch {
        if (mounted) {
          showToast("Language list could not be refreshed.", "warning");
        }
      }
    }

    void loadLanguages();
    return () => {
      mounted = false;
    };
  }, [showToast]);

  useEffect(() => {
    void loadPresets();
  }, [loadPresets]);

  useEffect(() => {
    setDefaultLocale((current) => current || locale);
  }, [locale]);

  async function saveLanguageVersion() {
    if (!/^[a-z]{2}$/.test(normalizedNewLanguageCode)) {
      showToast("Use a two-letter language code.", "error");
      return;
    }
    if (!newLanguageLabel.trim()) {
      showToast("Language name is required.", "error");
      return;
    }
    if (!/^[A-Z]{2}$/.test(normalizedNewLanguageShortLabel)) {
      showToast("Short label must contain two letters.", "error");
      return;
    }
    if (!editingLanguageCode && languageOptions.some((language) => language.code === normalizedNewLanguageCode)) {
      showToast("This language already exists.", "error");
      return;
    }

    setIsSavingLanguage(true);
    const response = await fetch("/api/resume/languages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: normalizedNewLanguageCode,
        label: newLanguageLabel.trim(),
        shortLabel: normalizedNewLanguageShortLabel,
        createDocument: true,
      }),
    });
    const payload = (await response.json()) as ApiLanguagePostResponse;
    setIsSavingLanguage(false);
    if (!response.ok || payload.error) {
      showToast(payload.error || "Language version save failed.", "error");
      return;
    }
    setIsLanguageModalOpen(false);
    setEditingLanguageCode(null);
    setNewLanguageCode("");
    setNewLanguageLabel("");
    setNewLanguageShortLabel("");
    setLocale(normalizedNewLanguageCode as ResumeLocale);
    showToast("Language version created.");
  }

  async function setDefaultLanguage(code: ResumeLocale) {
    const response = await fetch("/api/resume/languages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, setDefault: true }),
    });
    const payload = (await response.json()) as { error?: string; defaultLocale?: ResumeLocale };
    if (!response.ok || payload.error) {
      showToast(payload.error || "Default language update failed.", "error");
      return;
    }
    setDefaultLocale(payload.defaultLocale || code);
    showToast("Default language updated.");
  }

  async function deleteLanguageVersion(code: ResumeLocale) {
    const response = await fetch("/api/resume/languages", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok || payload.error) {
      showToast(payload.error || "Language version delete failed.", "error");
      return;
    }
    setLanguageOptions((current) => current.filter((language) => language.code !== code));
    if (locale === code) {
      const fallback = languageOptions.find((language) => language.code !== code)?.code || "en";
      setLocale(fallback as ResumeLocale);
    }
    showToast("Language version deleted.");
  }

  function handleLocaleSwitch(nextLocale: ResumeLocale) {
    if (nextLocale === locale || isBusy) {
      return;
    }
    setLocale(nextLocale);
  }

  function handleYamlChange(value: string) {
    setYamlPanel(value);
    try {
      const parsed = parseYamlToResumeDocument(value, actor?.displayName || "");
      const localValidation = validateResumeDocument(parsed);
      if (localValidation.valid) {
        setResume(parsed);
      }
    } catch {
      // User is typing, skip auto-sync to form
    }
  }

  function updateResumeFromHuman(nextResume: ResumeDocument) {
    setResume(nextResume);
    try {
      setYamlPanel(serializeResumeToYaml(nextResume));
    } catch {
      // Silent catch for auto-sync to YAML
    }
  }

  function updateTextField(field: keyof Pick<ResumeDocument, "brand_initials" | "name">, value: string) {
    updateResumeFromHuman({ ...resume, [field]: value });
  }

  function updateSummary(index: number, key: keyof ResumeSummaryItem, value: string | boolean) {
    const next = [...resume.summary];
    next[index] = {
      ...next[index],
      [key]: key === "default" ? Boolean(value) : value,
    };
    updateResumeFromHuman({ ...resume, summary: next });
  }

  function setDefaultSummary(index: number, checked: boolean) {
    updateResumeFromHuman({
      ...resume,
      summary: resume.summary.map((item, itemIndex) => ({
        ...item,
        default: itemIndex === index ? checked : false,
      })),
    });
  }

  function addArrayItem(field: "contact", item: ResumeContactItem): void;
  function addArrayItem(field: "summary", item: ResumeSummaryItem): void;
  function addArrayItem(field: "qr_codes", item: ResumeQrCode): void;
  function addArrayItem(field: "skills", item: ResumeSkill): void;
  function addArrayItem(field: "tech_stack", item: string): void;
  function addArrayItem(field: "languages", item: ResumeLanguage): void;
  function addArrayItem(field: "interests", item: string): void;
  function addArrayItem(field: "experience", item: ResumeExperience): void;
  function addArrayItem(field: "education", item: ResumeEducation): void;
  function addArrayItem(field: "courses", item: ResumeCourse): void;
  function addArrayItem(field: keyof ResumeDocument, item: unknown) {
    const currentValue = resume[field];
    if (!Array.isArray(currentValue)) return;
    updateResumeFromHuman({
      ...resume,
      [field]: [...currentValue, item],
    } as ResumeDocument);
  }

  function removeArrayItem(field: keyof ResumeDocument, index: number) {
    const currentValue = resume[field];
    if (!Array.isArray(currentValue)) return;
    updateResumeFromHuman({
      ...resume,
      [field]: currentValue.filter((_, itemIndex) => itemIndex !== index),
    } as ResumeDocument);
  }

  function updateContact(index: number, key: keyof ResumeContactItem, value: string) {
    const next = [...resume.contact];
    next[index] = { ...next[index], [key]: value };
    updateResumeFromHuman({ ...resume, contact: next });
  }

  function updateQrCode(index: number, key: keyof ResumeQrCode, value: string) {
    const next = [...resume.qr_codes];
    next[index] = {
      ...next[index],
      [key]: key === "size" ? Math.max(1, Number.parseInt(value, 10) || 130) : value,
    };
    updateResumeFromHuman({ ...resume, qr_codes: next });
  }

  function updateSkill(index: number, key: keyof ResumeSkill, value: string) {
    const next = [...resume.skills];
    next[index] = {
      ...next[index],
      [key]: key === "level" ? Math.max(1, Math.min(5, Number.parseInt(value, 10) || 1)) : value,
    };
    updateResumeFromHuman({ ...resume, skills: next });
  }

  function updateStringList(field: "tech_stack" | "interests", index: number, value: string) {
    const next = [...resume[field]];
    next[index] = value;
    updateResumeFromHuman({ ...resume, [field]: next });
  }

  function updateLanguage(index: number, key: keyof ResumeLanguage, value: string) {
    const next = [...resume.languages];
    next[index] = {
      ...next[index],
      [key]: key === "level" ? Math.max(1, Math.min(5, Number.parseInt(value, 10) || 1)) : value,
    };
    updateResumeFromHuman({ ...resume, languages: next });
  }

  function updateExperience(index: number, key: keyof ResumeExperience, value: string) {
    const next = [...resume.experience];
    next[index] = {
      ...next[index],
      [key]: key === "highlights" ? value.split("\n").map((item) => item.trim()).filter(Boolean) : value,
    };
    updateResumeFromHuman({ ...resume, experience: next });
  }

  function updateEducation(index: number, key: keyof ResumeEducation, value: string) {
    const next = [...resume.education];
    next[index] = { ...next[index], [key]: value };
    updateResumeFromHuman({ ...resume, education: next });
  }

  function updateCourse(index: number, key: keyof ResumeCourse, value: string) {
    const next = [...resume.courses];
    next[index] = {
      ...next[index],
      [key]: key === "year" ? Math.max(0, Number.parseInt(value, 10) || 0) : value,
    };
    updateResumeFromHuman({ ...resume, courses: next });
  }



  async function resetToTemplate() {
    try {
      const template = await fetchText(TEMPLATE_PATH);
      setYamlPanel(template);
      const parsed = parseYamlToResumeDocument(template, actor?.displayName || "");
      setResume(parsed);
      showToast("Template YAML loaded.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Template load failed.", "error");
    }
  }

  function exportYamlFile() {
    const fileName = `resume-${locale}.yaml`;
    const blob = new Blob([yamlPanel], { type: "text/yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);
    showToast(`Downloaded ${fileName}.`);
  }

  function buildAbsolutePublicUrl(publicPath: string) {
    if (typeof window === "undefined") {
      return publicPath;
    }
    return new URL(publicPath, window.location.origin).toString();
  }

  function openPublicLink(publicPath: string) {
    if (typeof window === "undefined") {
      return;
    }
    window.open(buildAbsolutePublicUrl(publicPath), "_blank", "noopener,noreferrer");
  }

  async function copyPublicLink(publicPath: string) {
    const absoluteUrl = buildAbsolutePublicUrl(publicPath);

    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(absoluteUrl);
      showToast("Canonical public URL copied.");
    } catch {
      showToast("Canonical public URL could not be copied.", "error");
    }
  }

  function openPublishSavedVersion(preset: ResumePresetRow) {
    const selectedLocales = Array.from(new Set(publishableLocales));
    if (selectedLocales.length === 0) {
      showToast("No language versions available for publish.", "error");
      return;
    }
    const nextDefaultLocale = selectedLocales.includes(preset.default_locale) ? preset.default_locale : selectedLocales[0];
    setPublishDraft({
      preset,
      selectedLocales,
      defaultLocale: nextDefaultLocale,
      allowIndexing: preset.allow_indexing,
    });
  }

  async function publishSavedVersion(payload: {
    preset: ResumePresetRow;
    selectedLocales: ResumeLocale[];
    defaultLocale: ResumeLocale;
    allowIndexing: boolean;
  }) {
    const { preset, selectedLocales, defaultLocale: nextDefaultLocale, allowIndexing: nextAllowIndexing } = payload;
    setActivePresetActionId(preset.id);

    try {
      const response = await fetch(`/api/resume/presets/${encodeURIComponent(preset.id)}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allowIndexing: nextAllowIndexing,
          aiGenerated: preset.ai_generated,
          defaultLocale: nextDefaultLocale,
          selectedLocales,
        }),
      });
      const result = (await response.json()) as PresetApiResponse;
      if (!response.ok || result.error || !result.preset) {
        showToast(result.error || "CV Version publish failed.", "error");
        return;
      }

      setPublishDraft(null);
      await loadPresets();
      showToast("CV Version published.");
    } catch {
      showToast("CV Version publish failed.", "error");
    } finally {
      setActivePresetActionId(null);
    }
  }

  async function unpublishSavedVersion(preset: ResumePresetRow) {
    setActivePresetActionId(preset.id);

    try {
      const response = await fetch(`/api/resume/presets/${encodeURIComponent(preset.id)}/unpublish`, {
        method: "POST",
      });
      const result = (await response.json()) as PresetApiResponse;
      if (!response.ok || result.error || !result.preset) {
        showToast(result.error || "CV Version unpublish failed.", "error");
        return;
      }

      await loadPresets();
      showToast("CV Version unpublished.");
    } catch {
      showToast("CV Version unpublish failed.", "error");
    } finally {
      setActivePresetActionId(null);
    }
  }

  async function publishResume(targetIsPublic: boolean) {
    if (!validation.valid) {
      showToast(validation.errors.join(" "), "warning");
      return;
    }
    setIsBusy(true);
    showToast(targetIsPublic ? "Publishing resume..." : "Saving unpublished version...");

    const response = await fetch("/api/resume/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale,
        yamlContent: yamlPanel,
        title: resume.name ? `${resume.name} - Master resume` : "Master resume",
        isPublic: targetIsPublic,
        allowIndexing,
        aiGenerated,
        changeNote: targetIsPublic ? (changeNote || "Published update") : (changeNote || "Unpublished save"),
      }),
    });
    const payload = (await response.json()) as ApiDocumentResponse;
    if (!response.ok || payload.error || !payload.document) {
      showToast(payload.error || "Operation failed.", "error");
      setIsBusy(false);
      return;
    }

    setDocumentRow(payload.document);
    setRevisions(payload.revisions || []);
    showToast(targetIsPublic ? "Resume published. New revision created." : "Unpublished version saved.");
    setIsBusy(false);
  }

  async function rollbackToRevision(revisionNumber: number) {
    if (!documentRow) return;
    setIsBusy(true);
    showToast(`Rolling back to revision ${revisionNumber}...`);

    const response = await fetch("/api/resume/rollback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale,
        documentId: documentRow.id,
        revisionNumber,
      }),
    });
    const payload = (await response.json()) as ApiDocumentResponse;
    if (!response.ok || payload.error || !payload.document) {
      showToast(payload.error || "Rollback failed.", "error");
      setIsBusy(false);
      return;
    }

    setDocumentRow(payload.document);
    setRevisions(payload.revisions || []);
    setYamlPanel(payload.document.yaml_content);
    try {
      const parsed = parseYamlToResumeDocument(payload.document.yaml_content, actor?.displayName || "");
      setResume(parsed);
    } catch {
      // Should not happen for a saved revision
    }
    setIsBusy(false);
    showToast(`Rollback complete. Current document now matches revision ${revisionNumber}.`);
  }

  return (
    <section className="resume-editor-shell">
      <header className="resume-editor-shell__header">
        <div>
          <h1>Master Resume Editor</h1>
          <p className="card-lead">YAML editor with a live basic CV preview.</p>
        </div>
        <div className="resume-editor-shell__locale-switch">
          {languageOptions.map((language) => (
            <button
              key={language.code}
              type="button"
              className={`button button--ghost ${locale === language.code ? "is-active" : ""}`}
              onClick={() => void handleLocaleSwitch(language.code)}
              disabled={isBusy || isLoading}
            >
              {language.short_label}
            </button>
          ))}
          <button type="button" className="button button--ghost" onClick={() => setIsLanguageModalOpen(true)} disabled={isBusy || isLoading} aria-label="Add language version">
            +
          </button>
        </div>
      </header>

      <StatusToast toast={toast} onClose={closeToast} />
      {isLanguageModalOpen ? (
        <div className="dashboard-modal" role="dialog" aria-modal="true" aria-label="Add language version">
          <button type="button" className="dashboard-modal__backdrop" onClick={() => setIsLanguageModalOpen(false)} aria-label="Close add language version"></button>
          <div className="dashboard-modal__body">
            <div className="section-row">
              <h2>{editingLanguageCode ? "Edit language version" : "Add language version"}</h2>
              <button type="button" className="button button--ghost button--small" onClick={() => setIsLanguageModalOpen(false)}>
                Close
              </button>
            </div>
            <p className="card-lead">
              Selected now:{" "}
              <strong>{languageOptions.find((language) => language.code === locale)?.short_label || locale.toUpperCase()}</strong>
            </p>
            <label>
              Code
              <input value={newLanguageCode} onChange={(event) => setNewLanguageCode(event.target.value)} placeholder="de" maxLength={8} />
            </label>
            <label>
              Language name
              <input value={newLanguageLabel} onChange={(event) => setNewLanguageLabel(event.target.value)} placeholder="Deutsch" />
            </label>
            <label>
              Short label
              <input
                value={newLanguageShortLabel}
                onChange={(event) => setNewLanguageShortLabel(event.target.value)}
                placeholder={normalizedNewLanguageShortLabel || "DE"}
                maxLength={4}
              />
            </label>
            <section className="stack">
              <h3>Versions</h3>
              <p className="card-lead">{languageOptions.length} configured languages</p>
              <ul className="language-versions__list">
                {languageOptions.map((language) => (
                  <li key={language.code}>
                    <div className="language-versions__identity">
                      <span>{language.short_label}</span>
                      <div>
                        <strong>{language.label}</strong>
                        <p>{language.code}</p>
                      </div>
                    </div>
                    <div className="language-versions__meta">
                      {language.code === locale && language.code !== defaultLocale ? (
                        <span className="dashboard-resume-list__badge">Selected</span>
                      ) : null}
                      {language.code === defaultLocale ? <span className="dashboard-resume-list__badge">Default</span> : null}
                    </div>
                    <div className="dashboard-resume-list__actions">
                      <div className="actions-row">
                        <button
                          type="button"
                          className="button button--ghost button--small"
                          onClick={() => void setDefaultLanguage(language.code)}
                          disabled={language.code === defaultLocale}
                        >
                          Set default
                        </button>
                        <button
                          type="button"
                          className="button button--ghost button--small"
                          onClick={() => {
                            setEditingLanguageCode(language.code);
                            setNewLanguageCode(language.code);
                            setNewLanguageLabel(language.label);
                            setNewLanguageShortLabel(language.short_label);
                          }}
                        >
                          Edit
                        </button>
                      </div>
                      <div className="dashboard-resume-list__delete-separator">
                        <button
                          type="button"
                          className="button button--ghost button--small button--icon button--danger"
                          aria-label={`Delete language version ${language.label}`}
                          title="Delete language version"
                          onClick={() => void deleteLanguageVersion(language.code)}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
            <div className="actions-row">
              <button type="button" className="button button--primary" onClick={() => void saveLanguageVersion()} disabled={isSavingLanguage}>
                {isSavingLanguage ? "Saving..." : editingLanguageCode ? "Save changes" : "Create version"}
              </button>
              {editingLanguageCode ? (
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => {
                    setEditingLanguageCode(null);
                    setNewLanguageCode("");
                    setNewLanguageLabel("");
                    setNewLanguageShortLabel("");
                  }}
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="resume-editor-shell__content">
        <div className="resume-editor-form">
          <section className="stack resume-editor-panel">
            <div className="resume-editor-tabs" role="tablist" aria-label="Resume editor mode">
              <button
                type="button"
                role="tab"
                aria-selected={editorTab === "yaml"}
                className={`resume-editor-tabs__tab ${editorTab === "yaml" ? "is-active" : ""}`}
                onClick={() => setEditorTab("yaml")}
              >
                YAML Editor
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={editorTab === "human"}
                className={`resume-editor-tabs__tab ${editorTab === "human" ? "is-active" : ""}`}
                onClick={() => setEditorTab("human")}
              >
                Human-friendly Editor
              </button>
            </div>

            {editorTab === "yaml" ? (
              <div className="stack">
                <div className="section-row">
                  <h2>YAML Editor</h2>
                  <label className="resume-editor-style-select">
                    CV style
                    <select value={selectedStyle} onChange={(event) => setSelectedStyle(event.target.value as ResumeEditorStyle)}>
                      {EDITOR_STYLES.map((style) => (
                        <option key={style.code} value={style.code}>
                          {style.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <textarea
                  className="resume-editor-yaml"
                  spellCheck={false}
                  value={yamlPanel}
                  onChange={(event) => handleYamlChange(event.target.value)}
                  disabled={isLoading}
                />
                <div className="actions-row">
                  <button type="button" className="button button--ghost" onClick={() => void resetToTemplate()} disabled={isLoading}>
                    Clear template
                  </button>
                  <button type="button" className="button button--ghost" onClick={exportYamlFile}>
                    Download YAML
                  </button>
                </div>
              </div>
            ) : (
              <div className="resume-human-editor">
                <div className="section-row">
                  <h2>Human-friendly Editor</h2>
                  <label className="resume-editor-style-select">
                    CV style
                    <select value={selectedStyle} onChange={(event) => setSelectedStyle(event.target.value as ResumeEditorStyle)}>
                      {EDITOR_STYLES.map((style) => (
                        <option key={style.code} value={style.code}>
                          {style.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <section className="resume-human-editor__section">
                  <h3>Core</h3>
                  <div className="resume-human-editor__grid">
                    <label>
                      Brand initials
                      <input value={resume.brand_initials} onChange={(event) => updateTextField("brand_initials", event.target.value)} />
                    </label>
                    <label>
                      Name
                      <input value={resume.name} onChange={(event) => updateTextField("name", event.target.value)} />
                    </label>
                  </div>
                </section>

                <section className="resume-human-editor__section">
                  <div className="section-row">
                    <h3>Summary</h3>
                    <button
                      type="button"
                      className="button button--ghost button--small"
                      onClick={() => addArrayItem("summary", { position: "", description: "", default: resume.summary.length === 0 })}
                    >
                      + Add
                    </button>
                  </div>
                  {resume.summary.map((item, index) => {
                    const defaultSummaryIndexes = resume.summary
                      .map((summaryItem, summaryIndex) => (summaryItem.default ? summaryIndex : -1))
                      .filter((summaryIndex) => summaryIndex >= 0);
                    const selectedDefaultIndex = defaultSummaryIndexes.length === 1 ? defaultSummaryIndexes[0] : -1;
                    const anotherDefaultSelected = selectedDefaultIndex >= 0 && selectedDefaultIndex !== index;
                    return (
                      <div
                        className={`resume-human-editor__card ${anotherDefaultSelected ? "resume-human-editor__card--muted" : ""}`}
                        key={`summary-${index}`}
                      >
                        <label>
                          Position
                          <input
                            placeholder="Position"
                            value={item.position}
                            onChange={(event) => updateSummary(index, "position", event.target.value)}
                          />
                        </label>
                        <label>
                          Description
                          <textarea
                            rows={4}
                            placeholder="Summary description"
                            value={item.description}
                            onChange={(event) => updateSummary(index, "description", event.target.value)}
                          />
                        </label>
                        <label className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={selectedDefaultIndex === index}
                            disabled={!item.default && anotherDefaultSelected}
                            onChange={(event) => setDefaultSummary(index, event.target.checked)}
                          />
                          Default summary
                        </label>
                        <button type="button" className="button button--danger button--small" onClick={() => removeArrayItem("summary", index)}>
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </section>

                <section className="resume-human-editor__section">
                  <div className="section-row">
                    <h3>Contact</h3>
                    <button type="button" className="button button--ghost button--small" onClick={() => addArrayItem("contact", { label: "", value: "", link: "" })}>
                      + Add
                    </button>
                  </div>
                  {resume.contact.map((item, index) => (
                    <div className="resume-human-editor__row" key={`contact-${index}`}>
                      <input placeholder="Label" value={item.label} onChange={(event) => updateContact(index, "label", event.target.value)} />
                      <input placeholder="Value" value={item.value} onChange={(event) => updateContact(index, "value", event.target.value)} />
                      <input placeholder="Link" value={item.link || ""} onChange={(event) => updateContact(index, "link", event.target.value)} />
                      <button type="button" className="button button--danger button--small" onClick={() => removeArrayItem("contact", index)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </section>

                <section className="resume-human-editor__section">
                  <div className="section-row">
                    <h3>QR codes</h3>
                    <button type="button" className="button button--ghost button--small" onClick={() => addArrayItem("qr_codes", { label: "", image: "", size: 130 })}>
                      + Add
                    </button>
                  </div>
                  {resume.qr_codes.map((item, index) => (
                    <div className="resume-human-editor__row" key={`qr-${index}`}>
                      <input placeholder="Label" value={item.label} onChange={(event) => updateQrCode(index, "label", event.target.value)} />
                      <input placeholder="Image path" value={item.image} onChange={(event) => updateQrCode(index, "image", event.target.value)} />
                      <input type="number" min={1} placeholder="Size" value={item.size} onChange={(event) => updateQrCode(index, "size", event.target.value)} />
                      <button type="button" className="button button--danger button--small" onClick={() => removeArrayItem("qr_codes", index)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </section>

                <section className="resume-human-editor__section">
                  <div className="section-row">
                    <h3>Skills</h3>
                    <button type="button" className="button button--ghost button--small" onClick={() => addArrayItem("skills", { name: "", level: 3 })}>
                      + Add
                    </button>
                  </div>
                  {resume.skills.map((item, index) => (
                    <div className="resume-human-editor__row resume-human-editor__row--compact" key={`skill-${index}`}>
                      <input placeholder="Skill" value={item.name} onChange={(event) => updateSkill(index, "name", event.target.value)} />
                      <input type="number" min={1} max={5} placeholder="Level" value={item.level} onChange={(event) => updateSkill(index, "level", event.target.value)} />
                      <button type="button" className="button button--danger button--small" onClick={() => removeArrayItem("skills", index)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </section>

                <section className="resume-human-editor__section">
                  <div className="section-row">
                    <h3>Tech stack</h3>
                    <button type="button" className="button button--ghost button--small" onClick={() => addArrayItem("tech_stack", "")}>
                      + Add
                    </button>
                  </div>
                  {resume.tech_stack.map((item, index) => (
                    <div className="resume-human-editor__row resume-human-editor__row--single" key={`tech-${index}`}>
                      <input placeholder="Technology" value={item} onChange={(event) => updateStringList("tech_stack", index, event.target.value)} />
                      <button type="button" className="button button--danger button--small" onClick={() => removeArrayItem("tech_stack", index)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </section>

                <section className="resume-human-editor__section">
                  <div className="section-row">
                    <h3>Languages</h3>
                    <button type="button" className="button button--ghost button--small" onClick={() => addArrayItem("languages", { name: "", level_text: "", level: 3 })}>
                      + Add
                    </button>
                  </div>
                  {resume.languages.map((item, index) => (
                    <div className="resume-human-editor__row" key={`language-${index}`}>
                      <input placeholder="Language" value={item.name} onChange={(event) => updateLanguage(index, "name", event.target.value)} />
                      <input placeholder="Level text" value={item.level_text} onChange={(event) => updateLanguage(index, "level_text", event.target.value)} />
                      <input type="number" min={1} max={5} placeholder="Level" value={item.level} onChange={(event) => updateLanguage(index, "level", event.target.value)} />
                      <button type="button" className="button button--danger button--small" onClick={() => removeArrayItem("languages", index)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </section>

                <section className="resume-human-editor__section">
                  <div className="section-row">
                    <h3>Interests</h3>
                    <button type="button" className="button button--ghost button--small" onClick={() => addArrayItem("interests", "")}>
                      + Add
                    </button>
                  </div>
                  {resume.interests.map((item, index) => (
                    <div className="resume-human-editor__row resume-human-editor__row--single" key={`interest-${index}`}>
                      <input placeholder="Interest" value={item} onChange={(event) => updateStringList("interests", index, event.target.value)} />
                      <button type="button" className="button button--danger button--small" onClick={() => removeArrayItem("interests", index)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </section>

                <section className="resume-human-editor__section">
                  <div className="section-row">
                    <h3>Experience</h3>
                    <button type="button" className="button button--ghost button--small" onClick={() => addArrayItem("experience", { period: "", company: "", role: "", highlights: [] })}>
                      + Add
                    </button>
                  </div>
                  {resume.experience.map((item, index) => (
                    <div className="resume-human-editor__card" key={`experience-${index}`}>
                      <input placeholder="Period" value={item.period} onChange={(event) => updateExperience(index, "period", event.target.value)} />
                      <input placeholder="Company" value={item.company} onChange={(event) => updateExperience(index, "company", event.target.value)} />
                      <input placeholder="Role" value={item.role} onChange={(event) => updateExperience(index, "role", event.target.value)} />
                      <textarea rows={3} placeholder="Highlights, one per line" value={item.highlights.join("\n")} onChange={(event) => updateExperience(index, "highlights", event.target.value)} />
                      <button type="button" className="button button--danger button--small" onClick={() => removeArrayItem("experience", index)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </section>

                <section className="resume-human-editor__section">
                  <div className="section-row">
                    <h3>Education</h3>
                    <button type="button" className="button button--ghost button--small" onClick={() => addArrayItem("education", { period: "", school: "", detail: "" })}>
                      + Add
                    </button>
                  </div>
                  {resume.education.map((item, index) => (
                    <div className="resume-human-editor__card" key={`education-${index}`}>
                      <input placeholder="Period" value={item.period} onChange={(event) => updateEducation(index, "period", event.target.value)} />
                      <input placeholder="School" value={item.school} onChange={(event) => updateEducation(index, "school", event.target.value)} />
                      <textarea rows={2} placeholder="Detail" value={item.detail} onChange={(event) => updateEducation(index, "detail", event.target.value)} />
                      <button type="button" className="button button--danger button--small" onClick={() => removeArrayItem("education", index)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </section>

                <section className="resume-human-editor__section">
                  <div className="section-row">
                    <h3>Courses</h3>
                    <button type="button" className="button button--ghost button--small" onClick={() => addArrayItem("courses", { year: 0, name: "" })}>
                      + Add
                    </button>
                  </div>
                  {resume.courses.map((item, index) => (
                    <div className="resume-human-editor__row resume-human-editor__row--compact" key={`course-${index}`}>
                      <input type="number" min={0} placeholder="Year" value={item.year || 0} onChange={(event) => updateCourse(index, "year", event.target.value)} />
                      <input placeholder="Course name" value={item.name} onChange={(event) => updateCourse(index, "name", event.target.value)} />
                      <button type="button" className="button button--danger button--small" onClick={() => removeArrayItem("courses", index)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </section>
              </div>
            )}
          </section>

          <section className="stack resume-editor-panel">
            <h2>Publish</h2>
            <label>
              Change note
              <input value={changeNote} onChange={(event) => setChangeNote(event.target.value)} />
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={allowIndexing} onChange={(event) => setAllowIndexing(event.target.checked)} />
              Allow indexing
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={aiGenerated} onChange={(event) => setAiGenerated(event.target.checked)} />
              Mark as AI generated
            </label>
            <div className="actions-row">
              <button className="button button--ghost" type="button" onClick={() => void publishResume(false)} disabled={isBusy || isLoading}>
                {isBusy ? "Saving..." : "Save unpublished"}
              </button>
              <button className="button button--primary" type="button" onClick={() => void publishResume(true)} disabled={isBusy || isLoading}>
                {isBusy ? "Publishing..." : "Publish and create revision"}
              </button>
            </div>
          </section>

          <section className="stack resume-editor-panel">
            <h2>Revision history</h2>
            {revisions.length === 0 ? (
              <p className="cv-preview__placeholder">No revisions yet.</p>
            ) : (
              <ul className="revision-list">
                {revisions.map((revision) => (
                  <li key={revision.id}>
                    <div>
                      <strong>Revision #{revision.revision_number}</strong>
                      <p>{revision.change_note || "No note"}</p>
                      <small>{new Date(revision.created_at).toLocaleString()}</small>
                    </div>
                    <button
                      type="button"
                      className="button button--ghost button--small"
                      onClick={() => void rollbackToRevision(revision.revision_number)}
                      disabled={isBusy || !documentRow}
                    >
                      Rollback
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="stack resume-editor-panel">
            <h2>Saved Versions and public links</h2>
            <p className="card-lead">Canonical URL is primary. Legacy /r/[slug] remains compatibility-only.</p>
            {isPresetsLoading ? (
              <p className="cv-preview__placeholder">Loading Saved Versions...</p>
            ) : presetsError ? (
              <div className="stack">
                <p className="status status--error" role="status">
                  {presetsError}
                </p>
                <div className="actions-row">
                  <button type="button" className="button button--ghost button--small" onClick={() => void loadPresets()}>
                    Retry Saved Version list
                  </button>
                </div>
              </div>
            ) : presets.length === 0 ? (
              <p className="cv-preview__placeholder">No Saved Versions yet.</p>
            ) : (
              <ul className="dashboard-resume-list">
                {presets.map((preset) => {
                  const hasPublishedCanonicalLink = preset.is_public && Boolean(preset.canonical_public_path);
                  const isPresetActionPending = activePresetActionId === preset.id;

                  return (
                    <li key={preset.id}>
                      <div className="dashboard-resume-list__content">
                        <strong>{preset.title}</strong>
                        <p>Updated {new Date(preset.updated_at).toLocaleString()}</p>
                        <dl className="dashboard-resume-list__links">
                          {preset.canonical_public_path ? (
                            <>
                              <dt>Canonical URL</dt>
                              <dd>{preset.canonical_public_path}</dd>
                            </>
                          ) : null}
                          {preset.compatibility_public_path ? (
                            <>
                              <dt>Compatibility URL</dt>
                              <dd>{preset.compatibility_public_path}</dd>
                            </>
                          ) : null}
                        </dl>
                      </div>
                      <div className="dashboard-resume-list__actions">
                        <div className="actions-row">
                          <span className={`dashboard-resume-list__badge ${preset.is_public ? "" : "dashboard-resume-list__badge--private"}`}>
                            {preset.is_public ? "Published" : "Private"}
                          </span>
                          <span className={`dashboard-resume-list__badge ${preset.allow_indexing ? "" : "dashboard-resume-list__badge--private"}`}>
                            {preset.allow_indexing ? "Indexable" : "Noindex"}
                          </span>
                          {hasPublishedCanonicalLink ? (
                            <>
                              <button
                                type="button"
                                className="button button--ghost button--small"
                                onClick={() => openPublicLink(preset.canonical_public_path!)}
                                disabled={isPresetActionPending}
                              >
                                Open public CV
                              </button>
                              <button
                                type="button"
                                className="button button--ghost button--small"
                                onClick={() => void copyPublicLink(preset.canonical_public_path!)}
                                disabled={isPresetActionPending}
                              >
                                Copy public URL
                              </button>
                            </>
                          ) : null}
                          {preset.is_public ? (
                            <button
                              type="button"
                              className="button button--ghost button--small"
                              onClick={() => void unpublishSavedVersion(preset)}
                              disabled={isPresetActionPending}
                            >
                              {isPresetActionPending ? "Unpublishing..." : "Unpublish"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="button button--ghost button--small"
                              onClick={() => openPublishSavedVersion(preset)}
                              disabled={isPresetActionPending || publishableLocales.length === 0}
                            >
                              Publish
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="resume-editor-preview">
          {isLoading ? (
            <p>Loading preview...</p>
          ) : (
            <ResumeLivePreview
              locale={locale}
              resume={resume}
              languages={languageOptions.map((language) => ({
                code: language.code,
                label: language.label,
                shortLabel: language.short_label,
              }))}
              onLanguageSelect={handleLocaleSwitch}
              styleCode={selectedStyle}
              yamlContent={yamlPanel}
              isExpanded={isPreviewExpanded}
              aiGenerated={aiGenerated}
              onExpand={() => setIsPreviewExpanded(true)}
              onClose={() => setIsPreviewExpanded(false)}
            />
          )}
        </div>
      </div>

      {publishDraft ? (
        <PublishSavedVersionModal
          draft={publishDraft}
          locales={publishableLocales}
          languageOptions={languageOptions}
          onClose={() => {
            if (!activePresetActionId) {
              setPublishDraft(null);
            }
          }}
          onPublish={publishSavedVersion}
        />
      ) : null}
    </section>
  );
}

