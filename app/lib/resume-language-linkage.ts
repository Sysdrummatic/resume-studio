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

type LinkageMetadata = {
  entries?: Partial<Record<LinkedResumeCollection, string[]>>;
};

function asObject(value: unknown): RawObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RawObject) : {};
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function newEntryId(): string {
  return crypto.randomUUID();
}

function validEntryId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function idsForCollection(source: RawObject, collection: LinkedResumeCollection): Array<string | null> {
  if (collection === "tech_stack" || collection === "interests") {
    const items = Array.isArray(source[collection]) ? source[collection] : [];
    const linkage = asObject(source[RESUME_LINKAGE_KEY]);
    const entries = asObject(linkage.entries);
    const ids = Array.isArray(entries[collection]) ? entries[collection] : [];
    return items.map((_, index) => validEntryId(ids[index]) ? ids[index] : null);
  }
  const items = Array.isArray(source[collection]) ? source[collection] : [];
  return items.map((item) => {
    const id = asObject(item).entry_id;
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
  if (collection === "tech_stack" || collection === "interests") return String(item ?? "").trim();
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
    tech_stack: [],
    interests: [],
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

    actual.forEach((id, index) => {
      if (!id) {
        issues.push({ kind: "missing-id", collection, index });
        return;
      }
      if (duplicateIds(actual).has(id)) {
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
    actual.forEach((id, index) => {
      if (!id) {
        const previousId = expected[index];
        if (previousId && linkageFingerprint(previous, collection, index) === linkageFingerprint(current, collection, index)) {
          issues.push({ kind: "missing-id", collection, index, expectedId: previousId });
        }
        return;
      }
      if (duplicateIds(actual).has(id)) {
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

function ensureObjectEntryIds(source: RawObject, collection: Exclude<LinkedResumeCollection, "tech_stack" | "interests">): void {
  const items = Array.isArray(source[collection]) ? source[collection] : [];
  source[collection] = items.map((item) => {
    const row = asObject(item);
    return { ...row, entry_id: validEntryId(row.entry_id) ? row.entry_id : newEntryId() };
  });
}

function ensureStringEntryIds(source: RawObject, collection: "tech_stack" | "interests", entries: Partial<Record<LinkedResumeCollection, string[]>>): void {
  const items = Array.isArray(source[collection]) ? source[collection] : [];
  const previous = Array.isArray(entries[collection]) ? entries[collection] || [] : [];
  entries[collection] = items.map((_, index) => validEntryId(previous[index]) ? previous[index] : newEntryId());
}

/** Adds stable private IDs without changing the public resume fields. */
export function ensureResumeEntryIds(value: unknown): RawObject {
  const source = clone(asObject(value));
  const linkage = asObject(source[RESUME_LINKAGE_KEY]) as LinkageMetadata;
  const entries = asObject(linkage.entries) as Partial<Record<LinkedResumeCollection, string[]>>;

  for (const collection of LINKED_RESUME_COLLECTIONS) {
    if (collection === "tech_stack" || collection === "interests") {
      ensureStringEntryIds(source, collection, entries);
    } else {
      ensureObjectEntryIds(source, collection);
    }
  }

  source[RESUME_LINKAGE_KEY] = { ...linkage, entries };
  return source;
}

function emptyTranslationRow(collection: Exclude<LinkedResumeCollection, "tech_stack" | "interests">, source: RawObject): RawObject {
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

function seedLegacyIdsFromCanonical(value: unknown, canonical: RawObject): RawObject {
  const source = clone(asObject(value));
  const seeded = ensureResumeEntryIds(canonical);
  for (const collection of LINKED_RESUME_COLLECTIONS) {
    if (collection === "tech_stack" || collection === "interests") {
      const sourceLinkage = asObject(source[RESUME_LINKAGE_KEY]);
      const sourceEntries = asObject(sourceLinkage.entries);
      const canonicalEntries = asObject(asObject(seeded[RESUME_LINKAGE_KEY]).entries);
      const current = Array.isArray(sourceEntries[collection]) ? sourceEntries[collection] : [];
      const expected = Array.isArray(canonicalEntries[collection]) ? canonicalEntries[collection] : [];
      source[RESUME_LINKAGE_KEY] = {
        ...sourceLinkage,
        entries: { ...sourceEntries, [collection]: current.map((id, index) => validEntryId(id) ? id : expected[index] || newEntryId()) },
      };
      continue;
    }
    const items = Array.isArray(source[collection]) ? source[collection] : [];
    const expected = Array.isArray(seeded[collection]) ? seeded[collection] : [];
    source[collection] = items.map((item, index) => {
      const row = asObject(item);
      return { ...row, entry_id: validEntryId(row.entry_id) ? row.entry_id : entryId(expected[index]) || newEntryId() };
    });
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
    if (collection === "tech_stack" || collection === "interests") {
      template[collection] = Array.isArray(source[collection]) ? source[collection].map(() => "") : [];
      continue;
    }
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
export function reconcileResumeLanguageDocument(defaultValue: unknown, localeValue: unknown): RawObject {
  const defaultSource = ensureResumeEntryIds(defaultValue);
  const localeSource = seedLegacyIdsFromCanonical(localeValue, defaultSource);
  const result = clone(localeSource);

  for (const collection of LINKED_RESUME_COLLECTIONS) {
    if (collection === "tech_stack" || collection === "interests") {
      const defaultItems = Array.isArray(defaultSource[collection]) ? defaultSource[collection] : [];
      const localeItems = Array.isArray(localeSource[collection]) ? localeSource[collection] : [];
      const localeEntries = asObject(asObject(localeSource[RESUME_LINKAGE_KEY]).entries);
      const defaultEntries = asObject(asObject(defaultSource[RESUME_LINKAGE_KEY]).entries);
      const defaultIds = Array.isArray(defaultEntries[collection]) ? defaultEntries[collection] : [];
      const localeIds = Array.isArray(localeEntries[collection]) ? localeEntries[collection] : [];
      const localeById = new Map(localeIds.map((id, index) => [id, localeItems[index]]));
      const nextIds = defaultIds.map((id) => id);
      result[collection] = defaultIds.map((id) => localeById.get(id) ?? "");
      const nextLinkage = asObject(result[RESUME_LINKAGE_KEY]);
      const nextEntries = asObject(nextLinkage.entries);
      result[RESUME_LINKAGE_KEY] = { ...nextLinkage, entries: { ...nextEntries, [collection]: nextIds } };
      void defaultItems;
      continue;
    }

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
