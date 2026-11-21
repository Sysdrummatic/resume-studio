import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
register("./helpers/ts-extension-resolve.mjs", import.meta.url);

const model = await import("../app/components/landing/scene-model.ts");
const { buildSceneCv, versionSections, LIVE_URL, versionPath } = await import("../app/components/landing/scene-cv.ts");
const {
  STAGE_IDS, STAGE_COUNT, AT, buildScene, buildLabels, samplePose, applyMotion, viewAt, toScreen,
  worldMatrix, follow, FOLLOW, BROWSER, paceAt, entryCount, pickedEntries, placeBrowserFrame,
} = model;

const LAYOUTS = [
  { narrow: false, lite: false },
  { narrow: true, lite: true },
  { narrow: false, lite: true },
];
const poseAt = (thing, progress) => {
  samplePose(thing, progress);
  return thing.pose;
};

test("the story keeps the mockup's nine stages, in order (epic #190 decision 3)", () => {
  assert.deepEqual(STAGE_IDS, ["start", "livecv", "base", "pick", "ready", "versions", "history", "feats", "go"]);
  assert.equal(STAGE_COUNT, 9);
});

test("the timeline follows the scroll as in the mockup, half as slow again: no lean, no cut", () => {
  assert.ok(Math.abs(follow(0, 1, 1 / 60) - FOLLOW) < 1e-9, "FOLLOW of the way per 60Hz frame");
  const framesTo90 = (f) => Math.ceil(Math.log(0.1) / Math.log(1 - f));
  const ratio = framesTo90(FOLLOW) / framesTo90(0.1);
  assert.ok(ratio > 1.45 && ratio < 1.55, `transitions last 50% longer than the mockup's (${ratio.toFixed(2)}x)`);
  let at120 = 0;
  for (let i = 0; i < 2; i += 1) at120 = follow(at120, 1, 1 / 120);
  assert.ok(Math.abs(at120 - FOLLOW) < 1e-9, "the same speed on a 120Hz screen");
  let p = 0;
  let frames = 0;
  for (; p !== 1 && frames < 200; frames += 1) p = follow(p, 1, 1 / 60);
  assert.equal(p, 1, "comes to rest on the target once it is within .0004");
  assert.ok(frames > 60, "an eased catch-up, not a jump");
  let q = 0;
  for (let i = 0; i < 10; i += 1) q = follow(q, 3, 1 / 60);
  assert.ok(follow(q, 0, 1 / 60) < q, "a new target turns it round mid-flight");
  assert.ok(follow(0, 5, 1 / 60) < 1, "a far target is not skipped to");
});

test("every object has a sorted track and a finite pose anywhere on the timeline, in every layout", () => {
  for (const { narrow, lite } of LAYOUTS) {
    const scene = buildScene(narrow, lite, 11);
    for (const thing of scene.things) {
      for (let i = 1; i < thing.keys.length; i += 1) assert.ok(thing.keys[i].at >= thing.keys[i - 1].at, thing.key);
      for (let progress = 0; progress <= 8; progress += 0.25) {
        const pose = poseAt(thing, progress);
        for (const value of [...pose.position, ...pose.rotation, ...pose.size, pose.alpha, pose.dim]) {
          assert.ok(Number.isFinite(value), `${thing.key} at ${progress}`);
        }
      }
    }
  }
});

test("phones get a lighter base and no 3D tiles; the desktop keeps the mockup's twelve", () => {
  assert.equal(entryCount(false), 12);
  assert.equal(entryCount(true), 8);
  assert.equal(pickedEntries(false).length, 6);
  assert.equal(pickedEntries(true).length, 4);
  for (const { narrow, lite } of LAYOUTS) {
    const scene = buildScene(narrow, lite, 11);
    assert.equal(scene.cards.length, entryCount(lite));
    assert.equal(scene.picks.length, pickedEntries(lite).length);
    assert.equal(scene.tiles.length, lite ? 0 : 11);
    for (const label of buildLabels(lite)) assert.ok(scene[label.on[0]][label.on[1]], label.key);
  }
});

test("the objects play the story the captions tell", () => {
  const scene = buildScene(false, false, 11);
  const alpha = (thing, stage) => poseAt(thing, AT[stage]).alpha;
  const hero = scene.cards[3];
  assert.equal(poseAt(hero, AT.start).texture, 1, "start: CV files");
  assert.ok(poseAt(hero, AT.livecv).position[2] > 3, "LiveCV?: the hero file steps up front");
  for (const card of scene.cards) {
    const base = poseAt(card, AT.base);
    assert.equal(base.texture, 0, "base: the files have become bricks");
    assert.ok(base.edges > 0.99);
    assert.equal(alpha(card, "pick"), 1, "the base stays whole when entries are picked");
  }
  const teal = scene.cards.filter((card) => poseAt(card, AT.pick).selected > 0.99).map((card) => card.index);
  assert.deepEqual(teal, pickedEntries(false));
  assert.equal(alpha(scene.sheets[0], "pick"), 0, "no LiveCV before it is built");
  assert.equal(alpha(scene.sheets[0], "ready"), 1);
  assert.equal(alpha(scene.sheets[1], "versions"), 1, "more versions from the same base");
  assert.equal(alpha(scene.sheets[1], "history"), 0);
  assert.equal(alpha(scene.snaps[0], "history"), 1, "snapshots on the time axis");
  for (const tile of scene.tiles) assert.equal(alpha(tile, "feats"), 1);
  for (const card of scene.cards) assert.equal(alpha(card, "feats"), 0, "the base leaves before the features");
});

test("the browser window traces round the hero in LiveCV? and once round the built LiveCV", () => {
  const scene = buildScene(false, false, 11);
  const at = (progress) => {
    scene.things.forEach((thing) => samplePose(thing, progress));
    return placeBrowserFrame(scene, progress);
  };
  assert.equal(at(AT.start), "off");
  assert.equal(at(AT.livecv), "cycle");
  assert.equal(at(AT.ready), "once");
  assert.equal(at(AT.versions), "once");
  assert.equal(at(AT.go), "off");
});

test("the opening vortex starts tight and opens into the hovering files", () => {
  const scene = buildScene(false, false, 11);
  const card = scene.cards[0];
  const clock = { time: 0, intro: 0, progress: 0, orbitFlow: 1 };
  samplePose(card, 0);
  applyMotion(card, 0, clock);
  const tight = Math.hypot(card.pose.position[0], card.pose.position[2] + 1.5);
  clock.intro = 1;
  samplePose(card, 0);
  applyMotion(card, 0, clock);
  const open = Math.hypot(card.pose.position[0], card.pose.position[2] + 1.5);
  assert.ok(tight < open * 0.5, `the spiral starts close to its axis (${tight} < ${open})`);
});

test("the CSS camera lands every point exactly where the mockup's projection does", () => {
  const K = 100;
  const width = 1440;
  const height = 836;
  const scene = buildScene(false, false, 11);
  for (const stage of [0, 2, 5, 8]) {
    const view = viewAt(scene, stage, width, height, { x: 0, y: 0 });
    const m = worldMatrix(view, K);
    for (const point of [[0, 0, 0], [1.5, 0.6, 0.2], [-3, 1, -4]]) {
      const css = [point[0] * K, -point[1] * K, point[2] * K, 1];
      const v = [0, 1, 2, 3].map((row) => m[row] * css[0] + m[4 + row] * css[1] + m[8 + row] * css[2] + m[12 + row] * css[3]);
      const scale = view.focal / (view.focal - v[2]);
      const x = width / 2 + v[0] * scale + view.shiftX * width * 0.5;
      const y = height / 2 + v[1] * scale - view.shiftY * height * 0.5;
      const expected = toScreen(view, width, height, ...point);
      assert.ok(Math.abs(x - expected[0]) < 0.5 && Math.abs(y - expected[1]) < 0.5, `stage ${stage} point ${point}: ${x},${y} vs ${expected}`);
    }
  }
});

test("the sheets print the public sample CV: three LiveCVs pick different entries", () => {
  const resume = {
    first_name: "Ariana", family_name: "Holt",
    contact: [{ label: "Location", value: "Portland, OR" }, { label: "Email", value: "ariana@example.com", link: "mailto:x" }],
    experience: [
      { role: "Senior Developer", company: "Nova Labs", period: "2022-03 – present", highlights: ["Built a platform"] },
      { role: "Developer", company: "Interlink", period: "2019-07 – 2022-02", highlights: ["Tools"] },
      { role: "Engineer", company: "Harbor", period: "2016-01 – 2019-06", highlights: ["Robots"] },
    ],
    education: [
      { school: "NYIT, master's in computer science", degree: "", period: "2014-09 – 2015-12", detail: "" },
      { school: "OSU, bachelor's in computer science", degree: "", period: "2010-09 – 2014-06", detail: "" },
    ],
    courses: [{ year: 2025, name: "AI Systems – Gradient" }, { year: 2024, name: "Architecture – Reforge" }, { year: 2023, name: "Data – Stanford" }],
    skills: [{ name: "Development", level: 5 }, { name: "System Design", level: 4 }, { name: "Testing", level: 4 }],
    tech_stack: ["Python", "TypeScript", "React", "Node.js", "PostgreSQL", "Docker"],
  };
  const cv = buildSceneCv(resume, { experience_heading: "Experience" }, { fe: "Frontend", pf: "Platform", ai: "AI" });
  assert.equal(cv.name, "Ariana Holt");
  assert.equal(cv.entries.find((e) => e.id === "r1").when, "2022 – present", "dates shrink to their year, words stay");
  assert.equal(cv.entries.find((e) => e.id === "e1").title, "Master's in computer science");
  assert.equal(cv.entries.find((e) => e.id === "s1").title, "TypeScript, React, Node.js");
  const fe = versionSections(cv, "fe").flatMap((section) => section.entries.map((entry) => entry.id));
  const ai = versionSections(cv, "ai").flatMap((section) => section.entries.map((entry) => entry.id));
  assert.deepEqual(fe, ["r1", "r2", "e1", "k2", "s1", "s3"]);
  assert.notDeepEqual(fe, ai);
  assert.equal(LIVE_URL, `opencivera.com${versionPath("fe")}`);
});

test("the scene modules stay pure and no animation library is installed (decisions 2 and 6)", () => {
  for (const file of ["scene-model.ts", "scene-cv.ts"]) {
    const source = readFileSync(`app/components/landing/${file}`, "utf8");
    assert.doesNotMatch(source, /document\.|window\.|from "(motion|framer-motion|gsap|three)/, file);
  }
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const name of ["three", "motion", "framer-motion", "gsap", "@react-three/fiber"]) {
    assert.equal(name in deps, false, `${name} is not a dependency`);
  }
});

test("the last stage peels off three chips: PDF, YAML and TXT", () => {
  for (const { narrow, lite } of [{ narrow: false, lite: false }, { narrow: true, lite: true }]) {
    const chips = buildScene(narrow, lite, 11).things.filter((thing) => thing.kind === "format");
    assert.equal(chips.length, 3);
  }
});

test("some transitions are slower: the base building up, the picks going into the LiveCV, the tiles coming and going", () => {
  const slow = [[AT.livecv, AT.base], [AT.pick, AT.ready], [AT.history, AT.feats], [AT.feats, AT.go]];
  for (const [from, to] of slow) {
    assert.ok(paceAt(from + 0.4, to) < 0.7, "forward " + from + "->" + to);
    assert.ok(paceAt(to - 0.4, from) < 0.7, "backward " + to + "->" + from);
  }
  assert.equal(paceAt(AT.start + 0.4, AT.livecv), 1, "the others keep their pace");
  assert.equal(paceAt(AT.base + 0.4, AT.pick), 1);
  assert.ok(follow(0, 1, 1 / 60, FOLLOW * 0.55) < follow(0, 1, 1 / 60), "a slower pace closes less of the way per frame");
});

test("the picked entries land on the LiveCV, glow there a moment, then go", () => {
  const scene = buildScene(false, false, 11);
  const pick = scene.picks[0];
  const at = (progress) => {
    samplePose(pick, progress);
    return { ...pick.pose, position: [...pick.pose.position] };
  };
  const landed = at(AT.ready - 0.25);
  const done = at(AT.ready);
  assert.ok(landed.alpha > 0.9, "still there once it has landed");
  assert.ok(landed.edges === 1 && landed.selected === 1, "glowing teal");
  assert.ok(Math.hypot(...landed.position.map((v, i) => v - done.position[i])) < 0.01, "it has already reached its row");
  assert.equal(done.alpha, 0, "gone when the LiveCV is ready");
});

test("the browser window sits far enough behind the CV that a swaying sheet never cuts into it", () => {
  assert.ok(BROWSER.behind >= 0.2, "behind " + BROWSER.behind);
});
