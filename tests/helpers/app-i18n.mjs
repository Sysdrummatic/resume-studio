import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { loadDictionaryModules } from "../../app/i18n/dictionary-loader.ts";

const root = process.cwd();
const config = yaml.load(fs.readFileSync(path.join(root, "app/i18n/config.yaml"), "utf8"));

export function readAppDictionary(locale) {
  const entry = config.locales.find((candidate) => candidate.code === locale);
  if (!entry) throw new Error(`Unknown application locale: ${locale}`);
  return loadDictionaryModules(path.join(root, "app/i18n", entry.dictionary), config.dictionary_files, locale);
}
