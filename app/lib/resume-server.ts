import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { ResumeLocale, ResumeRevisionItem } from "./resume-schema";
import { normalizeLocale } from "./resume-schema";
import { callRpc, deleteTable, insertTable, queryTable, updateTable } from "./supabase-http";

export type ResumeDocumentRow = {
  id: string;
  user_id: string;
  locale: ResumeLocale;
  title: string;
  yaml_content: string;
  schema_version: number;
  is_public: boolean;
  allow_indexing: boolean;
  updated_at: string;
};

type ResumeRevisionRow = {
  id: string;
  revision_number: number;
  change_note: string | null;
  created_at: string;
  created_by: string | null;
};

export type ResumeDocumentPayload = {
  document: ResumeDocumentRow;
  revisions: ResumeRevisionItem[];
};

export type ResumePresetSelection = {
  summary: number[];
  experience: number[];
  education: number[];
  courses: number[];
  skills: number[];
  interests: number[];
  languages: number[];
  tech_stack: number[];
};

export type ResumePresetRow = {
  id: string;
  document_id: string;
  user_id: string;
  title: string;
  selection: ResumePresetSelection;
  is_public: boolean;
  allow_indexing: boolean;
  slug: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const EMPTY_PRESET_SELECTION: ResumePresetSelection = {
  summary: [],
  experience: [],
  education: [],
  courses: [],
  skills: [],
  interests: [],
  languages: [],
  tech_stack: [],
};

const PRESET_SELECTION_KEYS = Object.keys(EMPTY_PRESET_SELECTION) as Array<keyof ResumePresetSelection>;

function yamlText(value: string): string {
  return JSON.stringify(value ?? "");
}

function readResumeTemplateYaml(): string | null {
  try {
    return fs.readFileSync(path.join(process.cwd(), "public", "data", "private", "resume-en-template.yaml"), "utf8");
  } catch {
    return null;
  }
}

export function buildDefaultResumeYaml(name: string): string {
  const templateYaml = readResumeTemplateYaml();
  if (templateYaml) {
    return templateYaml;
  }

  const safeName = String(name || "New User").trim() || "New User";
  return [
    `brand_initials: ${yamlText("")}`,
    `name: ${yamlText(safeName)}`,
    `role: ${yamlText("")}`,
    "summary:",
    `  - position: ${yamlText("")}`,
    `    description: ${yamlText("")}`,
    "    default: true",
    "contact: []",
    "qr_codes: []",
    "skills: []",
    "tech_stack: []",
    "languages: []",
    "interests: []",
    "experience: []",
    "education: []",
    "courses: []",
  ].join("\n");
}

async function fetchDocumentByLocale(
  accessToken: string,
  userId: string,
  locale: ResumeLocale,
): Promise<ResumeDocumentRow | null> {
  const result = await queryTable<ResumeDocumentRow>({
    table: "resume_documents",
    select: "id,user_id,locale,title,yaml_content,schema_version,is_public,allow_indexing,updated_at",
    accessToken,
    query: `user_id=eq.${encodeURIComponent(userId)}&locale=eq.${encodeURIComponent(locale)}&limit=1`,
  });

  if (!result.data || result.error) {
    return null;
  }
  return result.data[0] || null;
}

async function fetchRevisions(accessToken: string, documentId: string): Promise<ResumeRevisionItem[]> {
  const revisions = await queryTable<ResumeRevisionRow>({
    table: "resume_revisions",
    select: "id,revision_number,change_note,created_at,created_by",
    accessToken,
    query: `document_id=eq.${encodeURIComponent(documentId)}&order=revision_number.desc&limit=40`,
  });

  if (!revisions.data || revisions.error) {
    return [];
  }

  return revisions.data.map((row) => ({
    id: row.id,
    revision_number: Number(row.revision_number),
    change_note: row.change_note,
    created_at: row.created_at,
    created_by: row.created_by,
  }));
}

export async function fetchResumeDocumentsForUser(userId: string): Promise<ResumeDocumentRow[]> {
  const result = await queryTable<ResumeDocumentRow>({
    table: "resume_documents",
    select: "id,user_id,locale,title,yaml_content,schema_version,is_public,allow_indexing,updated_at",
    useServiceRole: true,
    query: `user_id=eq.${encodeURIComponent(userId)}&order=updated_at.desc`,
  });

  if (!result.data || result.error) {
    return [];
  }

  return result.data;
}

function normalizeIndexList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => Number.parseInt(String(item), 10))
        .filter((item) => Number.isInteger(item) && item >= 0),
    ),
  ).sort((left, right) => left - right);
}

export function normalizeResumePresetSelection(value: unknown): ResumePresetSelection {
  const source = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return PRESET_SELECTION_KEYS.reduce<ResumePresetSelection>(
    (selection, key) => ({
      ...selection,
      [key]: normalizeIndexList(source[key]),
    }),
    { ...EMPTY_PRESET_SELECTION },
  );
}

export function validateResumePresetSelection(selection: ResumePresetSelection): string[] {
  const errors: string[] = [];
  if (selection.summary.length !== 1) {
    errors.push("Preset must include exactly one summary.");
  }
  return errors;
}

export async function fetchResumePresetsForUser(userId: string): Promise<ResumePresetRow[]> {
  const result = await queryTable<ResumePresetRow>({
    table: "resume_presets",
    select: "id,document_id,user_id,title,selection,is_public,allow_indexing,slug,published_at,created_at,updated_at",
    useServiceRole: true,
    query: `user_id=eq.${encodeURIComponent(userId)}&order=updated_at.desc`,
  });

  if (!result.data || result.error) {
    return [];
  }

  return result.data.map((preset) => ({
    ...preset,
    selection: normalizeResumePresetSelection(preset.selection),
  }));
}

async function fetchDocumentById(accessToken: string, documentId: string, userId: string): Promise<ResumeDocumentRow | null> {
  const result = await queryTable<ResumeDocumentRow>({
    table: "resume_documents",
    select: "id,user_id,locale,title,yaml_content,schema_version,is_public,allow_indexing,updated_at",
    accessToken,
    query: `id=eq.${encodeURIComponent(documentId)}&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
  });

  if (!result.data || result.error) {
    return null;
  }
  return result.data[0] || null;
}

export async function saveResumePreset(
  accessToken: string,
  userId: string,
  payload: {
    presetId?: string;
    documentId: string;
    title: string;
    selection: ResumePresetSelection;
    isPublic?: boolean;
    allowIndexing?: boolean;
  },
): Promise<ResumePresetRow | null> {
  const document = await fetchDocumentById(accessToken, payload.documentId, userId);
  if (!document) {
    return null;
  }

  const errors = validateResumePresetSelection(payload.selection);
  if (errors.length > 0) {
    return null;
  }

  const title = payload.title.trim() || "Untitled preset";
  const values = {
    document_id: document.id,
    user_id: userId,
    title,
    selection: payload.selection as unknown as Record<string, unknown>,
    is_public: Boolean(payload.isPublic),
    allow_indexing: Boolean(payload.allowIndexing),
  };

  const result = payload.presetId
    ? await updateTable({
        table: "resume_presets",
        accessToken,
        query: `id=eq.${encodeURIComponent(payload.presetId)}&user_id=eq.${encodeURIComponent(userId)}`,
        values: {
          ...values,
          updated_at: new Date().toISOString(),
        },
      })
    : await insertTable({
        table: "resume_presets",
        accessToken,
        values,
      });

  if (!result.data || result.error) {
    return null;
  }

  const row = result.data[0] as unknown as ResumePresetRow;
  return {
    ...row,
    selection: normalizeResumePresetSelection(row.selection),
  };
}

export async function publishResumePreset(
  accessToken: string,
  userId: string,
  presetId: string,
  payload: {
    allowIndexing: boolean;
  },
): Promise<ResumePresetRow | null> {
  const slug = `p-${randomUUID().replace(/-/g, "").slice(0, 14)}`;
  const result = await updateTable({
    table: "resume_presets",
    accessToken,
    query: `id=eq.${encodeURIComponent(presetId)}&user_id=eq.${encodeURIComponent(userId)}`,
    values: {
      is_public: true,
      allow_indexing: payload.allowIndexing,
      slug,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });

  if (!result.data || result.error) {
    return null;
  }

  const row = result.data[0] as unknown as ResumePresetRow;
  return {
    ...row,
    selection: normalizeResumePresetSelection(row.selection),
  };
}

export async function deleteResumePreset(accessToken: string, userId: string, presetId: string): Promise<boolean> {
  const result = await deleteTable({
    table: "resume_presets",
    accessToken,
    query: `id=eq.${encodeURIComponent(presetId)}&user_id=eq.${encodeURIComponent(userId)}`,
  });

  return Boolean(result.data?.length) && !result.error;
}

export async function ensureResumeDocument(
  accessToken: string,
  userId: string,
  localeInput: string,
  fallbackName: string,
): Promise<ResumeDocumentPayload | null> {
  const locale = normalizeLocale(localeInput);
  let document = await fetchDocumentByLocale(accessToken, userId, locale);

  if (!document) {
    const insertResult = await insertTable({
      table: "resume_documents",
      accessToken,
      values: {
        user_id: userId,
        locale,
        title: "Master resume",
        yaml_content: buildDefaultResumeYaml(fallbackName),
        schema_version: 1,
        is_public: true,
        allow_indexing: false,
        created_by: userId,
      },
    });

    if (!insertResult.data || insertResult.error) {
      return null;
    }

    document = insertResult.data[0] as unknown as ResumeDocumentRow;
    await callRpc<number>({
      functionName: "create_resume_revision",
      payload: {
        input_document_id: document.id,
        input_change_note: "Initial seed",
      },
      accessToken,
    });
  }

  const revisions = await fetchRevisions(accessToken, document.id);
  return {
    document,
    revisions,
  };
}

export async function publishResumeDocument(
  accessToken: string,
  userId: string,
  localeInput: string,
  payload: {
    yamlContent: string;
    title: string;
    isPublic: boolean;
    allowIndexing: boolean;
    changeNote: string;
  },
): Promise<ResumeDocumentPayload | null> {
  const locale = normalizeLocale(localeInput);
  let document = await fetchDocumentByLocale(accessToken, userId, locale);

  const title = payload.title.trim() || "Master resume";
  if (!document) {
    const insertResult = await insertTable({
      table: "resume_documents",
      accessToken,
      values: {
        user_id: userId,
        locale,
        title,
        yaml_content: payload.yamlContent,
        schema_version: 1,
        is_public: payload.isPublic,
        allow_indexing: payload.allowIndexing,
        created_by: userId,
      },
    });
    if (!insertResult.data || insertResult.error) {
      return null;
    }
    document = insertResult.data[0] as unknown as ResumeDocumentRow;
  } else {
    const updateResult = await updateTable({
      table: "resume_documents",
      accessToken,
      query: `id=eq.${encodeURIComponent(document.id)}`,
      values: {
        title,
        yaml_content: payload.yamlContent,
        is_public: payload.isPublic,
        allow_indexing: payload.allowIndexing,
        updated_at: new Date().toISOString(),
      },
    });
    if (!updateResult.data || updateResult.error) {
      return null;
    }
    document = updateResult.data[0] as unknown as ResumeDocumentRow;
  }

  const revisionResult = await callRpc<number>({
    functionName: "create_resume_revision",
    payload: {
      input_document_id: document.id,
      input_change_note: payload.changeNote || "Publish",
    },
    accessToken,
  });
  if (revisionResult.error || !revisionResult.data) {
    return null;
  }

  const revisions = await fetchRevisions(accessToken, document.id);
  return {
    document,
    revisions,
  };
}

export async function saveResumeDraftDocument(
  accessToken: string,
  userId: string,
  localeInput: string,
  payload: {
    yamlContent: string;
    title: string;
    isPublic: boolean;
    allowIndexing: boolean;
  },
): Promise<ResumeDocumentPayload | null> {
  const locale = normalizeLocale(localeInput);
  let document = await fetchDocumentByLocale(accessToken, userId, locale);

  const title = payload.title.trim() || "Master resume draft";
  if (!document) {
    const insertResult = await insertTable({
      table: "resume_documents",
      accessToken,
      values: {
        user_id: userId,
        locale,
        title,
        yaml_content: payload.yamlContent,
        schema_version: 1,
        is_public: payload.isPublic,
        allow_indexing: payload.allowIndexing,
        created_by: userId,
      },
    });
    if (!insertResult.data || insertResult.error) {
      return null;
    }
    document = insertResult.data[0] as unknown as ResumeDocumentRow;
  } else {
    const updateResult = await updateTable({
      table: "resume_documents",
      accessToken,
      query: `id=eq.${encodeURIComponent(document.id)}`,
      values: {
        title,
        yaml_content: payload.yamlContent,
        is_public: payload.isPublic,
        allow_indexing: payload.allowIndexing,
        updated_at: new Date().toISOString(),
      },
    });
    if (!updateResult.data || updateResult.error) {
      return null;
    }
    document = updateResult.data[0] as unknown as ResumeDocumentRow;
  }

  const revisions = await fetchRevisions(accessToken, document.id);
  return {
    document,
    revisions,
  };
}

export async function rollbackResumeDocument(
  accessToken: string,
  userId: string,
  localeInput: string,
  documentId: string,
  revisionNumber: number,
): Promise<ResumeDocumentPayload | null> {
  const rollbackResult = await callRpc<string>({
    functionName: "rollback_resume_document",
    payload: {
      input_document_id: documentId,
      input_revision_number: revisionNumber,
      input_change_note: `Rollback to revision ${revisionNumber}`,
    },
    accessToken,
  });
  if (rollbackResult.error || !rollbackResult.data) {
    return null;
  }

  const locale = normalizeLocale(localeInput);
  const document = await fetchDocumentByLocale(accessToken, userId, locale);
  if (!document) {
    return null;
  }

  const revisions = await fetchRevisions(accessToken, document.id);
  return {
    document,
    revisions,
  };
}
