import path from "path";
import type { ReactElement } from "react";
import { Font, renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import type { PdfEngine } from "./engine";

const FONT_SOURCE = path.join(process.cwd(), "public/fonts/SpaceGrotesk-VariableFont_wght.ttf");

let fontsRegistered = false;

export function registerPdfFonts(): void {
  if (fontsRegistered) {
    return;
  }
  Font.register({
    family: "SpaceGrotesk",
    fonts: [
      { src: FONT_SOURCE, fontWeight: 400 },
      { src: FONT_SOURCE, fontWeight: 700 },
    ],
  });
  fontsRegistered = true;
}

registerPdfFonts();

export const reactPdfEngine: PdfEngine = {
  async render(document) {
    registerPdfFonts();
    return renderToBuffer(document as ReactElement<DocumentProps>);
  },
};
