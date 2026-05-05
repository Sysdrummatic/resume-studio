"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { defaultResumeDocument, normalizeResumeDocument, validateResumeDocument } from "../lib/resume-schema";

type ResumeDocumentRow = {
  id: string;
  locale: ResumeLocale;
  title: string;
  yaml_content: string;
  schema_version: number;
  is_public: boolean;
  allow_indexing: boolean;
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

type EditorTab = "yaml" | "human";

const TEMPLATE_PATH = "/data/private/resume-en-template.yaml";
const EDITOR_STYLES: Array<{ code: ResumeEditorStyle; label: string }> = [
  { code: "basic", label: "basic" },
  { code: "empty", label: "pusty" },
];

function getDraftKey(userId: string, locale: ResumeLocale): string {
  return `resume-studio:phase-d-draft:${userId}:${locale}`;
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

export default function EditorCanvasClient() {
  const [locale, setLocale] = useState<ResumeLocale>("en");
  const [editorTab, setEditorTab] = useState<EditorTab>("yaml");
  const [selectedStyle, setSelectedStyle] = useState<ResumeEditorStyle>("basic");
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [isError, setIsError] = useState(false);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);

  const [actor, setActor] = useState<{ userId: string; displayName: string; role: string } | null>(null);
  const [documentRow, setDocumentRow] = useState<ResumeDocumentRow | null>(null);
  const [resume, setResume] = useState<ResumeDocument>(defaultResumeDocument(""));
  const [yamlPanel, setYamlPanel] = useState("");
  const [changeNote, setChangeNote] = useState("Publish update");
  const [isPublic, setIsPublic] = useState(true);
  const [allowIndexing, setAllowIndexing] = useState(false);
  const [revisions, setRevisions] = useState<ResumeRevisionItem[]>([]);

  const validation = useMemo(() => validateResumeDocument(resume), [resume]);

  const applyYamlText = useCallback(
    (yamlContent: string, options: { successStatus?: string; silent?: boolean } = {}) => {
      try {
        const normalized = normalizeYamlForEditor(yamlContent, actor?.displayName || "");
        setYamlPanel(normalized.yamlContent);
        setResume(normalized.resume);
        if (!options.silent) {
          setStatus(options.successStatus || "YAML imported to form.");
          setIsError(false);
        }
      } catch (error) {
        if (!options.silent) {
          setStatus(`YAML import failed: ${error instanceof Error ? error.message : "unknown error"}`);
          setIsError(true);
        }
      }
    },
    [actor],
  );

  const loadLocaleDocument = useCallback(
    async (nextLocale: ResumeLocale) => {
      setIsLoading(true);
      setStatus("Loading YAML editor...");
      setIsError(false);

      try {
        const response = await fetch(`/api/resume/document?locale=${encodeURIComponent(nextLocale)}`);
        const payload = (await response.json()) as ApiDocumentResponse;
        const loadedActor = payload.actor || null;

        if (loadedActor) {
          setActor(loadedActor);
        }

        if (payload.document) {
          setDocumentRow(payload.document);
          setIsPublic(payload.document.is_public);
          setAllowIndexing(payload.document.allow_indexing);
        }
        setRevisions(payload.revisions || []);

        let nextYamlPanel = nextLocale === "en" ? await fetchText(TEMPLATE_PATH) : payload.document?.yaml_content || "";
        let nextStatus = nextLocale === "en" ? "Template YAML loaded." : "Resume document loaded.";

        const draftKey = loadedActor ? getDraftKey(loadedActor.userId, nextLocale) : "";
        if (draftKey) {
          const draftRaw = localStorage.getItem(draftKey);
          if (draftRaw) {
            try {
              const draftPayload = JSON.parse(draftRaw) as { yamlContent?: string };
              if (draftPayload.yamlContent) {
                nextYamlPanel = draftPayload.yamlContent;
                nextStatus = "Draft restored from browser storage.";
              }
            } catch {
              localStorage.removeItem(draftKey);
            }
          }
        }

        try {
          const normalized = normalizeYamlForEditor(nextYamlPanel, loadedActor?.displayName || "");
          nextYamlPanel = normalized.yamlContent;
          setResume(normalized.resume);
          setStatus(normalized.migrated ? `${nextStatus} Legacy summary migrated to list format.` : nextStatus);
          setIsError(false);
          if (normalized.migrated && draftKey) {
            localStorage.setItem(draftKey, JSON.stringify({ yamlContent: nextYamlPanel, savedAt: new Date().toISOString() }));
          }
        } catch (error) {
          setResume(defaultResumeDocument(loadedActor?.displayName || ""));
          setStatus(`Failed to parse YAML: ${error instanceof Error ? error.message : "unknown error"}`);
          setIsError(true);
        }

        setYamlPanel(nextYamlPanel);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to load YAML editor.");
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    },
    [],
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
        setStatus("YAML parser is unavailable. Reload the page.");
        setIsError(true);
        setIsLoading(false);
        return;
      }
      await loadLocaleDocument(locale);
    }

    void init();
    return () => {
      mounted = false;
    };
  }, [loadLocaleDocument, locale]);

  function handleLocaleSwitch(nextLocale: ResumeLocale) {
    if (nextLocale === locale || isBusy) {
      return;
    }
    setLocale(nextLocale);
  }

  function handleYamlChange(value: string) {
    setYamlPanel(value);
    try {
      setResume(parseYamlToResumeDocument(value, actor?.displayName || ""));
      setStatus("Live preview updated.");
      setIsError(false);
    } catch (error) {
      setStatus(`YAML preview paused: ${error instanceof Error ? error.message : "unknown error"}`);
      setIsError(true);
    }
  }

  function updateResumeFromHuman(nextResume: ResumeDocument) {
    setResume(nextResume);
    try {
      setYamlPanel(serializeResumeToYaml(nextResume));
      setStatus("YAML and live preview updated.");
      setIsError(false);
    } catch (error) {
      setStatus(`YAML export failed: ${error instanceof Error ? error.message : "unknown error"}`);
      setIsError(true);
    }
  }

  function updateTextField(field: keyof Pick<ResumeDocument, "brand_initials" | "name" | "role">, value: string) {
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

  async function saveDraft() {
    if (!actor) return;
    setIsBusy(true);
    setStatus("Saving draft to database...");
    setIsError(false);

    const response = await fetch("/api/resume/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale,
        yamlContent: yamlPanel,
        title: resume.name ? `${resume.name} - Master resume draft` : "Master resume draft",
        isPublic,
        allowIndexing,
      }),
    });
    const payload = (await response.json()) as ApiDocumentResponse;
    if (!response.ok || payload.error || !payload.document) {
      setStatus(payload.error || "Draft save failed.");
      setIsError(true);
      setIsBusy(false);
      return;
    }

    setDocumentRow(payload.document);
    setRevisions(payload.revisions || []);
    localStorage.setItem(getDraftKey(actor.userId, locale), JSON.stringify({ yamlContent: yamlPanel, savedAt: new Date().toISOString() }));
    setStatus("Draft saved to database.");
    setIsError(false);
    setIsBusy(false);
  }

  function restoreDraft() {
    if (!actor) return;
    const key = getDraftKey(actor.userId, locale);
    const raw = localStorage.getItem(key);
    if (!raw) {
      setStatus("No draft found for current locale.");
      setIsError(true);
      return;
    }
    try {
      const payload = JSON.parse(raw) as { yamlContent?: string };
      if (!payload.yamlContent) {
        throw new Error("Invalid draft payload.");
      }
      applyYamlText(payload.yamlContent, { successStatus: "Draft restored." });
    } catch (error) {
      setStatus(`Draft restore failed: ${error instanceof Error ? error.message : "unknown error"}`);
      setIsError(true);
    }
  }

  function clearDraft(options: { skipStatusUpdate?: boolean } = {}) {
    if (!actor) return;
    localStorage.removeItem(getDraftKey(actor.userId, locale));
    if (options.skipStatusUpdate) {
      return;
    }
    setStatus("Draft cleared.");
    setIsError(false);
  }

  function syncYamlFromForm() {
    try {
      const yaml = serializeResumeToYaml(resume);
      setYamlPanel(yaml);
      setStatus("YAML panel synchronized from form.");
      setIsError(false);
    } catch (error) {
      setStatus(`YAML export failed: ${error instanceof Error ? error.message : "unknown error"}`);
      setIsError(true);
    }
  }

  function applyYamlToForm() {
    try {
      const parsed = parseYamlToResumeDocument(yamlPanel, actor?.displayName || "");
      const localValidation = validateResumeDocument(parsed);
      if (!localValidation.valid) {
        setStatus(localValidation.errors.join(" "));
        setIsError(true);
        return;
      }
      setResume(parsed);
      setStatus("YAML imported to form.");
      setIsError(false);
    } catch (error) {
      setStatus(`YAML import failed: ${error instanceof Error ? error.message : "unknown error"}`);
      setIsError(true);
    }
  }

  async function resetToTemplate() {
    try {
      const template = await fetchText(TEMPLATE_PATH);
      applyYamlText(template, { successStatus: "Template YAML loaded." });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Template load failed.");
      setIsError(true);
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
    setStatus(`Exported ${fileName}.`);
    setIsError(false);
  }

  async function publishResume() {
    if (!validation.valid) {
      setStatus(validation.errors.join(" "));
      setIsError(true);
      return;
    }
    setIsBusy(true);
    setStatus("Publishing resume...");
    setIsError(false);

    const response = await fetch("/api/resume/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale,
        yamlContent: yamlPanel,
        title: resume.name ? `${resume.name} - Master resume` : "Master resume",
        isPublic,
        allowIndexing,
        changeNote,
      }),
    });
    const payload = (await response.json()) as ApiDocumentResponse;
    if (!response.ok || payload.error || !payload.document) {
      setStatus(payload.error || "Publish failed.");
      setIsError(true);
      setIsBusy(false);
      return;
    }

    setDocumentRow(payload.document);
    setRevisions(payload.revisions || []);
    setStatus("Resume published. New revision created.");
    setIsError(false);
    setIsBusy(false);
    clearDraft({ skipStatusUpdate: true });
  }

  async function rollbackToRevision(revisionNumber: number) {
    if (!documentRow) return;
    setIsBusy(true);
    setStatus(`Rolling back to revision ${revisionNumber}...`);
    setIsError(false);

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
      setStatus(payload.error || "Rollback failed.");
      setIsError(true);
      setIsBusy(false);
      return;
    }

    setDocumentRow(payload.document);
    setRevisions(payload.revisions || []);
    applyYamlText(payload.document.yaml_content, { successStatus: `Rollback complete. Current document now matches revision ${revisionNumber}.` });
    setIsBusy(false);
  }

  return (
    <section className="resume-editor-shell">
      <header className="resume-editor-shell__header">
        <div>
          <h1>Master Resume Editor</h1>
          <p className="card-lead">YAML editor with a live basic CV preview.</p>
        </div>
        <div className="resume-editor-shell__locale-switch">
          <button
            type="button"
            className={`button button--ghost ${locale === "en" ? "is-active" : ""}`}
            onClick={() => void handleLocaleSwitch("en")}
            disabled={isBusy || isLoading}
          >
            EN
          </button>
          <button
            type="button"
            className={`button button--ghost ${locale === "pl" ? "is-active" : ""}`}
            onClick={() => void handleLocaleSwitch("pl")}
            disabled={isBusy || isLoading}
          >
            PL
          </button>
        </div>
      </header>

      {status && <p className={`status ${isError ? "status--error" : "status--ok"}`}>{status}</p>}

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
                    Load template
                  </button>
                  <button type="button" className="button button--ghost" onClick={syncYamlFromForm}>
                    Sync from form
                  </button>
                  <button type="button" className="button button--ghost" onClick={applyYamlToForm}>
                    Import YAML to form
                  </button>
                  <button type="button" className="button button--ghost" onClick={exportYamlFile}>
                    Export YAML file
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
                    <label>
                      Role
                      <input value={resume.role} onChange={(event) => updateTextField("role", event.target.value)} />
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
            <h2>Draft</h2>
            <div className="actions-row">
              <button type="button" className="button button--ghost" onClick={() => void saveDraft()} disabled={isBusy || isLoading}>
                {isBusy ? "Saving..." : "Save draft"}
              </button>
              <button type="button" className="button button--ghost" onClick={restoreDraft}>
                Restore draft
              </button>
              <button type="button" className="button button--danger" onClick={() => clearDraft()}>
                Clear draft
              </button>
            </div>
          </section>

          <section className="stack resume-editor-panel">
            <h2>Publish</h2>
            <label>
              Change note
              <input value={changeNote} onChange={(event) => setChangeNote(event.target.value)} />
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
              Resume is public
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={allowIndexing} onChange={(event) => setAllowIndexing(event.target.checked)} />
              Allow indexing
            </label>
            <button className="button button--primary" type="button" onClick={() => void publishResume()} disabled={isBusy || isLoading}>
              {isBusy ? "Publishing..." : "Publish and create revision"}
            </button>
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
        </div>

        <div className="resume-editor-preview">
          {isLoading ? (
            <p>Loading preview...</p>
          ) : (
            <ResumeLivePreview
              locale={locale}
              resume={resume}
              styleCode={selectedStyle}
              yamlContent={yamlPanel}
              isExpanded={isPreviewExpanded}
              onExpand={() => setIsPreviewExpanded(true)}
              onClose={() => setIsPreviewExpanded(false)}
            />
          )}
        </div>
      </div>
    </section>
  );
}
