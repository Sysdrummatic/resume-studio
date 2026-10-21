import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import {
  anonKey,
  assertDisposableTarget,
  cleanup,
  createUser,
  expectAllowed,
  expectDenied,
  request,
  serviceRoleKey,
  skipReason
} from "./helpers/rls-postgrest.mjs";

const RESUME_YAML = [
  "name: RLS Owner",
  "brand_initials: RO",
  "summary: private summary",
  "contact: []",
  "qr_codes: []",
  "skills: []",
  "tech_stack: []",
  "languages: []",
  "interests: []",
  "experience: []",
  "education: []",
  "courses: []",
  "gdpr_clause: x",
  ""
].join("\n");

const users = [];
const anon = { id: null, role: "anon", accessToken: anonKey };
const service = { id: null, role: "service", accessToken: serviceRoleKey };
const seeded = {};
let owner;
let other;
let recruiter;
let manager;
let admin;

function rest(actor, table, { query = "", method = "GET", body } = {}) {
  return request(`/rest/v1/${table}${query}`, {
    token: actor.accessToken,
    method,
    body,
    prefer: method === "GET" ? undefined : "return=representation"
  });
}

async function seed(table, row) {
  const result = await rest(service, table, { method: "POST", body: row });
  assert.equal(result.response.ok, true, `seed ${table}: ${JSON.stringify(result.data)}`);
  return result.data[0];
}

// Revoked table privileges (anon on published snapshots) answer 401/403 instead of 200 [].
async function rowsOf(actor, table, id) {
  const result = await rest(actor, table, { query: `?id=eq.${id}` });
  if ([401, 403].includes(result.response.status)) return [];
  assert.equal(result.response.ok, true, `${actor.role} read ${table}: ${JSON.stringify(result.data)}`);
  return result.data;
}

describe("live cross-account RLS on CV tables", { skip: skipReason, timeout: 180_000 }, () => {
  before(async () => {
    assertDisposableTarget();
    const nonce = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    owner = await createUser("user", `${nonce}-owner`, users);
    other = await createUser("user", `${nonce}-other`, users);
    recruiter = await createUser("recruiter", nonce, users);
    manager = await createUser("manager", nonce, users);
    admin = await createUser("admin", nonce, users);

    // Signup already creates the owner's default "en" document; give it known content.
    const updated = await rest(service, "resume_documents", {
      query: `?user_id=eq.${owner.id}&locale=eq.en`,
      method: "PATCH",
      body: { yaml_content: RESUME_YAML }
    });
    assert.equal(updated.data?.length, 1, `owner default document: ${JSON.stringify(updated.data)}`);
    seeded.document = updated.data[0];
    seeded.revision = await seed("resume_revisions", {
      document_id: seeded.document.id,
      revision_number: 1000,
      locale: "en",
      title: "owner revision",
      yaml_content: RESUME_YAML,
      schema_version: 1
    });
    seeded.preset = await seed("resume_presets", {
      document_id: seeded.document.id,
      user_id: owner.id,
      title: "owner preset"
    });
    seeded.published = await seed("resume_published_cvs", {
      user_id: owner.id,
      available_locales: ["en", "pl"],
      default_locale: "en"
    });
    seeded.snapshot = await seed("resume_published_cv_locales", {
      published_cv_id: seeded.published.id,
      user_id: owner.id,
      locale: "en",
      title: "owner snapshot",
      yaml_content: RESUME_YAML
    });
    seeded.link = await seed("resume_public_links", {
      document_id: seeded.document.id,
      user_id: owner.id,
      slug: `rls-${nonce}`,
      active_published_cv_id: seeded.published.id
    });
    seeded.audit = await seed("admin_audit_logs", {
      actor_user_id: admin.id,
      action: "rls.probe",
      target_user_id: owner.id
    });
  });

  after(() => cleanup(users));

  const ownerOnly = () => [
    ["resume_documents", seeded.document.id],
    ["resume_revisions", seeded.revision.id],
    ["resume_presets", seeded.preset.id],
    ["resume_published_cvs", seeded.published.id],
    ["resume_published_cv_locales", seeded.snapshot.id]
  ];
  const outsiders = () => [anon, other, recruiter, manager, admin];

  it("lets the owner read every row (control for the denial checks)", async () => {
    for (const [table, id] of ownerOnly()) {
      assert.equal((await rowsOf(owner, table, id)).length, 1, `owner reads own ${table}`);
    }
  });

  it("hides private CV rows from anon, other users, recruiters, managers and admins", async () => {
    for (const actor of outsiders()) {
      for (const [table, id] of ownerOnly()) {
        assert.equal((await rowsOf(actor, table, id)).length, 0, `${actor.role} reads ${table}`);
      }
    }
  });

  it("blocks edits and deletes of another account's document, preset and link", async () => {
    for (const actor of outsiders()) {
      for (const [table, id, patch] of [
        ["resume_documents", seeded.document.id, { yaml_content: `${RESUME_YAML}# hijacked\n` }],
        ["resume_presets", seeded.preset.id, { title: "hijacked" }],
        ["resume_public_links", seeded.link.id, { is_active: false }]
      ]) {
        await expectDenied(
          rest(actor, table, { query: `?id=eq.${id}`, method: "PATCH", body: patch }),
          `${actor.role} PATCH ${table}`
        );
        // Staff may delete any user's public link by design (can_manage_target_user).
        if (table === "resume_public_links" && [manager, admin].includes(actor)) continue;
        await expectDenied(
          rest(actor, table, { query: `?id=eq.${id}`, method: "DELETE" }),
          `${actor.role} DELETE ${table}`
        );
      }
    }
    const [document] = await rowsOf(service, "resume_documents", seeded.document.id);
    const [preset] = await rowsOf(service, "resume_presets", seeded.preset.id);
    const [link] = await rowsOf(service, "resume_public_links", seeded.link.id);
    assert.equal(document.yaml_content, RESUME_YAML);
    assert.equal(preset.title, "owner preset");
    assert.equal(link.is_active, true);

    // Control: the same payloads are valid, the owner may apply them (then they are restored).
    for (const [table, id, patch, restore] of [
      ["resume_documents", seeded.document.id, { yaml_content: `${RESUME_YAML}# edited
` }, { yaml_content: RESUME_YAML }],
      ["resume_presets", seeded.preset.id, { title: "edited" }, { title: "owner preset" }],
      ["resume_public_links", seeded.link.id, { is_active: false }, { is_active: true }]
    ]) {
      const edited = await rest(owner, table, { query: `?id=eq.${id}`, method: "PATCH", body: patch });
      assert.equal(edited.data?.length, 1, `owner PATCH ${table}: ${JSON.stringify(edited.data)}`);
      await expectAllowed(
        rest(service, table, { query: `?id=eq.${id}`, method: "PATCH", body: restore }),
        `restore ${table}`
      );
    }
  });

  it("blocks creating rows that belong to, or point at, another account", async () => {
    const otherDocument = (
      await rest(service, "resume_documents", { query: `?user_id=eq.${other.id}&locale=eq.en` })
    ).data[0];
    assert.ok(otherDocument, "the other user has a default document");

    // Each forged payload is valid on its own: only the ownership differs, and `control` proves
    // the same payload is accepted for its rightful actor. Otherwise a validation error
    // (bad locale, missing column) would look like an RLS denial and the test could not fail.
    const attempts = [
      {
        table: "resume_documents",
        scope: `?user_id=eq.${owner.id}`,
        body: { user_id: owner.id, locale: "pl", yaml_content: RESUME_YAML },
        control: { actor: owner }
      },
      {
        table: "resume_revisions",
        scope: `?document_id=eq.${seeded.document.id}`,
        body: {
          document_id: seeded.document.id,
          revision_number: 1001,
          locale: "en",
          title: "forged",
          yaml_content: RESUME_YAML,
          schema_version: 1
        },
        control: { actor: owner }
      },
      {
        table: "resume_presets",
        scope: `?document_id=eq.${seeded.document.id}`,
        body: { document_id: seeded.document.id, user_id: owner.id, title: "forged" },
        control: { actor: owner }
      },
      {
        table: "resume_presets",
        scope: `?user_id=eq.${other.id}`,
        body: { document_id: seeded.document.id, user_id: other.id, title: "foreign document" },
        control: {
          actor: other,
          body: { document_id: otherDocument.id, user_id: other.id, title: "own document" }
        }
      },
      {
        table: "resume_published_cvs",
        scope: `?user_id=eq.${owner.id}`,
        body: { user_id: owner.id, available_locales: ["en"], default_locale: "en" },
        control: { actor: owner }
      },
      {
        table: "resume_published_cv_locales",
        scope: `?published_cv_id=eq.${seeded.published.id}`,
        body: {
          published_cv_id: seeded.published.id,
          user_id: owner.id,
          locale: "pl",
          title: "forged",
          yaml_content: RESUME_YAML
        },
        control: { actor: owner }
      },
      {
        table: "admin_audit_logs",
        scope: "?action=in.(rls.forged,rls.control)",
        body: { actor_user_id: owner.id, action: "rls.forged" },
        control: { actor: admin, body: { actor_user_id: admin.id, action: "rls.control" } }
      }
    ];
    const count = async ({ table, scope }) => (await rest(service, table, { query: scope })).data.length;
    const before = [];
    for (const attempt of attempts) before.push(await count(attempt));

    for (const actor of [anon, other]) {
      for (const { table, body } of attempts) {
        await expectDenied(
          rest(actor, table, { method: "POST", body }),
          `${actor.role} INSERT ${table}`
        );
      }
    }
    for (const [index, attempt] of attempts.entries()) {
      assert.equal(await count(attempt), before[index], `no row was created in ${attempt.table}`);
    }

    for (const [index, attempt] of attempts.entries()) {
      await expectAllowed(
        rest(attempt.control.actor, attempt.table, {
          method: "POST",
          body: attempt.control.body ?? attempt.body
        }),
        `control: ${attempt.control.actor.role} INSERT ${attempt.table}`
      );
      assert.equal(await count(attempt), before[index] + 1, `control row exists in ${attempt.table}`);
    }
  });

  it("keeps published snapshots immutable, even for their owner", async () => {
    for (const [table, id] of [
      ["resume_published_cvs", seeded.published.id],
      ["resume_published_cv_locales", seeded.snapshot.id]
    ]) {
      await expectDenied(
        rest(owner, table, { query: `?id=eq.${id}`, method: "DELETE" }),
        `owner DELETE ${table}`
      );
      assert.equal((await rowsOf(service, table, id)).length, 1);
    }
    const [snapshot] = await rowsOf(service, "resume_published_cv_locales", seeded.snapshot.id);
    assert.equal(snapshot.yaml_content, RESUME_YAML);
  });

  it("limits the audit log to staff", async () => {
    for (const actor of [anon, owner, other, recruiter]) {
      assert.equal(
        (await rowsOf(actor, "admin_audit_logs", seeded.audit.id)).length,
        0,
        `${actor.role} reads audit`
      );
    }
    for (const actor of [manager, admin]) {
      assert.equal(
        (await rowsOf(actor, "admin_audit_logs", seeded.audit.id)).length,
        1,
        `${actor.role} reads audit`
      );
    }
  });

  it("exposes only active public-link metadata, never CV content", async () => {
    for (const actor of [anon, other]) {
      const visible = await rowsOf(actor, "resume_public_links", seeded.link.id);
      assert.equal(visible.length, 1, `${actor.role} sees the active link`);
      const leaked = Object.keys(visible[0]).filter((key) => /yaml|content|summary/i.test(key));
      assert.deepEqual(leaked, [], "link rows carry no CV content columns");
    }

    await expectAllowed(
      rest(service, "resume_public_links", {
        query: `?id=eq.${seeded.link.id}`,
        method: "PATCH",
        body: { is_active: false }
      }),
      "deactivate link"
    );
    for (const actor of [anon, other, recruiter, manager]) {
      assert.equal(
        (await rowsOf(actor, "resume_public_links", seeded.link.id)).length,
        0,
        `${actor.role} sees an inactive link`
      );
    }
    for (const actor of [owner, admin]) {
      assert.equal(
        (await rowsOf(actor, "resume_public_links", seeded.link.id)).length,
        1,
        `${actor.role} keeps metadata access`
      );
    }
  });

  it("does not apply manager-scoped policies to anonymous callers", async () => {
    // can_access_target_user() used to return true for anon (NULL role) on user/recruiter targets.
    const profile = await rest(anon, "profiles", { query: `?id=eq.${owner.id}` });
    assert.equal(profile.response.ok && profile.data.length > 0, false, "anon reads a user profile");
    await expectDenied(
      rest(anon, "resume_public_links", {
        method: "POST",
        body: {
          document_id: seeded.document.id,
          user_id: owner.id,
          slug: `anon-${seeded.link.slug}`
        }
      }),
      "anon INSERT resume_public_links for another user"
    );
  });

  it("keeps the legacy resumes and public_links tables and their RPCs closed", async () => {
    // Every account gets an is_public = true legacy `resumes` row; it must not be readable.
    const anonResumes = await rest(anon, "resumes");
    assert.equal(
      [401, 403].includes(anonResumes.response.status) ||
        (anonResumes.response.ok && anonResumes.data.length === 0),
      true,
      `anon reads legacy resumes: ${anonResumes.response.status}`
    );
    const ownerResume = await rest(service, "resumes", { query: `?user_id=eq.${owner.id}` });
    assert.equal(ownerResume.data?.length, 1, "owner has a seeded legacy resume");
    for (const [table, query] of [
      ["resumes", `?user_id=eq.${owner.id}`],
      ["public_links", `?resume_id=eq.${ownerResume.data[0].id}`]
    ]) {
      const asOther = await rest(other, table, { query });
      assert.equal(asOther.response.ok, true, `${table}: ${JSON.stringify(asOther.data)}`);
      assert.equal(asOther.data.length, 0, `another user reads legacy ${table}`);
    }
    // These SECURITY DEFINER functions bypass the table policies, so any caller who can execute
    // them reads or changes legacy rows regardless of ownership. Only service_role may.
    const legacyLink = await rest(service, "public_links", {
      query: `?resume_id=eq.${ownerResume.data[0].id}`
    });
    assert.equal(legacyLink.data?.length, 1, "owner has a seeded legacy public link");
    const slug = legacyLink.data[0].slug;
    const rpc = (token, name, body) =>
      request(`/rest/v1/rpc/${name}`, { token, method: "POST", body });

    const control = await rpc(serviceRoleKey, "get_public_resume_by_slug", { input_slug: slug });
    assert.equal(control.data?.length, 1, `control: service_role resolves the legacy slug: ${JSON.stringify(control.data)}`);

    for (const [label, token] of [["anon", anonKey], ["another user", other.accessToken], ["the owner", owner.accessToken]]) {
      for (const [name, body] of [
        ["get_public_resume_by_slug", { input_slug: slug }],
        ["increment_public_link_view", { input_slug: slug }],
        ["get_admin_user_overview", {}]
      ]) {
        const result = await rpc(token, name, body);
        assert.equal(result.response.ok, false, `${label} executes ${name}: ${result.response.status}`);
      }
    }
  });
});
