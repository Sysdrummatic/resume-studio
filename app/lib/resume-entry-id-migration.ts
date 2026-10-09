import yaml from "js-yaml";

import {
  ensureResumeEntryIds,
  findDuplicateResumeEntryIds,
  findLegacyPairingConflicts,
  LINKED_RESUME_COLLECTIONS,
  type LegacyPairingConflict,
  type LinkedResumeCollection,
} from "./resume-language-linkage";
import { fillMissingRequiredKeysInRawYaml } from "./resume-schema";

/**
 * One-off data migration (ADR 0023 addendum): rewrites stored resume YAML to the
 * entry-object shape and replaces position-derived `legacy-<collection>-<index>`
 * IDs with random UUIDs, keeping the language versions of one account paired.
 *
 * Unlike the runtime (which never guesses a pairing), the migration pairs a
 * legacy translation with the default by position, because it must finish
 * without asking the user. It never deletes or overwrites translated content:
 * rows without a counterpart keep their text under a new UUID, and every
 * collection whose pairing was a guess is reported.
 */

type RawObject = Record<string, unknown>;

export type MigrationDocument = { locale: string; yamlContent: string };

export type PairingGuess = { locale: string; collection: LinkedResumeCollection; reason: LegacyPairingConflict["reason"] };

export type MigratedDocument = { locale: string; yamlContent: string; changed: boolean };

export type AccountMigration =
  | { status: "skipped"; reason: "no-default" | "unparseable" | "duplicate-ids"; locale?: string }
  | {
      status: "migrated" | "unchanged";
      documents: MigratedDocument[];
      /** Per locale: old legacy ID -> the ID it became, for rewriting that locale's revisions and snapshots. */
      idMaps: Record<string, Map<string, string>>;
      guessed: PairingGuess[];
    };

const LEGACY_PREFIX = "legacy-";

function asObject(value: unknown): RawObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RawObject) : {};
}

function parseDocument(yamlContent: string): RawObject | null {
  const parsed = yaml.load(yamlContent);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as RawObject) : null;
}

function dumpDocument(document: RawObject): string {
  return yaml.dump(fillMissingRequiredKeysInRawYaml(document), { lineWidth: 120, noRefs: true, sortKeys: false, quotingType: '"' });
}

function rowsOf(document: RawObject, collection: LinkedResumeCollection): RawObject[] {
  return Array.isArray(document[collection]) ? (document[collection] as unknown[]).map(asObject) : [];
}

function isLegacyId(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(LEGACY_PREFIX);
}

function setRowIds(document: RawObject, collection: LinkedResumeCollection, ids: string[]): void {
  document[collection] = rowsOf(document, collection).map((row, index) => ({ ...row, entry_id: ids[index] }));
}

/** Replaces every legacy ID of a default (canonical) document by a fresh UUID. */
function remapDefault(document: RawObject): Map<string, string> {
  const map = new Map<string, string>();
  for (const collection of LINKED_RESUME_COLLECTIONS) {
    const rows = rowsOf(document, collection);
    setRowIds(document, collection, rows.map((row) => {
      if (!isLegacyId(row.entry_id)) return row.entry_id as string;
      if (!map.has(row.entry_id)) map.set(row.entry_id, crypto.randomUUID());
      return map.get(row.entry_id) as string;
    }));
  }
  return map;
}

/**
 * Replaces the legacy IDs of a translation: an ID the default already uses keeps
 * the default's new ID, any other legacy ID takes the ID of the default entry at
 * the same position, and a row without a counterpart gets its own UUID.
 */
function remapTranslation(document: RawObject, defaultDocument: RawObject, defaultMap: Map<string, string>): Map<string, string> {
  const map = new Map<string, string>();
  for (const collection of LINKED_RESUME_COLLECTIONS) {
    const defaultRows = rowsOf(defaultDocument, collection);
    const rows = rowsOf(document, collection);
    const used = new Set(rows.map((row) => row.entry_id).filter((id): id is string => typeof id === "string" && !isLegacyId(id)));
    const ids = rows.map((row, index) => {
      const current = row.entry_id as string;
      if (!isLegacyId(current)) return current;
      if (map.has(current)) return map.get(current) as string;
      const paired = defaultMap.get(current) ?? (defaultRows[index]?.entry_id as string | undefined);
      const next = paired && !used.has(paired) ? paired : crypto.randomUUID();
      used.add(next);
      map.set(current, next);
      return next;
    });
    setRowIds(document, collection, ids);
  }
  return map;
}

/** The collections of a translation whose position-based pairing was not proven by its content. */
function pairingGuesses(locale: string, defaultDocument: RawObject, document: RawObject): PairingGuess[] {
  return findLegacyPairingConflicts(defaultDocument, document).map((conflict) => ({ locale, collection: conflict.collection, reason: conflict.reason }));
}

function hasLegacyIds(document: RawObject): boolean {
  return LINKED_RESUME_COLLECTIONS.some((collection) => rowsOf(document, collection).some((row) => isLegacyId(row.entry_id)));
}

/**
 * Plans the rewrite of every language document of one account. Pure: nothing is
 * written; the caller persists `documents` (and rewrites history with `idMaps`).
 */
export function planAccountMigration(documents: MigrationDocument[], defaultLocale: string): AccountMigration {
  const parsed = new Map<string, RawObject>();
  for (const document of documents) {
    const raw = parseDocument(document.yamlContent);
    if (!raw) return { status: "skipped", reason: "unparseable", locale: document.locale };
    parsed.set(document.locale, ensureResumeEntryIds(raw));
  }
  const defaultDocument = parsed.get(defaultLocale);
  if (!defaultDocument) return { status: "skipped", reason: "no-default" };
  if (findDuplicateResumeEntryIds(defaultDocument).length > 0) return { status: "skipped", reason: "duplicate-ids", locale: defaultLocale };
  for (const [locale, document] of parsed) {
    if (locale !== defaultLocale && findDuplicateResumeEntryIds(document).length > 0) return { status: "skipped", reason: "duplicate-ids", locale };
  }

  const guessed: PairingGuess[] = [];
  const idMaps: Record<string, Map<string, string>> = {};
  const positionsBeforeRemap = structuredClone(defaultDocument);
  const defaultMap = remapDefault(defaultDocument);
  idMaps[defaultLocale] = defaultMap;
  for (const [locale, document] of parsed) {
    if (locale === defaultLocale) continue;
    if (hasLegacyIds(document)) guessed.push(...pairingGuesses(locale, positionsBeforeRemap, document));
    idMaps[locale] = remapTranslation(document, defaultDocument, defaultMap);
  }

  const migrated = documents.map((document) => {
    const yamlContent = dumpDocument(parsed.get(document.locale) as RawObject);
    return { locale: document.locale, yamlContent, changed: yamlContent !== document.yamlContent };
  });
  return { status: migrated.some((document) => document.changed) ? "migrated" : "unchanged", documents: migrated, idMaps, guessed };
}

/**
 * Rewrites a revision or snapshot of one locale with that locale's ID map, so its
 * linkage stays consistent with the live document. A legacy ID the map does not
 * know gets a fresh UUID that is remembered for the next revision.
 */
export function rewriteStoredYaml(yamlContent: string, idMap: Map<string, string>): string {
  const raw = parseDocument(yamlContent);
  if (!raw) return yamlContent;
  const document = ensureResumeEntryIds(raw);
  for (const collection of LINKED_RESUME_COLLECTIONS) {
    setRowIds(document, collection, rowsOf(document, collection).map((row) => {
      const current = row.entry_id as string;
      if (!isLegacyId(current)) return current;
      if (!idMap.has(current)) idMap.set(current, crypto.randomUUID());
      return idMap.get(current) as string;
    }));
  }
  return dumpDocument(document);
}
