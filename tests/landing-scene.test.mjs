import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
register("./helpers/ts-extension-resolve.mjs", import.meta.url);

const {
  STAGE_IDS,
  STAGE_COUNT,
  LEAN_MAX,
  buildScene,
  buildCameras,
  buildLabels,
  entryCount,
  pickedEntries,
  hasTiles,
  stageFromProgress,
  mixPose,
  poseTransform,
  cameraTransform,
  labelVisible,
} = await import("../app/components/landing/scene-poses.ts");

const LAYOUTS = ["wide", "stacked", "side"];

test("the story keeps the mockup's nine stages, in order (epic #190 decision 3)", () => {
  assert.deepEqual(STAGE_IDS, ["start", "livecv", "base", "pick", "ready", "versions", "history", "feats", "go"]);
  assert.equal(STAGE_COUNT, 9);
});

test("scroll picks one stage; the lean toward the next never passes 10%", () => {
  assert.deepEqual(stageFromProgress(0), { stage: 0, toward: 0, lean: 0 });
  assert.deepEqual(stageFromProgress(3), { stage: 3, toward: 3, lean: 0 });
  assert.equal(stageFromProgress(3.2).lean, 0, "no lean while resting near a stage");
  const before = stageFromProgress(3.49);
  assert.equal(before.stage, 3);
  assert.equal(before.toward, 4);
  assert.ok(before.lean > 0.09 && before.lean <= LEAN_MAX);
  const after = stageFromProgress(3.51);
  assert.equal(after.stage, 4, "crossing the threshold picks the next stage");
  assert.equal(after.toward, 3);
  assert.equal(stageFromProgress(6.4).stage, 6);
  assert.equal(stageFromProgress(-5).stage, 0);
  assert.equal(stageFromProgress(99).stage, 8);
  assert.equal(stageFromProgress(Number.NaN).stage, 0);
  assert.equal(stageFromProgress(8).lean, 0, "the last stage leans nowhere");
});

test("a fast scroll lands directly on the target stage, never on the stages in between", () => {
  assert.equal(stageFromProgress(1).stage, 1);
  assert.equal(stageFromProgress(7).stage, 7, "jumping 1 → 7 resolves to 7 with no intermediate pose");
});

test("every object has one finite pose per stage in every layout", () => {
  for (const layout of LAYOUTS) {
    for (const object of buildScene(layout, 11)) {
      assert.equal(object.poses.length, STAGE_COUNT, object.key);
      for (const pose of object.poses) {
        for (const value of Object.values(pose)) assert.ok(Number.isFinite(value), `${layout} ${object.key}`);
        assert.ok(pose.o >= 0 && pose.o <= 1);
        assert.ok(pose.d >= 0 && pose.d <= 1);
      }
      if (object.looks) assert.equal(object.looks.length, STAGE_COUNT);
    }
  }
});

test("phones get a lighter base and no 3D tiles; the desktop keeps the mockup's twelve", () => {
  assert.equal(entryCount("wide"), 12);
  assert.equal(entryCount("stacked"), 8);
  assert.equal(entryCount("side"), 8);
  assert.equal(pickedEntries("wide").length, 6);
  assert.equal(pickedEntries("stacked").length, 4);
  for (const layout of LAYOUTS) {
    const scene = buildScene(layout, 11);
    const cards = scene.filter((o) => o.group === "card");
    assert.equal(cards.length, entryCount(layout));
    assert.equal(scene.filter((o) => o.group === "pick").length, pickedEntries(layout).length);
    for (const index of pickedEntries(layout)) assert.ok(index < cards.length);
    assert.equal(scene.filter((o) => o.group === "tile").length, hasTiles(layout) ? 11 : 0);
  }
});

test("the base stays whole: picking turns entries teal but never removes them", () => {
  const scene = buildScene("wide", 11);
  const pick = STAGE_IDS.indexOf("pick");
  const cards = scene.filter((o) => o.group === "card");
  for (const card of cards) assert.equal(card.poses[pick].o, 1, card.key);
  const teal = cards.filter((card) => card.looks[pick] === "picked").map((card) => card.index);
  assert.deepEqual(teal, pickedEntries("wide"));
  for (const card of cards) assert.equal(card.looks[0], "file");
});

test("the story's objects appear where the captions say", () => {
  const scene = buildScene("wide", 11);
  const shown = (key, stage) => scene.find((o) => o.key === key).poses[STAGE_IDS.indexOf(stage)].o > 0;
  assert.equal(shown("paper-0", "pick"), false, "no LiveCV before it is built");
  assert.equal(shown("paper-0", "ready"), true);
  assert.equal(shown("paper-1", "versions"), true, "more versions from the same base");
  assert.equal(shown("paper-1", "history"), false);
  assert.equal(shown("snap-1", "history"), true, "snapshots on the time axis");
  assert.equal(shown("frame", "livecv"), true, "the LiveCV shown as a page at a link");
  for (const k of [0, 1, 2]) {
    assert.equal(shown(`format-${k}`, "go"), true);
    assert.equal(shown(`format-${k}`, "feats"), false);
  }
  for (const tile of scene.filter((o) => o.group === "tile")) {
    assert.equal(tile.poses[STAGE_IDS.indexOf("feats")].o, 1);
    assert.equal(tile.poses[STAGE_IDS.indexOf("history")].o, 0);
  }
});

test("poses become transform strings only: translate, rotate and scale", () => {
  const scene = buildScene("wide", 11);
  const cameras = buildCameras("wide");
  assert.equal(cameras.length, STAGE_COUNT);
  for (const object of scene) {
    for (const pose of object.poses) {
      assert.match(poseTransform(pose), /^translate3d\(calc\(-?[\d.]+ \* var\(--u\)\), calc\(-?[\d.]+ \* var\(--u\)\), calc\(-?[\d.]+ \* var\(--u\)\)\) rotateY\(-?[\d.]+deg\) rotateX\(-?[\d.]+deg\) rotateZ\(-?[\d.]+deg\) scale\(-?[\d.]+, -?[\d.]+\)$/);
    }
  }
  for (const camera of cameras) assert.doesNotMatch(cameraTransform(camera), /NaN|undefined/);
  const a = scene[0].poses[0];
  const b = scene[0].poses[1];
  assert.equal(mixPose(a, b, 0), a);
  assert.equal(mixPose(a, b, 0.5).x, (a.x + b.x) / 2);
});

test("labels are shown only for their stage and wide-only labels stay off phones", () => {
  for (const layout of LAYOUTS) {
    for (const label of buildLabels(layout)) {
      const stages = STAGE_IDS.map((_, stage) => labelVisible(label, stage, layout));
      if (label.wideOnly && layout !== "wide") assert.ok(stages.every((v) => !v), label.key);
      else assert.ok(stages.some(Boolean), label.key);
    }
  }
});

test("the scene module stays a pure data module (no DOM, no animation library)", () => {
  const source = readFileSync("app/components/landing/scene-poses.ts", "utf8");
  assert.doesNotMatch(source, /document\.|window\.|from "(motion|framer-motion|gsap)/);
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const name of ["three", "motion", "framer-motion", "gsap", "@react-three/fiber"]) {
    assert.equal(name in deps, false, `${name} is not a dependency (decisions 2 and 6)`);
  }
});
