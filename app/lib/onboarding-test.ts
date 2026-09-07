import type { OnboardingState } from "./resume-onboarding";

export type OnboardingTestRun = OnboardingState & {
  id: string;
  auto_start: boolean;
  drafts: Record<string, string>;
  selections: Record<string, unknown>;
  created_at: string;
};

export function isTestRunId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
