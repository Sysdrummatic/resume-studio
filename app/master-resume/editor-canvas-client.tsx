"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ResumeLivePreview from "./resume-live-preview";
import type { ResumeEditorStyle } from "./resume-live-preview";
import type { ResumeDocument, ResumeLocale, ResumeRevisionItem } from "../lib/resume-schema";
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

async function fetchText(path: string) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.text();
}

export default function EditorCanvasClient() {
  const [locale, setLocale] = useState<ResumeLocale>("en");
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
      setYamlPanel(yamlContent);
      try {
        const parsed = parseYamlToResumeDocument(yamlContent, actor?.displayName || "");
        setResume(parsed);
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
          const nextResume = parseYamlToResumeDocument(nextYamlPanel, loadedActor?.displayName || "");
          setResume(nextResume);
          setStatus(nextStatus);
          setIsError(false);
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
