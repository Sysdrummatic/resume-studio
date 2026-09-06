import yaml from "js-yaml";

export const USER_DATA_BUNDLE_FORMAT = "opencivera-user-data";
export const USER_DATA_BUNDLE_VERSION = 1;
export const USER_DATA_BUNDLE_MAX_BYTES = 1_000_000;
// Bundles are small, hand-authored data exports; a legitimate one never needs
// YAML merge keys at all. Caps js-yaml's merge-key expansion (CVE-backed
// quadratic-complexity DoS via repeated aliases, GHSA-h67p-54hq-rp68) far
// below its own default of 10000.
const USER_DATA_BUNDLE_MAX_MERGE_KEYS = 50;

export type UserDataBundleLanguage = {
  code: string;
  label: string;
  short_label: string;
  is_default: boolean;
  sort_order: number;
};

export type UserDataBundleDocument = {
  locale: string;
  title: string;
  yaml_content: string;
};

export type UserDataBundleCvVersionVariant = {
  locale: string;
  selection: unknown;
};

export type UserDataBundleCvVersion = {
  title: string;
  default_locale: string;
  allow_indexing: boolean;
  ai_generated: boolean;
  selection: unknown;
  variants: UserDataBundleCvVersionVariant[];
};

export type UserDataBundle = {
  format: typeof USER_DATA_BUNDLE_FORMAT;
  version: typeof USER_DATA_BUNDLE_VERSION;
  exported_at: string;
  languages: UserDataBundleLanguage[];
  documents: UserDataBundleDocument[];
  cv_versions: UserDataBundleCvVersion[];
};

export type UserDataBundleInput = Pick<UserDataBundle, "languages" | "documents" | "cv_versions">;

type ParseResult = { bundle: UserDataBundle; error?: never } | { bundle?: never; error: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function nonEmptyString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// Must match normalizeLocale() in resume-schema.ts — anything else silently
// collapses to "en" downstream, so reject it at the import boundary instead.
const LOCALE_CODE_PATTERN = /^[a-z]{2}$/;

function normalizedLocaleCode(value: unknown): string {
  const code = nonEmptyString(value).toLowerCase();
  return LOCALE_CODE_PATTERN.test(code) ? code : "";
}

export function buildUserDataBundleYaml(input: UserDataBundleInput): string {
  const bundle: UserDataBundle = {
    format: USER_DATA_BUNDLE_FORMAT,
    version: USER_DATA_BUNDLE_VERSION,
    exported_at: new Date().toISOString(),
    languages: input.languages,
    documents: input.documents,
    cv_versions: input.cv_versions,
  };
  return yaml.dump(bundle, { indent: 2, lineWidth: -1 });
}

export function parseUserDataBundle(yamlText: string): ParseResult {
  if (!nonEmptyString(yamlText)) {
    return { error: "Import file is empty." };
  }
  if (new TextEncoder().encode(yamlText).length > USER_DATA_BUNDLE_MAX_BYTES) {
    return { error: "Import file is too large (max 1 MB)." };
  }

  let parsed: unknown;
  try {
    // @types/js-yaml 4.0.x predates js-yaml 4.3.0's maxTotalMergeKeys loader option.
    parsed = yaml.load(yamlText, { maxTotalMergeKeys: USER_DATA_BUNDLE_MAX_MERGE_KEYS } as yaml.LoadOptions);
  } catch {
    return { error: "Import file is not valid YAML." };
  }

  const root = asRecord(parsed);
  if (!root || root.format !== USER_DATA_BUNDLE_FORMAT) {
    return { error: "Import file is not an OpenCiVera user data export." };
  }
  if (root.version !== USER_DATA_BUNDLE_VERSION) {
    return { error: `Unsupported export version. Expected version ${USER_DATA_BUNDLE_VERSION}.` };
  }
  if (!Array.isArray(root.languages) || !Array.isArray(root.documents) || !Array.isArray(root.cv_versions)) {
    return { error: "Import file is missing languages, documents, or cv_versions sections." };
  }

  const languages: UserDataBundleLanguage[] = [];
  for (const entry of root.languages) {
    const row = asRecord(entry);
    const code = normalizedLocaleCode(row?.code);
    const label = nonEmptyString(row?.label);
    if (!row || !label) {
      return { error: "Each language entry requires a code and a label." };
    }
    if (!code) {
      return { error: `Language code "${nonEmptyString(row.code)}" must be a two-letter locale code.` };
    }
    languages.push({
      code,
      label,
      short_label: nonEmptyString(row.short_label) || code.toUpperCase(),
      is_default: row.is_default === true,
      sort_order: Number.isFinite(row.sort_order) ? Number(row.sort_order) : languages.length,
    });
  }
  if (languages.length === 0) {
    return { error: "Import file must contain at least one language." };
  }

  const languageCodes = new Set(languages.map((language) => language.code));
  if (languageCodes.size !== languages.length) {
    return { error: "Languages section contains duplicate locale codes." };
  }

  const documents: UserDataBundleDocument[] = [];
  for (const entry of root.documents) {
    const row = asRecord(entry);
    const locale = normalizedLocaleCode(row?.locale);
    const yamlContent = typeof row?.yaml_content === "string" ? row.yaml_content : "";
    if (!row || !locale || !yamlContent.trim()) {
      return { error: "Each document entry requires a two-letter locale and non-empty yaml_content." };
    }
    if (!languageCodes.has(locale)) {
      return { error: `Document locale "${locale}" is not listed in the languages section.` };
    }
    documents.push({
      locale,
      title: nonEmptyString(row.title) || "Master resume",
      yaml_content: yamlContent,
    });
  }
  if (documents.length === 0) {
    return { error: "Import file must contain at least one document." };
  }

  const documentLocales = new Set(documents.map((document) => document.locale));
  const cvVersions: UserDataBundleCvVersion[] = [];
  for (const entry of root.cv_versions) {
    const row = asRecord(entry);
    const title = nonEmptyString(row?.title);
    const defaultLocale = normalizedLocaleCode(row?.default_locale);
    if (!row || !title || !defaultLocale) {
      return { error: "Each CV version entry requires a title and a two-letter default_locale." };
    }
    if (!documentLocales.has(defaultLocale)) {
      return { error: `CV version "${title}" default locale "${defaultLocale}" has no matching document.` };
    }
    const variants: UserDataBundleCvVersionVariant[] = [];
    if (row.variants !== undefined && !Array.isArray(row.variants)) {
      return { error: `CV version "${title}" has an invalid variants section.` };
    }
    for (const variantEntry of Array.isArray(row.variants) ? row.variants : []) {
      const variantRow = asRecord(variantEntry);
      const variantLocale = normalizedLocaleCode(variantRow?.locale);
      if (!variantRow || !variantLocale) {
        return { error: `CV version "${title}" has a variant without a two-letter locale.` };
      }
      if (!languageCodes.has(variantLocale)) {
        return { error: `CV version "${title}" variant locale "${variantLocale}" is not listed in the languages section.` };
      }
      variants.push({ locale: variantLocale, selection: variantRow.selection });
    }
    cvVersions.push({
      title,
      default_locale: defaultLocale,
      allow_indexing: row.allow_indexing === true,
      ai_generated: row.ai_generated === true,
      selection: row.selection,
      variants,
    });
  }

  return {
    bundle: {
      format: USER_DATA_BUNDLE_FORMAT,
      version: USER_DATA_BUNDLE_VERSION,
      exported_at: nonEmptyString(root.exported_at),
      languages,
      documents,
      cv_versions: cvVersions,
    },
  };
}
