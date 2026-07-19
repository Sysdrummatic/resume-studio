import { marked } from "marked";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Content is founder-authored and repo-committed, but raw HTML pass-through is
// still disabled (defense in depth before dangerouslySetInnerHTML — same spirit
// as safeJsonLdScript). Every block and inline HTML token renders as escaped text.
marked.use({
  renderer: {
    html(token) {
      return escapeHtml(token.text);
    },
  },
});

export function renderMarkdownToHtml(markdown: string): string {
  return marked.parse(markdown, { async: false });
}
