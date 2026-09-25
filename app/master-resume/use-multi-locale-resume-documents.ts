"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { DEFAULT_RESUME_STYLE, normalizeResumeStyle, type ResumeStyleSettings } from "../lib/resume-style";
import {
  MULTIPLE_DEFAULT_SUMMARIES_ERROR,
  defaultResumeDocument,
  hasMultipleDefaultSummaries,
  normalizeResumeDocument,
  resumeFullName,
  validateResumeDocument,
  type ResumeDocument,
  type ResumeLocale,
  type ResumeRevisionItem,
} from "../lib/resume-schema";
import type { ResumeDocumentRow, ResumeUserLocaleVersionRow } from "../lib/resume-server";
import type { OnboardingTestRun } from "../lib/onboarding-test";
import {
  ensureResumeEntryIds,
  hasCompleteResumeLinkage,
  inspectResumeEntryIdStability,
  inspectResumeLanguagePair,
  type ResumeLinkageIssue,
} from "../lib/resume-language-linkage";

const TEMPLATE_PATH = "/data/private/resume-en-template.yaml";

export type ResumeLanguageMetadata = ResumeUserLocaleVersionRow;

export type LocaleBuffer = {
  locale: ResumeLocale;
  documentRow: ResumeDocumentRow | null;
  resume: ResumeDocument;
  yamlPanel: string;
  savedYamlContent: string;
  savedCvStyle: ResumeStyleSettings;
  yamlError: string | null;
  revisions: ResumeRevisionItem[];
  cvStyle: ResumeStyleSettings;
  saveError: string | null;
  /** True when the initial document fetch for this locale failed — never save over it. */
  loadFailed: boolean;
};

export type SaveAllResult = {
  succeeded: ResumeLocale[];
  failed: Array<{ locale: ResumeLocale; message: string; docsUrl?: string }>;
};

export type ResumeLinkageStatus = {
  ok: boolean;
  issues: ResumeLinkageIssue[];
  basis: "saved-default" | "default-language";
  parseError?: string;
};

type Actor = { userId: string; displayName: string; role: string };

type ApiDocumentResponse = {
  ok?: boolean;
  error?: string;
  docsUrl?: string;
  actor?: Actor;
  document?: ResumeDocumentRow;
  revisions?: ResumeRevisionItem[];
};

class ResumeSaveError extends Error {
  docsUrl?: string;
  constructor(message: string, docsUrl?: string) {
    super(message);
    this.docsUrl = docsUrl;
  }
}

type ApiLanguagesResponse = { ok?: boolean; error?: string; languages?: ResumeLanguageMetadata[] };
type ApiLanguagePostResponse = {
  ok?: boolean;
  error?: string;
  language?: ResumeLanguageMetadata;
  document?: ResumeDocumentRow | null;
  revisions?: ResumeRevisionItem[];
};

function hasYamlRuntime(): boolean {
  return typeof window !== "undefined" && typeof window.jsyaml?.load === "function" && typeof window.jsyaml?.dump === "function";
}

function parseYamlValue(yamlContent: string): unknown {
  if (!hasYamlRuntime()) throw new Error("YAML runtime is not loaded.");
  return window.jsyaml?.load(yamlContent);
}

function parseYamlToResumeDocument(yamlContent: string, fallbackName: string): ResumeDocument {
  if (!hasYamlRuntime()) {
    throw new Error("YAML runtime is not loaded.");
  }
  const parsed = ensureResumeEntryIds(window.jsyaml?.load(yamlContent));
  return normalizeResumeDocument(parsed, fallbackName, { preserveLinkedEntries: true });
}

function serializeResumeToYaml(resume: unknown): string {
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
  const parsed = window.jsyaml?.load(yamlContent);
  const source = ensureResumeEntryIds(parsed);
  const resume = normalizeResumeDocument(source, fallbackName, { preserveLinkedEntries: true });
  const shouldMigrateYaml = !Array.isArray(source.summary);
  const shouldPersistLinkageIds = !hasCompleteResumeLinkage(parsed);
  // A stored document with two defaults is re-serialized from the normalized
  // one (which keeps the first), so opening it does not raise the YAML error
  // reserved for edits made in the YAML tab.
  const hasDuplicateDefault = hasMultipleDefaultSummaries(parsed);
  return {
    resume,
    yamlContent: shouldMigrateYaml || hasDuplicateDefault
      ? serializeResumeToYaml(resume)
      : shouldPersistLinkageIds
        ? serializeResumeToYaml(source)
        : yamlContent,
    migrated: shouldMigrateYaml,
  };
}

async function fetchText(path: string): Promise<string> {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.text();
}

function sortLanguageRows(rows: ResumeLanguageMetadata[]): ResumeLanguageMetadata[] {
  return [...rows].sort((left, right) => (left.sort_order ?? 999) - (right.sort_order ?? 999) || left.code.localeCompare(right.code));
}

function buildBuffer(
  locale: ResumeLocale,
  documentRow: ResumeDocumentRow | null,
  revisions: ResumeRevisionItem[],
  fallbackName: string,
): { buffer: LocaleBuffer; migrated: boolean } {
  let yamlContent = documentRow?.yaml_content || "";
  let resume: ResumeDocument;
  let yamlError: string | null = null;
  let migrated = false;

  if (!yamlContent) {
    resume = normalizeResumeDocument(ensureResumeEntryIds(defaultResumeDocument(fallbackName)), fallbackName, { preserveLinkedEntries: true });
    if (hasYamlRuntime()) {
      try {
        yamlContent = serializeResumeToYaml(resume);
      } catch {
        // Leave yamlContent empty; the Form view still has the default resume state.
      }
    }
  } else if (!hasYamlRuntime()) {
    resume = defaultResumeDocument(fallbackName);
    yamlError = "YAML runtime is not loaded.";
  } else {
    try {
      const normalized = normalizeYamlForEditor(yamlContent, fallbackName);
      yamlContent = normalized.yamlContent;
      resume = normalized.resume;
      migrated = normalized.migrated;
    } catch (error) {
      resume = defaultResumeDocument(fallbackName);
      yamlError = error instanceof Error ? error.message : "Invalid YAML";
    }
  }

  return {
    buffer: {
      locale,
      documentRow,
      resume,
      yamlPanel: yamlContent,
      savedYamlContent: yamlContent,
      savedCvStyle: normalizeResumeStyle(documentRow?.style_settings),
      yamlError,
      revisions,
      cvStyle: normalizeResumeStyle(documentRow?.style_settings),
      saveError: null,
      loadFailed: false,
    },
    migrated,
  };
}

function buildFailedBuffer(locale: ResumeLocale, message: string, fallbackName: string): LocaleBuffer {
  return {
    locale,
    documentRow: null,
    resume: defaultResumeDocument(fallbackName),
    yamlPanel: "",
    savedYamlContent: "",
    savedCvStyle: { ...DEFAULT_RESUME_STYLE },
    yamlError: null,
    revisions: [],
    cvStyle: { ...DEFAULT_RESUME_STYLE },
    saveError: message,
    loadFailed: true,
  };
}

/**
 * Owns every language version of the active Master Resume as an in-memory buffer
 * (parsed resume + raw YAML + dirty/error state), so switching the active locale
 * never discards unsaved edits in another locale. Mirrors the publish/rollback/
 * language-CRUD API contracts in app/api/resume/{document,languages,publish,rollback}.
 */
export function useMultiLocaleResumeDocuments(initialLocale: ResumeLocale | null, testRun?: OnboardingTestRun) {
  const [actor, setActor] = useState<Actor | null>(null);
  const [languageOptions, setLanguageOptions] = useState<ResumeLanguageMetadata[]>([]);
  const [defaultLocale, setDefaultLocale] = useState<ResumeLocale>("en");
  const [activeLocale, setActiveLocale] = useState<ResumeLocale>(initialLocale || "en");
  const [buffers, setBuffers] = useState<Record<ResumeLocale, LocaleBuffer>>({});
  const [isLoadingAll, setIsLoadingAll] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadNotice, setLoadNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function waitForYamlRuntime() {
      let retries = 0;
      while (!hasYamlRuntime()) {
        if (cancelled || retries >= 40) return hasYamlRuntime();
        retries += 1;
        await new Promise((resolve) => window.setTimeout(resolve, 100));
      }
      return true;
    }

    async function bootstrap() {
      const ready = await waitForYamlRuntime();
      if (cancelled) return;
      if (!ready) {
        setLoadError("YAML parser is unavailable. Reload the page.");
        setIsLoadingAll(false);
        return;
      }

      try {
        if (testRun) {
          const sorted = ["en", "pl"].map((code) => ({ code, label: code === "pl" ? "Polski" : "English", short_label: code.toUpperCase(),
            is_default: code === testRun.locale, sort_order: code === "en" ? 0 : 1, labels: {}, user_id: "", created_at: "", updated_at: "",
            label_override: null, short_label_override: null, document: null }));
          const nextBuffers: Record<string, LocaleBuffer> = {};
          for (const language of sorted) {
            const content = testRun.drafts[language.code];
            const document = content ? { id: testRun.id, user_id: "", locale: language.code, title: "Test onboardingu", yaml_content: content, schema_version: 1, updated_at: "" } : null;
            nextBuffers[language.code] = buildBuffer(language.code, document, [], "").buffer;
          }
          setLanguageOptions(sorted);
          setDefaultLocale(testRun.locale);
          setActiveLocale(testRun.locale);
          setBuffers(nextBuffers);
          return;
        }
        const languagesResponse = await fetch("/api/resume/languages?withDocuments=true", { signal: controller.signal });
        const languagesPayload = (await languagesResponse.json()) as ApiLanguagesResponse;
        if (!languagesResponse.ok || languagesPayload.error || !languagesPayload.languages?.length) {
          throw new Error(languagesPayload.error || "Language list could not be loaded.");
        }
        const sorted = sortLanguageRows(languagesPayload.languages);
        const nextDefaultLocale = sorted.find((language) => language.is_default)?.code || sorted[0].code;

        const documentResponses = await Promise.all(
          sorted.map((language) => fetch(`/api/resume/document?locale=${encodeURIComponent(language.code)}`, { signal: controller.signal })),
        );
        const documentPayloads = (await Promise.all(documentResponses.map((response) => response.json()))) as ApiDocumentResponse[];
        if (cancelled) return;

        const loadedActor = documentPayloads.find((payload) => payload.actor)?.actor || null;
        const fallbackName = loadedActor?.displayName || "";

        const nextBuffers: Record<ResumeLocale, LocaleBuffer> = {};
        let anyMigrated = false;
        const failedLocales: string[] = [];
        sorted.forEach((language, index) => {
          const response = documentResponses[index];
          const payload = documentPayloads[index];
          if (!response.ok || payload.error) {
            failedLocales.push(language.code);
            nextBuffers[language.code] = buildFailedBuffer(language.code, payload.error || "Failed to load this language version.", fallbackName);
            return;
          }
          const { buffer, migrated } = buildBuffer(language.code, payload.document ?? null, payload.revisions || [], fallbackName);
          nextBuffers[language.code] = buffer;
          anyMigrated = anyMigrated || migrated;
        });

        setLanguageOptions(sorted);
        setDefaultLocale(nextDefaultLocale);
        if (loadedActor) setActor(loadedActor);
        setBuffers(nextBuffers);
        setActiveLocale(initialLocale && nextBuffers[initialLocale] ? initialLocale : nextDefaultLocale);
        if (anyMigrated) setLoadNotice("Legacy summary migrated to list format.");
        if (failedLocales.length > 0) {
          setLoadError(`Could not load: ${failedLocales.join(", ")}. Reload the page to retry before editing or saving.`);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : "Unable to load resume documents.");
      } finally {
        if (!cancelled) setIsLoadingAll(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
      controller.abort();
    };
    // Bootstraps once on mount; the initial locale from the URL is only a hint for which tab opens first.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchBuffer = useCallback((locale: ResumeLocale, patch: Partial<LocaleBuffer> | ((buffer: LocaleBuffer) => Partial<LocaleBuffer>)) => {
    setBuffers((prev) => {
      const current = prev[locale];
      if (!current) return prev;
      const nextPatch = typeof patch === "function" ? patch(current) : patch;
      return { ...prev, [locale]: { ...current, ...nextPatch } };
    });
  }, []);

  const updateActiveYaml = useCallback(
    (value: string) => {
      patchBuffer(activeLocale, { yamlPanel: value });
    },
    [activeLocale, patchBuffer],
  );

  const updateActiveResume = useCallback(
    (nextResume: ResumeDocument) => {
      patchBuffer(activeLocale, () => {
        try {
          const linkedResume = ensureResumeEntryIds(nextResume);
          return {
            resume: normalizeResumeDocument(linkedResume, "", { preserveLinkedEntries: true }),
            yamlPanel: serializeResumeToYaml(linkedResume),
            yamlError: null,
          };
        } catch {
          return { resume: nextResume };
        }
      });
    },
    [activeLocale, patchBuffer],
  );

  // Keeps `resume` in sync with manual YAML edits on the active tab only — the
  // textarea is the only mounted editor surface, so other locales' buffers are
  // already consistent from their last edit/load and don't need re-parsing.
  const activeYamlPanel = buffers[activeLocale]?.yamlPanel ?? "";
  const deferredYaml = useDeferredValue(activeYamlPanel);

  useEffect(() => {
    if (testRun) return;
    if (!deferredYaml || !hasYamlRuntime()) return;
    try {
      const parsed = parseYamlToResumeDocument(deferredYaml, actor?.displayName ?? "");
      const validation = validateResumeDocument(parsed);
      // Normalization already keeps one default, so the raw text is checked
      // to tell the author instead of silently ignoring their second one.
      const duplicateDefault = hasMultipleDefaultSummaries(window.jsyaml?.load(deferredYaml));
      patchBuffer(activeLocale, (buffer) =>
        buffer.yamlPanel !== deferredYaml
          ? {}
          : duplicateDefault
            ? { yamlError: MULTIPLE_DEFAULT_SUMMARIES_ERROR }
            : validation.valid
              ? { resume: parsed, yamlError: null }
              : { yamlError: validation.errors.join(" ") },
      );
    } catch (error) {
      patchBuffer(activeLocale, (buffer) =>
        buffer.yamlPanel !== deferredYaml ? {} : { yamlError: error instanceof Error ? error.message : "Invalid YAML" },
      );
    }
  }, [deferredYaml, activeLocale, actor?.displayName, patchBuffer, testRun]);

  const dirtyLocales = useMemo(
    () => Object.values(buffers)
      .filter((buffer) => buffer.yamlPanel !== buffer.savedYamlContent || JSON.stringify(buffer.cvStyle) !== JSON.stringify(buffer.savedCvStyle))
      .map((buffer) => buffer.locale),
    [buffers],
  );
  const errorLocales = useMemo(
    () => Object.values(buffers).filter((buffer) => buffer.saveError).map((buffer) => buffer.locale),
    [buffers],
  );
  const isAnyDirty = dirtyLocales.length > 0;

  const linkageStatuses = useMemo<Record<ResumeLocale, ResumeLinkageStatus>>(() => {
    const result = {} as Record<ResumeLocale, ResumeLinkageStatus>;
    const defaultBuffer = buffers[defaultLocale];
    for (const buffer of Object.values(buffers)) {
      try {
        const currentRaw = parseYamlValue(buffer.yamlPanel);
        if (buffer.locale === defaultLocale) {
          const savedRaw = parseYamlValue(buffer.savedYamlContent);
          const validation = inspectResumeEntryIdStability(savedRaw, currentRaw);
          result[buffer.locale] = { ...validation, basis: "saved-default" };
        } else if (defaultBuffer) {
          const defaultRaw = parseYamlValue(defaultBuffer.yamlPanel);
          const validation = inspectResumeLanguagePair(defaultRaw, currentRaw);
          result[buffer.locale] = { ...validation, basis: "default-language" };
        }
      } catch (error) {
        result[buffer.locale] = {
          ok: false,
          issues: [],
          basis: buffer.locale === defaultLocale ? "saved-default" : "default-language",
          parseError: error instanceof Error ? error.message : "Invalid YAML",
        };
      }
    }
    return result;
  }, [buffers, defaultLocale]);

  const resetActiveToTemplate = useCallback(async (): Promise<boolean> => {
    const current = buffers[activeLocale];
    if (current?.yamlPanel.trim() && !window.confirm("This will replace your current YAML with the template. Continue?")) {
      return false;
    }
    const template = await fetchText(TEMPLATE_PATH);
    const parsed = parseYamlToResumeDocument(template, actor?.displayName || "");
    patchBuffer(activeLocale, { yamlPanel: template, resume: parsed, yamlError: null });
    return true;
  }, [activeLocale, buffers, actor?.displayName, patchBuffer]);

  const setActiveCvStyle = useCallback(
    (value: ResumeStyleSettings) => patchBuffer(activeLocale, { cvStyle: value }),
    [activeLocale, patchBuffer],
  );

  const saveAllDirty = useCallback(
    async ({ changeNote }: { changeNote: string }): Promise<SaveAllResult> => {
      const targets = Array.from(new Set([activeLocale, ...dirtyLocales]));
      const result: SaveAllResult = { succeeded: [], failed: [] };

      const outcomes = await Promise.allSettled(
        targets.map(async (code) => {
          const buffer = buffers[code];
          if (!buffer) throw new Error(`${code}: not loaded.`);
          if (buffer.loadFailed) {
            throw new Error(`${code}: this language version failed to load — reload the page before saving it.`);
          }
          if (buffer.yamlError) throw new Error(`${code}: ${buffer.yamlError}`);
          const linkageStatus = linkageStatuses[code];
          if (linkageStatus && !linkageStatus.ok) throw new Error(`${code}: linked entry IDs are not valid.`);
          const validation = validateResumeDocument(buffer.resume);
          if (!validation.valid) throw new Error(`${code}: ${validation.errors.join(" ")}`);

          const snapshot = buffer.yamlPanel;
          if (testRun) {
            const response = await fetch(`/api/admin/onboarding-test/${testRun.id}`, {
              method: "PATCH", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ locale: code, yamlContent: snapshot }),
            });
            if (!response.ok) throw new Error("Could not save test draft.");
            const payload: ApiDocumentResponse = { document: { id: testRun.id, user_id: "", locale: code,
              title: "Test onboardingu", yaml_content: snapshot, schema_version: 1, updated_at: "" }, revisions: [] };
            return { code, payload, snapshot, styleSnapshot: buffer.cvStyle };
          }
          const response = await fetch("/api/resume/publish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              locale: code,
              yamlContent: snapshot,
              title: resumeFullName(buffer.resume) ? `${resumeFullName(buffer.resume)} - Experience Base` : "Experience Base",
              styleSettings: buffer.cvStyle,
              changeNote: changeNote || "Saved update",
            }),
          });
          const payload = (await response.json()) as ApiDocumentResponse;
          if (!response.ok || payload.error || !payload.document) {
            throw new ResumeSaveError(`${code}: ${payload.error || "Save failed."}`, payload.docsUrl);
          }
          return { code, payload, snapshot, styleSnapshot: buffer.cvStyle };
        }),
      );

      outcomes.forEach((outcome, index) => {
        if (outcome.status === "fulfilled") result.succeeded.push(targets[index]);
        else
          result.failed.push({
            locale: targets[index],
            message: outcome.reason instanceof Error ? outcome.reason.message : "Save failed.",
            docsUrl: outcome.reason instanceof ResumeSaveError ? outcome.reason.docsUrl : undefined,
          });
      });

      setBuffers((prev) => {
        const next = { ...prev };
        outcomes.forEach((outcome, index) => {
          const code = targets[index];
          if (outcome.status === "fulfilled") {
            const { payload, snapshot, styleSnapshot } = outcome.value;
            const current = next[code];
            // Only clear dirty if nothing changed locally since the save was sent.
            if (current && current.yamlPanel === snapshot && JSON.stringify(current.cvStyle) === JSON.stringify(styleSnapshot)) {
              next[code] = {
                ...current,
                documentRow: payload.document!,
                revisions: payload.revisions || [],
                savedYamlContent: snapshot,
                savedCvStyle: styleSnapshot,
                saveError: null,
              };
            }
          } else {
            const message = outcome.reason instanceof Error ? outcome.reason.message : "Save failed.";
            if (next[code]) next[code] = { ...next[code], saveError: message };
          }
        });
        return next;
      });

      return result;
    },
    [activeLocale, buffers, dirtyLocales, linkageStatuses, testRun],
  );

  const rollbackActiveToRevision = useCallback(
    async (revisionNumber: number) => {
      const targetLocale = activeLocale;
      const current = buffers[targetLocale];
      if (!current?.documentRow) return;
      const snapshot = current.yamlPanel;
      const response = await fetch("/api/resume/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: targetLocale, documentId: current.documentRow.id, revisionNumber }),
      });
      const payload = (await response.json()) as ApiDocumentResponse;
      if (!response.ok || payload.error || !payload.document) {
        throw new Error(payload.error || "Rollback failed.");
      }
      const { buffer } = buildBuffer(targetLocale, payload.document, payload.revisions || [], actor?.displayName || "");
      // Don't clobber edits made to this locale while the rollback request was in flight.
      patchBuffer(targetLocale, (existing) => (existing.yamlPanel === snapshot ? buffer : {}));
    },
    [activeLocale, buffers, actor?.displayName, patchBuffer],
  );

  /**
   * Reads a past revision's snapshot for preview only — it never touches the
   * active buffer, so viewing history cannot disturb unsaved edits.
   */
  const loadRevisionSnapshot = useCallback(
    async (revisionNumber: number): Promise<{ resume: ResumeDocument; yamlContent: string }> => {
      const current = buffers[activeLocale];
      if (!current?.documentRow) {
        throw new Error("This language version has no saved document yet.");
      }
      const query = new URLSearchParams({
        documentId: current.documentRow.id,
        revisionNumber: String(revisionNumber),
      });
      const response = await fetch(`/api/resume/revisions?${query.toString()}`);
      const payload = (await response.json()) as { error?: string; yamlContent?: string };
      if (!response.ok || payload.error || typeof payload.yamlContent !== "string") {
        throw new Error(payload.error || "Revision load failed.");
      }
      return {
        resume: parseYamlToResumeDocument(payload.yamlContent, actor?.displayName ?? ""),
        yamlContent: payload.yamlContent,
      };
    },
    [activeLocale, buffers, actor?.displayName],
  );

  const saveLanguageVersion = useCallback(
    async (input: { code: string; label: string; shortLabel: string }, editingCode: ResumeLocale | null) => {
      if (testRun) throw new Error("Test languages are isolated.");
      const response = await fetch("/api/resume/languages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: input.code, label: input.label, shortLabel: input.shortLabel, createDocument: true }),
      });
      const payload = (await response.json()) as ApiLanguagePostResponse;
      if (!response.ok || payload.error || !payload.language) {
        throw new Error(payload.error || "Language version save failed.");
      }

      const language = payload.language;
      setLanguageOptions((prev) => {
        const exists = prev.some((existing) => existing.code === language.code);
        const next = exists ? prev.map((existing) => (existing.code === language.code ? language : existing)) : [...prev, language];
        return sortLanguageRows(next);
      });

      // Editing only touches label/short-label metadata — never overwrite an
      // already-loaded, possibly-edited buffer with the server's unchanged document.
      if (!editingCode) {
        const { buffer } = buildBuffer(language.code, payload.document ?? null, payload.revisions || [], actor?.displayName || "");
        setBuffers((prev) => ({ ...prev, [language.code]: buffer }));
        setActiveLocale(language.code);
      }
    },
    [actor?.displayName, testRun],
  );

  const setDefaultLanguage = useCallback(async (code: ResumeLocale) => {
    if (testRun) { setDefaultLocale(code); return; }
    const response = await fetch("/api/resume/languages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, setDefault: true }),
    });
    const payload = (await response.json()) as { error?: string; defaultLocale?: ResumeLocale };
    if (!response.ok || payload.error) {
      throw new Error(payload.error || "Default language update failed.");
    }
    const nextDefault = payload.defaultLocale || code;
    setDefaultLocale(nextDefault);
    setLanguageOptions((prev) => prev.map((language) => ({ ...language, is_default: language.code === nextDefault })));
  }, [testRun]);

  const deleteLanguageVersion = useCallback(async (code: ResumeLocale) => {
    const response = await fetch("/api/resume/languages", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const payload = (await response.json()) as { error?: string; defaultLocale?: ResumeLocale };
    if (!response.ok || payload.error) {
      throw new Error(payload.error || "Language version delete failed.");
    }

    const nextDefault = payload.defaultLocale;
    setLanguageOptions((prev) => {
      const remaining = prev.filter((language) => language.code !== code);
      return nextDefault ? remaining.map((language) => ({ ...language, is_default: language.code === nextDefault })) : remaining;
    });
    setBuffers((prev) => {
      const next = { ...prev };
      delete next[code];
      return next;
    });
    if (nextDefault) setDefaultLocale(nextDefault);
    setActiveLocale((current) => (current === code ? nextDefault || current : current));
  }, []);

  return {
    actor,
    languageOptions,
    defaultLocale,
    activeLocale,
    buffers,
    isLoadingAll,
    loadError,
    loadNotice,
    dirtyLocales,
    errorLocales,
    linkageStatuses,
    isAnyDirty,
    setActiveLocale,
    updateActiveYaml,
    updateActiveResume,
    setActiveCvStyle,
    resetActiveToTemplate,
    saveAllDirty,
    rollbackActiveToRevision,
    loadRevisionSnapshot,
    saveLanguageVersion,
    setDefaultLanguage,
    deleteLanguageVersion,
  };
}
