export const APP_THEME_CONFIG = {
  dark: {
    label: "Dark",
    colorScheme: "dark",
    enabled: true,
  },
  light: {
    label: "Light",
    colorScheme: "light",
    enabled: true,
  },
} as const;

export type AppTheme = keyof typeof APP_THEME_CONFIG;

export const APP_THEMES = Object.freeze(
  Object.keys(APP_THEME_CONFIG) as AppTheme[],
);

/** Fallback only where a concrete theme is needed before the document is read; the portal itself follows the system until the user picks a theme. */
export const DEFAULT_APP_THEME: AppTheme = "dark";
export const APP_THEME_COOKIE_NAME = "OpenCiVera-theme";
export const APP_THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const ENABLED_APP_THEMES = Object.freeze(
  APP_THEMES.filter((theme) => APP_THEME_CONFIG[theme].enabled),
);

export function isAppTheme(value: string): value is AppTheme {
  return Object.hasOwn(APP_THEME_CONFIG, value);
}

export function isAppThemeEnabled(theme: AppTheme): boolean {
  return APP_THEME_CONFIG[theme].enabled;
}

export function resolveAppTheme(theme?: string | null): AppTheme {
  if (!theme || !isAppTheme(theme) || !isAppThemeEnabled(theme)) {
    return DEFAULT_APP_THEME;
  }

  return theme;
}

/** The theme the user picked in the top bar, or null when the portal follows the system (ADR 0012, #289). */
export function readStoredAppTheme(theme?: string | null): AppTheme | null {
  return theme && isAppTheme(theme) && isAppThemeEnabled(theme) ? theme : null;
}

export function getAppThemeMeta(theme: AppTheme) {
  return APP_THEME_CONFIG[theme];
}

export function getNextAppTheme(theme: AppTheme): AppTheme {
  const enabledThemes = ENABLED_APP_THEMES;
  const currentThemeIndex = enabledThemes.indexOf(theme);

  if (currentThemeIndex === -1) {
    return DEFAULT_APP_THEME;
  }

  return enabledThemes[(currentThemeIndex + 1) % enabledThemes.length];
}
