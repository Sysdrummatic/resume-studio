import assert from "node:assert/strict";

export const testUrl = process.env.SUPABASE_RLS_TEST_URL?.replace(/\/$/, "");
export const anonKey = process.env.SUPABASE_RLS_TEST_ANON_KEY;
export const serviceRoleKey = process.env.SUPABASE_RLS_TEST_SERVICE_ROLE_KEY;
export const configured = Boolean(testUrl && anonKey && serviceRoleKey);
export const skipReason = configured
  ? false
  : "Set SUPABASE_RLS_TEST_URL and dedicated test keys to run live RLS tests.";

if (!configured && process.env.npm_lifecycle_event === "test:rls") {
  throw new Error(
    "test:rls requires SUPABASE_RLS_TEST_URL, SUPABASE_RLS_TEST_ANON_KEY, and SUPABASE_RLS_TEST_SERVICE_ROLE_KEY."
  );
}

export function assertDisposableTarget() {
  const { hostname } = new URL(testUrl);
  const isLocal = ["127.0.0.1", "localhost", "host.docker.internal"].includes(hostname);
  assert.equal(
    isLocal || process.env.SUPABASE_RLS_TEST_ALLOW_REMOTE === "true",
    true,
    "Remote execution requires SUPABASE_RLS_TEST_ALLOW_REMOTE=true and a dedicated disposable project."
  );
}

function headers(token, extra = {}) {
  return {
    apikey: token === serviceRoleKey ? serviceRoleKey : anonKey,
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    ...extra
  };
}

export async function request(path, { token, method = "GET", body, prefer } = {}) {
  const response = await fetch(`${testUrl}${path}`, {
    method,
    headers: headers(token, prefer ? { prefer } : {}),
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { response, data };
}

export async function createUser(role, nonce, trackedUsers) {
  const email = `rls-${role}-${nonce}@example.test`;
  const password = `Rls-${nonce}-${role}-A9!`;
  const created = await request("/auth/v1/admin/users", {
    token: serviceRoleKey,
    method: "POST",
    body: {
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `RLS ${role} ${nonce}` }
    }
  });
  assert.equal(created.response.ok, true, JSON.stringify(created.data));

  const userId = created.data.id;
  const user = { id: userId, role, accessToken: null };
  trackedUsers.push(user);
  const assigned = await request(`/rest/v1/profiles?id=eq.${userId}`, {
    token: serviceRoleKey,
    method: "PATCH",
    prefer: "return=minimal",
    body: { role }
  });
  assert.equal(assigned.response.ok, true, JSON.stringify(assigned.data));

  const signedIn = await request("/auth/v1/token?grant_type=password", {
    token: anonKey,
    method: "POST",
    body: { email, password }
  });
  assert.equal(signedIn.response.ok, true, JSON.stringify(signedIn.data));

  user.accessToken = signedIn.data.access_token;
  return user;
}

export async function expectDenied(operation, message) {
  const result = await operation;
  // RLS can deny a write either with an error (WITH CHECK / trigger) or by
  // filtering the row out entirely, which PostgREST reports as success with
  // zero affected rows. Both are denials; follow-up assertions verify the
  // data is unchanged.
  const filteredToNoRows = Array.isArray(result.data) && result.data.length === 0;
  assert.equal(
    !result.response.ok || filteredToNoRows,
    true,
    `${message}: unexpectedly returned ${result.response.status}`
  );
}

export async function expectAllowed(operation, message) {
  const result = await operation;
  assert.equal(result.response.ok, true, `${message}: ${JSON.stringify(result.data)}`);
}

export async function cleanup(users) {
  if (users.length === 0) return;
  const errors = [];

  const admin = users.find((user) => user.role === "admin");
  if (admin) {
    const downgraded = await request(`/rest/v1/profiles?id=eq.${admin.id}`, {
      token: serviceRoleKey,
      method: "PATCH",
      prefer: "return=minimal",
      body: { role: "user" }
    });
    if (!downgraded.response.ok) errors.push(`admin downgrade: ${JSON.stringify(downgraded.data)}`);
  }

  const actorIds = users
    .filter((user) => ["admin", "manager"].includes(user.role))
    .map((user) => user.id);
  if (actorIds.length > 0) {
    const query = new URLSearchParams({ actor_user_id: `in.(${actorIds.join(",")})` });
    const auditDelete = await request(`/rest/v1/admin_audit_logs?${query}`, {
      token: serviceRoleKey,
      method: "DELETE",
      prefer: "return=minimal"
    });
    if (!auditDelete.response.ok) errors.push(`audit cleanup: ${JSON.stringify(auditDelete.data)}`);
  }

  for (const user of users.toReversed()) {
    const deleted = await request(`/auth/v1/admin/users/${user.id}`, {
      token: serviceRoleKey,
      method: "DELETE"
    });
    if (!deleted.response.ok) errors.push(`${user.role} cleanup: ${JSON.stringify(deleted.data)}`);
  }

  assert.deepEqual(errors, [], `Live RLS test cleanup failed: ${errors.join("; ")}`);
}
