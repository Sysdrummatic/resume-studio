import path from "node:path";
import { pathToFileURL } from "node:url";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

/** Raw text is capped before it ever reaches the heuristic parser, independent
 * of the upload size cap in the route — a PDF/DOCX can compress a huge amount
 * of text into a small file. */
export const EXTRACTED_TEXT_MAX_CHARS = 200_000;

// Left unset, pdf-parse falls back to pdfjs-dist's Node "fake worker", which
// resolves its own worker module with a dynamic import() — that hangs
// forever under Next's dev server (Turbopack), even with pdf-parse/pdfjs-dist
// marked as serverExternalPackages in next.config.ts. Pointing it at the real
// file on disk up front skips that fallback path entirely.
// `import.meta.resolve` would be the natural way to find it, but Turbopack's
// server runtime doesn't implement it ("{import.meta}.resolve is not a
// function") — process.cwd() is reliably the project root under
// dev/build/start, so build the node_modules path directly instead.
PDFParse.setWorker(
  pathToFileURL(path.join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs")).href,
);

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
