import type { ResumeLocale, ResumeRevisionItem } from "./resume-schema";
import { normalizeLocale } from "./resume-schema";
import { callRpc, insertTable, queryTable, updateTable } from "./supabase-http";

type ResumeDocumentRow = {
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

function yamlText(value: string): string {
  return JSON.stringify(value ?? "");
}

export function buildDefaultResumeYaml(name: string): string {
  const safeName = String(name || "New User").trim() || "New User";
  return [
    `brand_initials: ${yamlText("")}`,
    `name: ${yamlText(safeName)}`,
    `role: ${yamlText("")}`,
    `summary: ${yamlText("")}`,
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
