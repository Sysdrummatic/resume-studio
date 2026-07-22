import { marked, type Tokens } from "marked";

export type DocHeading = {
  depth: 2 | 3;
  text: string;
  slug: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugifyHeading(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "section";
}

// ponytail: module-level collector shared with the renderer; safe because
// marked.parse with async:false is fully synchronous — swap for a per-call
// Marked instance if async rendering is ever introduced.
let outline: DocHeading[] = [];
let slugCounts = new Map<string, number>();

const CALLOUT_TYPES = new Set(["info", "warning", "tip", "danger"]);

type AdmonitionToken = Tokens.Generic & {
  type: "admonition";
  calloutType: string;
  tokens: Tokens.Generic[];
};

// Docs-only callout syntax: ":::warning\nbody\n:::" renders as a styled box.
// Not CommonMark — a small marked block extension, scoped to content/docs
// authoring, not the resume/CV rendering path.
marked.use({
  extensions: [
    {
      name: "admonition",
      level: "block",
      start(src: string) {
        return src.match(/^:::\w+/m)?.index;
      },
      tokenizer(src: string) {
        const match = /^:::(\w+)[ \t]*\n([\s\S]*?)\n:::(?:\n+|$)/.exec(src);
        if (!match) {
          return undefined;
        }
        const calloutType = CALLOUT_TYPES.has(match[1]) ? match[1] : "info";
        const token: AdmonitionToken = { type: "admonition", raw: match[0], calloutType, tokens: [] };
        this.lexer.blockTokens(match[2].trim(), token.tokens);
        return token;
      },
      renderer(generic: Tokens.Generic) {
        const token = generic as AdmonitionToken;
        return `<div class="docs-callout docs-callout--${token.calloutType}">${this.parser.parse(token.tokens)}</div>\n`;
      },
    },
  ],
});

// Content is founder-authored and repo-committed, but raw HTML pass-through is
// still disabled (defense in depth before dangerouslySetInnerHTML — same spirit
// as safeJsonLdScript). Every block and inline HTML token renders as escaped text.
// Headings get stable ids so the "On this page" outline can anchor-link to them.
marked.use({
  renderer: {
    html(token) {
      return escapeHtml(token.text);
    },
    heading(token) {
      const base = slugifyHeading(token.text);
      const seen = slugCounts.get(base) ?? 0;
      slugCounts.set(base, seen + 1);
      const slug = seen === 0 ? base : `${base}-${seen}`;
      if (token.depth === 2 || token.depth === 3) {
        outline.push({ depth: token.depth, text: token.text, slug });
      }
      return `<h${token.depth} id="${slug}">${this.parser.parseInline(token.tokens)}</h${token.depth}>\n`;
    },
  },
});

export function renderMarkdownWithOutline(markdown: string): { html: string; headings: DocHeading[] } {
  outline = [];
  slugCounts = new Map();
  const html = marked.parse(markdown, { async: false });
  return { html, headings: outline };
}

export function renderMarkdownToHtml(markdown: string): string {
  return renderMarkdownWithOutline(markdown).html;
}
