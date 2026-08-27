/**
 * Minimum length for a NEWLY SET password (signup, reset, change) — must stay
 * in sync with the `password_min_length` value in each Supabase project's
 * live auth config (not `supabase/config.toml`, which only governs local
 * dev and drifted from production before 2026-08-26). Do not use this for
 * the sign-in form's pre-flight check: existing accounts may predate this
 * value, so raising sign-in's check to match would lock out real users
 * before their actual (still-valid, shorter) password ever reaches Supabase.
 */
export const NEW_PASSWORD_MIN_LENGTH = 10;
