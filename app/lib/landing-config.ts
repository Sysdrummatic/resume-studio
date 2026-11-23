import { readFileSync } from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

/** Settings of the home page that are not copy (copy lives in app/i18n/locales/{pl,en}/landing.yaml). */
export type LandingConfig = {
  sampleLivecv: { url: string; label: string };
};

export const LANDING_CONFIG_DEFAULTS: LandingConfig = {
  sampleLivecv: { url: "/resume", label: "opencivera.com/arianaholt/2f1a2877322e46" },
};

const CONFIG_PATH = path.join(process.cwd(), "content", "landing.yaml");

/* a path on this site, or an https address: never javascript:, data:, a protocol-relative //host or /\host (browsers read it as //host) */
const isSafeHref = (value: string) =>
  (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) || /^https:\/\/[^\s\\]+$/.test(value);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Parses content/landing.yaml; anything invalid falls back to the defaults so the page always renders. */
export function parseLandingConfig(text: string): LandingConfig {
  try {
    const raw = yaml.load(text);
    const sample = isRecord(raw) ? raw.sample_livecv : undefined;
    if (!isRecord(sample)) return LANDING_CONFIG_DEFAULTS;
    const { url, label } = sample;
    if (typeof url !== "string" || typeof label !== "string" || !label.trim() || !isSafeHref(url.trim())) {
      console.error("content/landing.yaml: sample_livecv needs a url (/path or https://) and a label; using the defaults");
      return LANDING_CONFIG_DEFAULTS;
    }
    return { sampleLivecv: { url: url.trim(), label: label.trim() } };
  } catch (error) {
    console.error("content/landing.yaml could not be read as YAML; using the defaults", error);
    return LANDING_CONFIG_DEFAULTS;
  }
}

export function loadLandingConfig(): LandingConfig {
  try {
    return parseLandingConfig(readFileSync(CONFIG_PATH, "utf8"));
  } catch (error) {
    console.error("content/landing.yaml is missing; using the defaults", error);
    return LANDING_CONFIG_DEFAULTS;
  }
}
