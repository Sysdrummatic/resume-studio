import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import React from "react";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

const { renderedHeight, MEASUREMENT_TOLERANCE_PT } = await import("./helpers/pdf-measure.mjs");
const { cvBasicDotTheme } = await import("../app/lib/pdf/theme.ts");
const { loadPdfFonts } = await import("../app/lib/pdf/engine-react-pdf.ts");
const { mainColumnWidth } = await import("../app/lib/pdf/metrics.ts");
const { PdfTimelineBlocks, PdfTimelineItem } = await import("../app/lib/pdf/primitives.tsx");
const { estimateTimelineEntryHeight, planTimelineSection, pageContentHeight, planCard } =
  await import("../app/lib/pdf/pagination.ts");
const { experienceBlocks } = await import("../app/lib/pdf/sections/PdfExperience.tsx");

// The estimate measures text with the registered font; without this it falls
// back to treating every character as the widest glyph.
await loadPdfFonts();

const theme = cvBasicDotTheme;
const LIMIT = pageContentHeight(theme);
/** The width a timeline entry gets: the main column inside the card's padding. */
const ENTRY_WIDTH = mainColumnWidth(theme) - 2 * theme.layout.cardPadding;

/**
 * The entry-height estimate exists because react-pdf will not tell us how tall a
 * node is, and the decision has to be made before layout: an entry taller than a
 * page must be allowed to split, because `wrap={false}` draws the overflow off
 * the sheet instead of breaking.
 *
 * The failure modes are asymmetric — over-estimating splits an entry that would
 * have fitted, under-estimating loses content off the page — so every assertion
 * here is about keeping the error on the safe side. And it is checked against a
 * rendered PdfTimelineItem, not against a bare Text: measuring only the text is
 * exactly how the margins came to be left out of the sum.
 */

const prose =
  "Led the migration of a legacy billing platform to a service oriented architecture, " +
  "cutting invoice processing time by forty percent and removing a nightly batch job. ";

const entry = (company, role, highlights) =>
  experienceBlocks({ company, role, period: "2020 — 2024", highlights }, theme);

/** Height react-pdf gives the real component built from `blocks`. */
function itemHeight(blocks) {
  return renderedHeight(
    React.createElement(
      PdfTimelineItem,
      { period: "2020 — 2024", isLast: false, theme },
      React.createElement(PdfTimelineBlocks, { blocks, theme }),
    ),
    ENTRY_WIDTH,
  );
}

test("an ordinary section keeps every entry whole and binds its title", () => {
  const plan = planTimelineSection(theme, [
    entry("Acme Corp", "Staff Engineer", ["Shipped the thing", "Shipped the other thing"]),
    entry("Globex", "Senior Engineer", ["Kept the lights on"]),
  ]);

  assert.deepEqual(plan.allowSplit, [false, false]);
  assert.equal(plan.keepTitleWithFirstEntry, true);
});

test("an entry that cannot fit on any page is allowed to split", () => {
  const huge = entry("Acme Corp", "Staff Engineer", Array.from({ length: 60 }, () => prose));
  const plan = planTimelineSection(theme, [huge, entry("Globex", "Engineer", ["Short"])]);

  assert.deepEqual(plan.allowSplit, [true, false]);
  assert.equal(plan.keepTitleWithFirstEntry, false);
});

test("the first entry's budget leaves room for the title it is bound to", () => {
  /*
   * PdfSectionCard puts the title and the first entry in one wrap={false} node,
   * so an entry measured only against the bare page limit can still overflow
   * once the heading rides along — and that node cannot split.
   *
   * Grow an entry until it stops being bindable, then check the decision was
   * driven by the title's height and not by the entry passing the page limit.
   */
  let highlights = [];
  while (planTimelineSection(theme, [entry("Acme Corp", "Staff Engineer", highlights)])
    .keepTitleWithFirstEntry) {
    highlights = [...highlights, "Kept the nightly batch job alive for another quarter."];
    assert.ok(highlights.length < 400, "the entry should have stopped being bindable long before this");
  }

  const blocks = entry("Acme Corp", "Staff Engineer", highlights);
  const height = estimateTimelineEntryHeight(theme, blocks);
  assert.ok(
    height <= LIMIT,
    `unbound only because it exceeded the page on its own (${height.toFixed(0)}pt of ${LIMIT.toFixed(0)}pt), ` +
      "so this does not prove the title is accounted for",
  );
  assert.equal(planTimelineSection(theme, [blocks]).allowSplit[0], false);
});

test("empty optional fields do not add phantom lines", () => {
  // Education passes degree and detail as "" when absent. Counting them as a
  // line each would push a section onto a new page for text that never renders.
  const size = theme.typography.sizes.md;
  const withEmpties = estimateTimelineEntryHeight(theme, [
    { text: "Some University", fontSize: size },
    { text: "", fontSize: size, marginTop: 6, marginBottom: 8 },
    { text: "", fontSize: size },
  ]);
  const without = estimateTimelineEntryHeight(theme, [{ text: "Some University", fontSize: size }]);

  assert.equal(withEmpties, without);
});

test("an empty section plans nothing", () => {
  assert.deepEqual(planTimelineSection(theme, []), { allowSplit: [], keepTitleWithFirstEntry: true });
});

test("the estimate is never shorter than the entry react-pdf lays out", async () => {
  /*
   * The one property that matters, and the one that kept breaking. Two ways it
   * broke: a character-count estimate read `\n` as an ordinary character (a
   * highlight holding 99 of them estimated 137pt against a real 1760pt), and
   * summing only the text left out the margins each block carries — an entry of
   * 37 short highlights measured 773.1pt against an estimate of 735.15pt and was
   * handed wrap={false} at a 760.2pt limit.
   *
   * Measuring the rendered PdfTimelineItem is what closes the second one: the
   * margins are only visible from the component.
   */
  const shapes = [
    ["short highlights, in bulk", entry("Acme", "Staff Engineer", Array.from({ length: 37 }, (_, i) => `Shipped item ${i}`))],
    ["one highlight per line", entry("Acme", "Staff Engineer", ["Short"])],
    ["prose", entry("Acme", "Staff Engineer", [prose.repeat(8).slice(0, 600)])],
    ["long prose", entry("Acme", "Staff Engineer", [prose.repeat(25).slice(0, 2000)])],
    ["forced newlines", entry("Acme", "Staff Engineer", [Array.from({ length: 100 }, (_, i) => `L${i}`).join("\n")])],
    ["wide glyphs", entry("Acme", "Staff Engineer", ["WWW ".repeat(150)])],
    ["all caps", entry("ACME HOLDINGS", "STAFF ENGINEER", ["MMMM WWWW ".repeat(60)])],
    ["unbreakable words", entry("Acme", "Staff Engineer", ["Donaudampfschifffahrtsgesellschaftskapitaen ".repeat(30)])],
    ["mixed with newlines", entry("Acme", "Staff Engineer", [`${prose}\n${"WWWW ".repeat(20)}\n`.repeat(6)])],
    ["diacritics", entry("Acme", "Inżynier", ["Zaimplementowałem rozproszony system przetwarzania zdarzeń. ".repeat(12)])],
    ["many bullets and long prose", entry("Acme", "Staff Engineer", Array.from({ length: 20 }, () => prose))],
  ];

  for (const [label, blocks] of shapes) {
    const rendered = await itemHeight(blocks);
    const estimated = estimateTimelineEntryHeight(theme, blocks);

    assert.ok(
      estimated >= rendered - MEASUREMENT_TOLERANCE_PT,
      `${label}: estimated ${estimated.toFixed(3)}pt but react-pdf laid out ${rendered.toFixed(3)}pt`,
    );
  }
});

test("an entry that really overflows a page is never handed wrap={false}", async () => {
  // The review's case, checked end to end rather than through the estimate: the
  // rendered height decides whether the plan was right.
  const blocks = entry(
    "Acme Corp",
    "Staff Engineer",
    Array.from({ length: 37 }, (_, i) => `Shipped item number ${i} on time`),
  );

  const rendered = await itemHeight(blocks);
  assert.ok(rendered > LIMIT, `the fixture must actually overflow — it laid out ${rendered.toFixed(1)}pt`);
  assert.equal(planTimelineSection(theme, [blocks]).allowSplit[0], true);
});

test("ordinary entries are still kept whole — the safety margin has not eaten the feature", () => {
  // Over-estimating is the safe direction, but only until it splits entries a
  // reader would expect to stay together.
  for (const count of [3, 5, 9]) {
    const blocks = entry("Acme Corp", "Staff Engineer", Array.from({ length: count }, () => prose));

    assert.equal(
      planTimelineSection(theme, [blocks]).allowSplit[0],
      false,
      `${count} two-sentence bullets must still render as one block`,
    );
  }
});

test("a card only gives up wrap={false} when its content cannot fit a page", () => {
  // Every card printed with wrap={false} before summary/skills/languages/tech
  // stack/interests were planned, and every CV that fits must keep printing that
  // way — planCard may only change the pathological case.
  assert.deepEqual(planCard(theme, 100), { wrap: false, keepTitleWithFirstChild: true });
  assert.deepEqual(planCard(theme, LIMIT * 2), { wrap: true, keepTitleWithFirstChild: false });
});
