import type { ResumeLocale } from "../lib/resume-schema";
import type { ResumeSynchronizationFailure } from "../lib/resume-server";

/** A failure the editor shows through `editor.text[key]` (EN/PL dictionaries). */
export type EditorFailureMessage = { locale: ResumeLocale; key: string; params: Record<string, string> };

export const LEGACY_PAIRING_MESSAGE =
  "{locale}: this older language version does not match the default language's entries ({collections}), so it was left unchanged. Make its entries match the default language, then save again.";
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
      ? { locale: failure.locale, key: LEGACY_PAIRING_MESSAGE, params: { locale: failure.locale, collections: [...new Set(failure.conflicts.map((conflict) => conflict.collection))].join(", ") } }
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
