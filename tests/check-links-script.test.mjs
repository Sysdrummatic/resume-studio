import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { crawl } from "../scripts/qa/check-links.mjs";

const pages = {
  "/": '<a href="/a">a</a><a href="https://elsewhere.test/x">ext</a><a href="/?lang=pl#top">self</a>',
  "/a": '<a href="/missing">gone</a><a href="/api/health">api</a>',
  "/lonely": "<p>nobody links here</p>",
};

test("crawl reports broken internal links and unlinked seeds, ignoring external, api and hash/lang", async () => {
  const server = http.createServer((req, res) => {
    const body = pages[new URL(req.url, "http://x").pathname];
    res.writeHead(body ? 200 : 404, { "content-type": "text/html" });
    res.end(body ?? "not found");
  });
  await new Promise((resolve) => server.listen(0, resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const report = await crawl(base, ["/", "/lonely"]);
    assert.deepEqual(report.broken, [{ path: "/missing", status: 404 }]);
    assert.deepEqual(report.orphans, ["/lonely"]);
  } finally {
    server.close();
  }
});
