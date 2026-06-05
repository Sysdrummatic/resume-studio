export const NAME_SYNC_MODES = ["auto", "manual"] as const;

export type NameSyncMode = (typeof NAME_SYNC_MODES)[number];

export type ProfileNameParts = {
  firstName: string;
  lastName: string;
};

const TRANSLITERATION_MAP: Record<string, string> = {
  "\u0105": "a",
  "\u0107": "c",
  "\u0119": "e",
  "\u0142": "l",
  "\u0144": "n",
  "\u00f3": "o",
  "\u015b": "s",
  "\u017c": "z",
  "\u017a": "z",
  "\u00e4": "a",
  "\u00f6": "o",
  "\u00fc": "u",
  "\u00df": "ss",
  "\u00e1": "a",
  "\u00e9": "e",
  "\u00ed": "i",
  "\u00f1": "n",
  "\u00fa": "u",
};

function normalizeWhitespace(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function transliterate(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x00-\x7F]/g, (char) => TRANSLITERATION_MAP[char.toLowerCase()] || "");
}

export function splitProfileName(name: unknown): ProfileNameParts {
  const normalized = normalizeWhitespace(name);
  if (!normalized) {
    return { firstName: "", lastName: "" };
  }

  const [firstName = "", ...rest] = normalized.split(" ");
  return {
    firstName,
    lastName: rest.join(" "),
  };
}

export function normalizeProfileNameParts(firstName: unknown, lastName: unknown): ProfileNameParts {
  return {
    firstName: normalizeWhitespace(firstName),
    lastName: normalizeWhitespace(lastName),
  };
}

export function buildProfileDisplayName(firstName: unknown, lastName: unknown, fallback = ""): string {
  const parts = normalizeProfileNameParts(firstName, lastName);
  return normalizeWhitespace(`${parts.firstName} ${parts.lastName}`) || normalizeWhitespace(fallback);
}

export function normalizeNameSyncMode(value: unknown): NameSyncMode {
  return value === "manual" ? "manual" : "auto";
}

export function buildCompactPersonSlug(firstName: unknown, lastName: unknown, fallback = "user"): string {
  const fullName = buildProfileDisplayName(firstName, lastName, fallback);
  const compact = transliterate(fullName).toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (compact.length >= 3) {
    return compact.slice(0, 80);
  }
  return `${compact || "user"}user`.slice(0, 80);
}
