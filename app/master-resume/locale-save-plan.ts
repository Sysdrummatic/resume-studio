import type { ResumeLocale } from "../lib/resume-schema";
import type { ParityIssue } from "../lib/resume-language-parity";

/** A failure the editor shows through `editor.text[key]` (EN/PL dictionaries). */
export type EditorFailureMessage = { locale: ResumeLocale; key: string; params: Record<string, string> };

export const PARITY_MESSAGE =
  "{locale}: the language versions do not have the same entries ({collections}). Use Match in the YAML editor, then save again.";

/** Reads `409 { code: "parity", parityIssues }` by its code, never by the server's English text. */
export function parityFailure(payload: { code?: string; parityIssues?: Array<Pick<ParityIssue, "collection">> }, locale: ResumeLocale): EditorFailureMessage | null {
  if (payload.code !== "parity") return null;
  return { locale, key: PARITY_MESSAGE, params: { locale, collections: [...new Set((payload.parityIssues ?? []).map((issue) => issue.collection))].join(", ") } };
}

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
