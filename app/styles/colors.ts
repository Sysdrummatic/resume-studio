import type { AppTheme } from "../lib/app-theme";

const brandColors = {
  primary: "#5E6AD2",
  secondary: "#6872D9",
  accent: "#009c8a",
} as const;

const semanticColors = {
  success: { bg: "#dcfce7", text: "#14532d", border: "#166534" },
  warning: { bg: "#fef9c3", text: "#713f12", border: "#854d0e" },
  error: { bg: "#fee2e2", text: "#7f1d1d", border: "#991b1b" },
} as const;

const themeTextColors = {
  dark: {
    primary: "#EDEDEF",
    secondary: "#C7CBD3",
    muted: "#8A8F98",
  },
  light: {
    primary: "#1C1B1F",
    secondary: "#49454F",
    muted: "#625F69",
  },
} as const;

const appThemeColors = {
  dark: {
    backgroundDeep: "#020203",
    background: "#050506",
    backgroundElevated: "#0a0a0c",
    surface: "rgba(255, 255, 255, 0.05)",
    surfaceHover: "rgba(255, 255, 255, 0.08)",
    glassBorder: "rgba(255, 255, 255, 0.06)",
    glassBorderHover: "rgba(255, 255, 255, 0.1)",
    glassBgLight: "rgba(255, 255, 255, 0.05)",
    glassBgDark: "rgba(10, 10, 12, 0.88)",
    accentGlow: "rgba(94, 106, 210, 0.3)",
    text: themeTextColors.dark,
  },
  light: {
    backgroundDeep: "#F3EFF8",
    background: "#FAF8FF",
    backgroundElevated: "#FFFFFF",
    surface: "#F6F1FA",
    surfaceHover: "#EFE8F7",
    glassBorder: "#DDD6E3",
    glassBorderHover: "#C9C1CF",
    glassBgLight: "rgba(255, 255, 255, 0.96)",
    glassBgDark: "rgba(240, 235, 244, 0.9)",
    accentGlow: "rgba(103, 80, 164, 0.12)",
    text: themeTextColors.light,
  },
} as const satisfies Record<
  AppTheme,
  {
    backgroundDeep: string;
    background: string;
    backgroundElevated: string;
    surface: string;
    surfaceHover: string;
    glassBorder: string;
    glassBorderHover: string;
    glassBgLight: string;
    glassBgDark: string;
    accentGlow: string;
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
  }
>;

export const colors = {
  brand: brandColors,
  theme: appThemeColors,
  dark: appThemeColors.dark,
  light: appThemeColors.light,
  text: {
    darkApp: appThemeColors.dark.text,
    lightDoc: appThemeColors.light.text,
  },
  semantic: semanticColors,
} as const;

export function getThemeColors(theme: AppTheme) {
  return colors.theme[theme];
}

export function getThemeTextColors(theme: AppTheme) {
  return getThemeColors(theme).text;
}
