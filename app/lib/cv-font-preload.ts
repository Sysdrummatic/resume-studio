import { preload } from "react-dom";

// Space Grotesk is the CV typeface and is declared in globals.css; without a preload the browser
// only discovers it after the CSS is parsed, which delays the text of the CV.
export const CV_FONT_URL = "/fonts/SpaceGrotesk-VariableFont_wght.woff2";

export function preloadCvFont(): void {
  preload(CV_FONT_URL, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
}
