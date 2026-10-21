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
      available_locales: ["en"],
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
  });

  it("blocks creating rows that belong to, or point at, another account", async () => {
    const attempts = [
      ["resume_documents", { user_id: owner.id, locale: "pl", yaml_content: RESUME_YAML }],
      [
        "resume_revisions",
        {
          document_id: seeded.document.id,
          revision_number: 1001,
          locale: "en",
          title: "forged",
          yaml_content: RESUME_YAML,
          schema_version: 1
        }
      ],
      ["resume_presets", { document_id: seeded.document.id, user_id: owner.id, title: "forged" }],
      ["resume_published_cvs", { user_id: owner.id }],
      [
        "resume_published_cv_locales",
        {
          published_cv_id: seeded.published.id,
          user_id: owner.id,
          locale: "pl",
          title: "forged",
          yaml_content: RESUME_YAML
        }
      ],
      ["admin_audit_logs", { actor_user_id: owner.id, action: "rls.forged" }]
    ];
    for (const actor of [anon, other]) {
      for (const [table, body] of attempts) {
        await expectDenied(
          rest(actor, table, { method: "POST", body }),
          `${actor.role} INSERT ${table}`
        );
      }
    }
    await expectDenied(
      rest(other, "resume_presets", {
        method: "POST",
        body: { document_id: seeded.document.id, user_id: other.id, title: "foreign document" }
      }),
      "preset owned by the caller but pointing at another account's document"
    );

    for (const [table, id] of ownerOnly()) {
      assert.equal((await rowsOf(service, table, id)).length, 1);
    }
    const documents = await rest(service, "resume_documents", { query: `?user_id=eq.${owner.id}` });
    assert.equal(documents.data.length, 1, "no extra document was created for the owner");
    const presets = await rest(service, "resume_presets", { query: `?document_id=eq.${seeded.document.id}` });
    assert.equal(presets.data.length, 1, "no extra preset points at the owner's document");
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
    for (const [table, query] of [
      ["resumes", `?user_id=eq.${owner.id}`],
      ["public_links", ""]
    ]) {
      const asOther = await rest(other, table, { query });
      assert.equal(asOther.response.ok, true, `${table}: ${JSON.stringify(asOther.data)}`);
      assert.equal(asOther.data.length, 0, `another user reads legacy ${table}`);
    }
    for (const [name, body] of [
      ["get_public_resume_by_slug", { input_slug: "x" }],
      ["increment_public_link_view", { input_slug: "x" }],
      ["get_admin_user_overview", {}]
    ]) {
      const result = await request(`/rest/v1/rpc/${name}`, { token: anonKey, method: "POST", body });
      assert.equal(result.response.ok, false, `anon executes ${name}: ${result.response.status}`);
    }
  });
});
