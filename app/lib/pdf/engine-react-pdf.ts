import path from "path";
import { Font } from "@react-pdf/renderer";

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
