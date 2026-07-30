import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * The PDF export is the LiveCV design scaled to A4, not a second design.
 *
 * app/lib/pdf/theme.ts encodes that as `pt(<web pixel value>)`, so parity is
 * checkable without arithmetic: the pixel argument in theme.ts must equal the
 * value resume.css declares. Before this contract existed the two drifted far
 * enough that the PDF's section dot was 27% of its web proportion and the
 * course tiles mirrored a stylesheet rule the renderer had stopped using.
 */

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const resumeCss = read("app/resume/resume.css");
const themeSource = read("app/lib/pdf/theme.ts");
const engineSource = read("app/lib/pdf/engine-react-pdf.ts");

const ROOT_FONT_SIZE_PX = 16;

const themeConstant = (name) => Number(themeSource.match(new RegExp(`${name}\\s*=\\s*([\\d.]+)`))?.[1]);

/**
 * `.resume-editor-basic` redeclares the whole token set at smaller values for
 * the editor and preview canvases. The PDF mirrors the public LiveCV view, so
 * only declarations before that rule are in scope.
 */
const PUBLIC_VIEW_CSS = resumeCss.slice(0, resumeCss.indexOf(".resume-editor-basic {"));

/** Last declaration wins, which is the >=1024px override the PDF layout mirrors. */
function cssCustomProperty(name) {
  const matches = [...PUBLIC_VIEW_CSS.matchAll(new RegExp(`--${name}:\\s*([^;]+);`, "g"))];
  assert.notEqual(matches.length, 0, `resume.css must declare --${name}`);
  return matches[matches.length - 1][1].trim();
}

function toPx(value) {
  const trimmed = value.trim();
  if (trimmed.endsWith("rem")) return parseFloat(trimmed) * ROOT_FONT_SIZE_PX;
  return parseFloat(trimmed);
}

/** Resolves `A + Bvw` sums and bare lengths; enough for every clamp in resume.css. */
function resolveExpression(expression) {
  return expression.split("+").reduce((total, term) => total + toPx(term), 0);
}

function resolveClamp(value) {
  const inner = value.match(/^clamp\((.*)\)$/s);
  if (!inner) return resolveExpression(value);

  const [min, preferred, max] = inner[1].split(",").map(resolveExpression);
  return Math.min(Math.max(min, preferred), max);
}

/** The exported theme object, so interface declarations cannot satisfy a check. */
const themeObject = themeSource.slice(themeSource.indexOf("export const cvBasicDotTheme"));

/** `indent` is the nesting depth of the group key: 2 for top level, 4 for `typography.sizes`. */
function themeGroup(name, indent = 2) {
  const pad = " ".repeat(indent);
  const block = themeObject.match(new RegExp(`\\n${pad}${name}: \\{([\\s\\S]*?)\\n${pad}\\},`));
  assert.notEqual(block, null, `theme.ts must declare a ${name} group`);
  return block[1];
}

/**
 * Pulls `<key>: pt(<px>)` out of a theme group. Values written any other way
 * are invisible here and fail the "everything is derived" test below.
 */
function themePt(group, key, indent) {
  const match = themeGroup(group, indent).match(new RegExp(`\\b${key}:\\s*pt\\(([\\d.\\s+]+)\\)`));
  assert.notEqual(match, null, `theme.ts must derive ${group}.${key} with pt()`);
  return match[1].split("+").reduce((total, term) => total + Number(term.trim()), 0);
}

const sizes = (key) => themePt("sizes", key, 4);

/** Resolving rem/vw sums accumulates binary float error; compare below a sub-pixel epsilon. */
function assertPx(actual, expected, message) {
  assert.ok(
    Math.abs(actual - expected) < 1e-6,
    `${message}: theme has ${actual}px, resume.css resolves to ${expected}px`,
  );
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

test("theme.ts converts with a single documented factor", () => {
  assert.equal(themeConstant("PX_TO_PT"), 0.625);
  assert.match(themeSource, /const pt = \(px: number\): number => px \* PX_TO_PT;/);
});

test("--resume-max-width is the width PX_TO_PT implies, not an independent choice", () => {
  /*
   * The contract this file was missing, and the reason the export drifted for
   * so long without a red test.
   *
   * Every token below was checked against resume.css and passed, but nothing
   * checked the *container* those tokens live in. theme.ts scaled type by
   * 0.625 while resume.css sized the shell at 1100px, which implies 0.508 —
   * two scales, one document. Text kept a measure a fifth shorter than the web
   * and every line broke somewhere else.
   *
   * `factor = usable A4 width / layout width` admits one declared value.
   * PX_TO_PT is it; the shell follows.
   */
  const layoutPx =
    (themeConstant("A4_WIDTH_PT") - 2 * themeConstant("PAGE_MARGIN_PT")) / themeConstant("PX_TO_PT");

  assertPx(
    toPx(cssCustomProperty("resume-max-width")),
    layoutPx + 2 * toPx(cssCustomProperty("space-lg")),
    "--resume-max-width",
  );

  assert.match(themeSource, /REFERENCE_LAYOUT_PX = \(A4_WIDTH_PT - 2 \* PAGE_MARGIN_PT\) \/ PX_TO_PT/);
  assert.match(themeObject, /pageMargin: PAGE_MARGIN_PT/);
});

test("the CV type scale is free of viewport units", () => {
  /*
   * The shell is capped at --resume-max-width, so a vw term resized text inside
   * a container that never moved: --font-size-lg ran 25.8px at a 1024px
   * viewport and 28px from 1300px up, over an identical column. The PDF has no
   * viewport and could match neither. rem keeps the reader's own font size
   * working, which is the part worth having.
   */
  for (const token of ["font-size-sm", "font-size-md", "font-size-lg"]) {
    assert.doesNotMatch(cssCustomProperty(token), /vw/, `--${token} must not depend on the viewport`);
  }

  assert.doesNotMatch(PUBLIC_VIEW_CSS, /--font-size-[\w-]+:[^;]*vw/);
});

test("spacing scale mirrors the --space-* tokens under their own names", () => {
  // The scales previously shared names but were shifted one step apart:
  // theme `spacing.lg` was 16 while --space-lg is 20px.
  assert.equal(themePt("spacing", "space2xs"), toPx(cssCustomProperty("space-2xs")));
  assert.equal(themePt("spacing", "spaceXs"), toPx(cssCustomProperty("space-xs")));
  assert.equal(themePt("spacing", "spaceSm"), toPx(cssCustomProperty("space-sm")));
  assert.equal(themePt("spacing", "spaceMd"), toPx(cssCustomProperty("space-md")));
  assert.equal(themePt("spacing", "spaceLg"), toPx(cssCustomProperty("space-lg")));
  assert.equal(themePt("spacing", "spaceXl"), toPx(cssCustomProperty("space-xl")));
});

test("type scale mirrors the --font-size-* tokens, fluid values included", () => {
  assertPx(sizes("base"), resolveClamp(cssCustomProperty("font-size-base")), "--font-size-base");
  assertPx(sizes("sm"), resolveClamp(cssCustomProperty("font-size-sm")), "--font-size-sm");
  assertPx(sizes("md"), resolveClamp(cssCustomProperty("font-size-md")), "--font-size-md");
  assertPx(sizes("lg"), resolveClamp(cssCustomProperty("font-size-lg")), "--font-size-lg");
  assertPx(
    sizes("lgSidebar"),
    toPx(cssCustomProperty("font-size-lg-sidebar")),
    "--font-size-lg-sidebar",
  );
  assertPx(sizes("xl"), toPx(cssCustomProperty("font-size-xl")), "--font-size-xl");
  assertPx(sizes("logo"), toPx(cssCustomProperty("logo-font-size")), "--logo-font-size");
  // The hero role used to reuse sizes.base, which happened to equal
  // --role-font-size until the role was enlarged.
  assertPx(sizes("role"), toPx(cssCustomProperty("role-font-size")), "--role-font-size");
  assertPx(
    sizes("contactValue"),
    toPx(cssCustomProperty("contact-value-font-size")),
    "--contact-value-font-size",
  );
});

test("line heights mirror the --line-height-* tokens", () => {
  const themeLineHeight = (key) =>
    Number(themeGroup("typography").match(new RegExp(`\\b${key}:\\s*([\\d.]+)`))[1]);

  assert.equal(themeLineHeight("lineHeightHeading"), Number(cssCustomProperty("line-height-heading")));
  assert.equal(themeLineHeight("lineHeightTight"), Number(cssCustomProperty("line-height-tight")));

  // The tokens have to be the ones the rules actually use, not parallel values.
  const heading = PUBLIC_VIEW_CSS.match(/\.section-title h2,\s*\n\.section-title h3\s*\{([^}]*)\}/)[1];
  assert.match(heading, /line-height: var\(--line-height-heading\)/);
  assert.match(heading, /min-width: 0/);

  const contactItem = PUBLIC_VIEW_CSS.match(/\n\.contact-item\s*\{([^}]*)\}/)[1];
  assert.match(contactItem, /line-height: var\(--line-height-tight\)/);
});

test("sidebar sections ask for the sidebar heading size", () => {
  // The sidebar column leaves 158.5px for heading text and single words cannot
  // wrap, so --font-size-lg overflowed the card. The rule is scoped to the
  // two-column breakpoint: a single-column layout keeps one heading scale.
  const scoped = PUBLIC_VIEW_CSS.match(
    /@media \(min-width: 1024px\) \{\s*\n\s*\.sidebar \.section-title h2,[\s\S]*?\}\s*\n\}/,
  );
  assert.notEqual(scoped, null, "resume.css must scope the sidebar heading size to >=1024px");
  assert.match(scoped[0], /font-size: var\(--font-size-lg-sidebar\)/);

  for (const section of ["PersonalInfo", "Skills", "TechStack", "Languages", "Interests"]) {
    const source = read(`app/lib/pdf/sections/Pdf${section}.tsx`);
    assert.match(source, /<PdfSectionCard[^>]*\ssidebar\b/, `Pdf${section} must render as a sidebar card`);
  }

  for (const section of ["Summary", "Experience", "Education", "Courses"]) {
    const source = read(`app/lib/pdf/sections/Pdf${section}.tsx`);
    assert.doesNotMatch(source, /<PdfSectionCard[^>]*\ssidebar\b/, `Pdf${section} is a main-column card`);
  }
});

test("only Skills drops the bold label, on both surfaces", () => {
  const rule = PUBLIC_VIEW_CSS.match(
    /\.resume-section--skills \.meter-item__label\s*\{([^}]*)\}/,
  );
  assert.notEqual(rule, null, "resume.css must scope the lighter label to Skills");
  assert.match(rule[1], /font-weight:\s*400/);

  assert.match(read("app/lib/pdf/sections/PdfSkills.tsx"), /nameWeight=\{theme\.typography\.weights\.regular\}/);
  assert.doesNotMatch(read("app/lib/pdf/sections/PdfLanguages.tsx"), /nameWeight/);
});

test("a contact value is coloured by whether it links anywhere", () => {
  // .contact-list dd inherits --text; only .contact-list a is --accent-dark.
  // The PDF used to paint every value accent-dark, so Location came out green
  // there and black on the web.
  const dd = PUBLIC_VIEW_CSS.match(/\.contact-list dd\s*\{([^}]*)\}/)[1];
  assert.doesNotMatch(dd, /color:/);
  assert.match(PUBLIC_VIEW_CSS.match(/\.contact-list a\s*\{([^}]*)\}/)[1], /color: var\(--accent-dark\)/);

  assert.match(
    read("app/lib/pdf/sections/PdfPersonalInfo.tsx"),
    /color: item\.link \? theme\.colors\.accentDark : theme\.colors\.text/,
  );
});

test("radii mirror the --radius-* tokens", () => {
  assert.equal(themePt("radii", "md"), toPx(cssCustomProperty("radius-md")));
  assert.equal(themePt("radii", "lg"), toPx(cssCustomProperty("radius-lg")));
});

test("component geometry mirrors the selectors it names", () => {
  assert.equal(themePt("components", "logoSize"), toPx(cssCustomProperty("logo-size")));
  assert.equal(
    themePt("components", "timelineAxisOffset"),
    toPx(cssCustomProperty("timeline-axis-offset")),
  );
  assert.equal(themePt("components", "timelineDotSize"), toPx(cssCustomProperty("timeline-dot-size")));
  // .timeline padding-left = axis offset + content gap; the PDF rail spans it.
  assert.equal(
    themePt("components", "timelineRailWidth"),
    toPx(cssCustomProperty("timeline-axis-offset")) + toPx(cssCustomProperty("timeline-content-gap")),
  );

  const sectionDot = PUBLIC_VIEW_CSS.match(/\.section-dot\s*\{[^}]*width:\s*(\d+)px/);
  assert.equal(themePt("components", "sectionDotSize"), Number(sectionDot[1]));

  const meterDot = PUBLIC_VIEW_CSS.match(/\.meter__dot\s*\{[^}]*width:\s*(\d+)px/);
  assert.equal(themePt("components", "meterDotSize"), Number(meterDot[1]));
});

test("every derived token goes through pt(), so none can be hand-tuned", () => {
  for (const group of ["spacing", "components"]) {
    const entries = [...themeGroup(group).matchAll(/^\s{4}(\w+):\s*([^,]+),/gm)];
    assert.notEqual(entries.length, 0, `${group} must not be empty`);

    for (const [, key, value] of entries) {
      assert.match(value, /^pt\(/, `theme.ts ${group}.${key} must be derived with pt(), got: ${value}`);
    }
  }
});

test("card styling matches the web, which draws no border", () => {
  // .section / .card carry a soft box-shadow and no border. react-pdf has no
  // shadow; substituting a 1pt border made every PDF card read as a hard box.
  const cardRule = PUBLIC_VIEW_CSS.match(/\n\.card\s*\{([^}]*)\}/);
  assert.doesNotMatch(cardRule[1], /border:/);

  const primitives = read("app/lib/pdf/primitives.tsx");
  const sectionCard = primitives.match(/export function PdfSectionCard[\s\S]*?\n}/)[0];
  assert.doesNotMatch(sectionCard, /borderWidth/);
});

test("the CV uses only weights Space Grotesk ships as static files", () => {
  // No 600 instance exists and react-pdf cannot instance a variable axis, so a
  // 600 anywhere in the CV render path is a weight the PDF can never match.
  const cvSelector =
    /^\s*\.(hero__title|logo-circle|summary-text|section-title|section-dot|timeline|timeline-item|timeline--|contact-list|contact-item|course-|meter|meter-item|pill-list|item-list)/;

  const rules = [...PUBLIC_VIEW_CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const inspected = [];

  for (const [, selector, body] of rules) {
    if (!cvSelector.test(selector)) continue;

    const weight = body.match(/font-weight:\s*(\d{3})/);
    if (!weight) continue;

    inspected.push(selector.trim());
    assert.ok(
      ["400", "500", "700"].includes(weight[1]),
      `${selector.trim()} uses font-weight ${weight[1]}, which has no Space Grotesk static instance`,
    );
  }

  assert.ok(inspected.length >= 5, `expected to inspect the CV weight rules, saw ${inspected.length}`);
});

test("the PDF registers static instances, never the variable font", () => {
  // Registering the variable file for several weights silently embedded its
  // default instance — Light (300) — for all of them, leaving the PDF bold-less.
  assert.doesNotMatch(stripComments(engineSource), /VariableFont/);

  for (const file of ["SpaceGrotesk-Regular.ttf", "SpaceGrotesk-Medium.ttf", "SpaceGrotesk-Bold.ttf"]) {
    assert.match(engineSource, new RegExp(file.replace(/[.]/g, "\\.")));
    assert.ok(
      fs.existsSync(path.join(process.cwd(), "public/fonts", file)),
      `public/fonts/${file} must be vendored`,
    );
  }

  for (const weight of ["400", "500", "700"]) {
    assert.match(engineSource, new RegExp(`fontWeight: ${weight}`));
  }
});

test("the PDF does not hyphenate, because the browser does not either", () => {
  /*
   * `hyphens` is never declared in resume.css, so the initial value `manual`
   * applies and only an explicit soft hyphen breaks a word. react-pdf defaults
   * the other way: with no callback registered @react-pdf/textkit falls back to
   * `hyphen` + en-US patterns and breaks inside words in any language, which
   * moved every wrap point away from the web and split contact values
   * mid-token.
   */
  assert.doesNotMatch(PUBLIC_VIEW_CSS, /hyphens:/);
  assert.match(engineSource, /Font\.registerHyphenationCallback\(\(word\) => \[word\]\)/);
});

test("contact pairs stack, because the sidebar card is always a narrow container", () => {
  /*
   * .card is a `container-type: inline-size` query container. At the derived
   * shell width the sidebar card holds 200.5px of content on both surfaces, so
   * `@container (max-width: 220px)` always applies and .contact-item becomes a
   * column. The PDF laid label and value side by side instead, which is what
   * pushed long values onto a second line at a break the web never makes.
   */
  const card = PUBLIC_VIEW_CSS.match(/\n\.card\s*\{([^}]*)\}/);
  assert.match(card[1], /container-type:\s*inline-size/);

  const narrow = PUBLIC_VIEW_CSS.match(/@container \(max-width: 220px\)\s*\{\s*\.contact-item\s*\{([^}]*)\}/);
  assert.notEqual(narrow, null, "resume.css must keep the narrow-container .contact-item rule");
  assert.match(narrow[1], /flex-direction:\s*column/);

  const stackedGapPx = Number(narrow[1].match(/gap:\s*(\d+)px/)[1]);
  assert.equal(themePt("components", "contactLabelGap"), stackedGapPx);

  const personalInfo = read("app/lib/pdf/sections/PdfPersonalInfo.tsx");
  assert.match(personalInfo, /flexDirection: "column", alignItems: "flex-start"/);
});

test("text centred against a sibling compensates react-pdf's leading", () => {
  /*
   * CSS splits a line box's leading evenly above and below the glyphs.
   * react-pdf puts the baseline at `box top + font ascent`, so all of it falls
   * below and the glyphs ride high by (lineHeight - 1.276) / 2 of the font
   * size: 3.2pt for the 20pt hero initials, which left them above the middle of
   * their circle, and 2.8pt for a section heading, which made its dot read low.
   *
   * The fix is `lineHeight: lineHeightNatural` so the box hugs the glyphs, plus
   * centeringPadding() wherever the intended box height has to be preserved.
   */
  assert.match(themeSource, /const FONT_LINE_HEIGHT = 1\.276;/);
  assert.match(themeSource, /lineHeightNatural: FONT_LINE_HEIGHT/);
  assert.match(
    themeSource,
    /centeringPadding = \(fontSize: number, boxHeight: number\): number =>\s*\(boxHeight - fontSize \* FONT_LINE_HEIGHT\) \/ 2/,
  );

  // The hero circle centres its Text, so the box must not carry phantom leading.
  const header = stripComments(read("app/lib/pdf/sections/PdfHeader.tsx"));
  const logoStyle = header.match(/fontSize: typography\.sizes\.logo,[\s\S]*?\}\}/)[0];
  assert.match(logoStyle, /lineHeight: typography\.lineHeightNatural/);

  assert.match(
    themeSource,
    /opticalCentringMargin = \(fontSize: number, lineHeight: number\): number =>\s*fontSize \* \(2 \* OPTICAL_CENTRE - lineHeight\)/,
  );

  const primitives = stripComments(read("app/lib/pdf/primitives.tsx"));

  // The timeline period fills a box taller than its glyphs, so it pads.
  assert.equal((primitives.match(/centeringPadding\(/g) ?? []).length, 1);

  // The heading cannot: --line-height-heading is below the font's own 1.276, so
  // the padding would be negative, and the value has to stay literal because it
  // also spaces the lines of a heading that wraps.
  assert.equal((primitives.match(/opticalCentringMargin\(/g) ?? []).length, 1);
  assert.match(primitives, /lineHeight: typography\.lineHeightHeading/);
});

test("the timeline dot draws its ring as a circle, never a border", () => {
  // .timeline-item__period::before rings the dot with `box-shadow: 0 0 0 3px`,
  // outside the shape. react-pdf strokes borderWidth inside it, which showed up
  // as an outline the web never draws.
  const period = PUBLIC_VIEW_CSS.match(/\.timeline-item__period::before\s*\{([^}]*)\}/);
  assert.match(period[1], /box-shadow:\s*0 0 0 3px/);

  // To the next top-level declaration, not to the first `}` in column 0 — a
  // multi-line parameter list closes with one of those.
  const timelineItem = stripComments(read("app/lib/pdf/primitives.tsx")).match(
    /export function PdfTimelineItem[\s\S]*?\n(?=type |export function )/,
  )[0];
  assert.doesNotMatch(timelineItem, /borderWidth/);
  // The ring is a card-coloured circle with the accent dot nested inside it.
  assert.match(timelineItem, /<PdfCircle[\s\S]*?color=\{theme\.colors\.cardBg\}/);
  assert.match(timelineItem, /<PdfCircle[\s\S]*?color=\{theme\.colors\.accent\}[\s\S]*?\/>\s*<\/PdfCircle>/);
});

test("every circle the web pins with flex-shrink goes through PdfCircle", () => {
  /*
   * .section-dot, .meter and .logo-circle are all `flex-shrink: 0`. react-pdf
   * ignores flexShrink on a sized View, so a bare View gets squashed by a long
   * neighbour and its border radius clamps to the smaller side — a circle with
   * straight sides. PdfCircle is the one place that knows to use minWidth.
   */
  for (const selector of ["section-dot", "meter", "logo-circle"]) {
    const rule = PUBLIC_VIEW_CSS.match(new RegExp(`\\n\\.${selector}\\s*\\{([^}]*)\\}`));
    assert.notEqual(rule, null, `resume.css must declare .${selector}`);
  }
  assert.match(PUBLIC_VIEW_CSS.match(/\n\.section-dot\s*\{([^}]*)\}/)[1], /flex-shrink:\s*0/);
  assert.match(PUBLIC_VIEW_CSS.match(/\n\.meter\s*\{([^}]*)\}/)[1], /flex-shrink:\s*0/);

  const primitives = stripComments(read("app/lib/pdf/primitives.tsx"));
  assert.match(primitives, /minWidth: size/);

  // No section may hand-roll a circle and miss the guard.
  const sources = fs
    .readdirSync(path.join(process.cwd(), "app/lib/pdf/sections"))
    .map((file) => stripComments(read(`app/lib/pdf/sections/${file}`)))
    .concat(primitives);

  for (const source of sources) {
    for (const [, style] of source.matchAll(/style=\{\{([\s\S]*?)\}\}/g)) {
      if (!/borderRadius: theme\.radii\.full/.test(style)) continue;
      assert.ok(
        !/\bwidth:/.test(style) || /minWidth/.test(style),
        `a sized circle bypasses PdfCircle and can be squashed:\n${style}`,
      );
    }
  }
});

test("every timeline section plans its own page breaks", () => {
  /*
   * The wiring behind tests/pdf-pagination.test.mjs. Without it a section falls
   * back to binding a title to an entry that has to split — the arrangement
   * that draws an oversized entry's overflow off the sheet.
   */
  const primitives = stripComments(read("app/lib/pdf/primitives.tsx"));
  assert.match(primitives, /<View wrap=\{allowSplit\}/);
  assert.match(primitives, /keepTitleWithFirstChild \? \(\s*<View wrap=\{false\}>/);
  // The prop that never worked here: a title is its card's first child, and
  // react-pdf only honours minPresenceAhead for a node with previous siblings.
  assert.doesNotMatch(primitives, /minPresenceAhead/);

  for (const section of ["Experience", "Education", "Courses"]) {
    const source = stripComments(read(`app/lib/pdf/sections/Pdf${section}.tsx`));

    assert.match(source, /planTimelineSection\(/, `Pdf${section} must plan its breaks`);
    assert.match(
      source,
      /keepTitleWithFirstChild=\{pagination\.keepTitleWithFirstEntry\}/,
      `Pdf${section} must bind its title to the first entry`,
    );
    assert.match(
      source,
      /allowSplit=\{pagination\.allowSplit\[index\]\}/,
      `Pdf${section} must let an oversized entry split`,
    );
  }
});

test("every PDF Text sets its own lineHeight", () => {
  /*
   * react-pdf derives a Text's box height from a lineHeight declared on that
   * Text. An inherited one is applied when painting but not when measuring, so
   * a Page-level `lineHeight` let the hero role paint on top of the name. Any
   * styled Text that omits it is the same bug waiting to happen.
   */
  const files = [
    "app/lib/pdf/primitives.tsx",
    ...fs
      .readdirSync(path.join(process.cwd(), "app/lib/pdf/sections"))
      .map((file) => `app/lib/pdf/sections/${file}`),
  ];

  let checked = 0;

  for (const file of files) {
    const source = read(file);

    for (const [, style] of source.matchAll(/<Text\s+style=\{\{([\s\S]*?)\}\}/g)) {
      if (!style.includes("fontSize")) continue;

      checked += 1;
      assert.ok(
        style.includes("lineHeight") || style.includes("height:"),
        `${file}: a <Text> sets fontSize without lineHeight:\n${style}`,
      );
    }
  }

  assert.ok(checked >= 10, `expected to check every styled Text, saw ${checked}`);
});

test("the Page does not declare an inheritable lineHeight", () => {
  const template = stripComments(read("app/lib/pdf/templates/TwoColumnTemplate.tsx"));
  const pageStyle = template.match(/<Page[\s\S]*?\}\}/)[0];

  assert.doesNotMatch(pageStyle, /lineHeight/);
});

test("LiveCV and the PDF render the same education fields", () => {
  // `degree` is in the schema, editable, and exported to ATS, but LiveCV used
  // to drop it while the PDF showed it.
  const renderer = read("app/components/resume-renderer/ResumeRenderer.tsx");
  const pdfEducation = read("app/lib/pdf/sections/PdfEducation.tsx");

  for (const field of ["school", "degree", "detail"]) {
    assert.match(renderer, new RegExp(`item\\.${field}`), `ResumeRenderer must render education ${field}`);
    assert.match(pdfEducation, new RegExp(`entry\\.${field}`), `PdfEducation must render ${field}`);
  }
});

test("courses render as a timeline on both surfaces", () => {
  // The PDF used to mirror .course-list, a rule the renderer no longer uses.
  const pdfCourses = read("app/lib/pdf/sections/PdfCourses.tsx");

  assert.match(pdfCourses, /PdfTimelineItem/);
  assert.doesNotMatch(themeSource, /courseItemBg/);
});
