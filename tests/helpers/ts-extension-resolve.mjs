import path from "node:path";

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
    if (isRelative && !path.extname(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    throw error;
  }
}
