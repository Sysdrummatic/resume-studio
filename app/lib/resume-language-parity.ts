/**
 * Language versions of one CV are parallel lists (ADR 0024): entry N of every
 * version is the same entry, and every version has the same number of entries
 * and of bullets per experience entry. There is no ID in the YAML. Structure is
 * changed by explicit index operations applied to every version at once, and the
 * platform validates the result instead of trusting metadata.
 *
 * Everything here is pure and works on plain parsed YAML objects, so the editor
 * (typed buffers), the server (raw documents) and the migration share it.
 */

export const PARALLEL_COLLECTIONS = [
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

export type ParallelCollection = (typeof PARALLEL_COLLECTIONS)[number];

type RawObject = Record<string, unknown>;

export type LanguageDocuments = Record<string, RawObject>;

export type StructuralOp =
  | { kind: "add"; collection: ParallelCollection; item?: unknown }
  | { kind: "remove"; collection: ParallelCollection; index: number }
  | { kind: "move"; collection: ParallelCollection; from: number; to: number }
  | { kind: "highlight-add"; entryIndex: number; item?: string }
  | { kind: "highlight-remove"; entryIndex: number; index: number }
  | { kind: "highlight-move"; entryIndex: number; from: number; to: number };

export type ParityIssue =
  | { kind: "count"; locale: string; collection: ParallelCollection; expected: number; actual: number }
  | { kind: "neutral"; locale: string; collection: ParallelCollection; index: number; field: string }
  | { kind: "highlights"; locale: string; collection: "experience"; index: number; expected: number; actual: number }
  | { kind: "summary-default"; locale: string; collection: "summary"; expected: number; actual: number };

export type TruncatedEntry = { locale: string; collection: ParallelCollection; index: number; hasContent: boolean; bulletIndex?: number };

/**
 * Fields that are identical in every version; the saved version wins when they are
 * copied. Contact and QR rows have none: a location or a link may be translated.
 */
const NEUTRAL_FIELDS: Partial<Record<ParallelCollection, string[]>> = {
  skills: ["level"],
  languages: ["level"],
  experience: ["period", "company"],
  education: ["period", "school"],
  courses: ["year"],
};

/** Fields a translator fills in. Text lists are their own single field. */
const TRANSLATABLE_FIELDS: Partial<Record<ParallelCollection, string[]>> = {
  summary: ["position", "description"],
  skills: ["name"],
  languages: ["name", "level_text"],
  experience: ["role"],
  education: ["degree", "detail"],
  courses: ["name"],
};

const TEXT_LISTS = new Set<ParallelCollection>(["tech_stack", "interests"]);

function asObject(value: unknown): RawObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RawObject) : {};
}

function rowsOf(document: RawObject, collection: ParallelCollection): unknown[] {
  return Array.isArray(document[collection]) ? (document[collection] as unknown[]) : [];
}

function highlightsOf(row: unknown): string[] {
  const value = asObject(row).highlights;
  return Array.isArray(value) ? (value as unknown[]).map((item) => String(item ?? "")) : [];
}

function isFilled(value: unknown): boolean {
  return String(value ?? "").trim().length > 0;
}

function sameValue(left: unknown, right: unknown): boolean {
  return String(left ?? "").trim() === String(right ?? "").trim();
}

function withoutEntryId(row: unknown): unknown {
  if (!row || typeof row !== "object" || Array.isArray(row)) return row;
  const rest = { ...(row as RawObject) };
  delete rest.entry_id;
  return rest;
}

/** The empty row a new version (or an added entry) gets: neutral fields copied, translatable ones blank. */
function blankSlot(collection: ParallelCollection, source: unknown): unknown {
  if (TEXT_LISTS.has(collection)) return "";
  const row = asObject(withoutEntryId(source));
  const blank: RawObject = { ...row };
  for (const field of TRANSLATABLE_FIELDS[collection] ?? []) blank[field] = "";
  if (collection === "experience") blank.highlights = highlightsOf(row).map(() => "");
  return blank;
}

export function rowHasTranslatedContent(collection: ParallelCollection, row: unknown): boolean {
  if (TEXT_LISTS.has(collection)) return isFilled(row);
  const value = asObject(row);
  if ((TRANSLATABLE_FIELDS[collection] ?? []).some((field) => isFilled(value[field]))) return true;
  return collection === "experience" && highlightsOf(row).some(isFilled);
}

/** Removes `entry_id` from rows and the `__ocv` block (older documents still carry them). */
export function stripEntryIds<T extends object>(document: T): T {
  const copy = structuredClone(document) as RawObject;
  delete copy.__ocv;
  for (const collection of PARALLEL_COLLECTIONS) {
    if (Array.isArray(copy[collection])) copy[collection] = (copy[collection] as unknown[]).map(withoutEntryId);
  }
  return copy as T;
}

/** A new language: same entries and bullets as the source, empty values to fill in. */
export function buildLanguageTemplate<T extends object>(source: T): T {
  const template = stripEntryIds(source) as RawObject;
  for (const collection of PARALLEL_COLLECTIONS) {
    template[collection] = rowsOf(template, collection).map((row) => blankSlot(collection, row));
  }
  template.gdpr_clause = "";
  return template as T;
}

function copyNeutralFields(collection: ParallelCollection, row: unknown, source: unknown): unknown {
  const fields = NEUTRAL_FIELDS[collection];
  if (!fields || !row || typeof row !== "object") return row;
  const next: RawObject = { ...(row as RawObject) };
  const sourceRow = asObject(source);
  for (const field of fields) if (field in sourceRow) next[field] = sourceRow[field];
  return next;
}

function defaultSummaryIndex(document: RawObject): number {
  return rowsOf(document, "summary").findIndex((row) => asObject(row).default === true);
}

/** Checks every version against the reference version: entry count, neutral fields, bullets, default summary. */
export function inspectParity(documents: LanguageDocuments, referenceLocale: string): ParityIssue[] {
  const reference = asObject(documents[referenceLocale]);
  const issues: ParityIssue[] = [];
  for (const [locale, value] of Object.entries(documents)) {
    if (locale === referenceLocale) continue;
    const document = asObject(value);
    for (const collection of PARALLEL_COLLECTIONS) {
      const expectedRows = rowsOf(reference, collection);
      const actualRows = rowsOf(document, collection);
      if (expectedRows.length !== actualRows.length) {
        issues.push({ kind: "count", locale, collection, expected: expectedRows.length, actual: actualRows.length });
      }
      const shared = Math.min(expectedRows.length, actualRows.length);
      for (let index = 0; index < shared; index += 1) {
        for (const field of NEUTRAL_FIELDS[collection] ?? []) {
          if (!sameValue(asObject(expectedRows[index])[field], asObject(actualRows[index])[field])) {
            issues.push({ kind: "neutral", locale, collection, index, field });
          }
        }
        if (collection === "experience") {
          const expected = highlightsOf(expectedRows[index]).length;
          const actual = highlightsOf(actualRows[index]).length;
          if (expected !== actual) issues.push({ kind: "highlights", locale, collection, index, expected, actual });
        }
      }
    }
    const expectedDefault = defaultSummaryIndex(reference);
    const actualDefault = defaultSummaryIndex(document);
    if (expectedDefault !== actualDefault) issues.push({ kind: "summary-default", locale, collection: "summary", expected: expectedDefault, actual: actualDefault });
  }
  return issues;
}

export type ParityDifference = {
  percent: number;
  worst: string | null;
  perLocale: Array<{ locale: string; percent: number; mismatches: number; total: number }>;
};

function mismatchUnits(issue: ParityIssue): number {
  if (issue.kind === "count" || issue.kind === "highlights") return Math.abs(issue.expected - issue.actual);
  return 1;
}

/** How far the current version's structure is from each other version, as a percentage of all slots. */
export function parityDifference(current: RawObject, others: LanguageDocuments): ParityDifference {
  const perLocale = Object.entries(others).map(([locale, other]) => {
    const issues = inspectParity({ __current: current, [locale]: other }, "__current");
    const mismatches = issues.reduce((sum, issue) => sum + mismatchUnits(issue), 0);
    let total = 0;
    for (const collection of PARALLEL_COLLECTIONS) {
      const left = rowsOf(current, collection);
      const right = rowsOf(asObject(other), collection);
      total += Math.max(left.length, right.length);
      if (collection === "experience") {
        for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
          total += Math.max(highlightsOf(left[index]).length, highlightsOf(right[index]).length);
        }
      }
    }
    const percent = mismatches === 0 ? 0 : Math.min(100, Math.max(1, Math.round((100 * mismatches) / Math.max(total, 1))));
    return { locale, percent, mismatches, total };
  });
  const worst = perLocale.reduce<(typeof perLocale)[number] | null>((top, entry) => (!top || entry.percent > top.percent ? entry : top), null);
  return { percent: worst?.percent ?? 0, worst: worst && worst.percent > 0 ? worst.locale : null, perLocale };
}

function alignRows(collection: ParallelCollection, source: unknown[], rows: unknown[], locale: string, truncated: TruncatedEntry[]): unknown[] {
  const aligned = rows.slice(0, source.length);
  rows.slice(source.length).forEach((row, offset) => {
    truncated.push({ locale, collection, index: source.length + offset, hasContent: rowHasTranslatedContent(collection, row) });
  });
  for (let index = aligned.length; index < source.length; index += 1) aligned.push(blankSlot(collection, source[index]));
  return aligned.map((row, index) => copyNeutralFields(collection, row, source[index]));
}

function alignHighlights(row: unknown, sourceRow: unknown, locale: string, entryIndex: number, truncated: TruncatedEntry[]): unknown {
  if (!row || typeof row !== "object") return row;
  const wanted = highlightsOf(sourceRow).length;
  const bullets = highlightsOf(row);
  bullets.slice(wanted).forEach((bullet, offset) => {
    truncated.push({ locale, collection: "experience", index: entryIndex, bulletIndex: wanted + offset, hasContent: isFilled(bullet) });
  });
  const aligned = bullets.slice(0, wanted);
  while (aligned.length < wanted) aligned.push("");
  return { ...(row as RawObject), highlights: aligned };
}

/**
 * Brings every other version to the structure of `sourceLocale`: missing entries
 * and bullets become empty slots at the end, surplus ones are cut from the end
 * (reported, so the caller can ask first), neutral fields are copied.
 */
export function matchOthersToVersion(documents: LanguageDocuments, sourceLocale: string): { documents: LanguageDocuments; truncated: TruncatedEntry[] } {
  const source = asObject(documents[sourceLocale]);
  const truncated: TruncatedEntry[] = [];
  const result: LanguageDocuments = { [sourceLocale]: documents[sourceLocale] };
  for (const [locale, value] of Object.entries(documents)) {
    if (locale === sourceLocale) continue;
    const document = structuredClone(asObject(value));
    for (const collection of PARALLEL_COLLECTIONS) {
      const sourceRows = rowsOf(source, collection);
      let rows = alignRows(collection, sourceRows, rowsOf(document, collection), locale, truncated);
      if (collection === "experience") rows = rows.map((row, index) => alignHighlights(row, sourceRows[index], locale, index, truncated));
      document[collection] = rows;
    }
    const defaultIndex = defaultSummaryIndex(source);
    document.summary = rowsOf(document, "summary").map((row, index) => ({ ...asObject(row), default: index === defaultIndex }));
    result[locale] = document;
  }
  return { documents: result, truncated };
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function applyOp(document: RawObject, op: StructuralOp, isSource: boolean): void {
  if (op.kind === "add") {
    const rows = [...rowsOf(document, op.collection)];
    rows.push(isSource ? op.item : blankSlot(op.collection, op.item));
    document[op.collection] = rows;
    return;
  }
  if (op.kind === "remove") {
    document[op.collection] = rowsOf(document, op.collection).filter((_, index) => index !== op.index);
    return;
  }
  if (op.kind === "move") {
    document[op.collection] = moveItem(rowsOf(document, op.collection), op.from, op.to);
    return;
  }
  const rows = [...rowsOf(document, "experience")];
  const row = asObject(rows[op.entryIndex]);
  if (!rows[op.entryIndex]) return;
  const bullets = highlightsOf(row);
  const nextBullets = op.kind === "highlight-add"
    ? [...bullets, isSource ? (op.item ?? "") : ""]
    : op.kind === "highlight-remove"
      ? bullets.filter((_, index) => index !== op.index)
      : moveItem(bullets, op.from, op.to);
  rows[op.entryIndex] = { ...row, highlights: nextBullets };
  document.experience = rows;
}

/** Applies one structural operation to every version; the source version keeps the given item, the others get empty slots. */
export function applyStructuralOpToAll(documents: LanguageDocuments, sourceLocale: string, op: StructuralOp): LanguageDocuments {
  const result: LanguageDocuments = {};
  for (const [locale, value] of Object.entries(documents)) {
    const copy = structuredClone(asObject(value));
    applyOp(copy, op, locale === sourceLocale);
    result[locale] = copy;
  }
  return result;
}

/** How many fields the version still has to fill in: filled in the source, empty here. */
export function untranslatedFieldCount(source: RawObject, version: RawObject): number {
  let count = 0;
  for (const collection of PARALLEL_COLLECTIONS) {
    const sourceRows = rowsOf(source, collection);
    const versionRows = rowsOf(version, collection);
    sourceRows.forEach((sourceRow, index) => {
      const row = versionRows[index];
      if (TEXT_LISTS.has(collection)) {
        if (isFilled(sourceRow) && !isFilled(row)) count += 1;
        return;
      }
      for (const field of TRANSLATABLE_FIELDS[collection] ?? []) {
        if (isFilled(asObject(sourceRow)[field]) && !isFilled(asObject(row)[field])) count += 1;
      }
      if (collection === "experience") {
        const own = highlightsOf(row);
        highlightsOf(sourceRow).forEach((bullet, bulletIndex) => {
          if (isFilled(bullet) && !isFilled(own[bulletIndex])) count += 1;
        });
      }
    });
  }
  return count;
}

/** True while a document still carries `entry_id` fields or an `__ocv` block from before ADR 0024. */
export function hasEntryIds(document: unknown): boolean {
  const source = asObject(document);
  if ("__ocv" in source) return true;
  return PARALLEL_COLLECTIONS.some((collection) => rowsOf(source, collection).some((row) => Boolean(row) && typeof row === "object" && "entry_id" in (row as RawObject)));
}

/**
 * Sets the bullets of one experience entry in the source version and fits every
 * other version to the new count: missing bullets become empty ones at the end,
 * surplus ones are cut from the end (reported, so the caller can ask first).
 */
export function setHighlightsInAll(
  documents: LanguageDocuments,
  sourceLocale: string,
  entryIndex: number,
  bullets: string[],
): { documents: LanguageDocuments; truncated: TruncatedEntry[] } {
  const truncated: TruncatedEntry[] = [];
  const result: LanguageDocuments = {};
  for (const [locale, value] of Object.entries(documents)) {
    const document = structuredClone(asObject(value));
    const rows = [...rowsOf(document, "experience")];
    if (rows[entryIndex]) {
      const current = highlightsOf(rows[entryIndex]);
      let next: string[];
      if (locale === sourceLocale) {
        next = bullets;
      } else {
        current.slice(bullets.length).forEach((bullet, offset) => {
          truncated.push({ locale, collection: "experience", index: entryIndex, bulletIndex: bullets.length + offset, hasContent: isFilled(bullet) });
        });
        next = current.slice(0, bullets.length);
        while (next.length < bullets.length) next.push("");
      }
      rows[entryIndex] = { ...asObject(rows[entryIndex]), highlights: next };
      document.experience = rows;
    }
    result[locale] = document;
  }
  return { documents: result, truncated };
}
