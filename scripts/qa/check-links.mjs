// Crawls the public routes of a running server and reports broken links and
// pages nothing links to. Needs a live server (`npm run build && npm start`),
// so it is deliberately not part of `npm run ci`.
import { fileURLToPath } from "node:url";

const DEFAULT_SEEDS = ["/", "/resume", "/docs", "/privacy", "/terms"];

function internalPath(href, base) {
  try {
    const url = new URL(href, base);
    if (url.origin !== new URL(base).origin) return null;
    url.hash = "";
    url.searchParams.delete("lang");
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

// Pages the sitemap promises but no crawled page links to; empty when it is unreachable.
async function sitemapPaths(baseUrl) {
  try {
    const response = await fetch(new URL("/sitemap.xml", baseUrl));
    if (!response.ok) return [];
    const xml = await response.text();
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => internalPath(loc, baseUrl)).filter(Boolean);
  } catch {
    return [];
  }
}

export async function crawl(baseUrl, seeds = DEFAULT_SEEDS, { limit = 200 } = {}) {
  const queue = [...seeds];
  const seen = new Set(seeds);
  const incoming = new Map();
  const broken = [];
  while (queue.length > 0 && seen.size <= limit) {
    const path = queue.shift();
    let response;
    try {
      response = await fetch(new URL(path, baseUrl));
    } catch {
      broken.push({ path, status: 0 });
      continue;
    }
    if (response.status >= 400) {
      broken.push({ path, status: response.status });
      continue;
    }
    if (!(response.headers.get("content-type") || "").includes("text/html")) continue;
    const html = await response.text();
    for (const [, href] of html.matchAll(/<a\s[^>]*href="([^"]+)"/g)) {
      const target = internalPath(href.replaceAll("&amp;", "&"), baseUrl);
      if (!target || target.startsWith("/api/")) continue;
      incoming.set(target, (incoming.get(target) ?? 0) + 1);
      if (!seen.has(target)) {
        seen.add(target);
        queue.push(target);
      }
    }
  }
  const orphans = [...new Set([...seeds, ...(await sitemapPaths(baseUrl))])].filter((p) => p !== "/" && !incoming.has(p));
  return { crawled: seen.size, broken, orphans };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const baseUrl = process.argv[2] || "http://localhost:3000";
  const report = await crawl(baseUrl);
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.broken.length > 0 ? 1 : 0);
}
