import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import type { ResumeDocument, ResumeLocale, ResumeRevisionItem } from "./resume-schema";
import { PREVIEW_LABELS, normalizeLocale, normalizeResumeDocument } from "./resume-schema";
import { callRpc, deleteTable, insertTable, queryTable, updateTable } from "./supabase-http";
import { buildCompactPersonSlug, buildProfileDisplayName, normalizeNameSyncMode, splitProfileName } from "./profile-name";
import { clampResumeSelectionToRawDocument, normalizeResumePresetSelection } from "./preset-selection";
import type { ResumePresetSelection } from "./preset-selection";
import { buildPublishedExportContent, buildPublishedResumeDocument } from "./published-export";

export { normalizeResumePresetSelection };
export { buildPublishedExportContent };
export type { ResumePresetSelection };

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

type ProfileIdentityRow = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  person_slug: string | null;
  name_sync_mode: "auto" | "manual" | null;
};

type ResumeUserLocaleRecord = {
  user_id: string;
  locale: ResumeLocale;
  label_override: string | null;
  short_label_override: string | null;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ResumeUserLocaleRow = {
  user_id: string;
  code: ResumeLocale;
  label: string;
  short_label: string;
  labels: Record<string, string>;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  label_override: string | null;
  short_label_override: string | null;
};

export type ResumeUserLocaleVersionRow = ResumeUserLocaleRow & {
  document: ResumeDocumentRow | null;
};

export type ResumeUserLocaleInput = {
  code: string;
  label: string;
  shortLabel?: string;
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
  resume: ResumeDocument;
  canonicalPath: string;
};

const FALLBACK_LANGUAGE_LABELS: Record<string, { label: string; shortLabel: string }> = {
  en: { label: "English", shortLabel: "EN" },
  pl: { label: "Polski", shortLabel: "PL" },
};

const RESUME_LANGUAGE_SELECT = "code,label,short_label,labels,is_enabled,sort_order,created_at,updated_at";
const RESUME_USER_LOCALE_SELECT =
  "user_id,locale,label_override,short_label_override,is_default,sort_order,created_at,updated_at";
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
const PROFILE_IDENTITY_SELECT = "id,display_name,first_name,last_name,person_slug,name_sync_mode";
const PROFILE_SLUG_SELECT = "id,display_name,person_slug";
const OPEN_CV_PUBLIC_CONTRACT_MAJOR = "1";
const OPEN_CV_MIN_SCHEMA_VERSION = 1;

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

function normalizeResumeUserLocaleInput(input: ResumeUserLocaleInput): ResumeUserLocaleInput {
  const code = normalizeLocale(input.code);
  const label = String(input.label || "").trim();
  const shortLabel = String(input.shortLabel || code.toUpperCase())
    .trim()
    .toUpperCase()
    .slice(0, 2);
  return {
    code,
    label,
    shortLabel,
  };
}

export function validateResumeUserLocaleInput(input: ResumeUserLocaleInput): string[] {
  const normalized = normalizeResumeUserLocaleInput(input);
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

async function fetchRawResumeUserLocalesForUser(
  userId: string,
  options: { accessToken?: string } = {},
): Promise<ResumeUserLocaleRecord[]> {
  const queryOptions = {
    table: "resume_user_locales",
    select: RESUME_USER_LOCALE_SELECT,
    query: `user_id=eq.${encodeURIComponent(userId)}&order=is_default.desc,sort_order.asc,locale.asc`,
  };
  const result = options.accessToken
    ? await queryTable<ResumeUserLocaleRecord>({
        ...queryOptions,
        accessToken: options.accessToken,
      })
    : await queryTable<ResumeUserLocaleRecord>({
        ...queryOptions,
        useServiceRole: true,
      });

  if (!result.data || result.error) {
    return [];
  }

  return result.data.map((row) => ({
    ...row,
    locale: normalizeLocale(row.locale),
    label_override: row.label_override ? String(row.label_override).trim() || null : null,
    short_label_override: row.short_label_override ? String(row.short_label_override).trim().toUpperCase().slice(0, 2) || null : null,
    is_default: Boolean(row.is_default),
    sort_order: Number(row.sort_order) || 100,
  }));
}

function resolveResumeUserLocales(
  userLocales: ResumeUserLocaleRecord[],
  globalLocales: ResumeLanguageRow[],
): ResumeUserLocaleRow[] {
  const globalByCode = new Map(globalLocales.map((language) => [language.code, language]));
  return userLocales.map((row) => {
    const globalLocale = globalByCode.get(row.locale);
    const fallback = getFallbackLanguageLabel(row.locale);
    return {
      user_id: row.user_id,
      code: row.locale,
      label: row.label_override || globalLocale?.label || fallback.label,
      short_label: row.short_label_override || globalLocale?.short_label || fallback.shortLabel,
      labels: globalLocale?.labels || normalizeLabelMap(PREVIEW_LABELS.en),
      is_default: row.is_default,
      sort_order: row.sort_order,
      created_at: row.created_at,
      updated_at: row.updated_at,
      label_override: row.label_override,
      short_label_override: row.short_label_override,
    };
  });
}

export async function fetchResumeUserLocalesForUser(
  userId: string,
  options: { accessToken?: string } = {},
): Promise<ResumeUserLocaleRow[]> {
  const [userLocales, globalLocales] = await Promise.all([
    fetchRawResumeUserLocalesForUser(userId, options),
    fetchResumeLanguages(),
  ]);
  return resolveResumeUserLocales(userLocales, globalLocales);
}

async function fetchResumeUserLocaleMapForUser(userId: string): Promise<Map<ResumeLocale, ResumeUserLocaleRow>> {
  const locales = await fetchResumeUserLocalesForUser(userId);
  return new Map(locales.map((locale) => [locale.code, locale]));
}

export async function upsertResumeLanguage(input: ResumeLanguageInput): Promise<ResumeLanguageRow | null> {
  const normalized = normalizeResumeLanguageInput(input);
  if (validateResumeLanguageInput(normalized).length > 0) {
    return null;
  }

  const existingLanguages = await fetchResumeLanguages();
  const existing = existingLanguages.find((language) => language.code === normalized.code);
  if (existing) {
    const updated = await updateTable({
      table: "resume_languages",
      useServiceRole: true,
      query: `code=eq.${encodeURIComponent(normalized.code)}`,
      values: {
        label: normalized.label,
        short_label: normalized.shortLabel,
        labels: normalized.labels as Record<string, unknown>,
        is_enabled: normalized.isEnabled,
        updated_at: new Date().toISOString(),
      },
    });
    if (!updated.data || updated.error || !updated.data[0]) {
      return null;
    }
    const row = updated.data[0] as unknown as ResumeLanguageRow;
    return {
      ...row,
      code: normalizeLocale(row.code),
      labels: normalizeLabelMap(row.labels),
      is_enabled: Boolean(row.is_enabled),
      sort_order: Number(row.sort_order) || existing.sort_order,
    };
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

async function ensureGlobalResumeLanguage(input: ResumeUserLocaleInput): Promise<ResumeLanguageRow | null> {
  const normalized = normalizeResumeUserLocaleInput(input);
  const existingLanguages = await fetchResumeLanguages();
  const existing = existingLanguages.find((language) => language.code === normalized.code);
  if (existing) {
    return existing;
  }

  return upsertResumeLanguage({
    code: normalized.code,
    label: normalized.label,
    shortLabel: normalized.shortLabel,
  });
}

export async function upsertResumeUserLocale(
  accessToken: string,
  userId: string,
  input: ResumeUserLocaleInput,
  options: { setDefault?: boolean } = {},
): Promise<ResumeUserLocaleRow | null> {
  const normalized = normalizeResumeUserLocaleInput(input);
  if (validateResumeUserLocaleInput(normalized).length > 0) {
    return null;
  }

  const globalLanguage = await ensureGlobalResumeLanguage(normalized);
  if (!globalLanguage) {
    return null;
  }

  const currentLocales = await fetchRawResumeUserLocalesForUser(userId, { accessToken });
  const existing = currentLocales.find((locale) => locale.locale === normalized.code);
  const shouldSetDefault = options.setDefault === true || currentLocales.length === 0;

  if (existing) {
    const updated = await updateTable({
      table: "resume_user_locales",
      accessToken,
      query: `user_id=eq.${encodeURIComponent(userId)}&locale=eq.${encodeURIComponent(normalized.code)}`,
      values: {
        label_override: normalized.label || globalLanguage.label,
        short_label_override: normalized.shortLabel || globalLanguage.short_label,
        updated_at: new Date().toISOString(),
      },
    });
    if (!updated.data || updated.error || !updated.data[0]) {
      return null;
    }
  } else {
    const inserted = await insertTable({
      table: "resume_user_locales",
      accessToken,
      values: {
        user_id: userId,
        locale: normalized.code,
        label_override: normalized.label || globalLanguage.label,
        short_label_override: normalized.shortLabel || globalLanguage.short_label,
        is_default: currentLocales.length === 0,
        sort_order: ((currentLocales[currentLocales.length - 1]?.sort_order || 0) + 10) || 10,
      },
    });
    if (!inserted.data || inserted.error || !inserted.data[0]) {
      return null;
    }
  }

  if (shouldSetDefault) {
    const defaultUpdated = await setDefaultResumeLocaleForUser(accessToken, userId, normalized.code);
    if (!defaultUpdated) {
      return null;
    }
  }

  const nextLocales = await fetchResumeUserLocalesForUser(userId, { accessToken });
  return nextLocales.find((locale) => locale.code === normalized.code) || null;
}

export async function disableResumeLanguage(codeInput: string): Promise<boolean> {
  const code = normalizeLocale(codeInput);
  const updated = await updateTable({
    table: "resume_languages",
    useServiceRole: true,
    query: `code=eq.${encodeURIComponent(code)}`,
    values: {
      is_enabled: false,
      updated_at: new Date().toISOString(),
    },
  });
  return Boolean(updated.data && !updated.error && updated.data.length > 0);
}

export async function deleteResumeUserLocale(
  accessToken: string,
  userId: string,
  codeInput: string,
): Promise<{ ok: boolean; defaultLocale: ResumeLocale | null }> {
  const code = normalizeLocale(codeInput);
  const currentLocales = await fetchResumeUserLocalesForUser(userId, { accessToken });
  const target = currentLocales.find((locale) => locale.code === code);
  if (!target || currentLocales.length <= 1) {
    return { ok: false, defaultLocale: currentLocales.find((locale) => locale.is_default)?.code || null };
  }

  const deleteResult = await deleteTable({
    table: "resume_user_locales",
    accessToken,
    query: `user_id=eq.${encodeURIComponent(userId)}&locale=eq.${encodeURIComponent(code)}`,
  });

  if (!deleteResult.data || deleteResult.error || deleteResult.data.length === 0) {
    return { ok: false, defaultLocale: currentLocales.find((locale) => locale.is_default)?.code || null };
  }

  const remainingLocales = currentLocales.filter((locale) => locale.code !== code);
  const presets = await fetchResumePresetsForUser(userId);
  const deletedLocaleWasInUse = target.is_default || presets.some((preset) => preset.default_locale === code);

  if (!deletedLocaleWasInUse) {
    return { ok: true, defaultLocale: remainingLocales.find((locale) => locale.is_default)?.code || null };
  }

  const fallbackLocale =
    remainingLocales.find((locale) => locale.code === "en")?.code ||
    remainingLocales.find((locale) => locale.is_default)?.code ||
    remainingLocales[0]?.code ||
    null;
  if (!fallbackLocale) {
    return { ok: false, defaultLocale: null };
  }

  const defaultUpdated = await setDefaultResumeLocaleForUser(accessToken, userId, fallbackLocale);
  return { ok: defaultUpdated, defaultLocale: defaultUpdated ? fallbackLocale : null };
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

function extractResumeNameFromYaml(yamlContent: string): string {
  try {
    const parsed = yaml.load(yamlContent);
    return normalizeResumeDocument(parsed).name.trim();
  } catch {
    return "";
  }
}

async function fetchProfileIdentity(userId: string): Promise<ProfileIdentityRow | null> {
  const result = await queryTable<ProfileIdentityRow>({
    table: "profiles",
    select: PROFILE_IDENTITY_SELECT,
    useServiceRole: true,
    query: `id=eq.${encodeURIComponent(userId)}&limit=1`,
  });

  if (!result.data || result.error) {
    return null;
  }
  return result.data[0] || null;
}

async function updateProfileIdentity(
  userId: string,
  values: Record<string, string | null>,
): Promise<boolean> {
  const result = await updateTable({
    table: "profiles",
    useServiceRole: true,
    query: `id=eq.${encodeURIComponent(userId)}`,
    values,
  });

  return Boolean(result.data?.[0]) && !result.error;
}

async function syncProfileNameFromResumeYaml(
  accessToken: string,
  userId: string,
  yamlContent: string,
  options: { updatePersonSlug?: boolean } = {},
): Promise<boolean> {
  const resumeName = extractResumeNameFromYaml(yamlContent);
  if (!resumeName) {
    return true;
  }

  const profile = await fetchProfileIdentity(userId);
  if (!profile || normalizeNameSyncMode(profile.name_sync_mode) === "manual") {
    return true;
  }

  const parts = splitProfileName(resumeName);
  const displayName = buildProfileDisplayName(parts.firstName, parts.lastName, resumeName);
  const values: Record<string, string | null> = {
    first_name: parts.firstName,
    last_name: parts.lastName,
    display_name: displayName,
    name_sync_mode: "auto",
  };

  if (options.updatePersonSlug) {
    values.person_slug = buildCompactPersonSlug(parts.firstName, parts.lastName, displayName);
  }

  return updateProfileIdentity(userId, values);
}

async function refreshProfilePersonSlugForPublish(accessToken: string, userId: string): Promise<boolean> {
  type ProfileSlugRow = { id: string; display_name: string | null; person_slug: string | null };
  const profileResult = await queryTable<ProfileSlugRow>({
    table: "profiles",
    select: PROFILE_SLUG_SELECT,
    useServiceRole: true,
    query: `id=eq.${encodeURIComponent(userId)}&limit=1`,
  });

  if (profileResult.error) {
    throw new Error(`[publish:step=refreshSlug:fetchProfile] Supabase error: ${profileResult.error} (status=${profileResult.status})`);
  }
  if (!profileResult.data || profileResult.data.length === 0) {
    throw new Error(`[publish:step=refreshSlug:fetchProfile] No profile row for userId=${userId} — profile may not exist`);
  }

  const profile = profileResult.data[0];

  const nameParts = profile.display_name ? splitProfileName(profile.display_name) : { firstName: "", lastName: "" };
  const nextPersonSlug = buildCompactPersonSlug(
    nameParts.firstName,
    nameParts.lastName,
    profile.display_name || userId,
  );

  if (profile.person_slug === nextPersonSlug) {
    return true;
  }

  const updateResult = await updateTable({
    table: "profiles",
    useServiceRole: true,
    query: `id=eq.${encodeURIComponent(userId)}`,
    values: { person_slug: nextPersonSlug },
  });

  if (updateResult.error) {
    throw new Error(`[publish:step=refreshSlug:updateSlug] Supabase error: ${updateResult.error} (status=${updateResult.status})`);
  }
  if (!updateResult.data?.[0]) {
    throw new Error(`[publish:step=refreshSlug:updateSlug] UPDATE returned 0 rows for userId=${userId} — trigger may have blocked it`);
  }

  return true;
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

async function ensureResumeDocumentRecord(
  accessToken: string,
  userId: string,
  locale: ResumeLocale,
  fallbackName: string,
): Promise<ResumeDocumentPayload | null> {
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

export async function bootstrapResumeUserLocales(accessToken: string, userId: string, fallbackName: string): Promise<ResumeUserLocaleRow[]> {
  const currentLocales = await fetchResumeUserLocalesForUser(userId, { accessToken });
  if (currentLocales.length > 0) {
    if (!currentLocales.some((locale) => locale.is_default)) {
      const fallbackLocale = currentLocales.find((locale) => locale.code === "en")?.code || currentLocales[0]?.code;
      if (fallbackLocale) {
        await setDefaultResumeLocaleForUser(accessToken, userId, fallbackLocale);
      }
    }
    return fetchResumeUserLocalesForUser(userId, { accessToken });
  }

  const nextLocale = await upsertResumeUserLocale(
    accessToken,
    userId,
    {
      code: "en",
      label: "English",
      shortLabel: "EN",
    },
    { setDefault: true },
  );
  if (!nextLocale) {
    return [];
  }

  await ensureResumeDocumentRecord(accessToken, userId, "en", fallbackName);
  return fetchResumeUserLocalesForUser(userId, { accessToken });
}

export async function fetchResumeLanguageVersionsForUser(userId: string): Promise<ResumeUserLocaleVersionRow[]> {
  const [languages, documents] = await Promise.all([fetchResumeUserLocalesForUser(userId), fetchResumeDocumentsForUser(userId)]);
  return languages.map((language) => ({
    ...language,
    document: documents.find((document) => document.locale === language.code) || null,
  }));
}

export function buildResumeDocumentFromPreset(yamlContent: string, selection: ResumePresetSelection): ResumeDocument | null {
  return buildPublishedResumeDocument(yamlContent, selection);
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
    return {
      ...preset,
      selection: normalizeResumePresetSelection(preset.selection),
      canonical_public_path: canonicalPublicPath,
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
    const updateResult = await updateTable({
      table: "resume_preset_variants",
      accessToken,
      query: `id=eq.${encodeURIComponent(existing.id)}&user_id=eq.${encodeURIComponent(userId)}`,
      values: {
        ...values,
        updated_at: new Date().toISOString(),
      },
    });
    if (updateResult.error) {
      throw new Error(`[presetVariant:locale=${locale}:operation=update] ${updateResult.error} (status=${updateResult.status})`);
    }
    if (!updateResult.data?.[0]) {
      throw new Error(`[presetVariant:locale=${locale}:operation=update] update returned no rows (status=${updateResult.status})`);
    }
    return;
  }

  const insertResult = await insertTable({
    table: "resume_preset_variants",
    accessToken,
    values,
  });
  if (insertResult.error) {
    throw new Error(`[presetVariant:locale=${locale}:operation=insert] ${insertResult.error} (status=${insertResult.status})`);
  }
  if (!insertResult.data?.[0]) {
    throw new Error(`[presetVariant:locale=${locale}:operation=insert] insert returned no rows (status=${insertResult.status})`);
  }
}

export async function fetchResumePresetVariantsForUser(userId: string): Promise<ResumePresetVariantRow[]> {
  const result = await queryTable<ResumePresetVariantRow>({
    table: "resume_preset_variants",
    select: RESUME_PRESET_VARIANT_SELECT,
    useServiceRole: true,
    query: `user_id=eq.${encodeURIComponent(userId)}&order=locale.asc`,
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

export async function importResumePresetVariant(
  accessToken: string,
  userId: string,
  preset: ResumePresetRow,
  localeInput: string,
  selection: ResumePresetSelection,
): Promise<boolean> {
  const locale = normalizeLocale(localeInput);
  const document = await fetchDocumentByLocale(accessToken, userId, locale);
  if (!document) {
    return false;
  }
  await upsertResumePresetVariant(accessToken, userId, preset, document, selection);
  return true;
}

function buildCanonicalPublicLanguageHref(personSlug: string, publicId: string, locale: ResumeLocale, defaultLocale: ResumeLocale): string {
  const basePath = `/${encodeURIComponent(personSlug)}/${encodeURIComponent(publicId)}`;
  return locale === defaultLocale ? basePath : `${basePath}?lang=${encodeURIComponent(locale)}`;
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

type ResolvedSnapshotLocales = {
  defaultLocale: ResumeLocale;
  requestedLocale: ResumeLocale;
  allowedLocales: Set<ResumeLocale>;
  localeRows: Array<ResumePublishedCvLocaleRow & { locale: ResumeLocale; selection: ResumePresetSelection }>;
  activeLocaleRow: ResumePublishedCvLocaleRow & { locale: ResumeLocale; selection: ResumePresetSelection };
};

async function resolveSnapshotLocales(
  link: ResumePublicLinkRow,
  snapshot: ResumePublishedCvRow,
  localeInput?: string,
): Promise<ResolvedSnapshotLocales | null> {
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
      selection: normalizeResumePresetSelection(row.selection || snapshot.selection),
    }))
    .filter((row) => allowedLocales.has(row.locale))
    .filter((row) => Boolean(buildResumeDocumentFromPreset(row.yaml_content, row.selection)));
  if (localeRows.length === 0) {
    return null;
  }

  const renderableLocales = new Set(localeRows.map((row) => row.locale));
  const effectiveDefaultLocale = renderableLocales.has(defaultLocale) ? defaultLocale : localeRows[0].locale;

  const activeLocaleRow =
    localeRows.find((row) => row.locale === requestedLocale) ||
    localeRows.find((row) => row.locale === effectiveDefaultLocale) ||
    localeRows[0];

  return {
    defaultLocale: effectiveDefaultLocale,
    requestedLocale,
    allowedLocales: renderableLocales,
    localeRows,
    activeLocaleRow,
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

  const resolved = await resolveSnapshotLocales(link, snapshot, localeInput);
  if (!resolved) {
    return null;
  }

  const { defaultLocale, localeRows, activeLocaleRow } = resolved;
  const activeSelection = normalizeResumePresetSelection(activeLocaleRow.selection || snapshot.selection);
  const resume = buildResumeDocumentFromPreset(activeLocaleRow.yaml_content, activeSelection);
  if (!resume) {
    return null;
  }

  const languageLabels = link.user_id ? await fetchResumeUserLocaleMapForUser(link.user_id) : new Map();
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
    defaultLocale: published.preset.default_locale,
    availableLocales: published.languages.map((language) => language.code),
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

  const resolved = await resolveSnapshotLocales(link, snapshot, localeInput);
  if (!resolved) {
    return null;
  }

  const { defaultLocale, allowedLocales, activeLocaleRow } = resolved;

  // ADR 0008: exports must serve the published (selection-filtered) document, never raw master content.
  const exportContent = buildPublishedExportContent(
    activeLocaleRow.yaml_content,
    activeLocaleRow.selection || snapshot.selection,
  );
  if (!exportContent) {
    return null;
  }

  return {
    personSlug: link.person_slug,
    publicId: link.public_id,
    locale: activeLocaleRow.locale,
    defaultLocale,
    availableLocales: Array.from(allowedLocales),
    allowIndexing: Boolean(link.allow_indexing),
    schemaVersion: Number(activeLocaleRow.schema_version) || Number(snapshot.schema_version) || 1,
    openCvYamlContractVersion: snapshot.open_cv_yaml_contract_version,
    yamlContent: exportContent.yamlContent,
    resume: exportContent.resume,
    canonicalPath: `/${encodeURIComponent(link.person_slug)}/${encodeURIComponent(link.public_id)}`,
  };
}

export async function fetchResumeExportByPresetId(
  accessToken: string,
  userId: string,
  presetId: string,
): Promise<PublishedResumeExport | null> {
  const preset = await fetchResumePresetById(accessToken, userId, presetId);
  if (!preset) return null;

  const document = await fetchDocumentById(accessToken, preset.document_id, userId);
  if (!document) return null;

  const exportContent = buildPublishedExportContent(document.yaml_content, preset.selection);
  if (!exportContent) return null;

  return {
    personSlug: "user",
    publicId: preset.id,
    locale: preset.default_locale,
    defaultLocale: preset.default_locale,
    availableLocales: [preset.default_locale],
    allowIndexing: false,
    schemaVersion: document.schema_version,
    openCvYamlContractVersion: OPEN_CV_PUBLIC_CONTRACT_MAJOR,
    yamlContent: exportContent.yamlContent,
    resume: exportContent.resume,
    canonicalPath: preset.canonical_public_path || `/dashboard?preset=${preset.id}`,
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
  const locales = await fetchResumeUserLocalesForUser(userId, { accessToken });
  if (!locales.some((entry) => entry.code === locale)) {
    return false;
  }

  const currentDefault = locales.find((entry) => entry.is_default)?.code || null;
  if (currentDefault && currentDefault !== locale) {
    const clearCurrent = await updateTable({
      table: "resume_user_locales",
      accessToken,
      query: `user_id=eq.${encodeURIComponent(userId)}&locale=eq.${encodeURIComponent(currentDefault)}`,
      values: {
        is_default: false,
        updated_at: new Date().toISOString(),
      },
    });
    if (clearCurrent.error) {
      return false;
    }
  }

  const setNext = await updateTable({
    table: "resume_user_locales",
    accessToken,
    query: `user_id=eq.${encodeURIComponent(userId)}&locale=eq.${encodeURIComponent(locale)}`,
    values: {
      is_default: true,
      updated_at: new Date().toISOString(),
    },
  });
  if (setNext.error || !setNext.data || !setNext.data[0]) {
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
  const preset = {
    ...result.data[0],
    default_locale: normalizeLocale(result.data[0].default_locale),
    selection: normalizeResumePresetSelection(result.data[0].selection),
  };

  const linkResult = await queryTable<ResumePublicLinkRow>({
    table: "resume_public_links",
    select: RESUME_PUBLIC_LINK_SELECT,
    useServiceRole: true,
    query: `preset_id=eq.${encodeURIComponent(presetId)}&user_id=eq.${encodeURIComponent(userId)}&status=eq.active&is_active=eq.true&limit=1`,
  });
  const link = linkResult.data?.[0] ?? null;
  return {
    ...preset,
    canonical_public_path:
      link?.person_slug && link?.public_id
        ? `/${encodeURIComponent(link.person_slug)}/${encodeURIComponent(link.public_id)}`
        : null,
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
  if (!existingPreset) throw new Error("[publish:step=fetchPreset] preset not found or access denied");

  const documents = await fetchResumeDocumentsForUser(userId);
  const documentById = new Map(documents.map((document) => [document.id, document]));
  const baseDocument = documentById.get(existingPreset.document_id);
  if (!baseDocument) throw new Error(`[publish:step=fetchDocument] document ${existingPreset.document_id} not found (docs returned: ${documents.length})`);

  const profileSynced = await syncProfileNameFromResumeYaml(accessToken, userId, baseDocument.yaml_content, {
    updatePersonSlug: true,
  });
  if (!profileSynced) throw new Error("[publish:step=syncProfile] updateProfileIdentity returned no rows — check SUPABASE_SERVICE_ROLE_KEY and profiles table");

  const publicIdentityReady = await refreshProfilePersonSlugForPublish(accessToken, userId);
  if (!publicIdentityReady) throw new Error("[publish:step=refreshSlug] fetchProfileIdentity returned null or updateProfileIdentity returned no rows");

  const explicitLocales = Array.from(new Set(payload.selectedLocales.map((locale) => normalizeLocale(locale))));
  if (explicitLocales.length === 0) throw new Error("[publish:step=locales] selectedLocales empty after normalization");
  const requestedDefaultLocale = normalizeLocale(payload.defaultLocale || existingPreset.default_locale || baseDocument.locale);
  if (!explicitLocales.includes(requestedDefaultLocale)) throw new Error(`[publish:step=defaultLocale] ${requestedDefaultLocale} not in ${explicitLocales.join(",")}`);

  // The snapshot RPC copies coalesce(variant.selection, preset.selection) per
  // locale (ADR 0009). The base selection is indexed against the default-locale
  // document, so on a locale document with fewer entries it can never be
  // applied and the public route 404s for that language. Materialize a variant
  // for every selected locale with the selection clamped to that locale's
  // document. Publishing is fail-closed: a successful response means every
  // explicitly selected locale was included in the snapshot.
  const documentByLocale = new Map(documents.map((document) => [normalizeLocale(document.locale), document]));
  const variants = await fetchResumePresetVariants(existingPreset.id);
  for (const locale of explicitLocales) {
    const localeDocument = documentByLocale.get(locale);
    let effectiveSelection: ResumePresetSelection | null = null;
    if (localeDocument) {
      const sourceSelection = variants.find((variant) => variant.locale === locale)?.selection || existingPreset.selection;
      try {
        effectiveSelection = clampResumeSelectionToRawDocument(yaml.load(localeDocument.yaml_content), sourceSelection);
      } catch {
        effectiveSelection = null;
      }
    }
    if (!effectiveSelection) {
      throw new Error(`[publish:step=localeSelection] selection cannot be applied to ${locale} document`);
    }
    await upsertResumePresetVariant(accessToken, userId, existingPreset, localeDocument!, effectiveSelection);
  }

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
  if (rpcResult.error) throw new Error(`[publish:step=rpc] ${rpcResult.error}`);
  if (!rpcResult.data) throw new Error("[publish:step=rpc] publish_resume_saved_version returned no data");

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
  // Deleting the preset sets resume_public_links.preset_id to null, which
  // would leave an active public link that can never be unpublished again.
  // Revoke it first via the unpublish RPC.
  const activeLink = await queryTable<ResumePublicLinkRow>({
    table: "resume_public_links",
    select: "id",
    useServiceRole: true,
    query:
      `user_id=eq.${encodeURIComponent(userId)}` +
      `&preset_id=eq.${encodeURIComponent(presetId)}` +
      "&status=eq.active&is_active=eq.true&limit=1",
  });
  if (activeLink.data?.length) {
    const unpublished = await unpublishResumePreset(accessToken, userId, presetId);
    if (!unpublished) {
      return false;
    }
  }

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
  const locales = await bootstrapResumeUserLocales(accessToken, userId, fallbackName);
  if (!locales.some((entry) => entry.code === locale)) {
    return null;
  }

  return ensureResumeDocumentRecord(accessToken, userId, locale, fallbackName);
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

  const profileSynced = await syncProfileNameFromResumeYaml(accessToken, userId, payload.yamlContent, {
    updatePersonSlug: true,
  });
  if (!profileSynced) {
    return null;
  }
  const publicIdentityReady = await refreshProfilePersonSlugForPublish(accessToken, userId);
  if (!publicIdentityReady) {
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

  const profileSynced = await syncProfileNameFromResumeYaml(accessToken, userId, payload.yamlContent, {
    updatePersonSlug: true,
  });
  if (!profileSynced) {
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
