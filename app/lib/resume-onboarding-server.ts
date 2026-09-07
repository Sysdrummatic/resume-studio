import yaml from "js-yaml";
import { callRpc, queryTable, updateTable } from "./supabase-http";
import {
  fetchResumePresetsForUser,
  publishResumePreset,
  type ResumeDocumentRow
} from "./resume-server";
import { normalizeResumeDocument } from "./resume-schema";
import { firstCvSelection, isFirstCvReady, type OnboardingState } from "./resume-onboarding";

export async function fetchOnboarding(
  accessToken: string,
  userId: string
): Promise<OnboardingState | null> {
  const result = await queryTable<OnboardingState>({
    table: "resume_onboarding",
    select: "status,step,locale,method,ui_language,first_preset_id,imported",
    accessToken,
    query: `user_id=eq.${encodeURIComponent(userId)}&limit=1`
  });
  if (result.error) throw new Error("Could not load first-use progress.");
  return result.data?.[0] ?? null;
}

export async function updateOnboarding(
  accessToken: string,
  userId: string,
  values: Record<string, unknown>
) {
  const result = await updateTable({
    table: "resume_onboarding",
    accessToken,
    query: `user_id=eq.${encodeURIComponent(userId)}&status=neq.completed`,
    values
  });
  if (result.error || !result.data?.[0]) throw new Error("Could not save first-use progress.");
  return result.data[0] as unknown as OnboardingState;
}

export async function completeOnboarding(accessToken: string, userId: string, publish: boolean) {
  const state = await fetchOnboarding(accessToken, userId);
  if (!state) throw new Error("First-use guide is unavailable.");
  const presets = await fetchResumePresetsForUser(userId);
  let preset = presets.find((row) => row.id === state.first_preset_id);
  if (state.status === "completed") return { publicPath: preset?.canonical_public_path ?? null };

  if (publish) {
    if (!preset?.canonical_public_path) {
      const documents = await queryTable<ResumeDocumentRow>({
        table: "resume_documents",
        select: "id,yaml_content,locale",
        accessToken,
        query: `user_id=eq.${encodeURIComponent(userId)}&locale=eq.${encodeURIComponent(state.locale)}&limit=1`
      });
      const document = documents.data?.[0];
      if (documents.error || !document) throw new Error("Master Resume is unavailable.");
      const rawResume = yaml.load(document.yaml_content);
      if (!isFirstCvReady(normalizeResumeDocument(rawResume, "")))
        throw new Error("Add your name and a professional summary before publishing.");
      const selection = firstCvSelection(rawResume);
      const title = state.ui_language === "pl" ? "Moje pierwsze CV" : "My first CV";
      const reservation = await callRpc<string>({
        functionName: "reserve_onboarding_preset",
        accessToken,
        payload: { input_locale: state.locale, input_selection: selection, input_title: title }
      });
      if (reservation.error || !reservation.data)
        throw new Error("Could not create your first CV.");
      preset = (await fetchResumePresetsForUser(userId)).find((row) => row.id === reservation.data);
      if (!preset?.canonical_public_path) {
        preset =
          (await publishResumePreset(accessToken, userId, reservation.data, {
            allowIndexing: false,
            defaultLocale: state.locale,
            selectedLocales: [state.locale]
          })) ?? undefined;
      }
      if (!preset?.canonical_public_path) throw new Error("Could not publish your first CV.");
    }
  }
  try {
    await updateOnboarding(accessToken, userId, { status: "completed" });
  } catch (error) {
    if ((await fetchOnboarding(accessToken, userId))?.status !== "completed") throw error;
  }
  return { publicPath: publish ? (preset?.canonical_public_path ?? null) : null };
}
