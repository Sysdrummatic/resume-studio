export const colors = {
  brand: {
    primary: "#6d8cff",
    secondary: "#7d65f7",
    accent: "#009c8a",
  },
  dark: {
    background: "#070a14",
    surface: "#10172a",
    surfaceSoft: "#162038",
    glassBorder: "rgba(122, 139, 199, 0.18)",
    glassBgLight: "rgba(255, 255, 255, 0.035)",
    glassBgDark: "rgba(13, 19, 35, 0.68)",
  },
  light: {
    background: "#F3F4F6",
    surface: "#FFFFFF",
    border: "#E5E7EB",
  },
  text: {
    darkApp: {
      primary: "#f5f7ff",
      muted: "#a4b0cf",
    },
    lightDoc: {
      primary: "#111827",
      secondary: "#374151",
      muted: "#6B7280",
    }
  },
  semantic: {
    success: { bg: "#dcfce7", text: "#14532d", border: "#166534" },
    warning: { bg: "#fef9c3", text: "#713f12", border: "#854d0e" },
    error: { bg: "#fee2e2", text: "#7f1d1d", border: "#991b1b" },
  }
} as const;
