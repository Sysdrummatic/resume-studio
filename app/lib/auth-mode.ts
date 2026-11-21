export type InitialAuthMode = "signin" | "signup" | "reset";

/**
 * The /login mode from `?mode=` (a string, or every value from `getAll` / Next's repeated-param array).
 * Exactly one "signup" or "reset" is kept; a missing, unknown or repeated mode opens sign-in.
 */
export function resolveAuthMode(value?: string | string[] | null): InitialAuthMode {
  const mode = Array.isArray(value) ? (value.length === 1 ? value[0] : undefined) : value;
  if (mode === "signup" || mode === "reset") {
    return mode;
  }

  return "signin";
}
