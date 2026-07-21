import type { SessionActor } from "../auth-types";
import { isFeatureFlagEnabled } from "../platform-feature-flags";
import { isAdminRole } from "../rbac";

export const BETA_TEST_SCENARIOS_FLAG_KEY = "beta_test_scenarios_visible";

type FlagReader = (key: string) => Promise<boolean>;

// Admin sees every docs section unconditionally (ADR 0021). For everyone else,
// per-user is_test_user is the access gate (ADR 0020); the platform flag is a
// master kill-switch checked last so non-test users never trigger a flag read.
export async function canViewTestScenarios(
  actor: Pick<SessionActor, "isTestUser" | "role">,
  readFlag: FlagReader = isFeatureFlagEnabled,
): Promise<boolean> {
  if (isAdminRole(actor.role)) {
    return true;
  }
  if (actor.isTestUser !== true) {
    return false;
  }
  return readFlag(BETA_TEST_SCENARIOS_FLAG_KEY);
}
