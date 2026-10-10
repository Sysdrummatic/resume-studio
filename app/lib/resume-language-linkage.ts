export const RESUME_LINKAGE_KEY = "__ocv";

export const LINKED_RESUME_COLLECTIONS = [
  "summary",
  "contact",
  "qr_codes",
  "skills",
  "languages",
  "experience",
  "education",
  "courses",
  "tech_stack",
  "interests",
] as const;

export type LinkedResumeCollection = (typeof LINKED_RESUME_COLLECTIONS)[number];

export type ResumeLinkageIssueKind = "missing-id" | "duplicate-id" | "missing-entry" | "extra-entry" | "changed-id" | "default-entry-mismatch";

export type ResumeLinkageIssue = {
  kind: ResumeLinkageIssueKind;
  collection: LinkedResumeCollection;
  index?: number;
  expectedId?: string;
  actualId?: string;
};

export type ResumeLinkageValidation = {
  ok: boolean;
  issues: ResumeLinkageIssue[];
};

type RawObject = Record<string, unknown>;

function asObject(value: unknown): RawObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RawObject) : {};
}

// structuredClone (not a JSON round-trip) so a Date js-yaml parsed from an
// unquoted date-shaped scalar in an extension field survives unchanged.
function clone<T>(value: T): T {
  return structuredClone(value);
}

function newEntryId(): string {
  return crypto.randomUUID();
}

function validEntryId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

// Text lists used to be plain strings with their IDs in `__ocv.entries`. That
// shape is still read (stored documents, snapshots, old bundles), never written.
function legacyTextListIds(source: RawObject, collection: LinkedResumeCollection): unknown[] {
  const ids = asObject(asObject(source[RESUME_LINKAGE_KEY]).entries)[collection];
  return Array.isArray(ids) ? ids : [];
}

function textOf(item: unknown): string {
  return typeof item === "string" ? item : String(asObject(item).name ?? "");
}

function idsForCollection(source: RawObject, collection: LinkedResumeCollection): Array<string | null> {
  const items = Array.isArray(source[collection]) ? source[collection] : [];
  const stringListIds = legacyTextListIds(source, collection);
  return items.map((item, index) => {
    const id = typeof item === "string" ? stringListIds[index] : asObject(item).entry_id;
    return validEntryId(id) ? id : null;
  });
}

function duplicateIds(ids: Array<string | null>): Set<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  ids.forEach((id) => {
    if (!id) return;
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  });
  return duplicates;
}

function linkageFingerprint(source: RawObject, collection: LinkedResumeCollection, index: number): string {
  const item = Array.isArray(source[collection]) ? source[collection][index] : undefined;
  if (typeof item === "string") return item.trim();
  const row = asObject(item);
  const fields: Record<LinkedResumeCollection, string[]> = {
    summary: ["position", "description"],
    contact: ["label", "value"],
    qr_codes: ["label", "value"],
    skills: ["name", "level"],
    languages: ["name", "level"],
    experience: ["company", "period", "role"],
    education: ["school", "period", "degree"],
    courses: ["year", "name"],
    tech_stack: ["name"],
    interests: ["name"],
  };
  return fields[collection].map((field) => String(row[field] ?? "").trim()).join("\u001f");
}

/** Checks that a locale contains exactly the same linked entries as the default. */
export function inspectResumeLanguagePair(defaultValue: unknown, localeValue: unknown): ResumeLinkageValidation {
  const defaultSource = asObject(defaultValue);
  const localeSource = asObject(localeValue);
  const issues: ResumeLinkageIssue[] = [];

  for (const collection of LINKED_RESUME_COLLECTIONS) {
    const expected = idsForCollection(defaultSource, collection);
    const actual = idsForCollection(localeSource, collection);
    const expectedSet = new Set(expected.filter((id): id is string => Boolean(id)));
    const actualSet = new Set(actual.filter((id): id is string => Boolean(id)));
    const missingExpected = new Set([...expectedSet].filter((id) => !actualSet.has(id)));
    const extraActual = new Set([...actualSet].filter((id) => !expectedSet.has(id)));
    const changedIndexes = new Set<number>();
    const duplicateActualIds = duplicateIds(actual);

    actual.forEach((id, index) => {
      if (!id) {
        issues.push({ kind: "missing-id", collection, index });
        return;
      }
      if (duplicateActualIds.has(id)) {
        issues.push({ kind: "duplicate-id", collection, index, actualId: id });
      }
      const expectedId = expected[index];
      if (expectedId && expectedId !== id && missingExpected.has(expectedId) && extraActual.has(id)) {
        changedIndexes.add(index);
        issues.push({ kind: "changed-id", collection, index, expectedId, actualId: id });
      }
    });

    expected.forEach((id, index) => {
      if (id && missingExpected.has(id) && !changedIndexes.has(index)) {
        issues.push({ kind: "missing-entry", collection, index, expectedId: id });
      }
    });
    actual.forEach((id, index) => {
      if (id && extraActual.has(id) && !changedIndexes.has(index)) {
        issues.push({ kind: "extra-entry", collection, index, actualId: id });
      }
    });
  }

  const defaultSummaryId = idsForCollection(defaultSource, "summary").find((id, index) => {
    const row = Array.isArray(defaultSource.summary) ? asObject(defaultSource.summary[index]) : {};
    return Boolean(id) && row.default === true;
  });
  const localeSummaryId = idsForCollection(localeSource, "summary").find((id, index) => {
    const row = Array.isArray(localeSource.summary) ? asObject(localeSource.summary[index]) : {};
    return Boolean(id) && row.default === true;
  });
  if (defaultSummaryId !== localeSummaryId) {
    issues.push({
      kind: "default-entry-mismatch",
      collection: "summary",
      expectedId: defaultSummaryId || undefined,
      actualId: localeSummaryId || undefined,
    });
  }

  return { ok: issues.length === 0, issues };
}

/**
 * The editor's check of a translation. While the stored translation is still
 * legacy its IDs are the editor's own position-derived ones and prove nothing,
 * so the server decides on the content (and asks the user when it is ambiguous).
 */
export function inspectTranslationLinkage(defaultValue: unknown, currentValue: unknown, storedValue: unknown): ResumeLinkageValidation {
  const stored = asObject(storedValue);
  if (Object.keys(stored).length > 0 && isLegacyResumeDocument(stored)) return { ok: true, issues: [] };
  return inspectResumeLanguagePair(defaultValue, currentValue);
}

/** A translation whose rows share an ID cannot be paired by ID without guessing; nothing was changed. */
export class ResumeDuplicateEntryIdsError extends Error {
  readonly issues: ResumeLinkageIssue[];

  constructor(issues: ResumeLinkageIssue[]) {
    super("A language version uses one entry ID for different entries.");
    this.name = "ResumeDuplicateEntryIdsError";
    this.issues = issues;
  }
}

/** IDs used by more than one entry of a collection, including `__ocv.entries` text lists. */
export function findDuplicateResumeEntryIds(value: unknown): ResumeLinkageIssue[] {
  const source = asObject(value);
  const issues: ResumeLinkageIssue[] = [];
  for (const collection of LINKED_RESUME_COLLECTIONS) {
    const ids = idsForCollection(source, collection);
    const duplicates = duplicateIds(ids);
    ids.forEach((id, index) => {
      if (id && duplicates.has(id)) issues.push({ kind: "duplicate-id", collection, index, actualId: id });
    });
  }
  return issues;
}

// Neutral fields are copied from the default into blank slots; they are not translated content.
const NEUTRAL_FIELDS = new Set(["entry_id", "default", "period", "company", "school", "year", "level"]);

function hasTranslatedContent(item: unknown): boolean {
  if (typeof item === "string") return item.trim().length > 0;
  return Object.entries(asObject(item)).some(([key, value]) =>
    !NEUTRAL_FIELDS.has(key) && (Array.isArray(value) ? value.some((entry) => String(entry ?? "").trim()) : String(value ?? "").trim().length > 0));
}

/**
 * IDs of translated entries that reconciling `translationValue` against
 * `canonicalValue` would drop because the canonical document no longer has them.
 */
export function translatedEntriesMissingFrom(canonicalValue: unknown, translationValue: unknown): string[] {
  const canonical = asObject(canonicalValue);
  const translation = asObject(translationValue);
  const missing: string[] = [];
  for (const collection of LINKED_RESUME_COLLECTIONS) {
    const canonicalIds = new Set(idsForCollection(canonical, collection).filter(Boolean));
    const items = Array.isArray(translation[collection]) ? translation[collection] : [];
    idsForCollection(translation, collection).forEach((id, index) => {
      if (id && !canonicalIds.has(id) && hasTranslatedContent(items[index])) missing.push(id);
    });
  }
  return missing;
}

/** True when two versions of a document carry different linkage IDs (e.g. a save assigned canonical ones). */
export function resumeEntryIdsDiffer(leftValue: unknown, rightValue: unknown): boolean {
  const left = asObject(leftValue);
  const right = asObject(rightValue);
  return LINKED_RESUME_COLLECTIONS.some((collection) => JSON.stringify(idsForCollection(left, collection)) !== JSON.stringify(idsForCollection(right, collection)));
}

/** Returns false for legacy documents until every linked row has a stable ID. */
export function hasCompleteResumeLinkage(value: unknown): boolean {
  const source = asObject(value);
  return LINKED_RESUME_COLLECTIONS.every((collection) => {
    const ids = idsForCollection(source, collection);
    return ids.every(Boolean) && new Set(ids).size === ids.length;
  });
}

/** Detects ID changes against the previously saved document while allowing additions/removals. */
export function inspectResumeEntryIdStability(previousValue: unknown, currentValue: unknown): ResumeLinkageValidation {
  const previous = asObject(previousValue);
  const current = asObject(currentValue);
  const issues: ResumeLinkageIssue[] = [];
  for (const collection of LINKED_RESUME_COLLECTIONS) {
    const expected = idsForCollection(previous, collection);
    const actual = idsForCollection(current, collection);
    const previousSet = new Set(expected.filter((id): id is string => Boolean(id)));
    const duplicateActualIds = duplicateIds(actual);
    actual.forEach((id, index) => {
      if (!id) {
        const previousId = expected[index];
        if (previousId && linkageFingerprint(previous, collection, index) === linkageFingerprint(current, collection, index)) {
          issues.push({ kind: "missing-id", collection, index, expectedId: previousId });
        }
        return;
      }
      if (duplicateActualIds.has(id)) {
        issues.push({ kind: "duplicate-id", collection, index, actualId: id });
      }
      const previousId = expected[index];
      if (previousId && previousId !== id && !previousSet.has(id) && linkageFingerprint(previous, collection, index) === linkageFingerprint(current, collection, index)) {
        issues.push({ kind: "changed-id", collection, index, expectedId: previousId, actualId: id });
      }
    });
  }
  return { ok: issues.length === 0, issues };
}

/**
 * A document saved before linkage existed: no linkage metadata and no row ID.
 * Only such documents are paired by position (ADR 0023 §7); a missing ID in a
 * linked document is never guessed from its position.
 */
export function isLegacyResumeDocument(source: RawObject): boolean {
  return LINKED_RESUME_COLLECTIONS.every((collection) => idsForCollection(source, collection).every((id) => !id));
}

/** True while a document still has the old text-list shape: plain strings or an `__ocv` block. */
export function hasLegacyTextListShape(value: unknown): boolean {
  const source = asObject(value);
  return RESUME_LINKAGE_KEY in source || (["tech_stack", "interests"] as const).some((collection) => Array.isArray(source[collection]) && source[collection].some((item) => typeof item === "string"));
}

/**
 * Turns the old string lists into `{ entry_id, name }` rows and drops `__ocv`.
 * A string keeps the ID `__ocv.entries` gave it; a string without one gets
 * `fallbackId`, or no ID at all when that is null.
 */
export function upgradeTextListsToEntries(source: RawObject, fallbackId: (collection: LinkedResumeCollection, index: number) => string | null): void {
  for (const collection of ["tech_stack", "interests"] as const) {
    if (!Array.isArray(source[collection])) continue;
    const ids = legacyTextListIds(source, collection);
    source[collection] = source[collection].map((item, index) => {
      if (typeof item !== "string") return item;
      const id = validEntryId(ids[index]) ? ids[index] : fallbackId(collection, index);
      return id ? { entry_id: id, name: item } : { name: item };
    });
  }
  delete source[RESUME_LINKAGE_KEY];
}

// Deterministic, so every independent parse of the same legacy document (editor,
// save, language sync, default switch) yields IDs that pair by position.
function legacyEntryId(collection: LinkedResumeCollection, index: number): string {
  return `legacy-${collection}-${index}`;
}

function ensureObjectEntryIds(source: RawObject, collection: LinkedResumeCollection, legacy: boolean): void {
  const items = Array.isArray(source[collection]) ? source[collection] : [];
  source[collection] = items.map((item, index) => {
    const row = asObject(item);
    return { ...row, entry_id: validEntryId(row.entry_id) ? row.entry_id : legacy ? legacyEntryId(collection, index) : newEntryId() };
  });
}

/** Adds stable private IDs without changing the public resume fields. */
/**
 * `positional: false` gives rows without an ID fresh random IDs even in an
 * ID-less document: used when such content replaces an already linked
 * document, whose position-derived IDs must not be reused for new entries.
 */
export function ensureResumeEntryIds(value: unknown, options: { positional?: boolean } = {}): RawObject {
  const source = clone(asObject(value));
  const legacy = options.positional !== false && isLegacyResumeDocument(source);
  upgradeTextListsToEntries(source, (collection, index) => (legacy ? legacyEntryId(collection, index) : null));

  for (const collection of LINKED_RESUME_COLLECTIONS) ensureObjectEntryIds(source, collection, legacy);
  return source;
}

/** Drops every linkage ID, e.g. the editor's position-derived "legacy-..." IDs, which prove nothing. */
export function withoutResumeEntryIds(value: unknown): RawObject {
  const source = clone(asObject(value));
  upgradeTextListsToEntries(source, () => null);
  for (const collection of LINKED_RESUME_COLLECTIONS) {
    if (!Array.isArray(source[collection])) continue;
    source[collection] = (source[collection] as unknown[]).map((item) => {
      const row = { ...asObject(item) };
      delete row.entry_id;
      return row;
    });
  }
  return source;
}

function emptyTranslationRow(collection: LinkedResumeCollection, source: RawObject): RawObject {
  const row = { ...source };
  switch (collection) {
    case "summary":
      return { ...row, position: "", description: "" };
    case "experience":
      return { ...row, role: "", highlights: [] };
    case "education":
      return { ...row, degree: "", detail: "" };
    case "courses":
      return { ...row, name: "" };
    case "skills":
    case "tech_stack":
    case "interests":
      return { ...row, name: "" };
    case "languages":
      return { ...row, name: "", level_text: "" };
    default:
      return row;
  }
}

function entryId(item: unknown): string | null {
  const id = asObject(item).entry_id;
  return validEntryId(id) ? id : null;
}

export type LegacyPairingConflict =
  | { collection: LinkedResumeCollection; reason: "count"; defaultCount: number; translationCount: number }
  | { collection: LinkedResumeCollection; reason: "order"; index: number }
  | { collection: LinkedResumeCollection; reason: "mismatch"; index: number }
  | { collection: LinkedResumeCollection; reason: "ambiguous" };

/** `confirmLegacyPairing`: the user confirmed that ambiguous collections are in the same order. */
export type LegacyPairingOptions = { confirmLegacyPairing?: boolean };

/** A legacy translation cannot be paired by position without guessing; nothing was changed. */
export class ResumeLegacyPairingError extends Error {
  readonly conflicts: LegacyPairingConflict[];

  constructor(conflicts: LegacyPairingConflict[]) {
    super("An older language version does not match the default language's entries.");
    this.name = "ResumeLegacyPairingError";
    this.conflicts = conflicts;
  }
}

function startYear(value: unknown): string | null {
  return String(value ?? "").match(/\d{4}/)?.[0] ?? null;
}

function normalizedText(value: unknown): string | null {
  const text = String(value ?? "").trim().toLowerCase();
  return text || null;
}

/**
 * A value that identifies the same entry in every language, or null when the
 * collection has none (summary, skills, languages, courses) or it is incomplete.
 * Company/school and contact values are neutral fields; a translated period
 * ("2020 - obecnie") still matches on its start year.
 */
function pairingKey(collection: LinkedResumeCollection, item: unknown): string | null {
  const row = asObject(item);
  if (collection === "experience" || collection === "education") {
    const name = normalizedText(collection === "experience" ? row.company : row.school);
    const year = startYear(row.period);
    return name && year ? `${name}\u001f${year}` : null;
  }
  if (collection === "contact" || collection === "qr_codes") return normalizedText(row.value);
  if (collection === "tech_stack" || collection === "interests") return normalizedText(textOf(item));
  return null;
}

const NEUTRAL_KEY_COLLECTIONS = new Set<LinkedResumeCollection>(["experience", "education", "contact", "qr_codes"]);

function hasDuplicates(keys: Array<string | null>): boolean {
  const present = keys.filter((key): key is string => Boolean(key));
  return new Set(present).size !== present.length;
}

/**
 * Pairs by position only when it is unambiguous: equal counts and either a
 * single entry or unique keys that match at every position. The same key at a
 * different position is an `order` conflict (e.g. Alpha/Beta swapped). Anything
 * else without that proof is `ambiguous`, which only the user can confirm.
 */
export function findLegacyPairingConflicts(canonicalValue: unknown, localeValue: unknown, options: LegacyPairingOptions = {}): LegacyPairingConflict[] {
  const canonical = asObject(canonicalValue);
  const source = asObject(localeValue);
  const conflicts: LegacyPairingConflict[] = [];
  for (const collection of LINKED_RESUME_COLLECTIONS) {
    const items = Array.isArray(source[collection]) ? source[collection] : [];
    const expected = Array.isArray(canonical[collection]) ? canonical[collection] : [];
    if (items.length === 0) continue;
    if (items.length !== expected.length) {
      conflicts.push({ collection, reason: "count", defaultCount: expected.length, translationCount: items.length });
      continue;
    }
    const translatedKeys = items.map((item) => pairingKey(collection, item));
    const canonicalKeys = expected.map((item) => pairingKey(collection, item));
    const unique = !hasDuplicates(translatedKeys) && !hasDuplicates(canonicalKeys);
    const moved = unique ? translatedKeys.findIndex((key, index) => key !== null && canonicalKeys.includes(key) && canonicalKeys[index] !== key) : -1;
    if (moved >= 0) {
      conflicts.push({ collection, reason: "order", index: moved });
      continue;
    }
    // Neutral fields (company/school + year, contact value) are the same in every
    // language, so a difference is evidence of another entry, not a translation.
    const contradicted = NEUTRAL_KEY_COLLECTIONS.has(collection)
      ? translatedKeys.findIndex((key, index) => key !== null && canonicalKeys[index] !== null && key !== canonicalKeys[index])
      : -1;
    if (contradicted >= 0) {
      conflicts.push({ collection, reason: "mismatch", index: contradicted });
      continue;
    }
    // A single entry is not proof by itself: its identity must be confirmed by a key.
    const proven = unique && translatedKeys.every((key, index) => key !== null && key === canonicalKeys[index]);
    if (!proven && !options.confirmLegacyPairing) conflicts.push({ collection, reason: "ambiguous" });
  }
  return conflicts;
}

/**
 * Gives a legacy translation the IDs of the canonical entries at the same
 * positions (ADR 0023 §7). Throws `ResumeLegacyPairingError` instead of guessing
 * when counts or order disagree. Linked documents are returned as-is.
 */
export function linkLegacyResumeLanguageDocument(canonicalValue: unknown, localeValue: unknown, options: LegacyPairingOptions = {}): RawObject {
  const source = clone(asObject(localeValue));
  if (!isLegacyResumeDocument(source)) return source;
  const canonical = ensureResumeEntryIds(canonicalValue);
  const conflicts = findLegacyPairingConflicts(canonical, source, options);
  if (conflicts.length) throw new ResumeLegacyPairingError(conflicts);
  upgradeTextListsToEntries(source, () => null);
  for (const collection of LINKED_RESUME_COLLECTIONS) {
    const items = Array.isArray(source[collection]) ? source[collection] : [];
    const expected = Array.isArray(canonical[collection]) ? canonical[collection] : [];
    source[collection] = items.map((item, index) => ({ ...asObject(item), entry_id: entryId(expected[index]) }));
  }
  return source;
}

function syncStructuralFields(collection: LinkedResumeCollection, localeRow: RawObject, defaultRow: RawObject): RawObject {
  if (collection === "experience") return { ...localeRow, period: defaultRow.period, company: defaultRow.company };
  if (collection === "education") return { ...localeRow, period: defaultRow.period, school: defaultRow.school };
  if (collection === "courses") return { ...localeRow, year: defaultRow.year };
  if (collection === "skills") return { ...localeRow, level: defaultRow.level };
  if (collection === "languages") return { ...localeRow, level: defaultRow.level };
  return localeRow;
}

/** Creates the editable skeleton for a newly added language. */
export function buildResumeLanguageTemplate(value: unknown): RawObject {
  const source = ensureResumeEntryIds(value);
  const template = clone(source);

  for (const collection of LINKED_RESUME_COLLECTIONS) {
    const sourceItems = Array.isArray(source[collection]) ? source[collection] : [];
    template[collection] = sourceItems.map((item) => emptyTranslationRow(collection, asObject(item)));
  }

  template.gdpr_clause = "";
  return template;
}

/**
 * Aligns a translated document to the default language's canonical inventory.
 * Missing records are created as blank translation slots; extra records are
 * removed. Existing translated content is kept by entry_id.
 */
export function reconcileResumeLanguageDocument(defaultValue: unknown, localeValue: unknown, options: LegacyPairingOptions = {}): RawObject {
  const defaultSource = ensureResumeEntryIds(defaultValue);
  const linkedLocale = linkLegacyResumeLanguageDocument(defaultSource, localeValue, options);
  // Two rows under one ID would both take the same translated entry (or one
  // would be dropped): refuse instead of guessing which row belongs where.
  const duplicateIssues = findDuplicateResumeEntryIds(linkedLocale);
  if (duplicateIssues.length) throw new ResumeDuplicateEntryIdsError(duplicateIssues);
  const localeSource = ensureResumeEntryIds(linkedLocale);
  const result = clone(localeSource);

  for (const collection of LINKED_RESUME_COLLECTIONS) {
    const defaultItems = Array.isArray(defaultSource[collection]) ? defaultSource[collection].map(asObject) : [];
    const localeItems = Array.isArray(localeSource[collection]) ? localeSource[collection].map(asObject) : [];
    const localeById = new Map(localeItems.map((item) => [entryId(item), item]));
    result[collection] = defaultItems.map((defaultItem) => {
      const id = entryId(defaultItem);
      const current = id ? localeById.get(id) : undefined;
      return syncStructuralFields(collection, current ? { ...current, entry_id: id } : emptyTranslationRow(collection, defaultItem), defaultItem);
    });
  }

  const defaultSummary = (Array.isArray(defaultSource.summary) ? defaultSource.summary : []).find((item) => asObject(item).default === true);
  const defaultSummaryId = entryId(defaultSummary);
  if (Array.isArray(result.summary)) {
    result.summary = result.summary.map((item) => ({ ...asObject(item), default: entryId(item) === defaultSummaryId }));
  }
  return result;
}

export function validateResumeLanguagePair(defaultValue: unknown, localeValue: unknown): string[] {
  return inspectResumeLanguagePair(defaultValue, localeValue).issues.map((issue) => {
    const location = `${issue.collection}${typeof issue.index === "number" ? `[${issue.index}]` : ""}`;
    if (issue.kind === "changed-id") return `${location}: ID changed from ${issue.expectedId} to ${issue.actualId}`;
    if (issue.kind === "missing-id") return `${location}: missing ID`;
    if (issue.kind === "duplicate-id") return `${location}: duplicate ID ${issue.actualId}`;
    if (issue.kind === "missing-entry") return `${location}: missing linked entry ${issue.expectedId}`;
    if (issue.kind === "extra-entry") return `${location}: contains unpaired entry ${issue.actualId}`;
    return `${location}: default entry is not paired`;
  });
}
