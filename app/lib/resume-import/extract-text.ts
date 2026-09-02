import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

/** Raw text is capped before it ever reaches the heuristic parser, independent
 * of the upload size cap in the route — a PDF/DOCX can compress a huge amount
 * of text into a small file. */
export const EXTRACTED_TEXT_MAX_CHARS = 200_000;

function capText(text: string): string {
  return text.length > EXTRACTED_TEXT_MAX_CHARS ? text.slice(0, EXTRACTED_TEXT_MAX_CHARS) : text;
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return capText(result.text);
  } finally {
    await parser.destroy();
  }
}

export async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return capText(result.value);
}
