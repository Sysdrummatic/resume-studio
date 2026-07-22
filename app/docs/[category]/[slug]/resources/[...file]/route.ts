import fs from "node:fs/promises";
import path from "node:path";
import { requireAuthenticatedActor } from "../../../../../lib/auth-server";
import { canViewTestScenarios } from "../../../../../lib/docs/access";
import { isDocCategory } from "../../../../../lib/docs/content";

const CONTENT_ROOT = path.join(process.cwd(), "content", "docs");
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const SAFE_SEGMENT = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

type RouteParams = { category: string; slug: string; file: string[] };

export async function GET(_req: Request, { params }: { params: Promise<RouteParams> }) {
  const { category, slug, file } = await params;

  if (!isDocCategory(category) || !SLUG_PATTERN.test(slug)) {
    return new Response("Not found", { status: 404 });
  }
  if (file.length === 0 || file.some((segment) => !SAFE_SEGMENT.test(segment))) {
    return new Response("Not found", { status: 404 });
  }

  const contentType = CONTENT_TYPES[path.extname(file[file.length - 1]).toLowerCase()];
  if (!contentType) {
    return new Response("Not found", { status: 404 });
  }

  // Same visibility gate as the doc page itself (app/docs/[category]/[slug]/page.tsx) —
  // resources must not be reachable when the parent doc is 404'd.
  const actor = await requireAuthenticatedActor();
  if (category === "test-scenarios" && !(await canViewTestScenarios(actor))) {
    return new Response("Not found", { status: 404 });
  }

  const filePath = path.join(CONTENT_ROOT, category, slug, "resources", ...file);
  let data: Buffer;
  try {
    data = await fs.readFile(filePath);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
