"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { StatusToast, useStatusToast } from "../components/status-toast";
import { canAccessDraftPdf } from "../lib/rbac";
import { isAppRole } from "../lib/auth-types";
import ResumeLivePreview from "./resume-live-preview";
import type { ResumeEditorStyle } from "./resume-live-preview";
import LocaleTabStrip from "./locale-tab-strip";
import LanguageVersionModal from "./language-version-modal";
import { useMultiLocaleResumeDocuments } from "./use-multi-locale-resume-documents";
import type {
  ResumeContactItem,
  ResumeCourse,
  ResumeDocument,
  ResumeEducation,
  ResumeExperience,
  ResumeLanguage,
  ResumeQrCode,
  ResumeSkill,
  ResumeSummaryItem,
} from "../lib/resume-schema";
import { defaultResumeDocument } from "../lib/resume-schema";

type EditorTab = "yaml" | "human";

const EDITOR_STYLES: Array<{ code: ResumeEditorStyle; label: string }> = [
  { code: "basic", label: "basic" },
  { code: "empty", label: "empty" },
];

const HFE_SECTION_NAV = [
  { id: "hfe-core", label: "Core" },
  { id: "hfe-summary", label: "Summary" },
  { id: "hfe-contact", label: "Contact" },
  { id: "hfe-qr-codes", label: "QR codes" },
  { id: "hfe-skills", label: "Skills" },
  { id: "hfe-tech-stack", label: "Tech stack" },
  { id: "hfe-languages", label: "Languages" },
  { id: "hfe-interests", label: "Interests" },
  { id: "hfe-experience", label: "Experience" },
  { id: "hfe-education", label: "Education" },
  { id: "hfe-courses", label: "Courses" },
] as const;

export default function EditorCanvasClient({ draftPdfEnabled = true }: { draftPdfEnabled?: boolean } = {}) {
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
    setActiveAllowIndexing,
    setActiveAiGenerated,
    resetActiveToTemplate,
    saveAllDirty,
    rollbackActiveToRevision,
    saveLanguageVersion,
    setDefaultLanguage,
    deleteLanguageVersion,
  } = useMultiLocaleResumeDocuments(searchParams.get("locale"));

  const activeBuffer = buffers[locale];
  const resume = activeBuffer?.resume ?? defaultResumeDocument("");
  const yamlPanel = activeBuffer?.yamlPanel ?? "";
  const yamlError = activeBuffer?.yamlError ?? null;
  const revisions = activeBuffer?.revisions ?? [];
  const allowIndexing = activeBuffer?.allowIndexing ?? false;
  const aiGenerated = activeBuffer?.aiGenerated ?? false;
  const documentRow = activeBuffer?.documentRow ?? null;

  const [editorTab, setEditorTab] = useState<EditorTab>("yaml");
  const [selectedStyle, setSelectedStyle] = useState<ResumeEditorStyle>("basic");
  const [isBusy, setIsBusy] = useState(false);
  const { toast, showToast, closeToast } = useStatusToast();
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [changeNote, setChangeNote] = useState("Publish update");
  // Rarely-used sections start collapsed for a new resume, but stay expanded
  // once the user has actually put something in them.
  const [isQrCodesOpen, setIsQrCodesOpen] = useState(() => resume.qr_codes.length > 0);
  const [isCoursesOpen, setIsCoursesOpen] = useState(() => resume.courses.length > 0);

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
    setActiveLocale(nextLocale);
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

  async function publishResume(targetIsPublic: boolean) {
    setIsBusy(true);
    showToast(targetIsPublic ? "Publishing resume..." : "Saving unpublished version...");
    try {
      const result = await saveAllDirty({ targetIsPublic, changeNote });
      if (result.failed.length === 0) {
        showToast(
          targetIsPublic
            ? `Resume published (${result.succeeded.length} language${result.succeeded.length === 1 ? "" : "s"}).`
            : `Saved (${result.succeeded.length} language${result.succeeded.length === 1 ? "" : "s"}).`,
        );
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
      showToast(`Rollback complete. Current document now matches revision ${revisionNumber}.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Rollback failed.", "error");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="resume-editor-shell">
      <header className="resume-editor-shell__header">
        <div>
          <h1>Master Resume Editor</h1>
        </div>
      </header>

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

      <div className="resume-editor-edit-section">
        <h2 className="resume-editor-section-heading">Edit your CV</h2>
        <div className="resume-editor-shell__content">
        <div className="resume-editor-form">
          <section className="stack resume-editor-panel">
            <div className="section-row">
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

            {editorTab === "yaml" ? (
              <div className="stack">
                <LocaleTabStrip
                  variant="yaml"
                  languageOptions={languageOptions}
                  activeLocale={locale}
                  defaultLocale={defaultLocale}
                  dirtyLocales={dirtyLocales}
                  errorLocales={errorLocales}
                  disabled={isBusy || isLoading}
                  onSelect={handleLocaleSwitch}
                  onManageLanguages={() => setIsLanguageModalOpen(true)}
                />
                <textarea
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
              <div className="resume-human-editor">
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
                <nav className="resume-human-editor__jumpnav" aria-label="Jump to section">
                  {HFE_SECTION_NAV.map((section) => (
                    <a key={section.id} href={`#${section.id}`} className="resume-human-editor__jumpnav-link">
                      {section.label}
                    </a>
                  ))}
                </nav>
                <fieldset className="resume-human-editor__fieldset" disabled={isBusy}>
                <section className="resume-human-editor__section" id="hfe-core">
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

                <section className="resume-human-editor__section" id="hfe-summary">
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

                <section className="resume-human-editor__section" id="hfe-contact">
                  <div className="section-row">
                    <h3>Contact</h3>
                    <button type="button" className="button button--ghost button--small" onClick={() => addArrayItem("contact", { label: "", value: "", link: "" })}>
                      + Add
                    </button>
                  </div>
                  {resume.contact.map((item, index) => (
                    <div className="resume-human-editor__row" key={`contact-${index}`}>
                      <label className="sr-only" htmlFor={`contact-label-${index}`}>Contact label</label>
                      <input id={`contact-label-${index}`} placeholder="Label" value={item.label} onChange={(event) => updateContact(index, "label", event.target.value)} />
                      <label className="sr-only" htmlFor={`contact-value-${index}`}>Contact value</label>
                      <input id={`contact-value-${index}`} placeholder="Value" value={item.value} onChange={(event) => updateContact(index, "value", event.target.value)} />
                      <label className="sr-only" htmlFor={`contact-link-${index}`}>Contact link</label>
                      <input id={`contact-link-${index}`} placeholder="Link" value={item.link || ""} onChange={(event) => updateContact(index, "link", event.target.value)} />
                      <button type="button" className="button button--danger button--small" onClick={() => removeArrayItem("contact", index)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </section>

                <details
                  className="resume-human-editor__section resume-human-editor__section--collapsible"
                  id="hfe-qr-codes"
                  open={isQrCodesOpen}
                  onToggle={(event) => setIsQrCodesOpen(event.currentTarget.open)}
                >
                  <summary className="section-row">
                    <h3>QR codes</h3>
                  </summary>
                  <div className="resume-human-editor__section-body">
                    <div className="actions-row">
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
                  </div>
                </details>

                <section className="resume-human-editor__section" id="hfe-skills">
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

                <section className="resume-human-editor__section" id="hfe-tech-stack">
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

                <section className="resume-human-editor__section" id="hfe-languages">
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

                <section className="resume-human-editor__section" id="hfe-interests">
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

                <section className="resume-human-editor__section" id="hfe-experience">
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

                <section className="resume-human-editor__section" id="hfe-education">
                  <div className="section-row">
                    <h3>Education</h3>
                    <button type="button" className="button button--ghost button--small" onClick={() => addArrayItem("education", { period: "", school: "", degree: "", detail: "" })}>
                      + Add
                    </button>
                  </div>
                  {resume.education.map((item, index) => (
                    <div className="resume-human-editor__card" key={`education-${index}`}>
                      <input placeholder="Period" value={item.period} onChange={(event) => updateEducation(index, "period", event.target.value)} />
                      <input placeholder="School" value={item.school} onChange={(event) => updateEducation(index, "school", event.target.value)} />
                      <input placeholder="Degree" value={item.degree} onChange={(event) => updateEducation(index, "degree", event.target.value)} />
                      <textarea rows={2} placeholder="Detail" value={item.detail} onChange={(event) => updateEducation(index, "detail", event.target.value)} />
                      <button type="button" className="button button--danger button--small" onClick={() => removeArrayItem("education", index)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </section>

                <details
                  className="resume-human-editor__section resume-human-editor__section--collapsible"
                  id="hfe-courses"
                  open={isCoursesOpen}
                  onToggle={(event) => setIsCoursesOpen(event.currentTarget.open)}
                >
                  <summary className="section-row">
                    <h3>Courses</h3>
                  </summary>
                  <div className="resume-human-editor__section-body">
                    <div className="actions-row">
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
                  </div>
                </details>
                </fieldset>
              </div>
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
              draftPdfEnabled={draftPdfEnabled && (actor && isAppRole(actor.role) ? canAccessDraftPdf(actor.role) : false)}
              onExpand={() => setIsPreviewExpanded(true)}
              onClose={() => setIsPreviewExpanded(false)}
            />
          )}
        </div>
        </div>
      </div>

      <section className="card stack resume-editor-panel">
        <h2>Publish</h2>
        <label>
          Change note
          <input value={changeNote} onChange={(event) => setChangeNote(event.target.value)} />
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={allowIndexing} onChange={(event) => setActiveAllowIndexing(event.target.checked)} />
          Allow indexing
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={aiGenerated} onChange={(event) => setActiveAiGenerated(event.target.checked)} />
          Mark as AI generated
        </label>
        <div className="actions-row">
          <button className="button button--ghost" type="button" onClick={() => void publishResume(false)} disabled={isBusy || isLoading}>
            {isBusy ? "Saving..." : "Save unpublished"}
          </button>
          <button className="button button--primary" type="button" onClick={() => void publishResume(true)} disabled={isBusy || isLoading}>
            {isBusy ? "Saving..." : "Save MasterCV"}
          </button>
        </div>
      </section>

      <section className="card stack resume-editor-panel">
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
    </section>
  );
}
