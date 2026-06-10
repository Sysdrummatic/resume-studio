export interface PdfTheme {
  id: string;
  colors: {
    accent: string;
    accentLight: string;
    text: string;
    muted: string;
    cardBg: string;
    border: string;
    pageBg: string;
    white: string;
  };
  typography: {
    fontFamily: string;
    sizes: {
      xs: number;
      sm: number;
      md: number;
      body: number;
      lg: number;
      xl: number;
      hero: number;
    };
    lineHeight: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  radii: {
    md: number;
    lg: number;
    full: number;
  };
  layout: {
    pageMarginTop: number;
    pageMarginBottom: number;
    pageMarginHorizontal: number;
    columnGap: number;
    mainColumnFlex: number;
    sideColumnFlex: number;
  };
}

// Color and spacing values mirror the design tokens in app/resume/resume.css.
// Web design changes must be synchronized here.
export const cvBasicDotTheme: PdfTheme = {
  id: "cv-basic-dot",
  colors: {
    accent: "#009c8a",
    accentLight: "#e6f4f2",
    text: "#1b1b1b",
    muted: "#6d6d6d",
    cardBg: "#ffffff",
    border: "#e3e6e8",
    pageBg: "#f6f8f8",
    white: "#ffffff",
  },
  typography: {
    fontFamily: "SpaceGrotesk",
    sizes: {
      xs: 8,
      sm: 9,
      md: 10,
      body: 11,
      lg: 13,
      xl: 16,
      hero: 22,
    },
    lineHeight: 1.5,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  radii: {
    md: 8,
    lg: 12,
    full: 999,
  },
  layout: {
    pageMarginTop: 24,
    pageMarginBottom: 24,
    pageMarginHorizontal: 24,
    columnGap: 14,
    mainColumnFlex: 2.5,
    sideColumnFlex: 1,
  },
};
