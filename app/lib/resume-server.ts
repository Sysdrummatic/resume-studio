import fs from "node:fs";
import path from "node:path";
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
  canonical_public_path?: string | null;
  compatibility_public_path?: string | null;
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

type ResumePublishedCvRow = {
  id: string;
  user_id: string;
  preset_id: string | null;
  source_document_id: string | null;
  title: string;
  schema_version: number;
  open_cv_yaml_contract_version: string;
  default_locale: ResumeLocale;
  published_locales: ResumeLocale[];
  available_locales: ResumeLocale[];
  selection: ResumePresetSelection;
  allow_indexing: boolean;
  published_at: string;
  created_by: string | null;
  created_at: string;
  snapshot_metadata: Record<string, unknown>;
};

type ResumePublishedCvLocaleRow = {
  id: string;
  published_cv_id: string;
  user_id: string;
  locale: ResumeLocale;
  source_document_id: string | null;
  source_revision_id: string | null;
  source_variant_id: string | null;
  title: string;
  yaml_content: string;
  schema_version: number;
  selection: ResumePresetSelection;
  labels: Record<string, unknown>;
  render_data: Record<string, unknown> | null;
  ai_generated: boolean;
  created_at: string;
};

type ResumePublicLinkRow = {
  id: string;
  document_id: string | null;
  user_id: string | null;
  preset_id: string | null;
  slug: string | null;
  person_slug: string | null;
  public_id: string | null;
  active_published_cv_id: string | null;
  default_locale: ResumeLocale | null;
  available_locales: ResumeLocale[];
  is_active: boolean;
  status: "active" | "revoked";
  allow_indexing: boolean;
  published_at: string | null;
  revoked_at: string | null;
  legacy_slug: string | null;
  updated_at: string;
};

export type PublicSitemapLink = {
  personSlug: string;
  publicId: string;
  defaultLocale: ResumeLocale;
  availableLocales: ResumeLocale[];
  updatedAt: string;
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

export type PublishedResumePublicRoute = {
  published: PublishedResumePreset;
  personSlug: string;
  publicId: string;
  allowIndexing: boolean;
  defaultLocale: ResumeLocale;
  availableLocales: ResumeLocale[];
  legacySlug: string | null;
};

export type PublishedResumeExport = {
  personSlug: string;
  publicId: string;
  locale: ResumeLocale;
  defaultLocale: ResumeLocale;
  availableLocales: ResumeLocale[];
  allowIndexing: boolean;
  schemaVersion: number;
  openCvYamlContractVersion: string;
  yamlContent: string;
  canonicalPath: string;
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
const RESUME_PUBLISHED_CV_SELECT =
  "id,user_id,preset_id,source_document_id,title,schema_version,open_cv_yaml_contract_version,default_locale,published_locales,available_locales,selection,allow_indexing,published_at,created_by,created_at,snapshot_metadata";
const RESUME_PUBLISHED_CV_LOCALE_SELECT =
  "id,published_cv_id,user_id,locale,source_document_id,source_revision_id,source_variant_id,title,yaml_content,schema_version,selection,labels,render_data,ai_generated,created_at";
const RESUME_PUBLIC_LINK_SELECT =
  "id,document_id,user_id,preset_id,slug,person_slug,public_id,active_published_cv_id,default_locale,available_locales,is_active,status,allow_indexing,published_at,revoked_at,legacy_slug,updated_at";
const OPEN_CV_PUBLIC_CONTRACT_MAJOR = "1";
const OPEN_CV_MIN_SCHEMA_VERSION = 1;

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

function isSupportedOpenCvContractVersion(version: unknown): boolean {
  const normalized = String(version || "").trim();
  return normalized === OPEN_CV_PUBLIC_CONTRACT_MAJOR || normalized.startsWith(`${OPEN_CV_PUBLIC_CONTRACT_MAJOR}.`);
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

  const presetIds = result.data.map((preset) => preset.id);
  const linksResult =
    presetIds.length > 0
      ? await queryTable<ResumePublicLinkRow>({
          table: "resume_public_links",
          select: RESUME_PUBLIC_LINK_SELECT,
          useServiceRole: true,
          query:
            `user_id=eq.${encodeURIComponent(userId)}` +
            `&preset_id=in.(${presetIds.map((id) => `"${id}"`).join(",")})` +
            "&status=eq.active&is_active=eq.true&order=updated_at.desc",
        })
      : { data: [], error: null, status: 200 };
  const linkByPresetId = new Map<string, ResumePublicLinkRow>();
  if (linksResult.data && !linksResult.error) {
    for (const link of linksResult.data) {
      if (link.preset_id && !linkByPresetId.has(link.preset_id)) {
        linkByPresetId.set(link.preset_id, link);
      }
    }
  }

  return result.data.map((preset) => {
    const link = linkByPresetId.get(preset.id);
    const canonicalPublicPath =
      link?.person_slug && link?.public_id ? `/${encodeURIComponent(link.person_slug)}/${encodeURIComponent(link.public_id)}` : null;
    const compatibilityPublicPath = link?.legacy_slug || preset.slug ? `/r/${encodeURIComponent(link?.legacy_slug || preset.slug || "")}` : null;
    return {
      ...preset,
      selection: normalizeResumePresetSelection(preset.selection),
      canonical_public_path: canonicalPublicPath,
      compatibility_public_path: compatibilityPublicPath,
    };
  });
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

function buildCanonicalPublicLanguageHref(personSlug: string, publicId: string, locale: ResumeLocale, defaultLocale: ResumeLocale): string {
  const basePath = `/${encodeURIComponent(personSlug)}/${encodeURIComponent(publicId)}`;
  return locale === defaultLocale ? basePath : `${basePath}?lang=${encodeURIComponent(locale)}`;
}

async function fetchLegacyPublishedResumePresetFromRow(
  normalizedSlug: string,
  preset: ResumePresetRow,
  localeInput?: string,
): Promise<PublishedResumePreset | null> {
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

async function fetchActivePublicLinkBySlug(normalizedSlug: string): Promise<ResumePublicLinkRow | null> {
  const slugResult = await queryTable<ResumePublicLinkRow>({
    table: "resume_public_links",
    select: RESUME_PUBLIC_LINK_SELECT,
    useServiceRole: true,
    query:
      `slug=eq.${encodeURIComponent(normalizedSlug)}` +
      "&is_active=eq.true&status=eq.active&order=updated_at.desc&limit=1",
  });
  const slugLink = slugResult.data?.[0];
  if (slugLink && !slugResult.error) {
    return slugLink;
  }

  const legacySlugResult = await queryTable<ResumePublicLinkRow>({
    table: "resume_public_links",
    select: RESUME_PUBLIC_LINK_SELECT,
    useServiceRole: true,
    query:
      `legacy_slug=eq.${encodeURIComponent(normalizedSlug)}` +
      "&is_active=eq.true&status=eq.active&order=updated_at.desc&limit=1",
  });
  if (!legacySlugResult.data || legacySlugResult.error) {
    return null;
  }
  return legacySlugResult.data[0] || null;
}

export async function fetchCanonicalPublicPathBySlug(slug: string, localeInput?: string): Promise<string | null> {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) {
    return null;
  }

  const link = await fetchActivePublicLinkBySlug(normalizedSlug);
  if (!link?.person_slug || !link?.public_id) {
    return null;
  }

  const defaultLocale = normalizeLocale(link.default_locale || "en");
  const requestedLocale = localeInput ? normalizeLocale(localeInput) : defaultLocale;
  const basePath = `/${encodeURIComponent(link.person_slug)}/${encodeURIComponent(link.public_id)}`;
  return requestedLocale === defaultLocale ? basePath : `${basePath}?lang=${encodeURIComponent(requestedLocale)}`;
}

export function trackLegacyPublicRouteEvent(input: {
  slug: string;
  requestedLocale?: string;
  outcome: "redirected" | "resolved_legacy" | "not_found";
}): void {
  const slug = String(input.slug || "").trim();
  if (!slug) {
    return;
  }
  const payload = {
    route: "/r/[slug]",
    slug,
    requestedLocale: input.requestedLocale || null,
    outcome: input.outcome,
    timestamp: new Date().toISOString(),
  };
  console.info("[public-route-compat]", JSON.stringify(payload));
}

async function fetchActivePublicLinkByPersonAndPublicId(
  personSlug: string,
  publicId: string,
): Promise<ResumePublicLinkRow | null> {
  const result = await queryTable<ResumePublicLinkRow>({
    table: "resume_public_links",
    select: RESUME_PUBLIC_LINK_SELECT,
    useServiceRole: true,
    query:
      `person_slug=eq.${encodeURIComponent(personSlug)}` +
      `&public_id=eq.${encodeURIComponent(publicId)}` +
      "&is_active=eq.true&status=eq.active&order=updated_at.desc&limit=1",
  });
  if (!result.data || result.error) {
    return null;
  }
  return result.data[0] || null;
}

function publishedLocaleToDocument(
  row: ResumePublishedCvLocaleRow,
  link: ResumePublicLinkRow,
  snapshot: ResumePublishedCvRow,
): ResumeDocumentRow {
  return {
    id: row.source_document_id || row.id,
    user_id: row.user_id,
    locale: normalizeLocale(row.locale),
    title: row.title || snapshot.title,
    yaml_content: row.yaml_content,
    schema_version: Number(row.schema_version) || Number(snapshot.schema_version) || 1,
    is_public: true,
    allow_indexing: Boolean(link.allow_indexing),
    ai_generated: Boolean(row.ai_generated),
    updated_at: row.created_at || snapshot.published_at,
  };
}

function buildPublishedSnapshotPreset(
  link: ResumePublicLinkRow,
  snapshot: ResumePublishedCvRow,
  localeRow: ResumePublishedCvLocaleRow,
  defaultLocale: ResumeLocale,
  normalizedSlug: string,
): ResumePresetRow {
  return {
    id: snapshot.preset_id || link.preset_id || snapshot.id,
    document_id: localeRow.source_document_id || snapshot.source_document_id || link.document_id || "",
    user_id: snapshot.user_id,
    title: snapshot.title,
    selection: normalizeResumePresetSelection(localeRow.selection || snapshot.selection),
    is_public: true,
    allow_indexing: Boolean(link.allow_indexing),
    ai_generated: Boolean(localeRow.ai_generated || snapshot.snapshot_metadata?.ai_generated),
    default_locale: defaultLocale,
    slug: link.slug || link.legacy_slug || normalizedSlug,
    published_at: snapshot.published_at,
    created_at: snapshot.created_at,
    updated_at: link.updated_at || snapshot.published_at,
  };
}

async function fetchSnapshotPublishedResumePresetBySlug(
  normalizedSlug: string,
  localeInput?: string,
): Promise<{ foundSnapshotLink: boolean; published: PublishedResumePreset | null }> {
  const link = await fetchActivePublicLinkBySlug(normalizedSlug);
  if (!link?.active_published_cv_id || link.revoked_at || !link.user_id) {
    return { foundSnapshotLink: false, published: null };
  }

  const snapshotResult = await queryTable<ResumePublishedCvRow>({
    table: "resume_published_cvs",
    select: RESUME_PUBLISHED_CV_SELECT,
    useServiceRole: true,
    query:
      `id=eq.${encodeURIComponent(link.active_published_cv_id)}` +
      `&user_id=eq.${encodeURIComponent(link.user_id)}` +
      "&limit=1",
  });
  const snapshot = snapshotResult.data?.[0];
  if (!snapshot || snapshotResult.error) {
    return { foundSnapshotLink: true, published: null };
  }
  if (!isSupportedOpenCvContractVersion(snapshot.open_cv_yaml_contract_version)) {
    return { foundSnapshotLink: true, published: null };
  }
  if (Number(snapshot.schema_version) < OPEN_CV_MIN_SCHEMA_VERSION) {
    return { foundSnapshotLink: true, published: null };
  }

  const defaultLocale = normalizeLocale(link.default_locale || snapshot.default_locale);
  const requestedLocale = localeInput ? normalizeLocale(localeInput) : defaultLocale;
  const linkLocales = normalizeLocales(link.available_locales || [], defaultLocale);
  const snapshotLocales = normalizeLocales(snapshot.available_locales || [], defaultLocale);
  const allowedLocales = new Set(linkLocales.filter((locale) => snapshotLocales.includes(locale)));
  if (allowedLocales.size === 0) {
    return { foundSnapshotLink: true, published: null };
  }

  const localesResult = await queryTable<ResumePublishedCvLocaleRow>({
    table: "resume_published_cv_locales",
    select: RESUME_PUBLISHED_CV_LOCALE_SELECT,
    useServiceRole: true,
    query:
      `published_cv_id=eq.${encodeURIComponent(snapshot.id)}` +
      `&user_id=eq.${encodeURIComponent(snapshot.user_id)}` +
      "&order=locale.asc",
  });
  if (!localesResult.data || localesResult.error) {
    return { foundSnapshotLink: true, published: null };
  }

  const localeRows = localesResult.data
    .map((row) => ({
      ...row,
      locale: normalizeLocale(row.locale),
      selection: normalizeResumePresetSelection(row.selection),
    }))
    .filter((row) => allowedLocales.has(row.locale));
  if (localeRows.length === 0) {
    return { foundSnapshotLink: true, published: null };
  }

  const activeLocaleRow =
    localeRows.find((row) => row.locale === requestedLocale) ||
    localeRows.find((row) => row.locale === defaultLocale) ||
    localeRows[0];
  const activeSelection = normalizeResumePresetSelection(activeLocaleRow.selection || snapshot.selection);
  const resume = buildResumeDocumentFromPreset(activeLocaleRow.yaml_content, activeSelection);
  if (!resume) {
    return { foundSnapshotLink: true, published: null };
  }

  const languageMetadata = await fetchResumeLanguages({ enabledOnly: true });
  const languageLabels = new Map(languageMetadata.map((language) => [language.code, language]));
  const languageSlug = link.legacy_slug || link.slug || normalizedSlug;
  const document = publishedLocaleToDocument(activeLocaleRow, link, snapshot);
  const preset = buildPublishedSnapshotPreset(link, snapshot, activeLocaleRow, defaultLocale, normalizedSlug);

  return {
    foundSnapshotLink: true,
    published: {
      preset,
      document,
      resume,
      languages: localeRows.map((row) => ({
        code: row.locale,
        label: languageLabels.get(row.locale)?.label || getFallbackLanguageLabel(row.locale).label,
        shortLabel: languageLabels.get(row.locale)?.short_label || getFallbackLanguageLabel(row.locale).shortLabel,
        href: buildPublicLanguageHref(languageSlug, row.locale, defaultLocale),
      })),
    },
  };
}

async function fetchPublishedResumeBySnapshotLink(
  link: ResumePublicLinkRow,
  localeInput: string | undefined,
  languageHrefBuilder: (locale: ResumeLocale, defaultLocale: ResumeLocale) => string,
): Promise<PublishedResumePreset | null> {
  if (!link.active_published_cv_id || link.revoked_at || !link.user_id) {
    return null;
  }

  const snapshotResult = await queryTable<ResumePublishedCvRow>({
    table: "resume_published_cvs",
    select: RESUME_PUBLISHED_CV_SELECT,
    useServiceRole: true,
    query:
      `id=eq.${encodeURIComponent(link.active_published_cv_id)}` +
      `&user_id=eq.${encodeURIComponent(link.user_id)}` +
      "&limit=1",
  });
  const snapshot = snapshotResult.data?.[0];
  if (!snapshot || snapshotResult.error) {
    return null;
  }
  if (!isSupportedOpenCvContractVersion(snapshot.open_cv_yaml_contract_version)) {
    return null;
  }
  if (Number(snapshot.schema_version) < OPEN_CV_MIN_SCHEMA_VERSION) {
    return null;
  }

  const defaultLocale = normalizeLocale(link.default_locale || snapshot.default_locale);
  const requestedLocale = localeInput ? normalizeLocale(localeInput) : defaultLocale;
  const linkLocales = normalizeLocales(link.available_locales || [], defaultLocale);
  const snapshotLocales = normalizeLocales(snapshot.available_locales || [], defaultLocale);
  const allowedLocales = new Set(linkLocales.filter((locale) => snapshotLocales.includes(locale)));
  if (allowedLocales.size === 0) {
    return null;
  }

  const localesResult = await queryTable<ResumePublishedCvLocaleRow>({
    table: "resume_published_cv_locales",
    select: RESUME_PUBLISHED_CV_LOCALE_SELECT,
    useServiceRole: true,
    query:
      `published_cv_id=eq.${encodeURIComponent(snapshot.id)}` +
      `&user_id=eq.${encodeURIComponent(snapshot.user_id)}` +
      "&order=locale.asc",
  });
  if (!localesResult.data || localesResult.error) {
    return null;
  }

  const localeRows = localesResult.data
    .map((row) => ({
      ...row,
      locale: normalizeLocale(row.locale),
      selection: normalizeResumePresetSelection(row.selection),
    }))
    .filter((row) => allowedLocales.has(row.locale));
  if (localeRows.length === 0) {
    return null;
  }

  const activeLocaleRow =
    localeRows.find((row) => row.locale === requestedLocale) ||
    localeRows.find((row) => row.locale === defaultLocale) ||
    localeRows[0];
  const activeSelection = normalizeResumePresetSelection(activeLocaleRow.selection || snapshot.selection);
  const resume = buildResumeDocumentFromPreset(activeLocaleRow.yaml_content, activeSelection);
  if (!resume) {
    return null;
  }

  const languageMetadata = await fetchResumeLanguages({ enabledOnly: true });
  const languageLabels = new Map(languageMetadata.map((language) => [language.code, language]));
  const document = publishedLocaleToDocument(activeLocaleRow, link, snapshot);
  const normalizedSlug = link.slug || link.legacy_slug || "";
  const preset = buildPublishedSnapshotPreset(link, snapshot, activeLocaleRow, defaultLocale, normalizedSlug);

  return {
    preset,
    document,
    resume,
    languages: localeRows.map((row) => ({
      code: row.locale,
      label: languageLabels.get(row.locale)?.label || getFallbackLanguageLabel(row.locale).label,
      shortLabel: languageLabels.get(row.locale)?.short_label || getFallbackLanguageLabel(row.locale).shortLabel,
      href: languageHrefBuilder(row.locale, defaultLocale),
    })),
  };
}

export async function fetchPublishedResumePresetBySlug(slug: string, localeInput?: string): Promise<PublishedResumePreset | null> {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) {
    return null;
  }

  const snapshotResult = await fetchSnapshotPublishedResumePresetBySlug(normalizedSlug, localeInput);
  if (snapshotResult.published || snapshotResult.foundSnapshotLink) {
    return snapshotResult.published;
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

  return fetchLegacyPublishedResumePresetFromRow(normalizedSlug, preset, localeInput);
}

export async function fetchPublishedResumePresetByPublicLink(
  personSlugInput: string,
  publicIdInput: string,
  localeInput?: string,
): Promise<PublishedResumePublicRoute | null> {
  const personSlug = personSlugInput.trim().toLowerCase();
  const publicId = publicIdInput.trim().toLowerCase();
  if (!personSlug || !publicId) {
    return null;
  }

  const link = await fetchActivePublicLinkByPersonAndPublicId(personSlug, publicId);
  if (!link || !link.person_slug || !link.public_id) {
    return null;
  }

  const published = await fetchPublishedResumeBySnapshotLink(link, localeInput, (locale, defaultLocale) =>
    buildCanonicalPublicLanguageHref(link.person_slug || personSlug, link.public_id || publicId, locale, defaultLocale),
  );
  if (!published) {
    return null;
  }

  return {
    published,
    personSlug: link.person_slug || personSlug,
    publicId: link.public_id || publicId,
    allowIndexing: Boolean(link.allow_indexing),
    defaultLocale: normalizeLocale(link.default_locale || published.document.locale),
    availableLocales: normalizeLocales(link.available_locales || [], normalizeLocale(link.default_locale || published.document.locale)),
    legacySlug: link.legacy_slug || link.slug || null,
  };
}

export async function fetchPublishedResumeExportByPublicLink(
  personSlugInput: string,
  publicIdInput: string,
  localeInput?: string,
): Promise<PublishedResumeExport | null> {
  const personSlug = personSlugInput.trim().toLowerCase();
  const publicId = publicIdInput.trim().toLowerCase();
  if (!personSlug || !publicId) {
    return null;
  }

  const link = await fetchActivePublicLinkByPersonAndPublicId(personSlug, publicId);
  if (!link || !link.person_slug || !link.public_id || !link.active_published_cv_id || !link.user_id || link.revoked_at) {
    return null;
  }

  const snapshotResult = await queryTable<ResumePublishedCvRow>({
    table: "resume_published_cvs",
    select: RESUME_PUBLISHED_CV_SELECT,
    useServiceRole: true,
    query:
      `id=eq.${encodeURIComponent(link.active_published_cv_id)}` +
      `&user_id=eq.${encodeURIComponent(link.user_id)}` +
      "&limit=1",
  });
  const snapshot = snapshotResult.data?.[0];
  if (!snapshot || snapshotResult.error) {
    return null;
  }
  if (!isSupportedOpenCvContractVersion(snapshot.open_cv_yaml_contract_version)) {
    return null;
  }
  if (Number(snapshot.schema_version) < OPEN_CV_MIN_SCHEMA_VERSION) {
    return null;
  }

  const defaultLocale = normalizeLocale(link.default_locale || snapshot.default_locale);
  const requestedLocale = localeInput ? normalizeLocale(localeInput) : defaultLocale;
  const linkLocales = normalizeLocales(link.available_locales || [], defaultLocale);
  const snapshotLocales = normalizeLocales(snapshot.available_locales || [], defaultLocale);
  const allowedLocales = new Set(linkLocales.filter((locale) => snapshotLocales.includes(locale)));
  if (allowedLocales.size === 0) {
    return null;
  }

  const localesResult = await queryTable<ResumePublishedCvLocaleRow>({
    table: "resume_published_cv_locales",
    select: RESUME_PUBLISHED_CV_LOCALE_SELECT,
    useServiceRole: true,
    query:
      `published_cv_id=eq.${encodeURIComponent(snapshot.id)}` +
      `&user_id=eq.${encodeURIComponent(snapshot.user_id)}` +
      "&order=locale.asc",
  });
  if (!localesResult.data || localesResult.error) {
    return null;
  }

  const localeRows = localesResult.data
    .map((row) => ({
      ...row,
      locale: normalizeLocale(row.locale),
    }))
    .filter((row) => allowedLocales.has(row.locale));
  if (localeRows.length === 0) {
    return null;
  }

  const activeLocaleRow =
    localeRows.find((row) => row.locale === requestedLocale) ||
    localeRows.find((row) => row.locale === defaultLocale) ||
    localeRows[0];

  return {
    personSlug: link.person_slug,
    publicId: link.public_id,
    locale: activeLocaleRow.locale,
    defaultLocale,
    availableLocales: Array.from(allowedLocales),
    allowIndexing: Boolean(link.allow_indexing),
    schemaVersion: Number(activeLocaleRow.schema_version) || Number(snapshot.schema_version) || 1,
    openCvYamlContractVersion: snapshot.open_cv_yaml_contract_version,
    yamlContent: activeLocaleRow.yaml_content,
    canonicalPath: `/${encodeURIComponent(link.person_slug)}/${encodeURIComponent(link.public_id)}`,
  };
}

export async function fetchIndexablePublicLinksForSitemap(): Promise<PublicSitemapLink[]> {
  const result = await queryTable<ResumePublicLinkRow>({
    table: "resume_public_links",
    select: RESUME_PUBLIC_LINK_SELECT,
    useServiceRole: true,
    query: "is_active=eq.true&status=eq.active&allow_indexing=eq.true&order=updated_at.desc",
  });

  if (!result.data || result.error) {
    return [];
  }

  return result.data
    .filter((link) => Boolean(link.person_slug && link.public_id))
    .map((link) => {
      const defaultLocale = normalizeLocale(link.default_locale || "en");
      return {
        personSlug: String(link.person_slug || "").trim(),
        publicId: String(link.public_id || "").trim(),
        defaultLocale,
        availableLocales: normalizeLocales(link.available_locales || [], defaultLocale),
        updatedAt: link.updated_at,
      };
    });
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

async function fetchResumePresetById(accessToken: string, userId: string, presetId: string): Promise<ResumePresetRow | null> {
  const result = await queryTable<ResumePresetRow>({
    table: "resume_presets",
    select: RESUME_PRESET_SELECT,
    accessToken,
    query: `id=eq.${encodeURIComponent(presetId)}&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
  });
  if (!result.data || result.error || !result.data[0]) {
    return null;
  }
  return {
    ...result.data[0],
    default_locale: normalizeLocale(result.data[0].default_locale),
    selection: normalizeResumePresetSelection(result.data[0].selection),
  };
}

function normalizeLocales(locales: string[], fallbackLocale: ResumeLocale): ResumeLocale[] {
  const normalized = Array.from(new Set(locales.map((locale) => normalizeLocale(locale))));
  return normalized.length > 0 ? normalized : [fallbackLocale];
}

export async function publishResumePreset(
  accessToken: string,
  userId: string,
  presetId: string,
  payload: {
    allowIndexing: boolean;
    aiGenerated?: boolean;
    defaultLocale?: ResumeLocale;
    selectedLocales: ResumeLocale[];
  },
): Promise<ResumePresetRow | null> {
  const existingPreset = await fetchResumePresetById(accessToken, userId, presetId);
  if (!existingPreset) return null;

  const documents = await fetchResumeDocumentsForUser(userId);
  const documentById = new Map(documents.map((document) => [document.id, document]));
  const baseDocument = documentById.get(existingPreset.document_id);
  if (!baseDocument) return null;

  const explicitLocales = Array.from(new Set(payload.selectedLocales.map((locale) => normalizeLocale(locale))));
  if (explicitLocales.length === 0) return null;
  const requestedDefaultLocale = normalizeLocale(payload.defaultLocale || existingPreset.default_locale || baseDocument.locale);
  if (!explicitLocales.includes(requestedDefaultLocale)) return null;

  const rpcResult = await callRpc<string>({
    functionName: "publish_resume_saved_version",
    payload: {
      input_preset_id: existingPreset.id,
      input_allow_indexing: payload.allowIndexing,
      input_ai_generated: Boolean(payload.aiGenerated || existingPreset.ai_generated),
      input_default_locale: requestedDefaultLocale,
      input_selected_locales: explicitLocales,
    },
    accessToken,
  });
  if (rpcResult.error) {
    throw new Error(rpcResult.error.message || "CV Version publish failed.");
  }
  if (!rpcResult.data) return null;


  return fetchResumePresetById(accessToken, userId, presetId);
}

export async function unpublishResumePreset(accessToken: string, userId: string, presetId: string): Promise<ResumePresetRow | null> {
  const preset = await fetchResumePresetById(accessToken, userId, presetId);
  if (!preset) return null;
  const rpcResult = await callRpc<boolean>({
    functionName: "unpublish_resume_saved_version",
    payload: {
      input_preset_id: presetId,
    },
    accessToken,
  });
  if (rpcResult.error || !rpcResult.data) return null;
  return fetchResumePresetById(accessToken, userId, presetId);
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
