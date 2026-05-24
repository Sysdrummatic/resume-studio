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

export const DEFAULT_APP_THEME: AppTheme = "dark";
export const APP_THEME_COOKIE_NAME = "OpenCiVera-theme";
export const APP_THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const ENABLED_APP_THEMES = Object.freeze(
  APP_THEMES.filter((theme) => APP_THEME_CONFIG[theme].enabled),
);

export function isAppTheme(value: string): value is AppTheme {
  return value in APP_THEME_CONFIG;
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
