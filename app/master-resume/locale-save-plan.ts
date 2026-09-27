import type { ResumeLocale } from "../lib/resume-schema";
import type { ResumeSynchronizationFailure } from "../lib/resume-server";

/** A failure the editor shows through `editor.text[key]` (EN/PL dictionaries). */
export type EditorFailureMessage = { locale: ResumeLocale; key: string; params: Record<string, string> };

export const LEGACY_PAIRING_MESSAGE =
  "{locale}: this older language version does not match the default language's entries ({collections}), so it was left unchanged. Make its entries match the default language, then save again.";
export const LEGACY_PAIRING_AMBIGUOUS_MESSAGE =
  "{locale}: the order of this older language version's entries cannot be verified ({collections}), so it was left unchanged. Save this language version and confirm the order to link it.";
export const LEGACY_PAIRING_CONFIRM_PROMPT =
  "{locale}: are the entries in {collections} in the same order as in the default language? They will be linked by their order.";

type LegacyConflict = { collection: string; reason: string };
type LegacyConflictPayload = { code?: string; legacyConflicts?: LegacyConflict[] };

function legacyConflictMessages(locale: ResumeLocale, conflicts: LegacyConflict[]): { message: EditorFailureMessage; prompt: EditorFailureMessage | null } {
  const params = { locale, collections: [...new Set(conflicts.map((conflict) => conflict.collection))].join(", ") };
  const confirmable = conflicts.length > 0 && conflicts.every((conflict) => conflict.reason === "ambiguous");
  return {
    message: { locale, key: confirmable ? LEGACY_PAIRING_AMBIGUOUS_MESSAGE : LEGACY_PAIRING_MESSAGE, params },
    prompt: confirmable ? { locale, key: LEGACY_PAIRING_CONFIRM_PROMPT, params } : null,
  };
}

/**
 * Reads `409 { code: "legacy-pairing", legacyConflicts }` by its code, never by
 * the server's English text. `prompt` is set only when every conflict is
 * `ambiguous`, i.e. when a user confirmation of the order may resolve it.
 */
export function legacyConflictFailure(payload: LegacyConflictPayload, locale: ResumeLocale): { message: EditorFailureMessage; prompt: EditorFailureMessage | null } | null {
  if (payload.code !== "legacy-pairing") return null;
  return legacyConflictMessages(locale, payload.legacyConflicts ?? []);
}

/**
 * Sends a save; on an ambiguous legacy-pairing conflict asks the user once and
 * resends with the confirmation. Count and order conflicts are never resent.
 */
export async function saveWithLegacyConfirmation<P extends LegacyConflictPayload>(
  locale: ResumeLocale,
  send: (confirmLegacyPairing: boolean) => Promise<{ status: number; payload: P }>,
  confirm?: (prompt: EditorFailureMessage) => boolean | Promise<boolean>,
): Promise<{ status: number; payload: P }> {
  const first = await send(false);
  const prompt = first.status === 409 ? legacyConflictFailure(first.payload, locale)?.prompt : null;
  if (!prompt || !confirm || !(await confirm(prompt))) return first;
  return send(true);
}

export const TRANSLATION_DUPLICATE_IDS_MESSAGE =
  "{locale}: this language version uses one entry ID for different entries ({collections}), so it was left unchanged. Give its entries the default language's IDs, then save it again.";

export const DEFAULT_DUPLICATE_IDS_MESSAGE =
  "{locale}: the default language version ({defaultLocale}) uses one entry ID for different entries, so this language cannot be linked to it. Save the default language with unique IDs first.";

/** Reads `409 { code: "default-duplicate-ids" }` by its code, never by the server's English text. */
export function defaultDuplicateIdsFailure(
  payload: { code?: string; defaultLocale?: string; locale?: string; linkageIssues?: Array<{ collection: string }> },
  locale: ResumeLocale,
): EditorFailureMessage | null {
  if (payload.code === "duplicate-ids") {
    const blocked = payload.locale ?? locale;
    return { locale: blocked, key: TRANSLATION_DUPLICATE_IDS_MESSAGE, params: { locale: blocked, collections: [...new Set((payload.linkageIssues ?? []).map((issue) => issue.collection))].join(", ") } };
  }
  if (payload.code !== "default-duplicate-ids") return null;
  return { locale, key: DEFAULT_DUPLICATE_IDS_MESSAGE, params: { locale, defaultLocale: payload.defaultLocale ?? "" } };
}

export const NOT_SYNCHRONIZED_MESSAGE = "{locale}: not synchronized with the default language. Save again to retry.";
export const SYNCHRONIZATION_UNCHECKED_MESSAGE =
  "{locale}: saved, but the other language versions could not be checked. Save again to retry the synchronization.";

export const PARTIAL_SAVE_MESSAGE =
  "{locale}: saved, but the revision history or public profile could not be updated. Save again to finish.";

/**
 * A save the server stored but could not finish (`saved: true`). The editor
 * takes `document` as its new base so the retry is not a conflict, and keeps the
 * language dirty so "save again" resends it.
 */
export function partialSaveFailure<T extends { updated_at: string }>(
  payload: { saved?: boolean; document?: T },
  locale: ResumeLocale,
): { document: T; message: EditorFailureMessage } | null {
  if (!payload.saved || !payload.document) return null;
  return { document: payload.document, message: { locale, key: PARTIAL_SAVE_MESSAGE, params: { locale } } };
}

/** Turns the sync outcome of a default-language save into editor messages; empty only for a full sync. */
export function synchronizationFailureMessages(
  payload: { synchronizationFailed?: ResumeSynchronizationFailure[]; synchronizationComplete?: boolean },
  defaultLocale: ResumeLocale,
): EditorFailureMessage[] {
  const messages: EditorFailureMessage[] = (payload.synchronizationFailed ?? []).map((failure): EditorFailureMessage =>
    failure.reason === "legacy-pairing"
      ? legacyConflictMessages(failure.locale, failure.conflicts).message
      : failure.reason === "duplicate-ids"
        ? { locale: failure.locale, key: TRANSLATION_DUPLICATE_IDS_MESSAGE, params: { locale: failure.locale, collections: [...new Set(failure.issues.map((issue) => issue.collection))].join(", ") } }
        : { locale: failure.locale, key: NOT_SYNCHRONIZED_MESSAGE, params: { locale: failure.locale } },
  );
  if (payload.synchronizationComplete === false) {
    messages.push({ locale: defaultLocale, key: SYNCHRONIZATION_UNCHECKED_MESSAGE, params: { locale: defaultLocale } });
  }
  return messages;
}

/**
 * Saves translations first and the default language last. The default's save
 * rewrites every translation on the server (ADR 0023 §4), so it has to run once
 * their newest text is stored. Outcomes stay aligned with `targets`.
 */
export async function saveLocalesInOrder<T>(
  targets: ResumeLocale[],
  defaultLocale: ResumeLocale,
  save: (locale: ResumeLocale) => Promise<T>,
): Promise<Array<PromiseSettledResult<T>>> {
  const translations = targets.filter((locale) => locale !== defaultLocale);
  const translationOutcomes = await Promise.allSettled(translations.map(save));
  const defaultOutcome = targets.includes(defaultLocale) ? (await Promise.allSettled([save(defaultLocale)]))[0] : null;
  return targets.map((locale) => (locale === defaultLocale ? defaultOutcome! : translationOutcomes[translations.indexOf(locale)]));
}

type PlannedBuffer = {
  documentRow: { updated_at: string } | null;
  yamlPanel: string;
  savedYamlContent: string;
  cvStyle: unknown;
  savedCvStyle: unknown;
};

/**
 * What to do with a buffer whose document the server rewrote from
 * `previousUpdatedAt`. Only a rewrite of the exact version the editor holds is
 * adopted; anything else stays stale so the next save is a reported conflict.
 */
export function planSynchronizedBuffer(buffer: PlannedBuffer, previousUpdatedAt: string): "replace" | "rebase" | "stale" {
  if (buffer.documentRow?.updated_at !== previousUpdatedAt) return "stale";
  const dirty = buffer.yamlPanel !== buffer.savedYamlContent || JSON.stringify(buffer.cvStyle) !== JSON.stringify(buffer.savedCvStyle);
  return dirty ? "rebase" : "replace";
}
