import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import React from "react";
import { Document, Page, View, Text, Font, renderToBuffer } from "@react-pdf/renderer";

/**
 * Renders PDFs and measures the result.
 *
 * tests/pdf-web-style-parity.test.mjs asserts the shape of the code — which
 * token a component uses, which property it sets. That is exactly the kind of
 * test that passed while the export rendered wrong: initials above the middle
 * of their circle, section dots low against their heading, and a stroked
 * outline around every timeline dot that the web never draws.
 *
 * These tests pin the two react-pdf behaviours those bugs came from, by reading
 * the operators in the generated content stream:
 *
 *  - a baseline is placed at `box top + font ascent`, so all leading falls
 *    below the glyphs where CSS splits it evenly;
 *  - `borderWidth` on a rounded box is painted as stroked arcs, not as the
 *    outset ring `box-shadow: 0 0 0 3px` gives on the web.
 */

const FONT_DIR = path.join(process.cwd(), "public/fonts");

Font.register({
  family: "SpaceGrotesk",
  fonts: [{ src: path.join(FONT_DIR, "SpaceGrotesk-Bold.ttf"), fontWeight: 700 }],
});
Font.registerHyphenationCallback((word) => [word]);

/** Space Grotesk, as app/lib/pdf/theme.ts hardcodes it. Asserted against the file below. */
const FONT_LINE_HEIGHT = 1.276;
const CAP_HEIGHT = 0.7;

const matrixMultiply = (m, n) => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];

const applyMatrix = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

function contentStream(buffer) {
  const raw = buffer.toString("latin1");
  const marker = /stream\r?\n/g;
  let found = null;
  let match;

  while ((match = marker.exec(raw))) {
    const start = match.index + match[0].length;
    const end = raw.indexOf("endstream", start);
    try {
      const text = zlib.inflateSync(Buffer.from(raw.slice(start, end), "latin1")).toString("latin1");
      if (text.includes("BT") || /\bf\b/.test(text)) found = text;
    } catch {
      // Not a deflated stream (font programs, metadata); skip it.
    }
  }

  assert.notEqual(found, null, "the rendered PDF must contain a readable content stream");
  return found;
}

/**
 * Walks the stream honouring the q/Q graphics-state stack, so nested transforms
 * compose the way the viewer composes them. Summing every `cm` instead reports
 * positions that do not exist on the page.
 *
 * Returns page-space coordinates measured from the top edge.
 */
function measure(buffer, pageHeight) {
  const tokens = contentStream(buffer).split(/\s+/);
  const baselines = [];
  const fills = [];
  const pending = [];

  let ctm = [1, 0, 0, 1, 0, 0];
  let textMatrix = [1, 0, 0, 1, 0, 0];
  let strokes = 0;
  const stack = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const back = (n) => Number(tokens[i - n]);
    const fromTop = (y) => pageHeight - y;

    if (token === "q") {
      stack.push(ctm.slice());
    } else if (token === "Q") {
      ctm = stack.pop() ?? ctm;
    } else if (token === "cm") {
      ctm = matrixMultiply(ctm, [back(6), back(5), back(4), back(3), back(2), back(1)]);
    } else if (token === "BT") {
      textMatrix = [1, 0, 0, 1, 0, 0];
    } else if (token === "Tm") {
      textMatrix = [back(6), back(5), back(4), back(3), back(2), back(1)];
    } else if (token === "TJ" || token === "Tj") {
      const [, y] = applyMatrix(matrixMultiply(ctm, textMatrix), 0, 0);
      baselines.push(fromTop(y));
    } else if (token === "m" || token === "l" || token === "c") {
      const points =
        token === "c"
          ? [
              [back(6), back(5)],
              [back(4), back(3)],
              [back(2), back(1)],
            ]
          : [[back(2), back(1)]];

      for (const [x, y] of points) {
        const [, py] = applyMatrix(ctm, x, y);
        pending.push(fromTop(py));
      }
    } else if (token === "f" || token === "f*") {
      if (pending.length > 0) {
        fills.push({ top: Math.min(...pending), bottom: Math.max(...pending) });
        pending.length = 0;
      }
    } else if (token === "S" || token === "s") {
      strokes += 1;
      pending.length = 0;
    }
  }

  return { baselines, fills, strokes };
}

const PAGE_HEIGHT = 120;

function render(children) {
  return renderToBuffer(
    React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: [240, PAGE_HEIGHT], style: { padding: 0, backgroundColor: "#ffffff" } },
        children,
      ),
    ),
  );
}

const A4 = { width: 595.28, height: 841.89, margin: 28.3465 };

/** Glyph runs per page, in page order, from an A4 render. */
function runsPerA4Page(buffer) {
  const raw = buffer.toString("latin1");
  const marker = /stream\r?\n/g;
  const counts = [];
  let match;

  while ((match = marker.exec(raw))) {
    const start = match.index + match[0].length;
    const end = raw.indexOf("endstream", start);
    try {
      const text = zlib.inflateSync(Buffer.from(raw.slice(start, end), "latin1")).toString("latin1");
      if (text.includes("BT")) counts.push((text.match(/TJ|Tj/g) || []).length);
    } catch {
      // Not a deflated content stream.
    }
  }

  return counts;
}

function renderA4(children) {
  return renderToBuffer(
    React.createElement(
      Document,
      null,
      React.createElement(Page, { size: "A4", style: { padding: A4.margin } }, children),
    ),
  );
}

const bodyLine = (key, index) =>
  React.createElement(
    Text,
    { key: `${key}${index}`, style: { fontFamily: "SpaceGrotesk", fontSize: 10, lineHeight: 1.6 } },
    `${key}${index}`,
  );

const bodyBlock = (key, lines, props = {}) =>
  React.createElement(
    View,
    { key, ...props },
    Array.from({ length: lines }, (_, index) => bodyLine(key, index)),
  );

const text = (fontSize, style, value = "Ag") =>
  React.createElement(
    Text,
    { style: { fontFamily: "SpaceGrotesk", fontWeight: 700, fontSize, color: "#000000", ...style } },
    value,
  );

const circle = (size, backgroundColor, extra, children) =>
  React.createElement(
    View,
    { style: { width: size, height: size, borderRadius: 999, backgroundColor, ...extra } },
    children,
  );

/** Optical centre of the glyphs: the midpoint of the cap height above the baseline. */
const glyphCentre = (baseline, fontSize) => baseline - (CAP_HEIGHT * fontSize) / 2;

async function centreOffset(boxSize, fontSize, textStyle) {
  const buffer = await render(
    circle(
      boxSize,
      "#009c8a",
      { justifyContent: "center", alignItems: "center" },
      text(fontSize, textStyle),
    ),
  );
  const { baselines } = measure(buffer, PAGE_HEIGHT);
  return glyphCentre(baselines[0], fontSize) - boxSize / 2;
}

test("theme.ts's FONT_LINE_HEIGHT is the metric the vendored font actually reports", async () => {
  // The compensation is only correct for this number; a font swap must fail here
  // rather than silently reintroduce the offset.
  const fontkit = await import("fontkit");
  const open = fontkit.openSync ?? fontkit.default.openSync;
  const font = open(path.join(FONT_DIR, "SpaceGrotesk-Bold.ttf"));

  const natural = (font.ascent - font.descent + font.lineGap) / font.unitsPerEm;
  assert.ok(
    Math.abs(natural - FONT_LINE_HEIGHT) < 0.001,
    `font reports ${natural.toFixed(4)}, theme.ts uses ${FONT_LINE_HEIGHT}`,
  );

  const theme = fs.readFileSync(path.join(process.cwd(), "app/lib/pdf/theme.ts"), "utf8");
  assert.match(theme, new RegExp(`const FONT_LINE_HEIGHT = ${FONT_LINE_HEIGHT};`));
});

test("a Text centred in a box rides high at a CSS line height, and centres at the natural one", async () => {
  // The hero initials: 20pt in a 60pt circle, the case that was visibly off.
  const cssLineHeight = await centreOffset(60, 20, { lineHeight: 1.6 });
  const natural = await centreOffset(60, 20, { lineHeight: FONT_LINE_HEIGHT });

  assert.ok(
    cssLineHeight < -3,
    `expected the 1.6 line height to lift the glyphs, offset was ${cssLineHeight.toFixed(2)}pt`,
  );
  assert.ok(
    Math.abs(natural) < 0.25,
    `natural line height must centre the glyphs, offset was ${natural.toFixed(2)}pt`,
  );
});

test("centeringPadding keeps the CSS box height and still centres the glyphs", async () => {
  // The section title: the box has to stay fontSize * 1.6 tall so the card keeps
  // the web's spacing, which rules out simply dropping the line height.
  const fontSize = 17.5;
  const dot = 18.75;
  const boxHeight = fontSize * 1.6;
  const padding = (boxHeight - fontSize * FONT_LINE_HEIGHT) / 2;

  const buffer = await render(
    React.createElement(
      View,
      { style: { flexDirection: "row", alignItems: "center", gap: 7.5 } },
      circle(dot, "#009c8a"),
      text(fontSize, { lineHeight: FONT_LINE_HEIGHT, paddingVertical: padding }, "Experience"),
    ),
  );

  const { baselines, fills } = measure(buffer, PAGE_HEIGHT);
  const dotShape = fills.find((fill) => Math.abs(fill.bottom - fill.top - dot) < 0.8);
  assert.notEqual(dotShape, undefined, "the section dot must be rendered");

  const dotCentre = (dotShape.top + dotShape.bottom) / 2;
  const offset = glyphCentre(baselines[0], fontSize) - dotCentre;

  assert.ok(Math.abs(offset) < 0.25, `heading and dot must share a centre line, off by ${offset.toFixed(2)}pt`);
  // The row is as tall as the CSS line box, not as tall as the glyphs.
  assert.ok(Math.abs(dotShape.bottom - dotShape.top - dot) < 0.8);
});

test("only minWidth keeps a circle round when its flex row runs out of space", async () => {
  /*
   * .section-dot, .logo-circle and .meter are `flex-shrink: 0` on the web.
   * react-pdf ignores flexShrink on a View that has a width, so the section dot
   * measured 17.12pt of its 18.75 beside a title filling the sidebar — and once
   * width < height the border radius clamps to width / 2, leaving a straight
   * segment down each side. That is what made the dots look cut off.
   */
  const size = 18.75;
  const sidebar = 125.31; // the derived sidebar text width

  async function dotWidth(extra) {
    const buffer = await renderToBuffer(
      React.createElement(
        Document,
        null,
        React.createElement(
          Page,
          { size: [sidebar + 20, PAGE_HEIGHT], style: { padding: 0, backgroundColor: "#ffffff" } },
          React.createElement(
            View,
            { style: { width: sidebar, flexDirection: "row", alignItems: "center", gap: 7.5 } },
            circle(size, "#009c8a", extra),
            text(17.5, { lineHeight: FONT_LINE_HEIGHT }, "Personal Info"),
          ),
        ),
      ),
    );

    const stream = contentStream(buffer);
    const rects = [...stream.matchAll(/([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) re/g)].map((r) => [
      Number(r[3]),
      Number(r[4]),
    ]);
    return rects.find(([, height]) => Math.abs(height - size) < 0.6)?.[0];
  }

  const squashed = await dotWidth({});
  assert.ok(squashed < size - 1, `expected the unguarded dot to shrink, got ${squashed}pt`);

  const withFlexShrink = await dotWidth({ flexShrink: 0 });
  assert.ok(
    withFlexShrink < size - 1,
    "flexShrink: 0 is expected to be ignored here — if react-pdf starts honouring it, simplify PdfCircle",
  );

  const withMinWidth = await dotWidth({ minWidth: size });
  assert.ok(
    Math.abs(withMinWidth - size) < 0.01,
    `minWidth must hold the circle at ${size}pt, got ${withMinWidth}pt`,
  );
});

test("opticalCentringMargin centres a heading whose line height is below the font's", async () => {
  /*
   * --line-height-heading is 1.15, under Space Grotesk's own 1.276, so the
   * heading cannot be centred with padding — the value would be negative. It
   * also has to stay literal, because it sets the spacing between the lines of a
   * heading that wraps. A bottom margin does the centring instead.
   */
  const dot = 18.75;
  const ascent = 0.984;
  const opticalCentre = ascent - CAP_HEIGHT / 2;

  async function offset(fontSize, lineHeight, margin) {
    const buffer = await render(
      React.createElement(
        View,
        { style: { flexDirection: "row", alignItems: "center", gap: 7.5 } },
        circle(dot, "#009c8a", { minWidth: dot }),
        text(fontSize, { lineHeight, marginBottom: margin }, "Zainteresowania"),
      ),
    );

    const { baselines, fills } = measure(buffer, PAGE_HEIGHT);
    const dotShape = fills.find((fill) => Math.abs(fill.bottom - fill.top - dot) < 0.8);
    return glyphCentre(baselines[0], fontSize) - (dotShape.top + dotShape.bottom) / 2;
  }

  // Both heading sizes: the main column and the narrower sidebar.
  for (const fontSize of [17.5, 11.25]) {
    const lineHeight = 1.15;
    const uncorrected = await offset(fontSize, lineHeight, 0);
    assert.ok(
      uncorrected > 0.3,
      `at ${fontSize}pt the raw line height should drop the glyphs below the dot, got ${uncorrected.toFixed(2)}pt`,
    );

    const margin = fontSize * (2 * opticalCentre - lineHeight);
    const corrected = await offset(fontSize, lineHeight, margin);
    assert.ok(
      Math.abs(corrected) < 0.25,
      `at ${fontSize}pt the heading must sit on the dot's centre line, off by ${corrected.toFixed(2)}pt`,
    );
  }
});

test("a rounded borderWidth is stroked; the timeline ring must be filled circles instead", async () => {
  // `box-shadow: 0 0 0 3px var(--card-bg)` is an outset ring. Expressed as a
  // border it became four stroked arcs whose joins showed as an outline.
  const ring = 1.875;
  const dot = 8.75;
  const outer = dot + 2 * ring;

  const bordered = await render(
    circle(outer, "#009c8a", { borderWidth: ring, borderColor: "#ffffff" }),
  );
  const nested = await render(
    circle(
      outer,
      "#ffffff",
      { justifyContent: "center", alignItems: "center" },
      circle(dot, "#009c8a"),
    ),
  );

  assert.ok(measure(bordered, PAGE_HEIGHT).strokes > 0, "a rounded border is expected to stroke");

  const clean = measure(nested, PAGE_HEIGHT);
  assert.equal(clean.strokes, 0, "the timeline dot must draw no stroked outline");

  const sizes = clean.fills.map((fill) => Number((fill.bottom - fill.top).toFixed(2)));
  assert.ok(sizes.includes(outer), `expected the ${outer}pt ring, got ${sizes.join(", ")}`);
  assert.ok(sizes.includes(dot), `expected the ${dot}pt dot, got ${sizes.join(", ")}`);
});

test("an entry taller than a page must be allowed to split, or its overflow leaves the sheet", async () => {
  /*
   * wrap={false} does not fall back to splitting: react-pdf warns, keeps the
   * node whole on one page, and the remainder is drawn past the bottom edge. The
   * text survives in the text layer — an ATS still reads it — but no reader
   * sees it. planTimelineSection() sets allowSplit for exactly this case.
   */
  const lines = 120;
  const usable = A4.height - 2 * A4.margin;

  const whole = runsPerA4Page(await renderA4([bodyBlock("D", lines, { wrap: false })]));
  assert.equal(whole.length, 1, "wrap={false} is expected to keep an oversized entry on one page");
  assert.equal(whole[0], lines, "and to draw every line there, most of them off the sheet");

  const split = runsPerA4Page(await renderA4([bodyBlock("D", lines, { wrap: true })]));
  assert.ok(split.length > 1, "an oversized entry must span several pages once it may split");
  assert.equal(
    split.reduce((total, count) => total + count, 0),
    lines,
    "and no line may be lost in the process",
  );

  // Nothing may exceed what a page can hold.
  for (const count of split) {
    assert.ok(count * 16 <= usable + 1, `a page holds ${count} lines, over the ${usable.toFixed(0)}pt limit`);
  }
});

/**
 * Pages identified by what is on them, never by the order the streams appear in
 * the file — PDF object order is not page order, and reading it as such is what
 * let a broken orphan fix look green.
 */
function a4Pages(buffer) {
  const raw = buffer.toString("latin1");
  const marker = /stream\r?\n/g;
  const pages = [];
  let match;

  while ((match = marker.exec(raw))) {
    const start = match.index + match[0].length;
    const end = raw.indexOf("endstream", start);
    try {
      const stream = zlib.inflateSync(Buffer.from(raw.slice(start, end), "latin1")).toString("latin1");
      if (!stream.includes("BT")) continue;
      pages.push({
        runs: (stream.match(/TJ|Tj/g) || []).length,
        fontSizes: [...new Set([...stream.matchAll(/\/F\d+ ([\d.]+) Tf/g)].map((m) => m[1]))],
        cards: (stream.match(/1 1 1 scn/g) || []).length,
      });
    } catch {
      // Not a deflated content stream.
    }
  }

  return pages;
}

const TITLE_SIZE = 17.5;

/** The real nesting: Page > row > main column > [previous section, section card]. */
function sectionCard({ keepTitleWithFirstChild, entryLines = [6, 6, 6] }) {
  const entries = entryLines.map((lines, index) => bodyBlock(`E${index}`, lines, { wrap: false }));
  const titleRow = React.createElement(
    View,
    { key: "T" },
    React.createElement(
      Text,
      { style: { fontFamily: "SpaceGrotesk", fontSize: TITLE_SIZE, lineHeight: 1.15 } },
      "TITLE",
    ),
  );

  const head = keepTitleWithFirstChild
    ? [React.createElement(View, { key: "U", wrap: false }, [titleRow, entries[0]]), ...entries.slice(1)]
    : [titleRow, ...entries];

  const card = React.createElement(
    View,
    { key: "C", wrap: true, style: { backgroundColor: "#ffffff", padding: 12.5, marginTop: 12.5 } },
    head,
  );

  return React.createElement(
    View,
    { key: "R", style: { flexDirection: "row" } },
    React.createElement(
      View,
      { key: "M", style: { flex: 1, flexDirection: "column", gap: 12.5 } },
      [bodyBlock("F", 42), card],
    ),
  );
}

test("a section title never stays behind alone when its first entry moves on", async () => {
  /*
   * `minPresenceAhead` cannot do this job. react-pdf's shouldBreak() gates that
   * branch on `breakingImprovesPresence`, which is `previousElements.length > 0`
   * — and a section title is its card's first child, so it has no previous
   * siblings and the branch never runs, at any value. The title stayed at the
   * foot of the page with an empty card fragment while its entries moved on.
   *
   * Binding title and first entry into one wrap={false} node takes the
   * `shouldSplit && !canWrap` branch instead, which has no such guard.
   *
   * 42 filler lines leave about 113pt of A4 — less than the title plus a 96pt
   * entry needs.
   */
  const stranded = a4Pages(await renderA4(sectionCard({ keepTitleWithFirstChild: false })));
  const bound = a4Pages(await renderA4(sectionCard({ keepTitleWithFirstChild: true })));

  const withFiller = (pages) => pages.find((page) => page.runs > 40);

  assert.ok(
    withFiller(stranded).fontSizes.includes(String(TITLE_SIZE)),
    "an unbound title is expected to strand — if react-pdf fixes this, drop the binding",
  );
  assert.ok(
    !withFiller(bound).fontSizes.includes(String(TITLE_SIZE)),
    "the bound title must travel to the page its first entry landed on",
  );

  // And the card must not leave an empty white box behind either.
  assert.equal(withFiller(bound).cards, 0, "no empty section card may remain on the first page");

  const total = (pages) => pages.reduce((sum, page) => sum + page.runs, 0);
  assert.equal(total(bound), total(stranded), "binding must not drop or duplicate any line");
});

test("a long name and role wrap inside the header instead of running off the page", async () => {
  /*
   * The identity column is a flex item, so it defaults to min-width: auto and
   * refuses to shrink below its longest line — the role rendered at 500pt in a
   * 468.6pt column and simply crossed the right margin. .hero__identity carries
   * `min-width: 0` on the web for the same reason.
   */
  const logo = 60;
  const gap = 10;
  const available = A4.width - 2 * A4.margin - logo - gap;

  const name = "Aleksandra Katarzyna Wisniewska-Kowalczyk";
  const role = "Principal Software Engineer, Distributed Systems and Platform Architecture";

  async function lineCount(identityStyle) {
    const buffer = await renderA4(
      React.createElement(
        View,
        { style: { flexDirection: "row", alignItems: "center", gap } },
        circle(logo, "#009c8a", { minWidth: logo }),
        React.createElement(
          View,
          { key: "identity", style: { flexDirection: "column", gap: 2.5, ...identityStyle } },
          text(27.5, { lineHeight: 1.15 }, name),
          text(13.75, { lineHeight: 1.6 }, role),
        ),
      ),
    );

    return a4Pages(buffer)[0].runs;
  }

  // Both strings are wider than the column, so a column that can shrink has to
  // produce more lines than one that cannot.
  const unshrinkable = await lineCount({});
  const shrinkable = await lineCount({ flex: 1, minWidth: 0 });

  assert.ok(
    shrinkable > unshrinkable,
    `expected extra wrapped lines once the column may shrink, got ${shrinkable} against ${unshrinkable} ` +
      `in ${available.toFixed(0)}pt`,
  );
});
