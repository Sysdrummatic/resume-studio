import assert from "node:assert/strict";
import test from "node:test";

const testUrl = process.env.SUPABASE_RLS_TEST_URL?.replace(/\/$/, "");
const anonKey = process.env.SUPABASE_RLS_TEST_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_RLS_TEST_SERVICE_ROLE_KEY;
const configured = Boolean(testUrl && anonKey && serviceRoleKey);

if (!configured && process.env.npm_lifecycle_event === "test:rls") {
  throw new Error(
    "test:rls requires SUPABASE_RLS_TEST_URL, SUPABASE_RLS_TEST_ANON_KEY, and SUPABASE_RLS_TEST_SERVICE_ROLE_KEY."
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

async function request(path, { token, method = "GET", body, prefer } = {}) {
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

async function createUser(role, nonce, trackedUsers) {
  const email = `rls-${role}-${nonce}@example.test`;
  const password = `Rls-${nonce}-${role}-A9!`;
  const created = await request("/auth/v1/admin/users", {
    token: serviceRoleKey,
    method: "POST",
    body: {
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `RLS ${role}` }
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

async function patchProfile(actor, targetId, body) {
  return request(`/rest/v1/profiles?id=eq.${targetId}`, {
    token: actor.accessToken,
    method: "PATCH",
    prefer: "return=minimal",
    body
  });
}

async function patchProfileAsService(targetId, body) {
  return request(`/rest/v1/profiles?id=eq.${targetId}`, {
    token: serviceRoleKey,
    method: "PATCH",
    prefer: "return=minimal",
    body
  });
}

async function readProfile(targetId) {
  const result = await request(
    `/rest/v1/profiles?select=id,display_name,first_name,last_name,avatar_url,bio,role,is_active,is_test_user,is_ocv_staff&id=eq.${targetId}`,
    { token: serviceRoleKey }
  );
  assert.equal(result.response.ok, true, JSON.stringify(result.data));
  assert.equal(result.data.length, 1);
  return result.data[0];
}

async function callRpc(actor, functionName, body) {
  return request(`/rest/v1/rpc/${functionName}`, {
    token: actor.accessToken,
    method: "POST",
    body
  });
}

async function callRpcAsService(functionName, body) {
  return request(`/rest/v1/rpc/${functionName}`, {
    token: serviceRoleKey,
    method: "POST",
    body
  });
}

async function expectDenied(operation, message) {
  const result = await operation;
  assert.equal(
    result.response.ok,
    false,
    `${message}: unexpectedly returned ${result.response.status}`
  );
}

async function expectAllowed(operation, message) {
  const result = await operation;
  assert.equal(result.response.ok, true, `${message}: ${JSON.stringify(result.data)}`);
}

async function readAudit(actor, targetId) {
  const query = new URLSearchParams({
    select: "actor_user_id,action,target_user_id,metadata",
    target_user_id: `eq.${targetId}`,
    order: "created_at.asc"
  });
  const result = await request(`/rest/v1/admin_audit_logs?${query}`, { token: actor.accessToken });
  assert.equal(result.response.ok, true, JSON.stringify(result.data));
  return result.data;
}

async function cleanup(users) {
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

test(
  "live PostgREST profile boundary covers user, recruiter, manager, and admin",
  {
    skip: configured
      ? false
      : "Set SUPABASE_RLS_TEST_URL and dedicated test keys to run live RLS tests.",
    timeout: 120_000
  },
  async () => {
    const parsedUrl = new URL(testUrl);
    const isLocal = ["127.0.0.1", "localhost", "host.docker.internal"].includes(parsedUrl.hostname);
    assert.equal(
      isLocal || process.env.SUPABASE_RLS_TEST_ALLOW_REMOTE === "true",
      true,
      "Remote execution requires SUPABASE_RLS_TEST_ALLOW_REMOTE=true and a dedicated disposable project."
    );

    const nonce = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const users = [];

    try {
      for (const role of ["user", "recruiter", "manager", "admin"]) {
        await createUser(role, nonce, users);
      }

      const byRole = Object.fromEntries(users.map((user) => [user.role, user]));
      const privilegedAttempts = [
        { role: "admin", is_active: false, is_test_user: true, is_ocv_staff: true },
        { role: "user", is_active: false, is_test_user: true, is_ocv_staff: true },
        { role: "user", is_active: false, is_test_user: true, is_ocv_staff: true },
        { role: "manager", is_active: false, is_test_user: true, is_ocv_staff: true }
      ];

      for (const [index, role] of ["user", "recruiter", "manager", "admin"].entries()) {
        const actor = byRole[role];
        const safeProfile = {
          display_name: `Safe ${role}`,
          first_name: "Safe",
          last_name: role,
          avatar_url: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"></svg>`,
          bio: `safe owner edit by ${role}`
        };
        await expectAllowed(
          patchProfile(actor, actor.id, safeProfile),
          `${role} safe own-profile PATCH`
        );
        for (const [field, value] of Object.entries(privilegedAttempts[index])) {
          await expectDenied(
            patchProfile(actor, actor.id, { [field]: value }),
            `${role} direct self-PATCH of ${field}`
          );
        }

        const unchanged = await readProfile(actor.id);
        assert.equal(unchanged.display_name, safeProfile.display_name);
        assert.equal(unchanged.first_name, safeProfile.first_name);
        assert.equal(unchanged.last_name, safeProfile.last_name);
        assert.equal(unchanged.avatar_url, safeProfile.avatar_url);
        assert.equal(unchanged.bio, safeProfile.bio);
        assert.equal(unchanged.role, role);
        assert.equal(unchanged.is_active, true);
        assert.equal(unchanged.is_test_user, false);
        assert.equal(unchanged.is_ocv_staff, false);
      }

      const crossRowTargets = {
        user: byRole.recruiter,
        recruiter: byRole.user,
        manager: byRole.user,
        admin: byRole.user
      };
      for (const role of ["user", "recruiter", "manager", "admin"]) {
        const target = crossRowTargets[role];
        const before = await readProfile(target.id);
        const auditBefore = await readAudit(byRole.admin, target.id);
        await expectDenied(
          patchProfile(byRole[role], target.id, { bio: `cross-row edit by ${role}` }),
          `${role} safe-field PATCH against another profile`
        );
        assert.equal((await readProfile(target.id)).bio, before.bio);
        assert.equal((await readAudit(byRole.admin, target.id)).length, auditBefore.length);
      }

      await expectDenied(
        patchProfile(byRole.user, byRole.user.id, {
          bio: "must roll back with the privileged field",
          is_test_user: true
        }),
        "mixed safe and privileged PATCH"
      );
      assert.equal((await readProfile(byRole.user.id)).bio, "safe owner edit by user");

      for (const [field, value] of [
        ["person_slug", `forbidden-${nonce}`],
        ["name_sync_mode", "manual"],
        ["updated_at", new Date().toISOString()]
      ]) {
        await expectDenied(
          patchProfile(byRole.user, byRole.user.id, { [field]: value }),
          `direct PATCH of non-allowlisted ${field}`
        );
      }

      for (const targetRole of ["manager", "admin"]) {
        await expectDenied(
          patchProfile(byRole.manager, byRole[targetRole].id, { is_test_user: true }),
          `manager direct PATCH of ${targetRole}`
        );
      }

      for (const role of ["user", "recruiter"]) {
        const targetId = byRole[role].id;
        const auditBefore = await readAudit(byRole.admin, targetId);
        for (const [functionName, body] of [
          ["set_user_role", { target_user_id: targetId, next_role: "admin" }],
          ["set_user_active", { target_user_id: targetId, target_is_active: false }],
          [
            "set_user_flag",
            { target_user_id: targetId, flag_name: "is_test_user", flag_value: true }
          ],
          [
            "update_user_privileges",
            {
              target_user_id: targetId,
              next_role: "admin",
              target_is_active: false,
              target_is_test_user: true,
              target_is_ocv_staff: true
            }
          ]
        ]) {
          await expectDenied(
            callRpc(byRole[role], functionName, body),
            `${role} ${functionName} RPC`
          );
        }
        const unchanged = await readProfile(targetId);
        assert.equal(unchanged.role, role);
        assert.equal(unchanged.is_active, true);
        assert.equal(unchanged.is_test_user, false);
        assert.equal((await readAudit(byRole.admin, targetId)).length, auditBefore.length);
      }

      await expectDenied(
        patchProfileAsService(byRole.user.id, { is_test_user: true }),
        "service role direct privileged flag PATCH"
      );
      assert.equal((await readProfile(byRole.user.id)).is_test_user, false);

      const serviceAuditBefore = await readAudit(byRole.admin, byRole.user.id);
      for (const [functionName, body] of [
        ["set_user_role", { target_user_id: byRole.user.id, next_role: "admin" }],
        ["set_user_active", { target_user_id: byRole.user.id, target_is_active: false }],
        [
          "set_user_flag",
          { target_user_id: byRole.user.id, flag_name: "is_test_user", flag_value: true }
        ],
        [
          "update_user_privileges",
          {
            target_user_id: byRole.user.id,
            next_role: "admin",
            target_is_active: false,
            target_is_test_user: true,
            target_is_ocv_staff: true
          }
        ]
      ]) {
        await expectDenied(
          callRpcAsService(functionName, body),
          `service role ${functionName} RPC`
        );
      }
      const afterServiceRpc = await readProfile(byRole.user.id);
      assert.equal(afterServiceRpc.role, "user");
      assert.equal(afterServiceRpc.is_active, true);
      assert.equal(afterServiceRpc.is_test_user, false);
      assert.equal(
        (await readAudit(byRole.admin, byRole.user.id)).length,
        serviceAuditBefore.length
      );

      const malformedAuditBefore = await readAudit(byRole.admin, byRole.user.id);
      for (const [functionName, body, label] of [
        [
          "set_user_role",
          { target_user_id: byRole.user.id, next_role: "owner" },
          "invalid role"
        ],
        [
          "set_user_active",
          { target_user_id: byRole.user.id, target_is_active: null },
          "NULL activity status"
        ],
        [
          "set_user_flag",
          { target_user_id: byRole.user.id, flag_name: "unknown_flag", flag_value: true },
          "unknown flag name"
        ],
        [
          "set_user_flag",
          { target_user_id: byRole.user.id, flag_name: "is_test_user", flag_value: null },
          "NULL flag value"
        ]
      ]) {
        await expectDenied(callRpc(byRole.admin, functionName, body), `admin RPC with ${label}`);
      }
      const afterMalformedRpc = await readProfile(byRole.user.id);
      assert.equal(afterMalformedRpc.role, "user");
      assert.equal(afterMalformedRpc.is_active, true);
      assert.equal(afterMalformedRpc.is_test_user, false);
      assert.equal(
        (await readAudit(byRole.admin, byRole.user.id)).length,
        malformedAuditBefore.length
      );

      const missingTargetId = "00000000-0000-0000-0000-000000000001";
      const missingTargetAuditBefore = await readAudit(byRole.admin, missingTargetId);
      for (const [functionName, body] of [
        ["set_user_role", { target_user_id: missingTargetId, next_role: "user" }],
        ["set_user_active", { target_user_id: missingTargetId, target_is_active: false }],
        [
          "set_user_flag",
          { target_user_id: missingTargetId, flag_name: "is_test_user", flag_value: true }
        ],
        [
          "update_user_privileges",
          {
            target_user_id: missingTargetId,
            next_role: "user",
            target_is_active: true,
            target_is_test_user: false,
            target_is_ocv_staff: false
          }
        ]
      ]) {
        await expectDenied(
          callRpc(byRole.admin, functionName, body),
          `admin ${functionName} RPC against missing target`
        );
      }
      assert.equal(
        (await readAudit(byRole.admin, missingTargetId)).length,
        missingTargetAuditBefore.length
      );

      for (const targetRole of ["manager", "admin"]) {
        for (const [functionName, body] of [
          ["set_user_role", { target_user_id: byRole[targetRole].id, next_role: "user" }],
          ["set_user_active", { target_user_id: byRole[targetRole].id, target_is_active: false }],
          [
            "set_user_flag",
            {
              target_user_id: byRole[targetRole].id,
              flag_name: "is_test_user",
              flag_value: true
            }
          ],
          [
            "update_user_privileges",
            {
              target_user_id: byRole[targetRole].id,
              next_role: "user",
              target_is_active: false,
              target_is_test_user: true,
              target_is_ocv_staff: true
            }
          ]
        ]) {
          await expectDenied(
            callRpc(byRole.manager, functionName, body),
            `manager ${functionName} RPC against ${targetRole}`
          );
        }
      }

      for (const targetRole of ["user", "recruiter"]) {
        const targetId = byRole[targetRole].id;
        const before = await readProfile(targetId);
        const auditBefore = await readAudit(byRole.admin, targetId);
        for (const nextRole of ["manager", "admin"]) {
          await expectDenied(
            callRpc(byRole.manager, "set_user_role", {
              target_user_id: targetId,
              next_role: nextRole
            }),
            `manager promotion of ${targetRole} to ${nextRole}`
          );
        }
        assert.equal((await readProfile(targetId)).role, before.role);
        assert.equal((await readAudit(byRole.admin, targetId)).length, auditBefore.length);
      }

      const managerAtomicAuditBefore = await readAudit(byRole.admin, byRole.user.id);
      await expectDenied(
        callRpc(byRole.manager, "update_user_privileges", {
          target_user_id: byRole.user.id,
          next_role: "admin",
          target_is_active: false,
          target_is_test_user: true,
          target_is_ocv_staff: true
        }),
        "manager atomic promotion rolls back every requested field"
      );
      const afterManagerAtomicDenial = await readProfile(byRole.user.id);
      assert.equal(afterManagerAtomicDenial.role, "user");
      assert.equal(afterManagerAtomicDenial.is_active, true);
      assert.equal(afterManagerAtomicDenial.is_test_user, false);
      assert.equal(afterManagerAtomicDenial.is_ocv_staff, false);
      assert.equal(
        (await readAudit(byRole.admin, byRole.user.id)).length,
        managerAtomicAuditBefore.length
      );

      for (const [functionName, body] of [
        ["set_user_role", { target_user_id: byRole.manager.id, next_role: "user" }],
        ["set_user_active", { target_user_id: byRole.manager.id, target_is_active: false }],
        [
          "set_user_flag",
          {
            target_user_id: byRole.manager.id,
            flag_name: "is_ocv_staff",
            flag_value: true
          }
        ],
        [
          "update_user_privileges",
          {
            target_user_id: byRole.manager.id,
            next_role: "user",
            target_is_active: false,
            target_is_test_user: true,
            target_is_ocv_staff: true
          }
        ]
      ]) {
        await expectDenied(
          callRpc(byRole.manager, functionName, body),
          `manager self ${functionName} RPC`
        );
      }

      await expectDenied(
        callRpc(byRole.manager, "set_user_flag", {
          target_user_id: byRole.user.id,
          flag_name: null,
          flag_value: true
        }),
        "manager NULL flag name"
      );
      assert.equal((await readProfile(byRole.user.id)).is_ocv_staff, false);

      await expectAllowed(
        patchProfileAsService(byRole.manager.id, { is_active: false }),
        "deactivate manager fixture"
      );
      for (const [functionName, body] of [
        ["set_user_role", { target_user_id: byRole.user.id, next_role: "recruiter" }],
        ["set_user_active", { target_user_id: byRole.user.id, target_is_active: false }],
        [
          "set_user_flag",
          { target_user_id: byRole.user.id, flag_name: "is_test_user", flag_value: true }
        ]
      ]) {
        await expectDenied(
          callRpc(byRole.manager, functionName, body),
          `inactive manager ${functionName} RPC`
        );
      }
      await expectAllowed(
        patchProfileAsService(byRole.manager.id, { is_active: true }),
        "reactivate manager fixture"
      );

      await expectAllowed(
        patchProfileAsService(byRole.admin.id, { is_active: false }),
        "deactivate admin fixture"
      );
      for (const [functionName, body] of [
        ["set_user_role", { target_user_id: byRole.user.id, next_role: "recruiter" }],
        ["set_user_active", { target_user_id: byRole.user.id, target_is_active: false }],
        [
          "set_user_flag",
          { target_user_id: byRole.user.id, flag_name: "is_test_user", flag_value: true }
        ]
      ]) {
        await expectDenied(
          callRpc(byRole.admin, functionName, body),
          `inactive admin ${functionName} RPC`
        );
      }
      await expectDenied(
        callRpc(byRole.admin, "set_user_active", {
          target_user_id: byRole.admin.id,
          target_is_active: true
        }),
        "inactive admin self-reactivation RPC"
      );
      await expectAllowed(
        patchProfileAsService(byRole.admin.id, { is_active: true }),
        "reactivate admin fixture"
      );

      const adminSelfAuditBefore = await readAudit(byRole.admin, byRole.admin.id);
      await expectAllowed(
        callRpc(byRole.admin, "set_user_role", {
          target_user_id: byRole.admin.id,
          next_role: "user"
        }),
        "admin self-demotion through audited RPC"
      );
      assert.equal((await readProfile(byRole.admin.id)).role, "user");
      await expectAllowed(
        patchProfileAsService(byRole.admin.id, { role: "admin" }),
        "restore admin fixture after self-demotion"
      );
      const adminSelfAudit = await readAudit(byRole.admin, byRole.admin.id);
      assert.equal(adminSelfAudit.length, adminSelfAuditBefore.length + 1);
      assert.equal(adminSelfAudit.at(-1).actor_user_id, byRole.admin.id);
      assert.equal(adminSelfAudit.at(-1).action, "user.role_updated");
      assert.equal(adminSelfAudit.at(-1).metadata.previous_role, "admin");
      assert.equal(adminSelfAudit.at(-1).metadata.next_role, "user");

      await expectAllowed(
        callRpc(byRole.manager, "set_user_role", {
          target_user_id: byRole.recruiter.id,
          next_role: "user"
        }),
        "manager changes recruiter role"
      );
      assert.equal((await readProfile(byRole.recruiter.id)).role, "user");
      await expectAllowed(
        callRpc(byRole.manager, "set_user_active", {
          target_user_id: byRole.recruiter.id,
          target_is_active: false
        }),
        "manager deactivates recruiter"
      );
      assert.equal((await readProfile(byRole.recruiter.id)).is_active, false);
      await expectAllowed(
        callRpc(byRole.manager, "set_user_active", {
          target_user_id: byRole.recruiter.id,
          target_is_active: true
        }),
        "manager reactivates recruiter"
      );
      assert.equal((await readProfile(byRole.recruiter.id)).is_active, true);

      await expectAllowed(
        callRpc(byRole.manager, "set_user_flag", {
          target_user_id: byRole.user.id,
          flag_name: "is_test_user",
          flag_value: true
        }),
        "manager flags user"
      );
      await expectAllowed(
        callRpc(byRole.manager, "set_user_flag", {
          target_user_id: byRole.recruiter.id,
          flag_name: "is_ocv_staff",
          flag_value: true
        }),
        "manager flags recruiter"
      );

      await expectAllowed(
        callRpc(byRole.admin, "update_user_privileges", {
          target_user_id: byRole.user.id,
          next_role: "recruiter",
          target_is_active: true,
          target_is_test_user: true,
          target_is_ocv_staff: true
        }),
        "admin atomically changes multiple privileged fields"
      );
      await expectAllowed(
        callRpc(byRole.admin, "set_user_active", {
          target_user_id: byRole.recruiter.id,
          target_is_active: false
        }),
        "admin changes status through RPC"
      );
      await expectAllowed(
        callRpc(byRole.admin, "set_user_flag", {
          target_user_id: byRole.manager.id,
          flag_name: "is_ocv_staff",
          flag_value: true
        }),
        "admin changes manager flag through RPC"
      );

      const changedUser = await readProfile(byRole.user.id);
      assert.equal(changedUser.role, "recruiter");
      assert.equal(changedUser.is_test_user, true);
      assert.equal(changedUser.is_ocv_staff, true);
      const changedRecruiter = await readProfile(byRole.recruiter.id);
      assert.equal(changedRecruiter.role, "user");
      assert.equal(changedRecruiter.is_active, false);
      assert.equal(changedRecruiter.is_ocv_staff, true);
      assert.equal((await readProfile(byRole.manager.id)).is_ocv_staff, true);

      const userAudit = await readAudit(byRole.admin, byRole.user.id);
      assert.equal(
        userAudit.filter(
          (row) => row.actor_user_id === byRole.admin.id && row.action === "user.role_updated"
        ).length,
        1
      );
      assert.equal(
        userAudit.filter(
          (row) =>
            row.actor_user_id === byRole.admin.id &&
            row.action === "user.flag_updated" &&
            row.metadata.flag === "is_ocv_staff" &&
            row.metadata.previous === false &&
            row.metadata.next === true
        ).length,
        1
      );
      assert.equal(
        userAudit.filter(
          (row) =>
            row.actor_user_id === byRole.manager.id &&
            row.action === "user.flag_updated" &&
            row.metadata.flag === "is_test_user" &&
            row.metadata.previous === false &&
            row.metadata.next === true
        ).length,
        1
      );

      const recruiterAudit = await readAudit(byRole.admin, byRole.recruiter.id);
      assert.equal(
        recruiterAudit.filter(
          (row) =>
            row.actor_user_id === byRole.manager.id &&
            row.action === "user.role_updated" &&
            row.metadata.previous_role === "recruiter" &&
            row.metadata.next_role === "user"
        ).length,
        1
      );
      assert.equal(
        recruiterAudit.filter(
          (row) => row.actor_user_id === byRole.manager.id && row.action === "user.status_updated"
        ).length,
        2
      );
      assert.equal(
        recruiterAudit.filter(
          (row) =>
            row.actor_user_id === byRole.admin.id &&
            row.action === "user.status_updated" &&
            row.metadata.next_is_active === false
        ).length,
        1
      );
      assert.equal(
        recruiterAudit.filter(
          (row) =>
            row.actor_user_id === byRole.manager.id &&
            row.action === "user.flag_updated" &&
            row.metadata.flag === "is_ocv_staff"
        ).length,
        1
      );

      const managerAudit = await readAudit(byRole.admin, byRole.manager.id);
      assert.equal(
        managerAudit.filter(
          (row) =>
            row.actor_user_id === byRole.admin.id &&
            row.action === "user.flag_updated" &&
            row.metadata.flag === "is_ocv_staff"
        ).length,
        1
      );
    } finally {
      await cleanup(users);
    }
  }
);
