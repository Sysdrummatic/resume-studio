export type InitialAuthMode = "signin" | "signup" | "reset";

/** The /login mode from `?mode=`; a missing or unknown value opens sign-in. */
export function resolveAuthMode(value?: string | null): InitialAuthMode {
  if (value === "signup" || value === "reset") {
    return value;
  }

  return "signin";
}
