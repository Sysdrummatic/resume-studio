import zlib from "node:zlib";
import React from "react";
import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";

/**
 * How tall react-pdf actually lays a node out, in points.
 *
 * react-pdf exposes no measurement API, which is the whole reason
 * app/lib/pdf/pagination.ts has to estimate. To check an estimate against
 * reality, the node is rendered on a page tall enough to hold anything with a
 * sentinel Text after it, and the sentinel's position is read back out of the
 * PDF's own content stream — so this measures the real component, not a
 * reconstruction of it.
 *
 * pdfkit positions text with nested `cm` translations, so the sentinel's offset
 * is the running sum of those inside the enclosing q/Q pairs. Its own baseline
 * sits one ascent below the top of its line box; subtracting that leaves the
 * height of everything drawn before it. Verified linear: a spacer View of height
 * h puts the sentinel at exactly h + ascent × fontSize.
 */

/**
 * pdfkit writes coordinates to six decimals, and this reads a height back out of
 * several of them added together, so a measurement can land a few millionths of
 * a point either side of the truth. Compare against it with this much slack —
 * 0.001pt is 350 nanometres on paper.
 */
export const MEASUREMENT_TOLERANCE_PT = 0.001;

const SENTINEL_SIZE = 10;
/** Space Grotesk ascent over unitsPerEm — see FONT_ASCENT in app/lib/pdf/theme.ts. */
const FONT_ASCENT = 0.984;

function contentStream(buffer) {
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

  return stream;
}

function lastTextTop(stream) {
  const stack = [];
  let offset = 0;
  let last = 0;

  for (const line of stream.split(/\r?\n/)) {
    if (line === "q") stack.push(offset);
    else if (line === "Q") offset = stack.length ? stack.pop() : 0;
    else if (line === "BT") last = offset;
    else {
      const cm = line.match(/^(\S+) (\S+) (\S+) (\S+) (\S+) (\S+) cm$/);
      if (cm) {
        const [a, b, c, d, , f] = cm.slice(1).map(Number);
        // Translations only; the `1 0 0 -1 0 H cm` flips are not offsets.
        if (a === 1 && b === 0 && c === 0 && d === 1) offset += f;
      }
    }
  }

  return last;
}

/** Renders `node` at `width` and returns the height react-pdf gave it. */
export async function renderedHeight(node, width) {
  const buffer = await renderToBuffer(
    React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: [width, 40000], style: { padding: 0 } },
        React.createElement(View, { style: { width } }, node),
        React.createElement(
          Text,
          { style: { fontFamily: "SpaceGrotesk", fontSize: SENTINEL_SIZE, lineHeight: 1 } },
          ".",
        ),
      ),
    ),
  );

  return lastTextTop(contentStream(buffer)) - SENTINEL_SIZE * FONT_ASCENT;
}
