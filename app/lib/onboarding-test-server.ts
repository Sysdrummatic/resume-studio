import { callRpc, queryTable } from "./supabase-http";
import type { OnboardingTestRun } from "./onboarding-test";

export async function fetchOnboardingTest(accessToken: string, userId: string, runId?: string): Promise<OnboardingTestRun | null> {
  const result = await queryTable<OnboardingTestRun>({ table: "resume_onboarding_test_runs", accessToken,
    select: "id,status,auto_start,step,locale,method,ui_language,imported,first_preset_id,drafts,selections,created_at",
    query: `user_id=eq.${encodeURIComponent(userId)}&${runId ? `id=eq.${encodeURIComponent(runId)}&` : ""}order=created_at.desc&limit=1` });
  if (result.error) throw new Error("Could not load test settings.");
  return result.data?.[0] ?? null;
}

export async function onboardingTestRpc<T>(accessToken: string, name: string, payload: Record<string, unknown>): Promise<T> {
  const result = await callRpc<T>({ accessToken, functionName: name, payload });
  const data = Array.isArray(result.data) ? result.data[0] : result.data;
  if (result.error || !data) throw new Error("Could not save onboarding test.");
  return data as T;
}
