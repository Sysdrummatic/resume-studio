import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import yaml from "js-yaml";
import type { ResumeDocument, ResumeLocale, ResumeRevisionItem } from "./resume-schema";
import { PREVIEW_LABELS, normalizeLocale, normalizeResumeDocument } from "./resume-schema";
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
  ai_generated: boolean;
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

export type ResumeLanguageRow = {
  code: ResumeLocale;
  label: string;
  short_label: string;
  labels: Record<string, string>;
  is_enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ResumeLanguageInput = {
  code: string;
  label: string;
  shortLabel?: string;
  labels?: Record<string, string>;
  isEnabled?: boolean;
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
  ai_generated: boolean;
  default_locale: ResumeLocale;
  slug: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ResumePresetVariantRow = {
  id: string;
  preset_id: string;
  document_id: string;
  user_id: string;
  locale: ResumeLocale;
  selection: ResumePresetSelection;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type PublishedResumePreset = {
  preset: ResumePresetRow;
  document: ResumeDocumentRow;
  resume: ResumeDocument;
  languages: Array<{
    code: ResumeLocale;
    label: string;
    shortLabel: string;
    href: string;
  }>;
};

const FALLBACK_LANGUAGE_LABELS: Record<string, { label: string; shortLabel: string }> = {
  en: { label: "English", shortLabel: "EN" },
  pl: { label: "Polski", shortLabel: "PL" },
};

const RESUME_LANGUAGE_SELECT = "code,label,short_label,labels,is_enabled,sort_order,created_at,updated_at";
const RESUME_DOCUMENT_SELECT = "id,user_id,locale,title,yaml_content,schema_version,is_public,allow_indexing,ai_generated,updated_at";
const RESUME_PRESET_SELECT =
  "id,document_id,user_id,title,selection,is_public,allow_indexing,ai_generated,default_locale,slug,published_at,created_at,updated_at";
const RESUME_PRESET_VARIANT_SELECT = "id,preset_id,document_id,user_id,locale,selection,is_default,created_at,updated_at";

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

function normalizeLabelMap(value: unknown): Record<string, string> {
  const source = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return Object.fromEntries(
    Object.entries(source)
      .map(([key, label]) => [key.trim(), typeof label === "string" ? label.trim() : ""])
      .filter(([key, label]) => key && label),
  );
}

function getFallbackLanguageLabel(code: ResumeLocale) {
  return FALLBACK_LANGUAGE_LABELS[code] || {
    label: code.toUpperCase(),
    shortLabel: code.slice(0, 2).toUpperCase(),
  };
}

export function normalizeResumeLanguageInput(input: ResumeLanguageInput): ResumeLanguageInput {
  const code = normalizeLocale(input.code);
  const label = String(input.label || "").trim();
  const shortLabel = String(input.shortLabel || code.toUpperCase())
    .trim()
    .toUpperCase()
    .slice(0, 2);
  const labels = normalizeLabelMap(input.labels);
  return {
    code,
    label,
    shortLabel,
    labels: {
      ...PREVIEW_LABELS.en,
      ...labels,
      language_switcher: labels.language_switcher || "Language",
      public_view_badge: labels.public_view_badge || "Public view",
      private_view_badge: labels.private_view_badge || "Private view",
      draft_view_badge: labels.draft_view_badge || "Draft",
      ai_generated_badge: labels.ai_generated_badge || "AI generated",
    },
    isEnabled: input.isEnabled !== false,
  };
}

export function validateResumeLanguageInput(input: ResumeLanguageInput): string[] {
  const normalized = normalizeResumeLanguageInput(input);
  const errors: string[] = [];
  if (!/^[a-z]{2}$/.test(normalized.code)) {
    errors.push("Language code must be a two-letter ISO code.");
  }
  if (!normalized.label) {
    errors.push("Language name is required.");
  }
  if (!/^[A-Z]{2}$/.test(normalized.shortLabel || "")) {
    errors.push("Short label must contain two uppercase letters.");
  }
  return errors;
}

export async function fetchResumeLanguages(options: { enabledOnly?: boolean } = {}): Promise<ResumeLanguageRow[]> {
  const enabledQuery = options.enabledOnly ? "&is_enabled=eq.true" : "";
  const result = await queryTable<ResumeLanguageRow>({
    table: "resume_languages",
    select: RESUME_LANGUAGE_SELECT,
    useServiceRole: true,
    query: `order=sort_order.asc,code.asc${enabledQuery}`,
  });

  if (!result.data || result.error) {
    return [];
  }

  return result.data.map((language) => ({
    ...language,
    code: normalizeLocale(language.code),
    labels: normalizeLabelMap(language.labels),
    is_enabled: Boolean(language.is_enabled),
    sort_order: Number(language.sort_order) || 100,
  }));
}

export async function upsertResumeLanguage(input: ResumeLanguageInput): Promise<ResumeLanguageRow | null> {
  const normalized = normalizeResumeLanguageInput(input);
  if (validateResumeLanguageInput(normalized).length > 0) {
    return null;
  }

  const existingLanguages = await fetchResumeLanguages();
  const existing = existingLanguages.find((language) => language.code === normalized.code);
  if (existing) {
    return existing;
  }

  const values = {
    code: normalized.code,
    label: normalized.label,
    short_label: normalized.shortLabel,
    labels: normalized.labels as Record<string, unknown>,
    is_enabled: normalized.isEnabled,
    sort_order: (existingLanguages.length + 1) * 10,
    updated_at: new Date().toISOString(),
  };

  const result = await insertTable({
    table: "resume_languages",
    useServiceRole: true,
    values,
  });

  if (!result.data || result.error) {
    return null;
  }

  const row = result.data[0] as unknown as ResumeLanguageRow;
  return {
    ...row,
    code: normalizeLocale(row.code),
    labels: normalizeLabelMap(row.labels),
  };
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
    select: RESUME_DOCUMENT_SELECT,
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
    select: RESUME_DOCUMENT_SELECT,
    useServiceRole: true,
    query: `user_id=eq.${encodeURIComponent(userId)}&order=updated_at.desc`,
  });

  if (!result.data || result.error) {
    return [];
  }

  return result.data;
}

export async function fetchResumeLanguageVersionsForUser(userId: string): Promise<
  Array<
    ResumeLanguageRow & {
      document: ResumeDocumentRow | null;
    }
  >
> {
  const [languages, documents] = await Promise.all([fetchResumeLanguages(), fetchResumeDocumentsForUser(userId)]);
  return languages.map((language) => ({
    ...language,
    document: documents.find((document) => document.locale === language.code) || null,
  }));
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

function selectByIndex<T>(items: T[], indexes: number[]): T[] {
  return indexes.map((index) => items[index]).filter((item): item is T => item !== undefined);
}

export function buildResumeDocumentFromPreset(yamlContent: string, selection: ResumePresetSelection): ResumeDocument | null {
  try {
    const masterDocument = normalizeResumeDocument(yaml.load(yamlContent), "");
    const selectedSummary = selectByIndex(masterDocument.summary, selection.summary).map((summary, index) => ({
      ...summary,
      default: index === 0,
    }));

    return {
      ...masterDocument,
      summary: selectedSummary,
      experience: selectByIndex(masterDocument.experience, selection.experience),
      education: selectByIndex(masterDocument.education, selection.education),
      courses: selectByIndex(masterDocument.courses, selection.courses),
      skills: selectByIndex(masterDocument.skills, selection.skills),
      interests: selectByIndex(masterDocument.interests, selection.interests),
      languages: selectByIndex(masterDocument.languages, selection.languages),
      tech_stack: selectByIndex(masterDocument.tech_stack, selection.tech_stack),
    };
  } catch {
    return null;
  }
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
    select: RESUME_PRESET_SELECT,
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

async function fetchResumePresetVariants(presetId: string): Promise<ResumePresetVariantRow[]> {
  const result = await queryTable<ResumePresetVariantRow>({
    table: "resume_preset_variants",
    select: RESUME_PRESET_VARIANT_SELECT,
    useServiceRole: true,
    query: `preset_id=eq.${encodeURIComponent(presetId)}&order=locale.asc`,
  });

  if (!result.data || result.error) {
    return [];
  }

  return result.data.map((variant) => ({
    ...variant,
    locale: normalizeLocale(variant.locale),
    selection: normalizeResumePresetSelection(variant.selection),
    is_default: Boolean(variant.is_default),
  }));
}

function buildImplicitPresetVariants(
  preset: ResumePresetRow,
  documents: ResumeDocumentRow[],
  storedVariants: ResumePresetVariantRow[],
): ResumePresetVariantRow[] {
  const storedLocales = new Set(storedVariants.map((variant) => variant.locale));
  const now = new Date().toISOString();
  const implicitVariants = documents
    .filter((document) => !storedLocales.has(document.locale))
    .map<ResumePresetVariantRow>((document) => ({
      id: `implicit-${preset.id}-${document.locale}`,
      preset_id: preset.id,
      document_id: document.id,
      user_id: preset.user_id,
      locale: normalizeLocale(document.locale),
      selection: normalizeResumePresetSelection(preset.selection),
      is_default: normalizeLocale(document.locale) === normalizeLocale(preset.default_locale),
      created_at: now,
      updated_at: now,
    }));

  return [...storedVariants, ...implicitVariants].sort((left, right) => left.locale.localeCompare(right.locale));
}

async function upsertResumePresetVariant(
  accessToken: string,
  userId: string,
  preset: ResumePresetRow,
  document: ResumeDocumentRow,
  selection: ResumePresetSelection,
): Promise<void> {
  const locale = normalizeLocale(document.locale);
  const variants = await fetchResumePresetVariants(preset.id);
  const existing = variants.find((variant) => variant.locale === locale);
  const values = {
    preset_id: preset.id,
    document_id: document.id,
    user_id: userId,
    locale,
    selection: selection as unknown as Record<string, unknown>,
    is_default: locale === normalizeLocale(preset.default_locale),
  };

  if (existing) {
    await updateTable({
      table: "resume_preset_variants",
      accessToken,
      query: `id=eq.${encodeURIComponent(existing.id)}&user_id=eq.${encodeURIComponent(userId)}`,
      values: {
        ...values,
        updated_at: new Date().toISOString(),
      },
    });
    return;
  }

  await insertTable({
    table: "resume_preset_variants",
    accessToken,
    values,
  });
}

function buildPublicLanguageHref(slug: string, locale: ResumeLocale, defaultLocale: ResumeLocale): string {
  return locale === defaultLocale ? `/r/${encodeURIComponent(slug)}` : `/r/${encodeURIComponent(slug)}?lang=${encodeURIComponent(locale)}`;
}

export async function fetchPublishedResumePresetBySlug(slug: string, localeInput?: string): Promise<PublishedResumePreset | null> {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) {
    return null;
  }

  const presetResult = await queryTable<ResumePresetRow>({
    table: "resume_presets",
    select: RESUME_PRESET_SELECT,
    useServiceRole: true,
    query: `slug=eq.${encodeURIComponent(normalizedSlug)}&is_public=eq.true&limit=1`,
  });

  const preset = presetResult.data?.[0];
  if (!preset || presetResult.error) {
    return null;
  }

  const documentResult = await queryTable<ResumeDocumentRow>({
    table: "resume_documents",
    select: RESUME_DOCUMENT_SELECT,
    useServiceRole: true,
    query: `id=eq.${encodeURIComponent(preset.document_id)}&limit=1`,
  });

  const document = documentResult.data?.[0];
  if (!document || documentResult.error) {
    return null;
  }

  const defaultLocale = normalizeLocale(preset.default_locale || document.locale);
  const requestedLocale = localeInput ? normalizeLocale(localeInput) : defaultLocale;
  const normalizedPreset: ResumePresetRow = {
    ...preset,
    default_locale: defaultLocale,
    selection: normalizeResumePresetSelection(preset.selection),
  };
  const documentsResult = await queryTable<ResumeDocumentRow>({
    table: "resume_documents",
    select: RESUME_DOCUMENT_SELECT,
    useServiceRole: true,
    query: `user_id=eq.${encodeURIComponent(preset.user_id)}&is_public=eq.true&order=locale.asc`,
  });
  const publicDocuments = documentsResult.data?.length ? documentsResult.data : [document].filter((item) => item.is_public);
  const publicDocumentById = new Map(publicDocuments.map((item) => [item.id, item]));
  const storedVariants = await fetchResumePresetVariants(preset.id);
  const variants = buildImplicitPresetVariants(normalizedPreset, publicDocuments, storedVariants);
  const publicVariants = variants.filter((variant) => publicDocumentById.has(variant.document_id));
  const activeVariant =
    publicVariants.find((variant) => variant.locale === requestedLocale) ||
    publicVariants.find((variant) => variant.locale === defaultLocale) ||
    publicVariants.find((variant) => variant.is_default);
  const languageDocuments = publicVariants.length
    ? publicVariants.map((variant) => publicDocumentById.get(variant.document_id)).filter((item): item is ResumeDocumentRow => Boolean(item))
    : publicDocuments;
  if (languageDocuments.length === 0) {
    return null;
  }
  const activeDocument =
    (activeVariant ? publicDocumentById.get(activeVariant.document_id) : null) ||
    languageDocuments.find((item) => item.locale === requestedLocale) ||
    languageDocuments.find((item) => item.locale === defaultLocale) ||
    document;
  const activeSelection = activeVariant ? activeVariant.selection : normalizeResumePresetSelection(preset.selection);

  const resume = buildResumeDocumentFromPreset(activeDocument.yaml_content, activeSelection);
  if (!resume) {
    return null;
  }

  const languageMetadata = await fetchResumeLanguages({ enabledOnly: true });
  const languageLabels = new Map(languageMetadata.map((language) => [language.code, language]));

  return {
    preset: normalizedPreset,
    document: activeDocument,
    resume,
    languages: languageDocuments.map((item) => ({
      code: item.locale,
      label: languageLabels.get(item.locale)?.label || getFallbackLanguageLabel(item.locale).label,
      shortLabel: languageLabels.get(item.locale)?.short_label || getFallbackLanguageLabel(item.locale).shortLabel,
      href: buildPublicLanguageHref(normalizedSlug, item.locale, defaultLocale),
    })),
  };
}

export async function setDefaultResumeLocaleForUser(accessToken: string, userId: string, localeInput: string): Promise<boolean> {
  const locale = normalizeLocale(localeInput);
  const documents = await fetchResumeDocumentsForUser(userId);
  if (!documents.some((document) => document.locale === locale)) {
    return false;
  }

  const presetsResult = await updateTable({
    table: "resume_presets",
    accessToken,
    query: `user_id=eq.${encodeURIComponent(userId)}`,
    values: {
      default_locale: locale,
      updated_at: new Date().toISOString(),
    },
  });

  const variants = await Promise.all((await fetchResumePresetsForUser(userId)).map((preset) => fetchResumePresetVariants(preset.id)));
  await Promise.all(
    variants.flat().map((variant) =>
      updateTable({
        table: "resume_preset_variants",
        accessToken,
        query: `id=eq.${encodeURIComponent(variant.id)}&user_id=eq.${encodeURIComponent(userId)}`,
        values: {
          is_default: variant.locale === locale,
          updated_at: new Date().toISOString(),
        },
      }),
    ),
  );

  return !presetsResult.error;
}

async function fetchDocumentById(accessToken: string, documentId: string, userId: string): Promise<ResumeDocumentRow | null> {
  const result = await queryTable<ResumeDocumentRow>({
    table: "resume_documents",
    select: RESUME_DOCUMENT_SELECT,
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
    aiGenerated?: boolean;
    defaultLocale?: ResumeLocale;
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
    ai_generated: Boolean(payload.aiGenerated),
    default_locale: normalizeLocale(payload.defaultLocale || document.locale),
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
  const preset = {
    ...row,
    selection: normalizeResumePresetSelection(row.selection),
  };
  await upsertResumePresetVariant(accessToken, userId, preset, document, payload.selection);
  return preset;
}

export async function publishResumePreset(
  accessToken: string,
  userId: string,
  presetId: string,
  payload: {
    allowIndexing: boolean;
    aiGenerated?: boolean;
    defaultLocale?: ResumeLocale;
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
      ai_generated: Boolean(payload.aiGenerated),
      default_locale: normalizeLocale(payload.defaultLocale || "en"),
      slug,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });

  if (!result.data || result.error) {
    return null;
  }

  const row = result.data[0] as unknown as ResumePresetRow;
  const preset = {
    ...row,
    selection: normalizeResumePresetSelection(row.selection),
  };
  const variants = await fetchResumePresetVariants(preset.id);
  await Promise.all(
    variants.map((variant) =>
      updateTable({
        table: "resume_preset_variants",
        accessToken,
        query: `id=eq.${encodeURIComponent(variant.id)}&user_id=eq.${encodeURIComponent(userId)}`,
        values: {
          is_default: variant.locale === preset.default_locale,
          updated_at: new Date().toISOString(),
        },
      }),
    ),
  );
  return preset;
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
        is_public: false,
        allow_indexing: false,
        ai_generated: false,
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
    aiGenerated?: boolean;
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
        ai_generated: Boolean(payload.aiGenerated),
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
        ai_generated: Boolean(payload.aiGenerated),
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
    aiGenerated?: boolean;
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
        ai_generated: Boolean(payload.aiGenerated),
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
        ai_generated: Boolean(payload.aiGenerated),
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
