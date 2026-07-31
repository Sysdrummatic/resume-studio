import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { register } from "node:module";
import React from "react";
import { Document, Page, Text, Font, renderToBuffer } from "@react-pdf/renderer";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

const { cvBasicDotTheme } = await import("../app/lib/pdf/theme.ts");
const { loadPdfFonts } = await import("../app/lib/pdf/engine-react-pdf.ts");
const { sidebarTextWidth, wrapAtBreakPoints, measureText } = await import("../app/lib/pdf/metrics.ts");
const { splitContactValueForWrapping } = await import(
  "../app/components/resume-renderer/build-resume-render-model.ts"
);

await loadPdfFonts();

const theme = cvBasicDotTheme;
const WIDTH = sidebarTextWidth(theme);
const SIZE = theme.typography.sizes.contactValue;

const wrap = (value) => wrapAtBreakPoints(splitContactValueForWrapping(value), WIDTH, SIZE);

/**
 * Long contact values had nowhere to break in the PDF.
 *
 * The web marks the same points with `<wbr>`, which costs nothing when the value
 * fits. react-pdf's hyphenation callback does offer break opportunities, but it
 * paints a hyphen at the break — a rendered `ariana.holt-` / `@example.com`,
 * which lands in the text layer too and is worse for an ATS than the overflow it
 * would replace. Verified below against the PDF's own ToUnicode map.
 */

/**
 * The text runs a PDF reader (or an ATS) extracts, decoded through the file's
 * own ToUnicode map — never rejoined here, so a break in the address shows up in
 * the assertion rather than being hidden by it. pdfkit emits one run per
 * positioned segment, so a wrapped value yields at least one run per line and
 * sometimes more.
 */
async function extractTextRuns(value) {
  const buffer = await renderToBuffer(
    React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: [WIDTH + 4, 400], style: { padding: 0 } },
        React.createElement(
          Text,
          {
            style: {
              fontFamily: "SpaceGrotesk",
              fontSize: SIZE,
              lineHeight: theme.typography.lineHeightTight,
              width: WIDTH,
            },
          },
          value,
        ),
      ),
    ),
  );

  const raw = buffer.toString("latin1");
  const toUnicode = {};
  let content = null;

  const marker = /stream\r?\n/g;
  let match;
  while ((match = marker.exec(raw))) {
    const start = match.index + match[0].length;
    const end = raw.indexOf("endstream", start);
    const segment = raw.slice(start, end);

    let text;
    try {
      text = zlib.inflateSync(Buffer.from(segment, "latin1")).toString("latin1");
    } catch {
      text = segment;
    }

    if (text.includes("BT")) content = text;

    for (const range of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
      for (const entry of range[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
        const [lo, hi, dst] = entry.slice(1).map((hex) => parseInt(hex, 16));
        for (let code = lo; code <= hi; code += 1) toUnicode[code] = String.fromCharCode(dst + code - lo);
      }
    }
    for (const chars of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
      for (const entry of chars[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
        toUnicode[parseInt(entry[1], 16)] = String.fromCharCode(parseInt(entry[2], 16));
      }
    }
  }

  return content
    .split("BT")
    .slice(1)
    .map((segment) => {
      const ids = [];
      for (const glyph of segment.matchAll(/<([0-9a-fA-F]+)>/g)) {
        for (let i = 0; i < glyph[1].length; i += 4) ids.push(parseInt(glyph[1].slice(i, i + 4), 16));
      }
      return ids.map((id) => toUnicode[id] ?? "�").join("");
    })
    .filter((line) => line.length > 0);
}

test("a value that fits is left exactly as it was written", () => {
  for (const value of ["Portland, OR", "+1 555 204 1130", "ariana.holt@example.com"]) {
    assert.ok(measureText(value, SIZE) <= WIDTH, `${value} was expected to fit ${WIDTH.toFixed(0)}pt`);
    assert.equal(wrap(value), value);
  }
});

test("an overlong e-mail breaks before the @, and a URL after a slash", () => {
  const email = "ariana.holt@examplecorp.com";
  const profile = "linkedin.com/in/aleksandrawisniewskakowalczyk";

  assert.ok(measureText(email, SIZE) > WIDTH, "the fixture must actually overflow");

  assert.equal(wrap(email), "ariana.holt\n@examplecorp.com");
  assert.match(wrap(profile), /^linkedin\.com\/in\/\n/);
});

test("no produced line is ever wider than the column", () => {
  /*
   * The invariant that keeps react-pdf out of it. Anything still over the width
   * gets broken by react-pdf itself, wherever it likes, with a hyphen painted
   * into the address. Punctuation the value already contains is the second
   * choice; a slug with none — `aleksandrawisniewskakowalczyk` — falls back to a
   * hard cut, which is what `overflow-wrap: break-word` does on the web.
   */
  const values = [
    "aleksandra.wisniewska-kowalczyk@very-long-company-name.example.com",
    "linkedin.com/in/aleksandrawisniewskakowalczyk",
    "averyveryverylongsinglewordwithnopunctuationatallhere",
  ];

  for (const value of values) {
    const lines = wrap(value).split("\n");
    assert.ok(lines.length > 1, `${value} was expected to need more than one line`);

    for (const line of lines) {
      assert.ok(
        measureText(line, SIZE) <= WIDTH,
        `"${line}" is ${measureText(line, SIZE).toFixed(0)}pt in a ${WIDTH.toFixed(0)}pt column`,
      );
    }
  }
});

test("wrapping only ever inserts newlines — the characters are untouched", () => {
  // An ATS reads the text layer. A hyphen, a zero-width space or a dropped
  // character would each corrupt the address it extracts.
  for (const value of [
    "ariana.holt@example.com",
    "aleksandra.wisniewska-kowalczyk@very-long-company-name.example.com",
    "linkedin.com/in/aleksandrawisniewskakowalczyk",
    "Portland, OR",
  ]) {
    assert.equal(wrap(value).replace(/\n/g, ""), value);
  }
});

test("a value that fits extracts as one unbroken token", async () => {
  // The case that covers virtually every real CV, and the one that has to be
  // perfect: an e-mail short enough for the column is a single line in the text
  // layer, so any ATS regex matches it.
  const value = "ariana.holt@example.com";
  assert.ok(measureText(value, SIZE) <= WIDTH, "the fixture must actually fit");

  assert.deepEqual(await extractTextRuns(value), [value]);
});

test("a wrapped value extracts discontinuously — the accepted cost, pinned", async () => {
  /*
   * The trade-off, stated rather than papered over. Rejoining the runs would
   * hide it, so this asserts the raw extraction: a wrapped address does not come
   * back as one token, and `pdftotext` reports the same discontinuity as a line
   * break (`ariana.holt` / `@examplecorp.com`). A one-line e-mail regex will not
   * match that.
   *
   * PDF has no soft break, so the alternatives were a value drawn past the edge
   * of the column where a reader cannot see it at all, or react-pdf's own
   * hyphenation, which paints a literal `-` into the address — in the text layer
   * too, so it corrupts the address even for a parser that does rejoin lines.
   * Pre-wrapping is the only one of the three that leaves every character
   * intact, and it only ever applies to a value that could not have stayed on
   * one line anyway. Machine-grade extraction is served by
   * /api/resume/export/text and /export/yaml, which emit each contact value on
   * one unbroken line. See app/lib/pdf/metrics.ts.
   */
  const value = "ariana.holt@examplecorp.com";
  assert.ok(measureText(value, SIZE) > WIDTH, "the fixture must actually overflow");

  const runs = await extractTextRuns(wrap(value));
  assert.deepEqual(runs, ["ariana.holt", "@", "examplecorp.com"]);
  assert.ok(!runs.includes(value), "if this ever extracts whole, the trade-off above is gone");

  // No character is added, dropped or altered — only the boundaries are new.
  assert.equal(runs.join(""), value);
});

test("react-pdf's own hyphenation would corrupt the address, which is why it is not used", async () => {
  const value = "aleksandra.wisniewska-kowalczyk@very-long-company-name.example.com";

  Font.registerHyphenationCallback((word) => splitContactValueForWrapping(word));
  const hyphenated = await extractTextRuns(value);
  Font.registerHyphenationCallback((word) => [word]);

  assert.notEqual(
    hyphenated.join(""),
    value,
    "react-pdf's hyphenation was expected to add a character — if it stopped, wrapAtBreakPoints can go",
  );

  const preWrapped = await extractTextRuns(wrap(value));
  assert.equal(
    preWrapped.join(""),
    value,
    `pre-wrapping must not alter the address, extracted ${JSON.stringify(preWrapped)}`,
  );
});

test("measuring a very long value stays linear", () => {
  /*
   * Breaking a token used to re-measure a one-character-longer prefix per step,
   * so a 64k-character field took ~1.9s of blocked event loop before react-pdf
   * had drawn anything — on a public route whose only other protection is a
   * per-process rate limiter. Shaping once and adding up glyph advances is
   * linear; the check is the shape of the curve, not a wall-clock threshold, so
   * it does not turn into a flaky benchmark on a slow CI box.
   */
  const time = (length) => {
    const value = "a".repeat(length);
    const started = process.hrtime.bigint();
    wrap(value);
    return Number(process.hrtime.bigint() - started) / 1e6;
  };

  time(4000); // warm the font cache and the JIT
  const short = Math.max(time(16000), 1);
  const long = time(64000);

  assert.ok(
    long < short * 12,
    `4x the input took ${(long / short).toFixed(1)}x the time (${short.toFixed(0)}ms -> ${long.toFixed(0)}ms) — that is not linear`,
  );
});

test("an over-long first contact is not bound to the section title", async () => {
  /*
   * PdfSectionCard binds the title and the first row into one `wrap={false}`
   * View. A 10 000-character contact wrapped to 417 lines, and that binding put
   * a node taller than the page inside something that cannot split: react-pdf
   * warned and drew the tail off the sheet. Nothing caps a contact value's
   * length, so the binding has to give way. A stranded heading is the lesser
   * failure.
   */
  const { PdfPersonalInfo } = await import("../app/lib/pdf/sections/PdfPersonalInfo.tsx");
  const card = (contact) => PdfPersonalInfo({ contact, title: "Personal Info", theme });

  assert.equal(
    card([{ label: "Email", value: "ariana.holt@example.com" }]).props.keepTitleWithFirstChild,
    true,
    "an ordinary contact must still keep the heading with it",
  );
  assert.equal(
    card([{ label: "Email", value: "a".repeat(10000) }]).props.keepTitleWithFirstChild,
    false,
  );

  const warnings = [];
  const original = console.warn;
  console.warn = (...args) => warnings.push(args.join(" "));
  try {
    await renderToBuffer(
      React.createElement(
        Document,
        null,
        React.createElement(
          Page,
          { size: "A4" },
          card([{ label: "Email", value: "a".repeat(10000) }]),
        ),
      ),
    );
  } finally {
    console.warn = original;
  }

  assert.deepEqual(
    warnings.filter((line) => /taller than page height/i.test(line)),
    [],
    "react-pdf still found an unsplittable node taller than the page",
  );
});

test("the PDF and the web split contact values at the same points", () => {
  // One shared function, so the two surfaces cannot drift apart.
  const personalInfo = fs.readFileSync(
    path.join(process.cwd(), "app/lib/pdf/sections/PdfPersonalInfo.tsx"),
    "utf8",
  );
  const renderer = fs.readFileSync(
    path.join(process.cwd(), "app/components/resume-renderer/ResumeRenderer.tsx"),
    "utf8",
  );

  assert.match(personalInfo, /splitContactValueForWrapping\(item\.value\)/);
  assert.match(renderer, /splitContactValueForWrapping\(item\.value\)/);
});

test("every route that renders a PDF loads the fonts first", () => {
  /*
   * `Font.register` only records a path. Until something loads it,
   * `Font.getFont(...).data` is null and metrics.ts falls back to treating every
   * character as the widest glyph — safe, but it would split entries that fit.
   * react-pdf loads fonts after the component tree has rendered, which is too
   * late for pagination.
   */
  const routes = ["app/api/resume/export/pdf/route.ts", "app/api/resume/export/pdf/preview/route.ts"];

  for (const route of routes) {
    const source = fs.readFileSync(path.join(process.cwd(), route), "utf8");
    assert.match(source, /renderToBuffer/, `${route} should be a PDF render route`);
    assert.match(source, /await loadPdfFonts\(\)/, `${route} must load the fonts before rendering`);
    assert.ok(
      source.indexOf("await loadPdfFonts()") < source.indexOf("await renderToBuffer"),
      `${route} must load the fonts before it renders, not after`,
    );
  }

  // A new export surface must not quietly skip it.
  const apiDir = path.join(process.cwd(), "app/api");
  const rendering = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts") && fs.readFileSync(full, "utf8").includes("renderToBuffer")) {
        rendering.push(full);
      }
    }
  })(apiDir);

  assert.equal(rendering.length, routes.length, `unexpected PDF render routes: ${rendering.join(", ")}`);
});
