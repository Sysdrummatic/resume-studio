/** Small text-shape helpers shared by the ATS round-trip parser and the
 * generic plain-text fallback — neither format has real structure, so both
 * lean on the same blank-line-block / heading-line conventions. */

export function splitBlankLineBlocks(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

export function isBulletLine(line: string): boolean {
  return /^[-*••]\s+/.test(line);
}

export function stripBullet(line: string): string {
  return line.replace(/^[-*••]\s+/, "").trim();
}

const DATE_RANGE = /(\d{4}(?:[/-]\d{2})?)\s*(?:[-–—]|to)\s*(present|current|now|\d{4}(?:[/-]\d{2})?)/i;

/** Finds a "2020 – Present" / "2018-03 - 2021-10" style range anywhere in a
 * heading line and returns it separately from the rest of the text, so the
 * remainder can still be split into role/company (or degree/school). */
export function extractDateRange(line: string): { period: string; rest: string } {
  const match = line.match(DATE_RANGE);
  if (!match) {
    return { period: "", rest: line.trim() };
  }
  const period = `${match[1]} – ${/present|current|now/i.test(match[2]) ? "Present" : match[2]}`;
  const rest = (line.slice(0, match.index) + line.slice((match.index ?? 0) + match[0].length)).trim();
  return { period, rest: rest.replace(/[|,\-–—@]+$/, "").replace(/^[|,\-–—@]+/, "").trim() };
}

const HEADING_SEPARATORS = [" | ", " at ", " @ ", " — ", " – ", " - ", ", "];

/** Splits "Role at Company" / "Role, Company" / "Role | Company" into two
 * parts on the first separator that actually appears. No separator found
 * means the whole line is treated as the primary field (role/degree). */
export function splitHeadingPair(text: string): [string, string] {
  for (const separator of HEADING_SEPARATORS) {
    const index = text.indexOf(separator);
    if (index > 0) {
      return [text.slice(0, index).trim(), text.slice(index + separator.length).trim()];
    }
  }
  return [text.trim(), ""];
}

const LEVEL_KEYWORDS: Array<[RegExp, number]> = [
  [/native|fluent|expert|c2|mastery|master/i, 5],
  [/advanced|proficient|c1/i, 4],
  [/intermediate|professional|b1|b2|working/i, 3],
  [/basic|elementary|beginner|a1|a2|novice/i, 2],
];

/** Best-effort mapping from a free-text proficiency word (CEFR code, "Native",
 * "Beginner", ...) to the schema's 1-5 scale. Defaults to 3 (mid) when the
 * text doesn't match a known keyword — same default defaultResumeDocument()
 * uses for a brand-new entry. */
export function guessLevelFromText(text: string): number {
  for (const [pattern, level] of LEVEL_KEYWORDS) {
    if (pattern.test(text)) return level;
  }
  return 3;
}
