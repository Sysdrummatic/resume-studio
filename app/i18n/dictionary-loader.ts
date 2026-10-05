import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function loadDictionaryModules(
  directory: string,
  files: string[],
  locale: string,
): Record<string, unknown> {
  const dictionary: Record<string, unknown> = {};
  for (const file of files) {
    const parsed = yaml.load(fs.readFileSync(path.join(directory, file), "utf8"));
    if (!isRecord(parsed)) {
      throw new Error(`Invalid application dictionary module "${file}" for locale "${locale}".`);
    }
    for (const [key, value] of Object.entries(parsed)) {
      if (Object.hasOwn(dictionary, key)) {
        throw new Error(`Duplicate application dictionary key "${key}" for locale "${locale}".`);
      }
      dictionary[key] = value;
    }
  }
  return dictionary;
}
