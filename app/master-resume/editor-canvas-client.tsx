"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ResumeLivePreview from "./resume-live-preview";
import type {
  ResumeContactItem,
  ResumeCourse,
  ResumeDocument,
  ResumeEducation,
  ResumeExperience,
  ResumeLanguage,
  ResumeLocale,
  ResumeRevisionItem,
  ResumeSkill,
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

function multilineToArray(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

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

export default function EditorCanvasClient() {
  const [locale, setLocale] = useState<ResumeLocale>("en");
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [isError, setIsError] = useState(false);

  const [actor, setActor] = useState<{ userId: string; displayName: string; role: string } | null>(null);
  const [documentRow, setDocumentRow] = useState<ResumeDocumentRow | null>(null);
  const [resume, setResume] = useState<ResumeDocument>(defaultResumeDocument(""));
  const [yamlPanel, setYamlPanel] = useState("");
  const [changeNote, setChangeNote] = useState("Publish update");
  const [isPublic, setIsPublic] = useState(true);
  const [allowIndexing, setAllowIndexing] = useState(false);
  const [revisions, setRevisions] = useState<ResumeRevisionItem[]>([]);

  const validation = useMemo(() => validateResumeDocument(resume), [resume]);

  const loadLocaleDocument = useCallback(async (nextLocale: ResumeLocale) => {
    setIsLoading(true);
    setStatus("Loading resume document...");
    setIsError(false);

    const response = await fetch(`/api/resume/document?locale=${encodeURIComponent(nextLocale)}`);
    const payload = (await response.json()) as ApiDocumentResponse;

    if (!response.ok || payload.error || !payload.document) {
      setStatus(payload.error || "Unable to load resume document.");
      setIsError(true);
      setIsLoading(false);
      return;
    }

    const loadedActor = payload.actor || null;
    if (loadedActor) {
      setActor(loadedActor);
    }

    let nextResume = defaultResumeDocument(loadedActor?.displayName || "");
    try {
      nextResume = parseYamlToResumeDocument(payload.document.yaml_content, loadedActor?.displayName || "");
    } catch (error) {
      setStatus(`Failed to parse YAML from database: ${error instanceof Error ? error.message : "unknown error"}`);
      setIsError(true);
    }

    const draftKey = loadedActor ? getDraftKey(loadedActor.userId, nextLocale) : "";
    if (draftKey) {
      const draftRaw = localStorage.getItem(draftKey);
      if (draftRaw) {
        try {
          const draftPayload = JSON.parse(draftRaw) as { yamlContent?: string };
          if (draftPayload.yamlContent) {
            nextResume = parseYamlToResumeDocument(draftPayload.yamlContent, loadedActor?.displayName || "");
            setStatus("Draft restored from browser storage.");
            setIsError(false);
          }
        } catch {
          localStorage.removeItem(draftKey);
        }
      }
    }

    setDocumentRow(payload.document);
    setResume(nextResume);
    setYamlPanel(payload.document.yaml_content);
    setIsPublic(payload.document.is_public);
    setAllowIndexing(payload.document.allow_indexing);
    setRevisions(payload.revisions || []);
    setIsLoading(false);
    setStatus("Resume document loaded.");
    setIsError(false);
  }, []);

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

  function updateResume(nextValue: ResumeDocument) {
    setResume(nextValue);
    try {
      setYamlPanel(serializeResumeToYaml(nextValue));
    } catch {
      setYamlPanel("");
    }
  }

  function updateTextField(field: keyof Pick<ResumeDocument, "brand_initials" | "name" | "role" | "summary">, value: string) {
    updateResume({
      ...resume,
      [field]: value,
    });
  }

  function updateStringList(field: "tech_stack" | "interests", value: string) {
    updateResume({
      ...resume,
      [field]: multilineToArray(value),
    });
  }

  function updateContact(index: number, key: keyof ResumeContactItem, value: string) {
    const next = [...resume.contact];
    next[index] = { ...next[index], [key]: value };
    updateResume({ ...resume, contact: next });
  }

  function addContact() {
    updateResume({
      ...resume,
      contact: [...resume.contact, { label: "", value: "", link: "" }],
    });
  }

  function removeContact(index: number) {
    updateResume({
      ...resume,
      contact: resume.contact.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  function updateSkill(index: number, key: keyof ResumeSkill, value: string) {
    const next = [...resume.skills];
    if (key === "level") {
      next[index] = { ...next[index], level: Math.max(1, Math.min(5, Number.parseInt(value, 10) || 1)) };
    } else {
      next[index] = { ...next[index], [key]: value };
    }
    updateResume({ ...resume, skills: next });
  }

  function addSkill() {
    updateResume({
      ...resume,
      skills: [...resume.skills, { name: "", level: 3 }],
    });
  }

  function removeSkill(index: number) {
    updateResume({
      ...resume,
      skills: resume.skills.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  function updateLanguage(index: number, key: keyof ResumeLanguage, value: string) {
    const next = [...resume.languages];
    if (key === "level") {
      next[index] = { ...next[index], level: Math.max(1, Math.min(5, Number.parseInt(value, 10) || 1)) };
    } else {
      next[index] = { ...next[index], [key]: value };
    }
    updateResume({ ...resume, languages: next });
  }

  function addLanguage() {
    updateResume({
      ...resume,
      languages: [...resume.languages, { name: "", level_text: "", level: 3 }],
    });
  }

  function removeLanguage(index: number) {
    updateResume({
      ...resume,
      languages: resume.languages.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  function updateExperience(index: number, key: keyof ResumeExperience, value: string) {
    const next = [...resume.experience];
    if (key === "highlights") {
      next[index] = { ...next[index], highlights: multilineToArray(value) };
    } else {
      next[index] = { ...next[index], [key]: value };
    }
    updateResume({ ...resume, experience: next });
  }

  function addExperience() {
    updateResume({
      ...resume,
      experience: [...resume.experience, { period: "", company: "", role: "", highlights: [] }],
    });
  }

  function removeExperience(index: number) {
    updateResume({
      ...resume,
      experience: resume.experience.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  function updateEducation(index: number, key: keyof ResumeEducation, value: string) {
    const next = [...resume.education];
    next[index] = { ...next[index], [key]: value };
    updateResume({ ...resume, education: next });
  }

  function addEducation() {
    updateResume({
      ...resume,
      education: [...resume.education, { period: "", school: "", detail: "" }],
    });
  }

  function removeEducation(index: number) {
    updateResume({
      ...resume,
      education: resume.education.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  function updateCourse(index: number, key: keyof ResumeCourse, value: string) {
    const next = [...resume.courses];
    if (key === "year") {
      next[index] = { ...next[index], year: Math.max(0, Number.parseInt(value, 10) || 0) };
    } else {
      next[index] = { ...next[index], [key]: value };
    }
    updateResume({ ...resume, courses: next });
  }

  function addCourse() {
    updateResume({
      ...resume,
      courses: [...resume.courses, { year: 0, name: "" }],
    });
  }

  function removeCourse(index: number) {
    updateResume({
      ...resume,
      courses: resume.courses.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  function saveDraft() {
    if (!actor) return;
    const key = getDraftKey(actor.userId, locale);
    try {
      const yamlContent = serializeResumeToYaml(resume);
      localStorage.setItem(key, JSON.stringify({ yamlContent, savedAt: new Date().toISOString() }));
      setStatus("Draft saved in browser storage.");
      setIsError(false);
    } catch (error) {
      setStatus(`Draft save failed: ${error instanceof Error ? error.message : "unknown error"}`);
      setIsError(true);
    }
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
      const parsed = parseYamlToResumeDocument(payload.yamlContent, actor.displayName);
      setResume(parsed);
      setYamlPanel(payload.yamlContent);
      setStatus("Draft restored.");
      setIsError(false);
    } catch (error) {
      setStatus(`Draft restore failed: ${error instanceof Error ? error.message : "unknown error"}`);
      setIsError(true);
    }
  }

  function clearDraft() {
    if (!actor) return;
    localStorage.removeItem(getDraftKey(actor.userId, locale));
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

  function exportYamlFile() {
    const fileName = `resume-${locale}.yaml`;
    const blob = new Blob([yamlPanel], { type: "text/yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
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

    let yamlContent = yamlPanel;
    if (!yamlContent.trim()) {
      yamlContent = serializeResumeToYaml(resume);
      setYamlPanel(yamlContent);
    }

    const response = await fetch("/api/resume/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale,
        yamlContent,
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
    clearDraft();
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
    try {
      const parsed = parseYamlToResumeDocument(payload.document.yaml_content, actor?.displayName || "");
      setResume(parsed);
      setYamlPanel(payload.document.yaml_content);
    } catch {
      setResume(defaultResumeDocument(actor?.displayName || ""));
    }
    setStatus(`Rollback complete. Current document now matches revision ${revisionNumber}.`);
    setIsError(false);
    setIsBusy(false);
  }

  const techStackMultiline = resume.tech_stack.join("\n");
  const interestsMultiline = resume.interests.join("\n");

  return (
    <section className="card resume-editor-shell">
      <header className="resume-editor-shell__header">
        <div>
          <h1>Master Resume Editor</h1>
          <p className="card-lead">Canvas mode: editable form on the left, live CV preview on the right.</p>
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
          <section className="stack">
            <h2>Core</h2>
            <label>
              Brand initials
              <input value={resume.brand_initials} onChange={(event) => updateTextField("brand_initials", event.target.value)} />
            </label>
            <label>
              Full name
              <input value={resume.name} onChange={(event) => updateTextField("name", event.target.value)} />
            </label>
            <label>
              Role / Headline
              <input value={resume.role} onChange={(event) => updateTextField("role", event.target.value)} />
            </label>
            <label>
              Summary
              <textarea rows={5} value={resume.summary} onChange={(event) => updateTextField("summary", event.target.value)} />
            </label>
          </section>

          <section className="stack">
            <div className="section-row">
              <h2>Contact</h2>
              <button type="button" className="button button--ghost button--small" onClick={addContact}>
                Add row
              </button>
            </div>
            {resume.contact.map((item, index) => (
              <div className="array-row" key={`contact-${index}`}>
                <input placeholder="Label" value={item.label} onChange={(event) => updateContact(index, "label", event.target.value)} />
                <input placeholder="Value" value={item.value} onChange={(event) => updateContact(index, "value", event.target.value)} />
                <input
                  placeholder="Link (optional)"
                  value={item.link || ""}
                  onChange={(event) => updateContact(index, "link", event.target.value)}
                />
                <button type="button" className="button button--danger button--small" onClick={() => removeContact(index)}>
                  Remove
                </button>
              </div>
            ))}
          </section>

          <section className="stack">
            <div className="section-row">
              <h2>Skills</h2>
              <button type="button" className="button button--ghost button--small" onClick={addSkill}>
                Add skill
              </button>
            </div>
            {resume.skills.map((item, index) => (
              <div className="array-row" key={`skill-${index}`}>
                <input placeholder="Skill" value={item.name} onChange={(event) => updateSkill(index, "name", event.target.value)} />
                <input
                  placeholder="Level 1-5"
                  type="number"
                  min={1}
                  max={5}
                  value={item.level}
                  onChange={(event) => updateSkill(index, "level", event.target.value)}
                />
                <button type="button" className="button button--danger button--small" onClick={() => removeSkill(index)}>
                  Remove
                </button>
              </div>
            ))}
          </section>

          <section className="stack">
            <div className="section-row">
              <h2>Languages</h2>
              <button type="button" className="button button--ghost button--small" onClick={addLanguage}>
                Add language
              </button>
            </div>
            {resume.languages.map((item, index) => (
              <div className="array-row" key={`language-${index}`}>
                <input placeholder="Language" value={item.name} onChange={(event) => updateLanguage(index, "name", event.target.value)} />
                <input
                  placeholder="Level text"
                  value={item.level_text}
                  onChange={(event) => updateLanguage(index, "level_text", event.target.value)}
                />
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={item.level}
                  onChange={(event) => updateLanguage(index, "level", event.target.value)}
                />
                <button type="button" className="button button--danger button--small" onClick={() => removeLanguage(index)}>
                  Remove
                </button>
              </div>
            ))}
          </section>

          <section className="stack">
            <h2>Tech Stack</h2>
            <textarea rows={4} value={techStackMultiline} onChange={(event) => updateStringList("tech_stack", event.target.value)} />
          </section>

          <section className="stack">
            <h2>Interests</h2>
            <textarea rows={4} value={interestsMultiline} onChange={(event) => updateStringList("interests", event.target.value)} />
          </section>

          <section className="stack">
            <div className="section-row">
              <h2>Experience</h2>
              <button type="button" className="button button--ghost button--small" onClick={addExperience}>
                Add experience
              </button>
            </div>
            {resume.experience.map((item, index) => (
              <div className="stack array-card" key={`experience-${index}`}>
                <input placeholder="Period" value={item.period} onChange={(event) => updateExperience(index, "period", event.target.value)} />
                <input
                  placeholder="Company"
                  value={item.company}
                  onChange={(event) => updateExperience(index, "company", event.target.value)}
                />
                <input placeholder="Role" value={item.role} onChange={(event) => updateExperience(index, "role", event.target.value)} />
                <textarea
                  rows={3}
                  placeholder="Highlights (one per line)"
                  value={item.highlights.join("\n")}
                  onChange={(event) => updateExperience(index, "highlights", event.target.value)}
                />
                <button type="button" className="button button--danger button--small" onClick={() => removeExperience(index)}>
                  Remove
                </button>
              </div>
            ))}
          </section>

          <section className="stack">
            <div className="section-row">
              <h2>Education</h2>
              <button type="button" className="button button--ghost button--small" onClick={addEducation}>
                Add education
              </button>
            </div>
            {resume.education.map((item, index) => (
              <div className="stack array-card" key={`education-${index}`}>
                <input placeholder="Period" value={item.period} onChange={(event) => updateEducation(index, "period", event.target.value)} />
                <input placeholder="School" value={item.school} onChange={(event) => updateEducation(index, "school", event.target.value)} />
                <textarea
                  rows={2}
                  placeholder="Detail"
                  value={item.detail}
                  onChange={(event) => updateEducation(index, "detail", event.target.value)}
                />
                <button type="button" className="button button--danger button--small" onClick={() => removeEducation(index)}>
                  Remove
                </button>
              </div>
            ))}
          </section>

          <section className="stack">
            <div className="section-row">
              <h2>Courses</h2>
              <button type="button" className="button button--ghost button--small" onClick={addCourse}>
                Add course
              </button>
            </div>
            {resume.courses.map((item, index) => (
              <div className="array-row" key={`course-${index}`}>
                <input
                  type="number"
                  placeholder="Year"
                  value={item.year || 0}
                  onChange={(event) => updateCourse(index, "year", event.target.value)}
                />
                <input placeholder="Course name" value={item.name} onChange={(event) => updateCourse(index, "name", event.target.value)} />
                <button type="button" className="button button--danger button--small" onClick={() => removeCourse(index)}>
                  Remove
                </button>
              </div>
            ))}
          </section>

          <section className="stack">
            <h2>Draft</h2>
            <div className="actions-row">
              <button type="button" className="button button--ghost" onClick={saveDraft}>
                Save draft
              </button>
              <button type="button" className="button button--ghost" onClick={restoreDraft}>
                Restore draft
              </button>
              <button type="button" className="button button--danger" onClick={clearDraft}>
                Clear draft
              </button>
            </div>
          </section>

          <section className="stack">
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
            <button className="button button--primary" type="button" onClick={publishResume} disabled={isBusy || isLoading}>
              {isBusy ? "Publishing..." : "Publish and create revision"}
            </button>
          </section>

          <section className="stack">
            <h2>YAML panel</h2>
            <textarea rows={12} value={yamlPanel} onChange={(event) => setYamlPanel(event.target.value)} />
            <div className="actions-row">
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

          <section className="stack">
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
          {isLoading ? <p>Loading preview...</p> : <ResumeLivePreview locale={locale} resume={resume} />}
        </div>
      </div>
    </section>
  );
}
