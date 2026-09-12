"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import OnboardingClient from "../onboarding/onboarding-client";
import WorkspaceBreadcrumbs from "../components/workspace-breadcrumbs";
import { firstCvSelection, ONBOARDING_SECTIONS, type OnboardingState } from "../lib/resume-onboarding";
import { applyResumeSelectionToRawDocument } from "../lib/preset-selection";
import { normalizeResumeDocument } from "../lib/resume-schema";
import { onboardingEditorText } from "../onboarding/editor-copy";
import type { OnboardingTestRun } from "../lib/onboarding-test";
import { useSearchParams } from "next/navigation";
import { StatusToast, useStatusToast } from "../components/status-toast";
import { canAccessDraftPdf } from "../lib/rbac";
import { isAppRole } from "../lib/auth-types";
import ResumeLivePreview from "./resume-live-preview";
import type { ResumeEditorStyle } from "./resume-live-preview";
import LocaleTabStrip from "./locale-tab-strip";
import LanguageVersionModal from "./language-version-modal";
import SaveVersionModal from "./save-version-modal";
import ImportCvBanner from "./import-cv-banner";
import ImportReviewModal from "./import-review-modal";
import { shouldClearLocalDraft } from "./local-draft-policy";
import type { ImportedResumeSections, ResumeImportResult } from "../lib/resume-import/parse-resume-file";
import { mergeImportedResume } from "../lib/resume-import/merge-imported-resume";
import EditorSectionNav, { type EditorNavGroup } from "./editor-section-nav";
import { computeResumeCompletion } from "./resume-completion";
import {
  DEFAULT_RESUME_STYLE,
  type ResumeDensity,
  type ResumeStyleSettings,
  type ResumeTextSize,
} from "../lib/resume-style";

const TEXT_SIZE_OPTIONS: Array<{ value: ResumeTextSize; label: string }> = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

const DENSITY_OPTIONS: Array<{ value: ResumeDensity; label: string }> = [
  { value: "compact", label: "Compact" },
  { value: "normal", label: "Normal" },
  { value: "relaxed", label: "Relaxed" },
];

const STYLE_DETAIL_TOGGLES: Array<{ key: keyof Pick<ResumeStyleSettings, "sectionDividers" | "headerPhoto" | "liveLinkQr">; label: string }> = [
  { key: "sectionDividers", label: "Section dividers" },
  { key: "headerPhoto", label: "Initials badge in header" },
  { key: "liveLinkQr", label: "QR code to the live link" },
];
import { useMultiLocaleResumeDocuments } from "./use-multi-locale-resume-documents";
import type {
  ResumeCourse,
  ResumeDocument,
  ResumeEducation,
  ResumeExperience,
  ResumeLanguage,
  ResumeQrCode,
  ResumeSkill,
  ResumeSummaryItem,
} from "../lib/resume-schema";
import { defaultResumeDocument, initialsFromNameParts, resumeFullName } from "../lib/resume-schema";

type EditorTab = "yaml" | "human";

// One-click starting point for the "GDPR clause" field. Users on the Polish
// job market include this text verbatim; it is not an enum in the schema
// (see gdpr_clause on ResumeDocument) — just a plain string a click can seed.
const STANDARD_GDPR_CLAUSE =
  "Wyrażam zgodę na przetwarzanie moich danych osobowych zawartych w niniejszym dokumencie do realizacji procesu rekrutacji zgodnie z Rozporządzeniem Parlamentu Europejskiego i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r. (RODO).";

const EDITOR_STYLES: Array<{ code: ResumeEditorStyle; label: string }> = [
  { code: "basic", label: "basic" },
  { code: "empty", label: "empty" },
];

type ContactLinkKind = "tel" | "mailto" | "url";

const CONTACT_FIELDS: Array<{ label: string; linkKind?: ContactLinkKind }> = [
  { label: "Location" },
  { label: "Phone", linkKind: "tel" },
  { label: "E-mail", linkKind: "mailto" },
  { label: "LinkedIn", linkKind: "url" },
  { label: "Portfolio", linkKind: "url" },
];

// Location is rendered separately (half-width, matching the name fields);
// Phone/E-mail and LinkedIn/Portfolio pair up on one row each.
const CONTACT_FIELD_ROWS: string[][] = [["Phone", "E-mail"], ["LinkedIn", "Portfolio"]];

// The link is derived from the value, never typed by the user: a phone
// number becomes a `tel:` URI, an email a `mailto:` one, a bare domain gets
// `https://` prepended (left alone if it already has a scheme).
function deriveContactLink(kind: ContactLinkKind, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  switch (kind) {
    case "tel": {
      const digits = trimmed.replace(/[^\d+]/g, "");
      return digits ? `tel:${digits}` : "";
    }
    case "mailto":
      return `mailto:${trimmed}`;
    case "url":
      return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }
}

/** Array field whose length is shown as the entry count in the sidebar. */
type CountableField = "summary" | "experience" | "education" | "skills" | "languages" | "courses" | "interests" | "tech_stack" | "qr_codes";

type EditorSection = {
  id: string;
  label: string;
  /** Shown under the workspace heading — what this section is for. */
  hint: string;
  /** Top-level YAML key the sidebar jumps to in YAML mode. */
  yamlKey?: string;
  countField?: CountableField;
};

// Single source of truth for the sidebar, the workspace heading, and the
// YAML jump targets. Keys match ResumeDocument (app/lib/resume-schema.ts),
// which is also the emitted YAML order since serializeResumeToYaml uses
// sortKeys: false.
const EDITOR_SECTION_GROUPS: Array<{ label: string; numbered?: boolean; sections: EditorSection[] }> = [
  {
    label: "Basics",
    numbered: true,
    sections: [
      {
        id: "personal",
        label: "Personal details",
        hint: "Name, brand initials and contact details. All of it lands in the CV header.",
        yamlKey: "brand_initials",
      },
      { id: "summary", label: "Summary", hint: "Several variants; one is picked per CV version.", yamlKey: "summary", countField: "summary" },
      { id: "experience", label: "Experience", hint: "Start with your most recent role.", yamlKey: "experience", countField: "experience" },
      { id: "education", label: "Education", hint: "List your highest completed level first.", yamlKey: "education", countField: "education" },
      { id: "skills", label: "Skills", hint: "Hard skills tied to the role you are targeting.", yamlKey: "skills", countField: "skills" },
      { id: "languages", label: "Languages", hint: "Proficiency renders as a meter in the CV.", yamlKey: "languages", countField: "languages" },
    ],
  },
  {
    label: "Optional",
    sections: [
      { id: "courses", label: "Courses", hint: "Certificates, training and licences.", yamlKey: "courses", countField: "courses" },
      { id: "interests", label: "Interests", hint: "A short list, without elaboration.", yamlKey: "interests", countField: "interests" },
      { id: "tech-stack", label: "Tech stack", hint: "Technologies and tools you work with.", yamlKey: "tech_stack", countField: "tech_stack" },
      { id: "qr-codes", label: "QR codes", hint: "Links encoded as QR codes in the printed version.", yamlKey: "qr_codes", countField: "qr_codes" },
      { id: "gdpr", label: "GDPR clause", hint: "Common on the Polish job market, usually left empty for English CVs.", yamlKey: "gdpr_clause" },
    ],
  },
];

const EDITOR_SECTIONS: EditorSection[] = EDITOR_SECTION_GROUPS.flatMap((group) => group.sections);

function cardMeta(parts: Array<string | number | null | undefined>): string {
  return parts.filter((part) => part !== undefined && part !== null && part !== "").join(" · ");
}

// Selects the YAML block for `key` (e.g. "experience") in the textarea and
// scrolls it into view. Pure DOM/text-range logic — never touches parsed state.
function jumpToYamlKey(textarea: HTMLTextAreaElement, key: string): void {
  const value = textarea.value;
  const needle = `\n${key}:`;
  const index = value.indexOf(needle);
  if (index < 0) return;

  const start = index + 1;
  const afterKey = start + key.length + 1;
  const nextKeyOffset = value.slice(afterKey).search(/\n[A-Za-z_]+:/);
  const end = nextKeyOffset < 0 ? value.length : afterKey + nextKeyOffset;

  textarea.focus();
  textarea.setSelectionRange(start, end);

  const lineNumber = value.slice(0, start).split("\n").length;
  const lineHeight = Number.parseFloat(getComputedStyle(textarea).lineHeight) || 20;
  textarea.scrollTop = Math.max(0, (lineNumber - 2) * lineHeight);
}

function formatClockTime(timestampMs: number): string {
  return new Date(timestampMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function localDraftStorageKey(locale: string): string {
  return `ocv-master-resume-local-draft:${locale}`;
}

type LocalDraft = { yamlContent: string; savedAt: number };

function readLocalDraft(locale: string): LocalDraft | null {
  try {
    const raw = window.localStorage.getItem(localDraftStorageKey(locale));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalDraft>;
    if (typeof parsed.yamlContent !== "string" || typeof parsed.savedAt !== "number") return null;
    return { yamlContent: parsed.yamlContent, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

function writeLocalDraft(locale: string, draft: LocalDraft): void {
  try {
    window.localStorage.setItem(localDraftStorageKey(locale), JSON.stringify(draft));
  } catch {
    // Best-effort only (private browsing / storage full) — never blocks editing.
  }
}

function clearLocalDraft(locale: string): void {
  try {
    window.localStorage.removeItem(localDraftStorageKey(locale));
  } catch {
    // Best-effort only.
  }
}

export default function EditorCanvasClient({ draftPdfEnabled = true, onboarding, testRun }: { draftPdfEnabled?: boolean; onboarding?: OnboardingState; testRun?: OnboardingTestRun } = {}) {
  const [onboardingLanguage, setOnboardingLanguage] = useState<"en" | "pl">(onboarding?.ui_language ?? "en");
  const [onboardingImported, setOnboardingImported] = useState(onboarding?.imported ?? false);
  const editorText = (text: string) => onboardingEditorText(text, onboarding ? onboardingLanguage : "en");
  const searchParams = useSearchParams();
  const requestedPanel = searchParams.get("panel");

  const {
    actor,
    languageOptions,
    defaultLocale,
    activeLocale: locale,
    buffers,
    isLoadingAll: isLoading,
    loadError,
    loadNotice,
    dirtyLocales,
    errorLocales,
    isAnyDirty,
    setActiveLocale,
    updateActiveYaml,
    updateActiveResume: updateResumeFromHuman,
    setActiveCvStyle,
    resetActiveToTemplate,
    saveAllDirty,
    rollbackActiveToRevision,
    loadRevisionSnapshot,
    saveLanguageVersion,
    setDefaultLanguage,
    deleteLanguageVersion,
  } = useMultiLocaleResumeDocuments(onboarding?.locale ?? searchParams.get("locale"), testRun);

  const activeBuffer = buffers[locale];
  const resume = activeBuffer?.resume ?? defaultResumeDocument("");
  const yamlPanel = activeBuffer?.yamlPanel ?? "";
  const yamlError = activeBuffer?.yamlError ?? null;
  const revisions = activeBuffer?.revisions ?? [];
  // Style lives on the document buffer, so it survives a reload and is saved
  // with the rest of the document rather than only living in this component.
  const cvStyle = activeBuffer?.cvStyle ?? DEFAULT_RESUME_STYLE;
  const setCvStyle = setActiveCvStyle;
  const documentRow = activeBuffer?.documentRow ?? null;

  // Form-first, matching the redesigned editor: the sidebar's section switching
  // is the primary interaction, and it only applies to the form. YAML stays one
  // click away in the toolbar.
  const [editorTab, setEditorTab] = useState<EditorTab>("human");
  const [selectedStyle, setSelectedStyle] = useState<ResumeEditorStyle>("basic");
  const [isBusy, setIsBusy] = useState(false);
  const { toast, showToast, closeToast } = useStatusToast();
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isSaveVersionModalOpen, setIsSaveVersionModalOpen] = useState(false);
  const [changeNote, setChangeNote] = useState("Publish update");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ResumeImportResult | null>(null);
  const [importFilename, setImportFilename] = useState("");
  const importControllerRef = useRef<AbortController | null>(null);
  // Brand initials have no manual input anymore, only this toggle: checked
  // (the default) keeps them in sync with the name; unchecking freezes the
  // last computed value. Only explicit edits update existing branding.
  const [autoBrandInitials, setAutoBrandInitials] = useState(true);
  // The one open entry card, keyed "<field>:<index>". Opening a card closes its
  // siblings (exclusive accordion), and a freshly added entry opens itself.
  const [openEntryKey, setOpenEntryKey] = useState<string | null>(null);

  // A past revision rendered in the preview pane instead of the live draft.
  // Read-only: the active buffer is never touched, so previewing history can
  // never disturb unsaved edits.
  const [previewedRevision, setPreviewedRevision] = useState<{
    revisionNumber: number;
    note: string;
    createdAt: string;
    resume: ResumeDocument;
    yamlContent: string;
  } | null>(null);

  const [sidePanelTab, setSidePanelTab] = useState<"preview" | "history" | "style">("preview");
  const [activeSectionId, setActiveSectionId] = useState<string>(onboarding ? ONBOARDING_SECTIONS[onboarding.step - 2] ?? "personal" : EDITOR_SECTIONS[0].id);
  // Below 1020px the side panel leaves the grid and opens as a slide-over.
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const yamlTextareaRef = useRef<HTMLTextAreaElement>(null);
  const sidePanelTabsRef = useRef<HTMLDivElement>(null);
  const [tabIndicator, setTabIndicator] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const tabs = sidePanelTabsRef.current;
    const active = tabs?.querySelector<HTMLElement>(".resume-editor-tabs__tab.is-active");
    if (!tabs || !active) return;
    setTabIndicator({ left: active.offsetLeft, width: active.offsetWidth });
  }, [sidePanelTab]);

  const activeSection = EDITOR_SECTIONS.find((section) => section.id === activeSectionId) ?? EDITOR_SECTIONS[0];
  const activeSectionCount = activeSection.countField ? resume[activeSection.countField].length : null;
  const completion = computeResumeCompletion(resume);
  const navGroups: EditorNavGroup[] = EDITOR_SECTION_GROUPS.map((group) => ({
    label: group.label,
    numbered: group.numbered,
    sections: group.sections.map((section) => ({
      id: section.id,
      label: section.label,
      count: section.countField ? resume[section.countField].length : null,
      status: completion.statuses[section.id] ?? null,
    })),
  }));
  const nextSectionLabel = completion.next
    ? EDITOR_SECTIONS.find((section) => section.id === completion.next?.id)?.label
    : null;

  // Local-only autosave safety net (localStorage, keyed by locale). This is
  // deliberately NOT a server autosave: every /api/resume/publish call
  // (including "Save unpublished") already creates a revision row, so writing
  // to it on every keystroke would flood revision history. A true remote
  // autosave needs a separate, non-revision persistence path — out of scope
  // for Phase 1.
  // ponytail: per-browser only, not synced across devices; upgrade path is a
  // dedicated draft-only save endpoint if that's ever needed.
  const [lastLocalSaveAt, setLastLocalSaveAt] = useState<number | null>(null);
  const [restorableDraft, setRestorableDraft] = useState<LocalDraft | null>(null);
  const previousDraftDirty = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (onboarding || isLoading || !activeBuffer) return;
    const draft = readLocalDraft(locale);
    setRestorableDraft(draft && draft.yamlContent !== activeBuffer.yamlPanel ? draft : null);
    setLastLocalSaveAt(null);
    // Runs once per locale switch, comparing against the buffer as it was
    // freshly loaded/selected — not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, isLoading, onboarding]);

  useEffect(() => {
    if (onboarding || isLoading || !activeBuffer) return;
    const wasDirty = previousDraftDirty.current[locale] ?? false;
    previousDraftDirty.current[locale] = yamlPanel !== activeBuffer.savedYamlContent;
    if (yamlPanel === activeBuffer.savedYamlContent) {
      // Loading a saved buffer must preserve an older recovery draft until
      // the user restores/discards it. Clear only a saved copy or an actual
      // transition back to clean after saving/reverting this locale.
      if (shouldClearLocalDraft({
        yamlContent: yamlPanel,
        savedYamlContent: activeBuffer.savedYamlContent,
        storedYamlContent: readLocalDraft(locale)?.yamlContent,
        wasDirty,
      })) {
        clearLocalDraft(locale);
        setRestorableDraft(null);
      }
      setLastLocalSaveAt(null);
      return;
    }
    const timer = window.setTimeout(() => {
      writeLocalDraft(locale, { yamlContent: yamlPanel, savedAt: Date.now() });
      setLastLocalSaveAt(Date.now());
    }, 800);
    return () => window.clearTimeout(timer);
  }, [locale, yamlPanel, isLoading, activeBuffer, onboarding]);

  function restoreLocalDraft() {
    if (!restorableDraft) return;
    updateActiveYaml(restorableDraft.yamlContent);
    setRestorableDraft(null);
    showToast("Local draft restored.");
  }

  // The explicit "discard" action for the unsaved-draft entry (banner and
  // History list): unlike restoreLocalDraft, this is destructive on purpose —
  // it drops the local copy AND reverts the open editor to the last saved
  // version, undoing any edits made in this session too.
  function discardLocalDraft() {
    clearLocalDraft(locale);
    setRestorableDraft(null);
    if (activeBuffer) updateActiveYaml(activeBuffer.savedYamlContent);
    showToast("Unsaved changes discarded.");
  }

  // True both right after a reload (a stale local draft was found) and while
  // actively editing in this same session (dirtyLocales already tracks
  // yamlPanel !== savedYamlContent) — either way there's local-only content
  // to surface as the "unsaved draft" entry in the History list.
  const hasUnsavedDraft = restorableDraft !== null || dirtyLocales.includes(locale);
  const unsavedDraftSavedAt = restorableDraft?.savedAt ?? lastLocalSaveAt;

  useEffect(() => {
    if (requestedPanel === "languages") {
      setIsLanguageModalOpen(true);
    }
  }, [requestedPanel]);

  useEffect(() => {
    if (loadError) showToast(loadError, "error");
  }, [loadError, showToast]);

  useEffect(() => {
    if (loadNotice) showToast(loadNotice);
  }, [loadNotice, showToast]);

  function handleLocaleSwitch(nextLocale: string) {
    if (nextLocale === locale || isBusy) return;
    // Revisions belong to one language version's document, so a snapshot from
    // the previous locale must not stay on screen.
    setPreviewedRevision(null);
    setActiveLocale(nextLocale);
  }

  // Sidebar nav works in both editor modes: swaps which section is shown in
  // the human-friendly editor, jumps the caret to the matching block in YAML.
  function handleSectionNavSelect(id: string) {
    setActiveSectionId(id);
    // Each section opens on its first entry, the way it looks on first render.
    setOpenEntryKey(null);
    if (editorTab === "human") return;
    const key = EDITOR_SECTIONS.find((section) => section.id === id)?.yamlKey;
    if (key && yamlTextareaRef.current) jumpToYamlKey(yamlTextareaRef.current, key);
  }

  useEffect(() => {
    if (!isAnyDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isAnyDirty]);

  function handleYamlChange(value: string) {
    updateActiveYaml(value);
  }

  function updateTextField(field: keyof Pick<ResumeDocument, "first_name" | "family_name">, value: string) {
    const next = { ...resume, [field]: value };
    if (autoBrandInitials) next.brand_initials = initialsFromNameParts(next.first_name, next.family_name);
    updateResumeFromHuman(next);
  }

  function toggleAutoBrandInitials(enabled: boolean) {
    setAutoBrandInitials(enabled);
    if (enabled) {
      updateResumeFromHuman({ ...resume, brand_initials: initialsFromNameParts(resume.first_name, resume.family_name) });
    }
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
    setOpenEntryKey(`${String(field)}:${currentValue.length}`);
    updateResumeFromHuman({
      ...resume,
      [field]: [...currentValue, item],
    } as ResumeDocument);
  }

  // `null` means "no explicit choice yet", which shows the first entry open;
  // `""` means the user closed it and wants nothing open.
  function isEntryOpen(field: string, index: number): boolean {
    return openEntryKey === null ? index === 0 : openEntryKey === `${field}:${index}`;
  }

  function handleEntryToggle(field: string, index: number, open: boolean) {
    const key = `${field}:${index}`;
    if (open) {
      setOpenEntryKey(key);
      return;
    }
    // Opening a card makes React close its sibling, which fires this handler a
    // second time with open=false. Only the card that is actually the open one
    // may clear the state, otherwise that echo would undo the new selection.
    setOpenEntryKey((current) => (current === key || (current === null && index === 0) ? "" : current));
  }

  function removeArrayItem(field: keyof ResumeDocument, index: number) {
    const currentValue = resume[field];
    if (!Array.isArray(currentValue)) return;
    updateResumeFromHuman({
      ...resume,
      [field]: currentValue.filter((_, itemIndex) => itemIndex !== index),
    } as ResumeDocument);
  }

  function updateContactValue(label: string, linkKind: ContactLinkKind | undefined, value: string) {
    const link = linkKind ? deriveContactLink(linkKind, value) : "";
    const exists = resume.contact.some((item) => item.label === label);
    const next = exists
      ? resume.contact.map((item) => (item.label === label ? { ...item, value, link } : item))
      : [...resume.contact, { label, value, link }];
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

  function updateGdprClause(value: string) {
    updateResumeFromHuman({ ...resume, gdpr_clause: value });
  }

  useEffect(() => {
    setImportResult(null);
    setIsImporting(false);
    return () => {
      importControllerRef.current?.abort();
      importControllerRef.current = null;
    };
  }, [locale]);

  async function handleImportFile(file: File) {
    importControllerRef.current?.abort();
    const controller = new AbortController();
    importControllerRef.current = controller;
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/resume/import-file", { method: "POST", body: formData, signal: controller.signal });
      const payload = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) {
        showToast(payload.error || "Could not read this file.", "error");
        return;
      }
      setImportResult(payload as ResumeImportResult);
      setImportFilename(file.name);
    } catch {
      if (!controller.signal.aborted) showToast("Import failed. Check your connection and try again.", "error");
    } finally {
      if (importControllerRef.current === controller) {
        importControllerRef.current = null;
        setIsImporting(false);
      }
    }
  }

  function applyImportResult(selected: ImportedResumeSections) {
    const next = mergeImportedResume(resume, selected);
    if (autoBrandInitials && (next.first_name !== resume.first_name || next.family_name !== resume.family_name)) {
      next.brand_initials = initialsFromNameParts(next.first_name, next.family_name);
    }
    updateResumeFromHuman(next);
    setImportResult(null);
    setOnboardingImported(true);
    showToast(onboarding && onboardingLanguage === "pl" ? `Dodano dane z pliku ${importFilename}.` : `Added content from ${importFilename}.`);
  }

  async function resetToTemplate() {
    try {
      const applied = await resetActiveToTemplate();
      if (applied) showToast("Template YAML loaded.");
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

  async function publishResume() {
    setIsBusy(true);
    showToast("Saving...");
    try {
      const result = await saveAllDirty({ changeNote });
      if (result.failed.length === 0) {
        showToast(`Saved (${result.succeeded.length} language${result.succeeded.length === 1 ? "" : "s"}).`);
      } else if (result.succeeded.length === 0) {
        showToast(`Save failed: ${result.failed.map((entry) => entry.message).join(" ")}`, "error");
      } else {
        showToast(
          `Saved ${result.succeeded.length}, failed ${result.failed.length}: ${result.failed.map((entry) => entry.message).join(" ")}`,
          "warning",
        );
      }
    } finally {
      setIsBusy(false);
    }
  }

  async function rollbackToRevision(revisionNumber: number) {
    setIsBusy(true);
    showToast(`Rolling back to revision ${revisionNumber}...`);
    try {
      await rollbackActiveToRevision(revisionNumber);
      setPreviewedRevision(null);
      showToast(`Rollback complete. Current document now matches revision ${revisionNumber}.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Rollback failed.", "error");
    } finally {
      setIsBusy(false);
    }
  }

  async function previewRevision(revision: { revision_number: number; change_note: string | null; created_at: string }) {
    try {
      const snapshot = await loadRevisionSnapshot(revision.revision_number);
      setPreviewedRevision({
        revisionNumber: revision.revision_number,
        note: revision.change_note || "No note",
        createdAt: revision.created_at,
        ...snapshot,
      });
      setSidePanelTab("preview");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Revision preview failed.", "error");
    }
  }

  const humanEditor = (
              <div className="resume-human-editor">
                <fieldset className="resume-human-editor__fieldset" disabled={isBusy}>
                {activeSectionId === "personal" && (
                <section className="resume-human-editor__section">
                  <div className="resume-human-editor__grid">
                    <label>
                      {editorText("First name")}
                      <input value={resume.first_name} onChange={(event) => updateTextField("first_name", event.target.value)} />
                    </label>
                    <label>
                      {editorText("Family name")}
                      <input value={resume.family_name} onChange={(event) => updateTextField("family_name", event.target.value)} />
                    </label>
                  </div>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={autoBrandInitials}
                      onChange={(event) => toggleAutoBrandInitials(event.target.checked)}
                    />
                    {editorText("Auto-generate brand initials")}
                  </label>
                  <div className="resume-human-editor__grid resume-human-editor__grid--half">
                    <label>
                      {editorText("Location")}
                      <input
                        aria-label={editorText("Location")} placeholder={editorText("Location")}
                        value={resume.contact.find((entry) => entry.label === "Location")?.value ?? ""}
                        onChange={(event) => updateContactValue("Location", undefined, event.target.value)}
                      />
                    </label>
                  </div>
                  {CONTACT_FIELD_ROWS.map((rowLabels) => (
                    <div className="resume-human-editor__grid" key={`contact-row-${rowLabels.join("-")}`}>
                      {rowLabels.map((label) => {
                        const linkKind = CONTACT_FIELDS.find((field) => field.label === label)?.linkKind;
                        const item = resume.contact.find((entry) => entry.label === label) ?? { label, value: "", link: "" };
                        return (
                          <label key={`contact-${label}`}>
                            {editorText(label)}
                            <input
                              placeholder={editorText(label)}
                              value={item.value}
                              onChange={(event) => updateContactValue(label, linkKind, event.target.value)}
                            />
                          </label>
                        );
                      })}
                    </div>
                  ))}
                </section>
                )}

                {activeSectionId === "summary" && (
                <section className="resume-human-editor__section">
                  {resume.summary.map((item, index) => {
                    const defaultSummaryIndexes = resume.summary
                      .map((summaryItem, summaryIndex) => (summaryItem.default ? summaryIndex : -1))
                      .filter((summaryIndex) => summaryIndex >= 0);
                    const selectedDefaultIndex = defaultSummaryIndexes.length === 1 ? defaultSummaryIndexes[0] : -1;
                    const anotherDefaultSelected = selectedDefaultIndex >= 0 && selectedDefaultIndex !== index;
                    return (
                      <details
                        className={`resume-human-editor__card resume-human-editor__card--collapsible ${anotherDefaultSelected ? "resume-human-editor__card--muted" : ""}`}
                        open={isEntryOpen("summary", index)}
                        onToggle={(event) => handleEntryToggle("summary", index, event.currentTarget.open)}
                        key={`summary-${index}`}
                      >
                        <summary>
                          <span className="resume-human-editor__card-title">{item.position || editorText("Untitled summary")}</span>
                          <span className="resume-human-editor__card-meta">{cardMeta([item.default ? editorText("Default") : null])}</span>
                        </summary>
                        <div className="resume-human-editor__card-body">
                          <label>
                            {editorText("Position")}
                            <input
                              aria-label={editorText("Position")} placeholder={editorText("Position")}
                              value={item.position}
                              onChange={(event) => updateSummary(index, "position", event.target.value)}
                            />
                          </label>
                          <label>
                            {editorText("Description")}
                            <textarea
                              rows={4}
                              aria-label={editorText("Summary description")} placeholder={editorText("Summary description")}
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
                            {editorText("Default summary")}
                          </label>
                          <div className="resume-human-editor__card-actions">
                            <button type="button" className="button button--ghost button--small" onClick={() => removeArrayItem("summary", index)}>
                              {editorText("Remove entry")}
                            </button>
                          </div>
                        </div>
                      </details>
                    );
                  })}
                  <button
                    type="button"
                    className="resume-human-editor__add"
                    onClick={() => addArrayItem("summary", { position: "", description: "", default: resume.summary.length === 0 })}
                  >
                    {editorText("+ Add summary")}
                  </button>
                </section>
                )}

                {activeSectionId === "qr-codes" && (
                <section className="resume-human-editor__section">
                  {resume.qr_codes.map((item, index) => (
                    <div className="resume-human-editor__row" key={`qr-${index}`}>
                      <input aria-label={editorText("Label")} placeholder={editorText("Label")} value={item.label} onChange={(event) => updateQrCode(index, "label", event.target.value)} />
                      <input aria-label={editorText("Image path")} placeholder={editorText("Image path")} value={item.image} onChange={(event) => updateQrCode(index, "image", event.target.value)} />
                      <input type="number" min={1} aria-label={editorText("Size")} placeholder={editorText("Size")} value={item.size} onChange={(event) => updateQrCode(index, "size", event.target.value)} />
                      <button type="button" className="button button--danger button--small" onClick={() => removeArrayItem("qr_codes", index)}>
                        {editorText("Remove")}
                      </button>
                    </div>
                  ))}
                  <button type="button" className="resume-human-editor__add" onClick={() => addArrayItem("qr_codes", { label: "", image: "", size: 130 })}>
                    {editorText("+ Add QR code")}
                  </button>
                </section>
                )}

                {activeSectionId === "skills" && (
                <section className="resume-human-editor__section">
                  {resume.skills.map((item, index) => (
                    <div className="resume-human-editor__row resume-human-editor__row--compact" key={`skill-${index}`}>
                      <input aria-label={editorText("Skill")} placeholder={editorText("Skill")} value={item.name} onChange={(event) => updateSkill(index, "name", event.target.value)} />
                      <input type="number" min={1} max={5} aria-label={editorText("Level")} placeholder={editorText("Level")} value={item.level} onChange={(event) => updateSkill(index, "level", event.target.value)} />
                      <button type="button" className="button button--danger button--small" onClick={() => removeArrayItem("skills", index)}>
                        {editorText("Remove")}
                      </button>
                    </div>
                  ))}
                  <button type="button" className="resume-human-editor__add" onClick={() => addArrayItem("skills", { name: "", level: 3 })}>
                    {editorText("+ Add skill")}
                  </button>
                </section>
                )}

                {activeSectionId === "tech-stack" && (
                <section className="resume-human-editor__section">
                  {resume.tech_stack.map((item, index) => (
                    <div className="resume-human-editor__row resume-human-editor__row--single" key={`tech-${index}`}>
                      <input aria-label={editorText("Technology")} placeholder={editorText("Technology")} value={item} onChange={(event) => updateStringList("tech_stack", index, event.target.value)} />
                      <button type="button" className="button button--danger button--small" onClick={() => removeArrayItem("tech_stack", index)}>
                        {editorText("Remove")}
                      </button>
                    </div>
                  ))}
                  <button type="button" className="resume-human-editor__add" onClick={() => addArrayItem("tech_stack", "")}>
                    {editorText("+ Add technology")}
                  </button>
                </section>
                )}

                {activeSectionId === "languages" && (
                <section className="resume-human-editor__section">
                  {resume.languages.map((item, index) => (
                    <div className="resume-human-editor__row" key={`language-${index}`}>
                      <input aria-label={editorText("Language")} placeholder={editorText("Language")} value={item.name} onChange={(event) => updateLanguage(index, "name", event.target.value)} />
                      <input aria-label={editorText("Level text")} placeholder={editorText("Level text")} value={item.level_text} onChange={(event) => updateLanguage(index, "level_text", event.target.value)} />
                      <input type="number" min={1} max={5} aria-label={editorText("Level")} placeholder={editorText("Level")} value={item.level} onChange={(event) => updateLanguage(index, "level", event.target.value)} />
                      <button type="button" className="button button--danger button--small" onClick={() => removeArrayItem("languages", index)}>
                        {editorText("Remove")}
                      </button>
                    </div>
                  ))}
                  <button type="button" className="resume-human-editor__add" onClick={() => addArrayItem("languages", { name: "", level_text: "", level: 3 })}>
                    {editorText("+ Add language")}
                  </button>
                </section>
                )}

                {activeSectionId === "interests" && (
                <section className="resume-human-editor__section">
                  {resume.interests.map((item, index) => (
                    <div className="resume-human-editor__row resume-human-editor__row--single" key={`interest-${index}`}>
                      <input aria-label={editorText("Interest")} placeholder={editorText("Interest")} value={item} onChange={(event) => updateStringList("interests", index, event.target.value)} />
                      <button type="button" className="button button--danger button--small" onClick={() => removeArrayItem("interests", index)}>
                        {editorText("Remove")}
                      </button>
                    </div>
                  ))}
                  <button type="button" className="resume-human-editor__add" onClick={() => addArrayItem("interests", "")}>
                    {editorText("+ Add interest")}
                  </button>
                </section>
                )}

                {activeSectionId === "experience" && (
                <section className="resume-human-editor__section">
                  {resume.experience.map((item, index) => (
                    <details
                      className="resume-human-editor__card resume-human-editor__card--collapsible"
                      open={isEntryOpen("experience", index)}
                      onToggle={(event) => handleEntryToggle("experience", index, event.currentTarget.open)}
                      key={`experience-${index}`}
                    >
                      <summary>
                        <span className="resume-human-editor__card-title">{item.role || editorText("Untitled role")}</span>
                        <span className="resume-human-editor__card-meta">{cardMeta([item.company, item.period])}</span>
                      </summary>
                      <div className="resume-human-editor__card-body">
                        <input aria-label={editorText("Period")} placeholder={editorText("Period")} value={item.period} onChange={(event) => updateExperience(index, "period", event.target.value)} />
                        <input aria-label={editorText("Company")} placeholder={editorText("Company")} value={item.company} onChange={(event) => updateExperience(index, "company", event.target.value)} />
                        <input aria-label={editorText("Role")} placeholder={editorText("Role")} value={item.role} onChange={(event) => updateExperience(index, "role", event.target.value)} />
                        <textarea rows={3} aria-label={editorText("Highlights, one per line")} placeholder={editorText("Highlights, one per line")} value={item.highlights.join("\n")} onChange={(event) => updateExperience(index, "highlights", event.target.value)} />
                        <div className="resume-human-editor__card-actions">
                          <button type="button" className="button button--ghost button--small" onClick={() => removeArrayItem("experience", index)}>
                            {editorText("Remove entry")}
                          </button>
                        </div>
                      </div>
                    </details>
                  ))}
                  <button
                    type="button"
                    className="resume-human-editor__add"
                    onClick={() => addArrayItem("experience", { period: "", company: "", role: "", highlights: [] })}
                  >
                    {editorText("+ Add position")}
                  </button>
                </section>
                )}

                {activeSectionId === "education" && (
                <section className="resume-human-editor__section">
                  {resume.education.map((item, index) => (
                    <details
                      className="resume-human-editor__card resume-human-editor__card--collapsible"
                      open={isEntryOpen("education", index)}
                      onToggle={(event) => handleEntryToggle("education", index, event.currentTarget.open)}
                      key={`education-${index}`}
                    >
                      <summary>
                        <span className="resume-human-editor__card-title">{item.school || editorText("Untitled school")}</span>
                        <span className="resume-human-editor__card-meta">{cardMeta([item.degree, item.period])}</span>
                      </summary>
                      <div className="resume-human-editor__card-body">
                        <input aria-label={editorText("Period")} placeholder={editorText("Period")} value={item.period} onChange={(event) => updateEducation(index, "period", event.target.value)} />
                        <input aria-label={editorText("School")} placeholder={editorText("School")} value={item.school} onChange={(event) => updateEducation(index, "school", event.target.value)} />
                        <input aria-label={editorText("Degree")} placeholder={editorText("Degree")} value={item.degree} onChange={(event) => updateEducation(index, "degree", event.target.value)} />
                        <textarea rows={2} aria-label={editorText("Detail")} placeholder={editorText("Detail")} value={item.detail} onChange={(event) => updateEducation(index, "detail", event.target.value)} />
                        <div className="resume-human-editor__card-actions">
                          <button type="button" className="button button--ghost button--small" onClick={() => removeArrayItem("education", index)}>
                            {editorText("Remove entry")}
                          </button>
                        </div>
                      </div>
                    </details>
                  ))}
                  <button
                    type="button"
                    className="resume-human-editor__add"
                    onClick={() => addArrayItem("education", { period: "", school: "", degree: "", detail: "" })}
                  >
                    {editorText("+ Add education")}
                  </button>
                </section>
                )}

                {activeSectionId === "courses" && (
                <section className="resume-human-editor__section">
                  {resume.courses.map((item, index) => (
                    <div className="resume-human-editor__row resume-human-editor__row--compact" key={`course-${index}`}>
                      <input type="number" min={0} aria-label={editorText("Year")} placeholder={editorText("Year")} value={item.year || 0} onChange={(event) => updateCourse(index, "year", event.target.value)} />
                      <input aria-label={editorText("Course name")} placeholder={editorText("Course name")} value={item.name} onChange={(event) => updateCourse(index, "name", event.target.value)} />
                      <button type="button" className="button button--danger button--small" onClick={() => removeArrayItem("courses", index)}>
                        {editorText("Remove")}
                      </button>
                    </div>
                  ))}
                  <button type="button" className="resume-human-editor__add" onClick={() => addArrayItem("courses", { year: 0, name: "" })}>
                    {editorText("+ Add course")}
                  </button>
                </section>
                )}

                {activeSectionId === "gdpr" && (
                <section className="resume-human-editor__section">
                  <label>
                    {editorText("Clause text")}
                    <textarea
                      rows={4}
                      aria-label={editorText("No clause")} placeholder={editorText("No clause")}
                      value={resume.gdpr_clause}
                      onChange={(event) => updateGdprClause(event.target.value)}
                    />
                  </label>
                  <div className="actions-row">
                    <button type="button" className="button button--ghost button--small" onClick={() => updateGdprClause(STANDARD_GDPR_CLAUSE)}>
                      {editorText("Use standard PL wording")}
                    </button>
                    <button type="button" className="button button--ghost button--small" onClick={() => updateGdprClause("")}>
                      {editorText("Clear")}
                    </button>
                  </div>
                  <p className="resume-editor-hint">{editorText("Rendered as a small footer on the CV. Leave empty to omit it.")}</p>
                </section>
                )}

                </fieldset>
              </div>
  );
  const importReview = (
      <ImportReviewModal
        language={onboarding ? onboardingLanguage : "en"}
        isOpen={importResult !== null}
        filename={importFilename}
        result={importResult}
        currentName={resumeFullName(resume)}
        onConfirm={applyImportResult}
        onClose={() => setImportResult(null)}
      />
  );
  if (onboarding) {
    const previewResume = normalizeResumeDocument(applyResumeSelectionToRawDocument(resume, firstCvSelection(resume)) ?? resume, "");
    return <>
      <StatusToast toast={toast} onClose={closeToast} />
      {importReview}
      <OnboardingClient initialState={onboarding} testRunId={testRun?.id} uiLanguage={onboardingLanguage} onUiLanguage={setOnboardingLanguage}
        locale={locale} languages={languageOptions} loading={isLoading}
        loadError={Boolean(loadError || activeBuffer?.loadFailed || yamlError)} importing={isImporting}
        imported={onboardingImported} resume={resume} onSection={handleSectionNavSelect}
        onLocale={async (code) => {
          if (code === locale) return;
          if (isAnyDirty) {
            const saved = await saveAllDirty({ changeNote: "First CV guide" });
            if (saved.failed.length) throw new Error("Save failed");
          }
          if (languageOptions.some((language) => language.code === code)) setActiveLocale(code);
          else await saveLanguageVersion({ code, label: code === "pl" ? "Polski" : "English", shortLabel: code.toUpperCase() }, null);
          await setDefaultLanguage(code);
          setOnboardingImported(false);
        }}
        onSave={async () => {
          if (!activeBuffer || activeBuffer.loadFailed || isLoading || yamlError) throw new Error("CV unavailable");
          if (!isAnyDirty) return;
          setIsBusy(true);
          try {
            const saved = await saveAllDirty({ changeNote: "First CV guide" });
            if (saved.failed.length) throw new Error("Save failed");
          } finally { setIsBusy(false); }
        }}
        form={humanEditor}
        preview={<ResumeLivePreview locale={locale} resume={previewResume} styleCode="basic" yamlContent={yamlPanel}
          isExpanded={isPreviewExpanded} draftPdfEnabled={false} cvStyle={cvStyle}
          onExpand={() => setIsPreviewExpanded(true)} onClose={() => setIsPreviewExpanded(false)} />}
        importControl={<ImportCvBanner language={onboardingLanguage} isBusy={isImporting} onFileSelected={(file) => void handleImportFile(file)} />}
      />
    </>;
  }

  return (
    <section className="resume-editor-shell wide-shell-page">
      <WorkspaceBreadcrumbs current="Master Resume" />
      <StatusToast toast={toast} onClose={closeToast} />
      <LanguageVersionModal
        isOpen={isLanguageModalOpen}
        activeLocale={locale}
        defaultLocale={defaultLocale}
        languageOptions={languageOptions}
        onClose={() => setIsLanguageModalOpen(false)}
        onSave={async (input, editingCode) => {
          await saveLanguageVersion(input, editingCode);
          showToast(editingCode ? "Language version updated." : "Language version created.");
        }}
        onSetDefault={async (code) => {
          await setDefaultLanguage(code);
          showToast("Default language updated.");
        }}
        onDelete={async (code) => {
          await deleteLanguageVersion(code);
          showToast("Language version deleted.");
        }}
        onError={(message) => showToast(message, "error")}
      />
      <SaveVersionModal
        isOpen={isSaveVersionModalOpen}
        changeNote={changeNote}
        isSaving={isBusy}
        onChangeNote={setChangeNote}
        onClose={() => setIsSaveVersionModalOpen(false)}
        onConfirm={() => {
          void publishResume().then(() => setIsSaveVersionModalOpen(false));
        }}
      />
      {importReview}

      <div className="resume-editor-layout">
        <aside className="resume-editor-sidebar">
          <div className="resume-editor-sidebar__header">
            <h1>Master Resume</h1>
            <p>Source for every CV version</p>
          </div>
          <EditorSectionNav groups={navGroups} activeId={activeSectionId} onSelect={handleSectionNavSelect} />

          <div className="resume-editor-completion">
            <div className="resume-editor-completion__row">
              <span>Completion</span>
              <b>{completion.percent}%</b>
            </div>
            <div
              className="resume-editor-completion__bar"
              role="progressbar"
              aria-valuenow={completion.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Resume completion"
            >
              <i style={{ width: `${completion.percent}%` }} />
            </div>
            {completion.next && nextSectionLabel ? (
              <small>
                Complete {nextSectionLabel} to add {completion.next.weight}%.
              </small>
            ) : (
              <small>Every section has content.</small>
            )}
          </div>
        </aside>

        <div className="resume-editor-toolbar">
          <div className="resume-editor-toolbar__group">
            <LocaleTabStrip
              variant="human"
              languageOptions={languageOptions}
              activeLocale={locale}
              defaultLocale={defaultLocale}
              dirtyLocales={dirtyLocales}
              errorLocales={errorLocales}
              showManageTrigger
              disabled={isBusy || isLoading}
              onSelect={handleLocaleSwitch}
              onManageLanguages={() => setIsLanguageModalOpen(true)}
            />
            {lastLocalSaveAt ? (
              <span
                className="resume-editor-draft-indicator"
                title="Saved in this browser only, not on our servers — click Save MasterCV to save it for real."
              >
                <span className="resume-editor-draft-indicator__dot" aria-hidden="true" />
                Draft saved locally {formatClockTime(lastLocalSaveAt)}
              </span>
            ) : null}
          </div>

          <div className="resume-editor-toolbar__group">
            <button
              type="button"
              className="button button--ghost resume-editor-toolbar__panel-trigger"
              onClick={() => setIsSidePanelOpen(true)}
            >
              Preview
            </button>
            <div className="resume-editor-tabs" role="tablist" aria-label="Resume editor mode">
              {/* Short visible labels keep the toolbar on one row at narrow
                  widths; the full names stay as the accessible names. */}
              <button
                type="button"
                role="tab"
                aria-selected={editorTab === "human"}
                aria-label="Human-friendly Editor"
                className={`resume-editor-tabs__tab ${editorTab === "human" ? "is-active" : ""}`}
                onClick={() => setEditorTab("human")}
              >
                Form
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={editorTab === "yaml"}
                aria-label="YAML Editor"
                className={`resume-editor-tabs__tab ${editorTab === "yaml" ? "is-active" : ""}`}
                onClick={() => setEditorTab("yaml")}
              >
                YAML
              </button>
            </div>
            <button
              className="button button--primary"
              type="button"
              onClick={() => setIsSaveVersionModalOpen(true)}
              disabled={isBusy || isLoading}
            >
              Save MasterCV
            </button>
          </div>
        </div>

        {/* Below 760px the sidebar is hidden and this replaces it. */}
        <div className="resume-editor-section-select">
          <label className="sr-only" htmlFor="resume-editor-section-select">
            Resume section
          </label>
          <select
            id="resume-editor-section-select"
            value={activeSectionId}
            onChange={(event) => handleSectionNavSelect(event.target.value)}
          >
            {EDITOR_SECTION_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <main className="resume-editor-workspace">
          {restorableDraft ? (
            <div className="resume-editor-restore-banner">
              <span>Unsaved local draft from {formatClockTime(restorableDraft.savedAt)} found for this language version.</span>
              <div className="actions-row">
                <button type="button" className="button button--ghost button--small" onClick={restoreLocalDraft}>
                  Restore
                </button>
                <button type="button" className="button button--ghost button--small" onClick={discardLocalDraft}>
                  Delete
                </button>
              </div>
            </div>
          ) : null}

          {editorTab === "human" ? <ImportCvBanner isBusy={isImporting} onFileSelected={(file) => void handleImportFile(file)} /> : null}

          <header className="resume-editor-workspace__header">
            <h2>
              {editorTab === "yaml" ? "YAML" : activeSection.label}
              {editorTab === "yaml" ? (
                <span>the same document</span>
              ) : activeSectionCount === null ? null : (
                <span>
                  {activeSectionCount} {activeSectionCount === 1 ? "entry" : "entries"}
                </span>
              )}
            </h2>
            <p>{editorTab === "yaml" ? "The sidebar jumps to the matching block." : activeSection.hint}</p>
          </header>

          {editorTab === "yaml" ? (
            <div className="stack">
                <textarea
                  ref={yamlTextareaRef}
                  className="resume-editor-yaml"
                  spellCheck={false}
                  value={yamlPanel}
                  onChange={(event) => handleYamlChange(event.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Tab") return;
                    e.preventDefault();
                    const el = e.currentTarget;
                    const start = el.selectionStart;
                    const next = el.value.slice(0, start) + "  " + el.value.slice(el.selectionEnd);
                    el.value = next;
                    el.setSelectionRange(start + 2, start + 2);
                    handleYamlChange(next);
                  }}
                  disabled={isLoading || isBusy}
                />
                {yamlError && <p className="resume-editor-yaml__error">{yamlError}</p>}
                <div className="actions-row">
                  <button type="button" className="button button--ghost" onClick={() => void resetToTemplate()} disabled={isLoading || isBusy}>
                    Load template
                  </button>
                  <button type="button" className="button button--ghost" onClick={exportYamlFile}>
                    Download YAML
                  </button>
                  <button type="button" className="button button--ghost" onClick={() => setIsLanguageModalOpen(true)}>
                    Languages
                  </button>
                </div>
              </div>
            ) : (
              humanEditor
            )}
        </main>

          <aside className="resume-editor-side-panel" data-open={isSidePanelOpen}>
            <div className="resume-editor-side-panel__head">
              <div className="resume-editor-tabs" role="tablist" aria-label="Side panel" ref={sidePanelTabsRef}>
                {tabIndicator ? (
                  <span
                    className="resume-editor-tabs__indicator"
                    aria-hidden="true"
                    style={{ transform: `translateX(${tabIndicator.left}px)`, width: `${tabIndicator.width}px` }}
                  />
                ) : null}
                <button
                  type="button"
                  role="tab"
                  aria-selected={sidePanelTab === "preview"}
                  className={`resume-editor-tabs__tab ${sidePanelTab === "preview" ? "is-active" : ""}`}
                  onClick={() => setSidePanelTab("preview")}
                >
                  Preview
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={sidePanelTab === "history"}
                  className={`resume-editor-tabs__tab ${sidePanelTab === "history" ? "is-active" : ""}`}
                  onClick={() => setSidePanelTab("history")}
                >
                  History
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={sidePanelTab === "style"}
                  className={`resume-editor-tabs__tab ${sidePanelTab === "style" ? "is-active" : ""}`}
                  onClick={() => setSidePanelTab("style")}
                >
                  Style
                </button>
              </div>
              <button
                type="button"
                className="button button--ghost button--small resume-editor-side-panel__close"
                onClick={() => setIsSidePanelOpen(false)}
              >
                Close
              </button>
            </div>

            {sidePanelTab === "preview" ? (
              <>
              {previewedRevision ? (
                <div className="resume-editor-revision-ribbon">
                  <div>
                    <strong>Revision #{previewedRevision.revisionNumber} preview</strong>
                    <span>
                      {previewedRevision.note} · {new Date(previewedRevision.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="actions-row">
                    <button
                      type="button"
                      className="button button--ghost button--small"
                      onClick={() => void rollbackToRevision(previewedRevision.revisionNumber)}
                      disabled={isBusy || !documentRow}
                    >
                      Restore
                    </button>
                    <button type="button" className="button button--ghost button--small" onClick={() => setPreviewedRevision(null)}>
                      Exit
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="resume-editor-preview">
                {isLoading ? (
                  <p>Loading preview...</p>
                ) : (
                  <ResumeLivePreview
                    locale={locale}
                    resume={previewedRevision ? previewedRevision.resume : resume}
                    languages={languageOptions.map((language) => ({
                      code: language.code,
                      label: language.label,
                      shortLabel: language.short_label,
                    }))}
                    onLanguageSelect={handleLocaleSwitch}
                    styleCode={selectedStyle}
                    yamlContent={previewedRevision ? previewedRevision.yamlContent : yamlPanel}
                    isExpanded={isPreviewExpanded}
                    draftPdfEnabled={draftPdfEnabled && (actor && isAppRole(actor.role) ? canAccessDraftPdf(actor.role) : false)}
                    cvStyle={cvStyle}
                    onExpand={() => setIsPreviewExpanded(true)}
                    onClose={() => setIsPreviewExpanded(false)}
                  />
                )}
              </div>
              </>
            ) : sidePanelTab === "style" ? (
              <div className="resume-editor-style-panel">
                <label className="resume-editor-style-select">
                  Template
                  <select value={selectedStyle} onChange={(event) => setSelectedStyle(event.target.value as ResumeEditorStyle)}>
                    {EDITOR_STYLES.map((style) => (
                      <option key={style.code} value={style.code}>
                        {style.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="resume-editor-style-group">
                  <span className="resume-editor-style-group__label">Text size</span>
                  <div className="resume-editor-segmented" role="group" aria-label="Text size">
                    {TEXT_SIZE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={cvStyle.textSize === option.value}
                        onClick={() => setCvStyle({ ...cvStyle, textSize: option.value })}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="resume-editor-style-group">
                  <span className="resume-editor-style-group__label">Density</span>
                  <div className="resume-editor-segmented" role="group" aria-label="Density">
                    {DENSITY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={cvStyle.density === option.value}
                        onClick={() => setCvStyle({ ...cvStyle, density: option.value })}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="resume-editor-style-group">
                  <span className="resume-editor-style-group__label">Details</span>
                  {STYLE_DETAIL_TOGGLES.map((toggle) => (
                    <div className="resume-editor-style-row" key={toggle.key}>
                      <span>{toggle.label}</span>
                      <input
                        type="checkbox"
                        checked={cvStyle[toggle.key]}
                        aria-label={toggle.label}
                        onChange={(event) => setCvStyle({ ...cvStyle, [toggle.key]: event.target.checked })}
                      />
                    </div>
                  ))}
                </div>

                <p className="resume-editor-hint">
                  Style is saved with the document and applies to the preview, the published CV and the PDF.
                </p>
              </div>
            ) : (
              <div className="resume-editor-side-panel__history">
                <h2>Revision history</h2>
                {revisions.length === 0 && !hasUnsavedDraft ? (
                  <p className="cv-preview__placeholder">No revisions yet.</p>
                ) : (
                  <ul className="revision-list">
                    {hasUnsavedDraft ? (
                      <li data-unsaved="true">
                        <div className="revision-list__meta">
                          <div className="revision-list__top">
                            <strong>Unsaved draft</strong>
                            <span className="revision-list__tag revision-list__tag--unsaved">unsaved</span>
                          </div>
                          <p>Saved only in this browser — not yet part of your revision history.</p>
                          <small>{unsavedDraftSavedAt ? formatClockTime(unsavedDraftSavedAt) : "just now"}</small>
                        </div>
                        <div className="actions-row">
                          {restorableDraft ? (
                            <button type="button" className="button button--ghost button--small" onClick={restoreLocalDraft}>
                              Restore
                            </button>
                          ) : null}
                          <button type="button" className="button button--danger button--small" onClick={discardLocalDraft}>
                            Delete
                          </button>
                        </div>
                      </li>
                    ) : null}
                    {revisions.map((revision, index) => {
                      // Revisions come back newest-first, so index 0 is what the
                      // saved document currently matches — nothing to preview or
                      // roll back to.
                      const isCurrent = index === 0;
                      const isBeingViewed = previewedRevision?.revisionNumber === revision.revision_number;
                      return (
                        <li key={revision.id} data-current={isCurrent} data-viewing={isBeingViewed}>
                          <div className="revision-list__meta">
                            <div className="revision-list__top">
                              <strong>Revision #{revision.revision_number}</strong>
                              {isCurrent ? <span className="revision-list__tag">current</span> : null}
                            </div>
                            <p>{revision.change_note || "No note"}</p>
                            <small>{new Date(revision.created_at).toLocaleString()}</small>
                          </div>
                          {isCurrent ? null : (
                            <div className="actions-row">
                              <button
                                type="button"
                                className="button button--ghost button--small"
                                onClick={() => void previewRevision(revision)}
                                disabled={isBusy || !documentRow}
                              >
                                {isBeingViewed ? "Viewing" : "Preview"}
                              </button>
                              <button
                                type="button"
                                className="button button--ghost button--small"
                                onClick={() => void rollbackToRevision(revision.revision_number)}
                                disabled={isBusy || !documentRow}
                              >
                                Rollback
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
        </aside>
      </div>
    </section>
  );
}
