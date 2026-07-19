import type { SessionActor } from "../auth-types";
import { isFeatureFlagEnabled } from "../platform-feature-flags";

export const BETA_TEST_SCENARIOS_FLAG_KEY = "beta_test_scenarios_visible";

type FlagReader = (key: string) => Promise<boolean>;

// Per-user is_test_user is the access gate (ADR 0020); the platform flag is a
// master kill-switch checked second so non-test users never trigger a flag read.
export async function canViewTestScenarios(
  actor: Pick<SessionActor, "isTestUser">,
  readFlag: FlagReader = isFeatureFlagEnabled,
): Promise<boolean> {
  if (actor.isTestUser !== true) {
    return false;
  }
  return readFlag(BETA_TEST_SCENARIOS_FLAG_KEY);
}
