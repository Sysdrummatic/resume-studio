import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import zlib from "node:zlib";
import { register } from "node:module";
import React from "react";
import { Document, Page, Text, Font, renderToBuffer } from "@react-pdf/renderer";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

const { cvBasicDotTheme } = await import("../app/lib/pdf/theme.ts");
const { estimateTimelineEntryHeight, planTimelineSection } = await import(
  "../app/lib/pdf/pagination.ts"
);

const theme = cvBasicDotTheme;

/**
 * The entry-height estimate exists because react-pdf will not tell us how tall a
 * node is, and both pagination fixes need to know before layout:
 *
 *  - an entry taller than a page has to be allowed to split, because wrap={false}
 *    draws the overflow off the sheet instead of breaking.
 *
 * The failure modes are asymmetric: over-estimating splits an entry that would
 * have fitted, under-estimating loses content off the page. Every assertion here
 * is about keeping the error on the safe side.
 */

const prose =
  "Led the migration of a legacy billing platform to a service oriented architecture, " +
  "cutting invoice processing time by forty percent and removing a nightly batch job. ";

test("an ordinary section keeps every entry whole and binds its title", () => {
  const plan = planTimelineSection(theme, [
    ["Acme Corp", "Staff Engineer", "Shipped the thing", "Shipped the other thing"],
    ["Globex", "Senior Engineer", "Kept the lights on"],
  ]);

  assert.deepEqual(plan.allowSplit, [false, false]);
  assert.equal(plan.keepTitleWithFirstEntry, true);
});

test("an entry that cannot fit on any page is allowed to split", () => {
  const huge = ["Acme Corp", "Staff Engineer", ...Array.from({ length: 40 }, () => prose)];
  const plan = planTimelineSection(theme, [huge, ["Globex", "Engineer", "Short"]]);

  assert.deepEqual(plan.allowSplit, [true, false]);
});

test("a section whose first entry may split does not bind its title to it", () => {
  // Binding would put an oversized node inside a wrap={false} one, which is the
  // arrangement that draws content off the sheet. A stranded heading is the
  // lesser fault.
  const huge = Array.from({ length: 80 }, () => prose);

  const plan = planTimelineSection(theme, [huge, ["Globex", "Engineer", "Short"]]);
  assert.deepEqual(plan.allowSplit, [true, false]);
  assert.equal(plan.keepTitleWithFirstEntry, false);
});

test("empty optional fields do not add phantom lines", () => {
  // Education passes degree and detail as "" when absent. Counting them as a
  // line each would push a section onto a new page for text that never renders.
  const withEmpties = estimateTimelineEntryHeight(theme, ["Some University", "", ""]);
  const without = estimateTimelineEntryHeight(theme, ["Some University"]);

  assert.equal(withEmpties, without);
});

test("an empty section plans nothing", () => {
  assert.deepEqual(planTimelineSection(theme, []), { allowSplit: [], keepTitleWithFirstEntry: true });
});

test("the estimate is never shorter than what react-pdf actually lays out", async () => {
  /*
   * The one property that matters. Chrome — the period line, the paddings, the
   * trailing gap — is identical for any entry, so subtracting a bare entry's
   * estimate from a filled one leaves just the text, which can be compared
   * against a real render at the same size and width.
   */
  Font.register({
    family: "SpaceGrotesk",
    fonts: [{ src: path.join(process.cwd(), "public/fonts/SpaceGrotesk-Regular.ttf"), fontWeight: 400 }],
  });
  Font.registerHyphenationCallback((word) => [word]);

  const { layout, components, typography } = theme;
  const columns = layout.mainColumnFlex + layout.sideColumnFlex;
  const mainColumn = ((595.28 - 2 * 28.3465 - layout.columnGap) * layout.mainColumnFlex) / columns;
  const width =
    mainColumn -
    2 * layout.cardPadding -
    components.timelineRailWidth -
    2 * components.timelineContentPaddingX -
    components.listIndent;

  const baseline = estimateTimelineEntryHeight(theme, []);

  for (const repeats of [1, 3, 8, 20]) {
    const body = prose.repeat(repeats);

    const buffer = await renderToBuffer(
      React.createElement(
        Document,
        null,
        React.createElement(
          Page,
          { size: [width + 4, 4000], style: { padding: 0 } },
          React.createElement(
            Text,
            {
              style: {
                fontFamily: "SpaceGrotesk",
                fontSize: typography.sizes.md,
                lineHeight: typography.lineHeight,
                width,
              },
            },
            body,
          ),
        ),
      ),
    );

    const raw = buffer.toString("latin1");
    const marker = /stream\r?\n/g;
    let stream = null;
    let match;
    while ((match = marker.exec(raw))) {
      const start = match.index + match[0].length;
      const end = raw.indexOf("endstream", start);
      try {
        const text = zlib.inflateSync(Buffer.from(raw.slice(start, end), "latin1")).toString("latin1");
        if (text.includes("BT")) stream = text;
      } catch {
        // Not a deflated content stream.
      }
    }

    const renderedLines = (stream.match(/TJ|Tj/g) || []).length;
    const rendered = renderedLines * typography.sizes.md * typography.lineHeight;
    const estimated = estimateTimelineEntryHeight(theme, [body]) - baseline;

    assert.ok(
      estimated >= rendered,
      `${body.length} characters: estimated ${estimated.toFixed(0)}pt but react-pdf laid out ${rendered.toFixed(0)}pt`,
    );
  }
});
