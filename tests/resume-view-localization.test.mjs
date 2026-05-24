import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const componentPath = path.join(process.cwd(), "app", "resume", "resume-view-client.tsx");
const localesPath = path.join(process.cwd(), "public", "data", "public", "locales.yaml");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("resume view loads locale config with resume data on language change", () => {
  const source = read(componentPath);

  assert.equal(source.includes("type ResumeViewConfig"), true);
  assert.equal(source.includes("const [viewConfig, setViewConfig]"), true);
  assert.equal(source.includes("const handleLocaleChange = useCallback"), true);
  assert.equal(source.includes("fetchYaml<ResumeViewConfig>(`/${locale.config_path}`, isResumeViewConfig)"), true);
  assert.equal(source.includes("setViewConfig(loadedViewConfig)"), true);
});

test("resume view renders section headings from locale labels", () => {
  const source = read(componentPath);
  const renderer = read(path.join(process.cwd(), "app", "components", "resume-renderer", "ResumeRenderer.tsx"));
  const basicResume = read(path.join(process.cwd(), "app", "components", "resume-renderer", "BasicResumeDocument.tsx"));

  assert.equal(source.includes("buildRendererLabels"), true);
  assert.equal(source.includes("summary_heading"), true);
  assert.equal(source.includes("personal_info_heading"), true);
  assert.equal(source.includes("public_view_badge"), true);
  assert.equal(renderer.includes("rendererLabels.summary"), true);
  assert.equal(renderer.includes("rendererLabels.personalInfo"), true);
  assert.equal(renderer.includes("rendererLabels.languages"), true);
  assert.equal(basicResume.includes('disabledReason: "Available after publish"'), true, "BasicResumeDocument owns disabled-action messaging");
});

test("public locales define config paths", () => {
  const source = read(localesPath);
  const configPaths = [...source.matchAll(/config_path:\s*([^\s]+)/g)].map((match) => match[1]);

  assert.deepEqual(configPaths, ["data/public/config/en.yaml", "data/public/config/pl.yaml"]);
});
