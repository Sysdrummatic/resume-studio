import { randomUUID } from "node:crypto";

const SUPABASE_URL = "http://fake-supabase.test";

// In-memory PostgREST stand-in for the handful of filters resume-server uses:
// `col=eq.x`, `col=in.("a","b")`, `order=col.asc|desc,...`, `limit=n`, plus the
// select/return=representation conventions supabase-http relies on. It does
// not model RLS, so it is only for asserting the order of the app's own calls.
// `triggers[table](row)` mirrors a BEFORE INSERT/UPDATE trigger: returning a
// string rejects the write like a PL/pgSQL `raise exception` (PostgREST: 400).
export function installFakePostgrest(seed = {}, { triggers = {} } = {}) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service";

  const tables = new Map(Object.entries(seed).map(([name, rows]) => [name, rows.map((row) => ({ ...row }))]));
  const table = (name) => {
    if (!tables.has(name)) tables.set(name, []);
    return tables.get(name);
  };
  const calls = [];

  function matches(row, params) {
    for (const [key, raw] of params) {
      if (["select", "order", "limit"].includes(key)) continue;
      const [op, ...rest] = raw.split(".");
      const value = rest.join(".");
      if (op === "eq" && String(row[key]) !== value) return false;
      if (op === "in") {
        const list = value.slice(1, -1).split(",").map((item) => item.replace(/^"|"$/g, ""));
        if (!list.includes(String(row[key]))) return false;
      }
    }
    return true;
  }

  function sorted(rows, order) {
    if (!order) return rows;
    const keys = order.split(",").map((part) => {
      const [column, direction = "asc"] = part.split(".");
      return { column, sign: direction === "desc" ? -1 : 1 };
    });
    return [...rows].sort((left, right) => {
      for (const { column, sign } of keys) {
        const a = left[column];
        const b = right[column];
        if (a === b) continue;
        return (a > b ? 1 : -1) * sign;
      }
      return 0;
    });
  }

  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  const original = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    const method = (init.method || "GET").toUpperCase();
    const path = url.pathname.replace("/rest/v1/", "");

    if (path.startsWith("rpc/")) {
      const name = path.slice(4);
      calls.push({ method: "RPC", target: name });
      return json(name === "create_resume_revision" ? 1 : true);
    }

    const rows = table(path);
    const params = [...url.searchParams.entries()];
    const now = new Date().toISOString();
    calls.push({ method, target: path, query: url.search });

    if (method === "GET") {
      const found = sorted(rows.filter((row) => matches(row, params)), url.searchParams.get("order"));
      const limit = Number(url.searchParams.get("limit") || found.length);
      return json(found.slice(0, limit));
    }
    const rejected = (row) => {
      const message = triggers[path]?.(row);
      return message ? json({ code: "P0001", message }, 400) : null;
    };
    if (method === "POST") {
      const body = JSON.parse(init.body);
      const created = (Array.isArray(body) ? body : [body]).map((row) => ({ id: randomUUID(), created_at: now, updated_at: now, ...row }));
      for (const row of created) {
        const failure = rejected(row);
        if (failure) return failure;
      }
      rows.push(...created);
      return json(created, 201);
    }
    if (method === "PATCH") {
      const patch = JSON.parse(init.body);
      const hit = rows.filter((row) => matches(row, params));
      for (const row of hit) {
        const failure = rejected({ ...row, ...patch });
        if (failure) return failure;
      }
      hit.forEach((row) => Object.assign(row, patch));
      return json(hit);
    }
    if (method === "DELETE") {
      const hit = rows.filter((row) => matches(row, params));
      tables.set(path, rows.filter((row) => !hit.includes(row)));
      return json(hit);
    }
    return json({ message: "unsupported" }, 400);
  };

  return {
    calls,
    rows: (name) => table(name),
    restore: () => {
      globalThis.fetch = original;
    },
  };
}
