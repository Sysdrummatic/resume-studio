import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

import yaml from "js-yaml";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

const { buildPublishedExportContent } = await import("../app/lib/published-export.ts");
const { ensureResumeEntryIds } = await import("../app/lib/resume-language-linkage.ts");

// The public OpenCV contract (1.x) lists tech_stack and interests as plain
// strings. Internally they are { entry_id, name } rows now, but older snapshots
// still hold strings plus __ocv, and both must publish the exact same YAML.
const base = {
  first_name: "Jan", family_name: "Kowalski", brand_initials: "JK", gdpr_clause: "",
  summary: [{ position: "Engineer", description: "Builds", default: true }],
  contact: [], qr_codes: [], skills: [], languages: [], education: [], courses: [], experience: [],
};
const selection = { summary: [0], tech_stack: [0, 1], interests: [1] };

const oldShape = yaml.dump({
  ...base,
  summary: [{ ...base.summary[0], entry_id: "s-1" }],
  tech_stack: ["TypeScript", "React"],
  interests: ["Music", "Chess"],
  __ocv: { entries: { tech_stack: ["t-1", "t-2"], interests: ["i-1", "i-2"] } },
});
const newShape = yaml.dump(ensureResumeEntryIds({ ...yaml.load(oldShape) }));

test("a snapshot in the old string shape and one in the entry-object shape publish identical YAML", () => {
  const fromOld = buildPublishedExportContent(oldShape, selection);
  const fromNew = buildPublishedExportContent(newShape, selection);

  assert.ok(fromOld && fromNew);
  assert.equal(fromNew.yamlContent, fromOld.yamlContent);
  assert.deepEqual(yaml.load(fromNew.yamlContent).tech_stack, ["TypeScript", "React"]);
  assert.deepEqual(yaml.load(fromNew.yamlContent).interests, ["Chess"]);
  assert.doesNotMatch(fromNew.yamlContent, /entry_id|__ocv/);
});

test("the rendered document of both shapes carries the same selected names", () => {
  const fromOld = buildPublishedExportContent(oldShape, selection);
  const fromNew = buildPublishedExportContent(newShape, selection);

  assert.deepEqual(fromNew.resume.tech_stack, fromOld.resume.tech_stack);
  assert.deepEqual(fromNew.resume.interests.map((item) => item.name), ["Chess"]);
});
