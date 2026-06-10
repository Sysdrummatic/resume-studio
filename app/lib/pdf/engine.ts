import type { ReactElement } from "react";

export interface PdfRenderOptions {
  title: string;
  author?: string;
}

export interface PdfEngine {
  render(document: ReactElement, options: PdfRenderOptions): Promise<Buffer>;
}
