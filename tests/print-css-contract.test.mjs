import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const resumeCss = read("app/resume/resume.css");

/**
 * The print rules live in a single `@media print { ... }` block. Extract it by
 * brace matching so the assertions below cannot accidentally pass on a rule
 * that sits outside the print context.
 */
function extractPrintBlock(css) {
  const start = css.indexOf("@media print");
  assert.notEqual(start, -1, "resume.css must contain an @media print block");

  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }

  throw new Error("Unbalanced braces in @media print block");
}

const printBlock = extractPrintBlock(resumeCss);

test("resume.css declares exactly one @media print block", () => {
  const blocks = resumeCss.match(/@media\s+print/g) || [];
  assert.equal(blocks.length, 1);
});

test("resume.css declares exactly one @page rule, inside the print block", () => {
  const pageRules = resumeCss.match(/@page/g) || [];
  assert.equal(pageRules.length, 1);
  assert.equal(printBlock.includes("@page"), true);
});

test("print block does not reintroduce the swapped timeline-item break properties", () => {
  // The audit found `break-after: avoid-page` where `break-inside: avoid` was
  // meant, which forced a near-empty first page and still let entries split.
  assert.equal(printBlock.includes("break-after: avoid-page"), false);
  assert.equal(printBlock.includes("page-break-after: avoid;\n  }"), false);

  const timelineItemRule = printBlock.match(/\.timeline-item\s*\{[^}]*\}/);
  assert.notEqual(timelineItemRule, null, "print block must style .timeline-item");
  assert.equal(timelineItemRule[0].includes("break-inside: auto"), false);
  assert.equal(timelineItemRule[0].includes("break-after: avoid"), false);
  assert.equal(timelineItemRule[0].includes("break-inside: avoid"), true);
});

test("section titles carry orphan protection so headers are never stranded", () => {
  const sectionTitleRule = printBlock.match(/\.section-title\s*\{[^}]*\}/);
  assert.notEqual(sectionTitleRule, null, "print block must style .section-title");
  assert.equal(sectionTitleRule[0].includes("break-after: avoid"), true);
});

test("print block no longer references the dead .language-switcher selector", () => {
  // `.resume-language-switcher` is the real class and does not contain the
  // literal `.language-switcher` substring, so this assertion is precise.
  assert.equal(printBlock.includes(".language-switcher"), false);
  assert.equal(printBlock.includes(".resume-language-switcher"), true);
});

test("print block resets color-scheme to light for the whole printed page", () => {
  const rootRule = printBlock.match(/:root\s*\{[^}]*\}/);
  assert.notEqual(rootRule, null, "print block must contain a :root rule");

  // `!important` is the whole point: globals.css declares the dark scheme on
  // :root at equal specificity and is bundled later, so without it the dark
  // canvas returns and every sheet prints framed in black. Matching only
  // `color-scheme: light` let that regression through.
  assert.equal(/color-scheme:\s*light\s*!important/.test(rootRule[0]), true);
});

test("print block hides the portal ambient background layer", () => {
  // DESIGN.md: ambient light is --portal-body-ambient, painted on body::before
  // (app/globals.css). body::after carries the grid overlay from the same layer.
  const ambientRule = printBlock.match(/body::before[^{]*\{[^}]*\}/);
  assert.notEqual(ambientRule, null, "print block must hide body::before");
  assert.equal(/display:\s*none/.test(ambientRule[0]), true);
  assert.equal(printBlock.includes("body::after"), true);
});

test("print block drops the dead grid-template-columns rules on flex containers", () => {
  // Both compute to display:flex and print does not change that, so
  // grid-template-columns never applied on either.
  assert.equal(/\.contact-list\s*\{[^}]*grid-template-columns/.test(printBlock), false);
  assert.equal(/\.timeline-item\s*\{[^}]*grid-template-columns/.test(printBlock), false);
});

test("print block drops the dead background on the hidden timeline axis", () => {
  const axisRule = printBlock.match(/\.timeline::before\s*\{[^}]*\}/);
  assert.notEqual(axisRule, null, "print block must still hide .timeline::before");
  assert.equal(/display:\s*none/.test(axisRule[0]), true);
  assert.equal(axisRule[0].includes("background"), false);
});
