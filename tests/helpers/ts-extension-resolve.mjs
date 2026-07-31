import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import ts from "typescript";

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
    if (isRelative && !path.extname(specifier)) {
      for (const extension of [".ts", ".tsx"]) {
        try {
          return await nextResolve(`${specifier}${extension}`, context);
        } catch {
          // Try the next one.
        }
      }
    }
    throw error;
  }
}

/**
 * Node strips types from `.ts` on its own but cannot parse JSX, so a test that
 * renders a real PDF component would otherwise have to reconstruct it — which is
 * how app/lib/pdf/pagination.ts and the section components came to disagree
 * about an entry's margins in the first place. `typescript` is already a
 * dev-dependency (npm run typecheck), so this needs no new one.
 */
export async function load(url, context, nextLoad) {
  if (!url.endsWith(".tsx")) return nextLoad(url, context);

  const fileName = fileURLToPath(url);
  const { outputText } = ts.transpileModule(await readFile(fileName, "utf8"), {
    fileName,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });

  return { format: "module", source: outputText, shortCircuit: true };
}
