import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Enforces the breakpoint ladder documented in DESIGN.md → Layout → Breakpoints.
 * The prose there and the sets here are one decision: change both together.
 *
 * A ladder step is written as a pair (767/768, 979/980, ...) because `max-width`
 * blocks sit one pixel below the `min-width` block they hand over to.
 */
const PORTAL_LADDER = new Set([640, 767, 768, 979, 980, 1279, 1280, 1439, 1440, 1599, 1600]);

/**
 * The CV renderer is a fixed-width document (210mm in plain/print mode), not a
 * fluid page, so it runs its own ladder. DESIGN.md → Design Domain Boundaries.
 */
const CV_LADDER = new Set([479, 480, 639, 640, 767, 768, 1023, 1024]);
const CV_DOMAIN_PREFIX = "app/resume/";

/**
 * Values that predate the ladder. This list is a ratchet: it may shrink, never
 * grow. Removing a value from the code without removing it here fails
 * "the grandfathered list carries no stale entries" below, so the list cannot
 * quietly outlive the CSS it excuses.
 */
const GRANDFATHERED = {
  "app/components/open-civera-animation.module.css": [760],
  "app/cv-templates/templates.module.css": [720],
  "app/globals.css": [479, 560, 600, 680, 699, 700, 900, 940, 960],
  "app/onboarding/onboarding.css": [600, 900],
  "app/resume/resume.css": [520, 900],
  "app/user/user.css": [699, 700, 1100]
};

/** 980px has one home; every other module imports it. See CLAUDE.md and DESIGN.md. */
const NAV_BREAKPOINT = 980;
const NAV_BREAKPOINT_OWNER = "app/components/app-header-navigation.tsx";

function collectSourceFiles(dir, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(entryPath, found);
    } else if (/\.(css|ts|tsx)$/.test(entry.name)) {
      found.push(entryPath.split(path.sep).join("/"));
    }
  }
  return found;
}

/**
 * Viewport breakpoints only: widths inside an `@media` prelude, plus the quoted
 * media strings JS hands to `matchMedia`. `@container` queries are deliberately
 * excluded — they measure an element, not the viewport, and answer to the
 * component that owns them rather than to this ladder.
 */
function readBreakpoints(file) {
  const source = readFileSync(file, "utf8");
  const widths = [];

  for (const media of source.matchAll(/@media[^{;]*/g)) {
    for (const width of media[0].matchAll(/\((?:min|max)-width:\s*(\d+)px\)/g)) {
      widths.push(Number(width[1]));
    }
  }

  for (const quoted of source.matchAll(/["'`]\s*\((?:min|max)-width:\s*(\d+)px\)\s*["'`]/g)) {
    widths.push(Number(quoted[1]));
  }

  return widths;
}

const sourceFiles = collectSourceFiles("app");
const breakpointsByFile = new Map(
  sourceFiles
    .map((file) => [file, new Set(readBreakpoints(file))])
    .filter(([, widths]) => widths.size > 0)
);

test("every viewport breakpoint sits on the documented ladder", () => {
  const offLadder = [];

  for (const [file, widths] of breakpointsByFile) {
    const ladder = file.startsWith(CV_DOMAIN_PREFIX) ? CV_LADDER : PORTAL_LADDER;
    const excused = new Set(GRANDFATHERED[file] || []);

    for (const width of widths) {
      if (!ladder.has(width) && !excused.has(width)) {
        offLadder.push(`${file}: ${width}px`);
      }
    }
  }

  assert.deepEqual(
    offLadder,
    [],
    `Off-ladder breakpoints. Move them onto a documented step (DESIGN.md → Layout → Breakpoints), ` +
      `or add them to GRANDFATHERED here with a reason:\n  ${offLadder.join("\n  ")}`
  );
});

test("the grandfathered list carries no stale entries", () => {
  const stale = [];

  for (const [file, widths] of Object.entries(GRANDFATHERED)) {
    const present = breakpointsByFile.get(file);
    for (const width of widths) {
      if (!present?.has(width)) stale.push(`${file}: ${width}px`);
    }
  }

  assert.deepEqual(
    stale,
    [],
    `These breakpoints are excused but no longer in the code. Delete them from GRANDFATHERED ` +
      `so the list keeps shrinking:\n  ${stale.join("\n  ")}`
  );
});

test("the desktop navigation breakpoint is declared once and imported everywhere else", () => {
  const redeclared = [];

  for (const [file, widths] of breakpointsByFile) {
    if (!/\.tsx?$/.test(file) || file === NAV_BREAKPOINT_OWNER) continue;
    if (widths.has(NAV_BREAKPOINT)) redeclared.push(file);
  }

  assert.deepEqual(
    redeclared,
    [],
    `Import DESKTOP_NAVIGATION_BREAKPOINT_QUERY from ${NAV_BREAKPOINT_OWNER} instead of ` +
      `repeating "(min-width: ${NAV_BREAKPOINT}px)":\n  ${redeclared.join("\n  ")}`
  );
});
