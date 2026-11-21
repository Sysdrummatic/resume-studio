/**
 * The landing scene as a timeline (epic #190, issue #290): a port of the
 * "OpenCiVera LiveCV 3D" mockup's story model to plain data, so the DOM scene
 * shows exactly what the mockup shows. Pure module: no DOM, testable in Node.
 *
 * Units: x right, y up, z toward the viewer (scene units). Angles in radians.
 * Every object is a box with a track of keys along one timeline whose slots are
 * the stages; a key only states what changes, the rest carries over.
 */

export const STAGE_IDS = [
  "start",
  "livecv",
  "base",
  "pick",
  "ready",
  "versions",
  "history",
  "feats",
  "go",
] as const;
export type StageId = (typeof STAGE_IDS)[number];
export const STAGE_COUNT = STAGE_IDS.length;
export const LAST_SLOT = STAGE_COUNT - 1;
export const AT = Object.fromEntries(STAGE_IDS.map((id, index) => [id, index])) as Record<StageId, number>;

/* ---------- helpers ---------- */

export type Vec3 = [number, number, number];
export type Mat4 = number[];
export const TAU = Math.PI * 2;
export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const scale3 = (v: Vec3, k: number): Vec3 => [v[0] * k, v[1] * k, v[2] * k];
export const smooth = (t: number) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};
export const distance3 = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/* 4x4 matrices, column-major (as WebGL and CSS matrix3d) */
export function perspective(fov: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fov / 2);
  return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0];
}

export function lookAt(eye: Vec3, target: Vec3): Mat4 {
  let zx = eye[0] - target[0];
  let zy = eye[1] - target[1];
  let zz = eye[2] - target[2];
  let length = Math.hypot(zx, zy, zz);
  zx /= length;
  zy /= length;
  zz /= length;
  let xx = zz;
  let xz = -zx;
  length = Math.hypot(xx, xz) || 1;
  xx /= length;
  xz /= length;
  const yx = zy * xz;
  const yy = zz * xx - zx * xz;
  const yz = -zy * xx;
  return [
    xx, yx, zx, 0, 0, yy, zy, 0, xz, yz, zz, 0,
    -(xx * eye[0] + xz * eye[2]), -(yx * eye[0] + yy * eye[1] + yz * eye[2]), -(zx * eye[0] + zy * eye[1] + zz * eye[2]), 1,
  ];
}

export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Array<number>(16);
  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      out[col * 4 + row] =
        a[row] * b[col * 4] + a[4 + row] * b[col * 4 + 1] + a[8 + row] * b[col * 4 + 2] + a[12 + row] * b[col * 4 + 3];
    }
  }
  return out;
}

/** translate * rotateY * rotateX * rotateZ * scale */
export function modelMatrix(position: Vec3, rotation: Vec3, size: Vec3): Mat4 {
  const cx = Math.cos(rotation[0]);
  const sx = Math.sin(rotation[0]);
  const cy = Math.cos(rotation[1]);
  const sy = Math.sin(rotation[1]);
  const cz = Math.cos(rotation[2]);
  const sz = Math.sin(rotation[2]);
  return [
    (cy * cz + sy * sx * sz) * size[0], cx * sz * size[0], (-sy * cz + cy * sx * sz) * size[0], 0,
    (-cy * sz + sy * sx * cz) * size[1], cx * cz * size[1], (sy * sz + cy * sx * cz) * size[1], 0,
    sy * cx * size[2], -sx * size[2], cy * cx * size[2], 0,
    position[0], position[1], position[2], 1,
  ];
}

/* ---------- poses and tracks ---------- */

export type Pose = {
  position: Vec3;
  rotation: Vec3;
  size: Vec3;
  alpha: number;
  /** 0 solid colour .. 1 printed sheet */
  texture: number;
  /** glowing edges of a brick */
  edges: number;
  /** 0 indigo .. 1 teal */
  selected: number;
  /** 1 full .. 0 faded into the background, still opaque */
  dim: number;
  /** radians travelled around the vertical axis; the box keeps facing the same way */
  swirl: number;
  /** 1 keeps circling the axis while the stage rests */
  orbit: number;
  /** -1 has yet to come round from behind the axis, 1 has travelled on to behind it */
  behind: number;
  /** 1 floats gently in place */
  drift: number;
};

type Key = Pose & { at: number; late: number };
type KeyInput = Partial<Pose> & { at: number; late?: number };

const REST: Key = {
  at: 0, position: [0, 0, 0], rotation: [0, 0, 0], size: [1, 1, 1], alpha: 1, texture: 0, edges: 0, selected: 0,
  dim: 1, swirl: 0, orbit: 0, behind: 0, drift: 0, late: 0,
};
const VECTORS = ["position", "rotation", "size"] as const;
const SCALARS = ["texture", "edges", "selected", "dim", "swirl", "orbit", "behind", "drift"] as const;

function track(keys: KeyInput[]): Key[] {
  let previous = REST;
  return keys.map((key) => (previous = { ...previous, late: 0, ...key }));
}

export type ThingKind = "card" | "pick" | "sheet" | "snap" | "tile" | "frame" | "format";
/** what the front face shows: a plain CV file, one of the three LiveCVs, the browser window, a feature tile */
export type Face = "doc" | "fe" | "pf" | "ai" | "web" | "tile" | "format" | "none";

export type Thing = {
  key: string;
  kind: ThingKind;
  index: number;
  face: Face;
  /** "file": a CV file's slightly grey paper in the dark theme; "white": a LiveCV */
  tone: "file" | "white";
  /** a sheet of paper bends in the air */
  sheet: boolean;
  lag: number;
  haze: number;
  axis: [number, number];
  introOrder: number;
  keys: Key[];
  pose: Pose;
  orbitAngle: number;
  air: Vec3;
  airSpeed: Vec3;
  lastPosition?: Vec3;
};

/* shapes */
const YAW = 0.62;
export const SHEET: Vec3 = [1.7, 2.4, 0.02];
export const BRICK: Vec3 = [1.5, 2.6, 0.22];
export const PAPER: Vec3 = [3, 4.24, 0.03];
const lyingFlat = (yaw: number): Vec3 => [-Math.PI / 2, yaw, Math.PI / 2];
const STACK_GAP = 0.34;
const STACK_DIM = 0.36;
const HERO = 3;
const SWIRL_AXIS: [number, number] = [0, -1.5];
const RING_RADIUS = 4.4;
const RING_HEIGHTS = [-1.6, 0.3, 1.9];
const LIVE_AT: Vec3 = [1.5, 0, 0.2];
const LIVE_YAW = -0.3;
const TILES_HIDDEN = 0.5;
export const TILE_RATIO = 264 / 512;
const HOVER: Vec3[] = [
  [-4.8, 1.7, -2.2], [-2.3, -1.5, 0.4], [-0.4, 2.1, -3.6], [2.3, 0.9, -1], [4.7, -1.3, -2.6], [0.9, -2.1, 1.1],
  [-3.7, -0.3, -5.2], [3.4, 2.6, -5.5], [-1.6, 0.5, -7], [6.2, 1.5, -6.5], [-6.4, 2.5, -6], [1.3, -0.5, -8.5],
];
const TILT: Vec3[] = [
  [0.2, 0.5, 0.15], [-0.3, -0.4, -0.2], [0.1, 0.9, 0.3], [-0.15, -0.6, 0.1], [0.35, 0.3, -0.25], [-0.25, 0.7, 0.2],
  [0.1, -0.8, -0.1], [0.2, -0.4, 0.2], [-0.1, 0.6, -0.15], [0.25, -0.7, 0.1], [-0.2, 0.5, 0.2], [0.15, 0.3, -0.1],
];

/** Phones lighten the base (8 entries, 4 picked); the desktop keeps the mockup's 12 and 6. */
export function entryCount(lite: boolean) {
  return lite ? 8 : 12;
}
export function pickedEntries(lite: boolean) {
  return lite ? [0, 1, 3, 6] : [0, 1, 3, 6, 8, 10];
}
const ROWS_WIDE = [1.45, 0.85, 0.2, -0.4, -0.95, -1.5];
const ROWS_LITE = [1.45, 0.45, -0.55, -1.5];

export type Camera = { eye: Vec3; target: Vec3; shiftX: number; shiftY: number; halfWidth: number };
export type Scene = {
  things: Thing[];
  cards: Thing[];
  picks: Thing[];
  sheets: Thing[];
  snaps: Thing[];
  tiles: Thing[];
  frame: Thing;
  cameras: Camera[];
  narrow: boolean;
  lite: boolean;
};

/**
 * narrow: a portrait screen (the scene is framed tighter).
 * lite: a phone (fewer entries, no 3D tiles; the features are a list of cards instead).
 */
export function buildScene(narrow: boolean, lite: boolean, featureCount: number): Scene {
  const things: Thing[] = [];
  const add = (
    options: Partial<Thing> & Pick<Thing, "key" | "kind" | "index" | "face">,
    keys: KeyInput[],
  ): Thing => {
    const thing: Thing = {
      tone: "white", sheet: false, lag: 0, haze: 1, axis: SWIRL_AXIS, introOrder: 0, orbitAngle: 0,
      air: [0, 0, 0], airSpeed: [0, 0, 0],
      ...options,
      keys: track(keys),
      pose: { ...REST, position: [0, 0, 0], rotation: [0, 0, 0], size: [1, 1, 1] },
    };
    things.push(thing);
    return thing;
  };
  const centre = narrow ? 0.2 : 1.1;
  const pileX = narrow ? 0.5 : 2;
  const count = entryCount(lite);
  const picked = pickedEntries(lite);
  const stackHeight = (index: number) => ((count - 1) / 2 - index) * STACK_GAP;

  /* CV files: they hover, swirl around the hero, lie down into a stack and only then become the bricks of the base */
  const cards = HOVER.slice(0, count).map((position, i) => {
    const isHero = i === HERO;
    const y = stackHeight(i);
    const place = i - (i > HERO ? 1 : 0);
    const angle = ((place + 0.5) / (count - 1)) * TAU;
    const aroundHero: KeyInput = {
      at: AT.livecv,
      position: [RING_RADIUS * Math.sin(angle), RING_HEIGHTS[place % 3], SWIRL_AXIS[1] + RING_RADIUS * Math.cos(angle)],
      rotation: [0, Math.sin(angle) * 0.5, 0], size: scale3(SHEET, 0.85), dim: 0.5, orbit: 0.5,
    };
    const upFront: KeyInput = { at: AT.livecv, position: [0.4, 0, 4.2], rotation: [0, -0.1, 0], size: [2, 2.83, 0.02] };
    return add({ key: `card-${i}`, kind: "card", index: i, face: isHero ? "fe" : "doc", tone: "file", sheet: true, lag: i * 0.012, introOrder: i + 1 }, [
      { at: AT.start, position, rotation: TILT[i], size: SHEET, texture: 1, drift: 1 },
      { ...(isHero ? upFront : aroundHero), swirl: TAU, drift: 0.35 },
      { at: AT.base - 0.25, position: [0, y, 0], rotation: lyingFlat(YAW), size: SHEET, dim: 1, swirl: TAU * 2, orbit: 0, drift: 0 },
      { at: AT.base, size: BRICK, texture: 0, edges: 1 },
      { at: AT.base + 0.2 },
      { at: AT.pick - 0.5, selected: picked.includes(i) ? 1 : 0 },
      { at: AT.pick, position: [-1.9, y, -3.2], dim: STACK_DIM },
      { at: AT.ready, position: [-4.1, y * 0.8 - 0.1, -2.8], rotation: lyingFlat(0.95), size: scale3(BRICK, 0.8) },
      { at: AT.versions, position: [0, y * 0.7 - 0.5, -7.5], rotation: lyingFlat(YAW) },
      { at: AT.history, position: [-4.4, y * 0.7, -5.5], rotation: lyingFlat(0.9), size: scale3(BRICK, 0.75) },
      { at: AT.history + 0.6, position: [-4.4, y * 0.7 - 1.2, -5.5], alpha: 0 },
    ]);
  });

  /* bright copies of the picked bricks: they leave the stack and become the rows of the LiveCV */
  const rows = lite ? ROWS_LITE : ROWS_WIDE;
  const picks = picked.map((cardIndex, j) => {
    const y = stackHeight(cardIndex);
    return add({ key: `pick-${j}`, kind: "pick", index: j, face: "none", lag: j * 0.035 }, [
      { at: AT.pick - 0.5, position: [0, y, 0], rotation: lyingFlat(YAW), size: scale3(BRICK, 1.012), alpha: 0, selected: 1, edges: 1 },
      { at: AT.pick - 0.4, alpha: 1 },
      { at: AT.pick, position: [1.6, y, 0.9], size: BRICK },
      {
        at: AT.ready,
        position: [LIVE_AT[0] + 0.06 * Math.sin(LIVE_YAW), rows[j], LIVE_AT[2] + 0.06 * Math.cos(LIVE_YAW)],
        rotation: [0, LIVE_YAW, Math.PI / 2], size: [0.42, 2.5, 0.03], alpha: 0, late: 0.6,
      },
    ]);
  });

  /* the LiveCV and, one stage later, two more versions from the same base */
  const unpublished: Partial<Pose> = { position: LIVE_AT, rotation: [0, LIVE_YAW, 0], size: PAPER, alpha: 0, texture: 1 };
  const spread = narrow ? 1.95 : 3.55;
  const depth = narrow ? -2.2 : -0.7;
  const fan = narrow ? 0.5 : 0.42;
  const live = add({ key: "sheet-0", kind: "sheet", index: 0, face: "fe", sheet: true }, [
    { at: AT.pick, ...unpublished },
    { at: AT.ready, alpha: 1, late: 0.45 },
    { at: AT.versions, position: [0, 0, 0.5], rotation: [0, 0, 0] },
    { at: AT.history, position: [1.1, -0.05, 0.6], rotation: [0, -0.32, 0] },
    { at: AT.feats - TILES_HIDDEN, position: [centre, 0, 0.8], rotation: [0, -0.1, 0], dim: 0.86 },
    { at: AT.feats + TILES_HIDDEN },
    { at: AT.go, position: [pileX, 0, 0.6], rotation: [0.1, -0.32, 0], dim: 1 },
  ]);
  const sideVersion = (face: Face, side: number, index: number) =>
    add({ key: `sheet-${index}`, kind: "sheet", index, face, sheet: true }, [
      { at: AT.ready + 0.4, ...unpublished },
      { at: AT.versions, position: [side * spread, 0, depth], rotation: [0, -side * fan, 0], alpha: 1, late: 0.1 },
      { at: AT.history, position: [side * 8, 0, -2.5], rotation: [0, -side * 0.7, 0], alpha: 0 },
    ]);
  const sheets = [live, sideVersion("pf", -1, 1), sideVersion("ai", 1, 2)];

  /* earlier snapshots of the LiveCV: behind it, then overlapping it, then under it in the pile */
  const snaps = [1, 2].map((n) =>
    add({ key: `snap-${n}`, kind: "snap", index: n, face: "fe", sheet: true }, [
      { at: AT.versions, position: [0, 0, 0.4], size: PAPER, alpha: 0, texture: 1 },
      { at: AT.history, position: [1.1 - 0.62 * n, -0.05 + 0.36 * n, 0.6 - 1.05 * n], rotation: [0, -0.32, 0], alpha: 1, late: 0.3, dim: 1 - 0.18 * n },
      { at: AT.feats - TILES_HIDDEN, position: [centre + (n === 1 ? -0.8 : 0.8), 0.12, 0.8 - 0.35 * n], rotation: [0, -0.1, n === 1 ? 0.09 : -0.09], dim: 0.7 },
      { at: AT.feats + TILES_HIDDEN },
      { at: AT.go, position: [pileX - 0.26 * n, -0.16 * n, 0.6 - 0.5 * n], rotation: [0.1, -0.32, 0], dim: 1 - 0.19 * n },
    ]),
  );

  /* PDF, YAML and TXT peel off the published LiveCV in the last stage (issue #290; not in the mockup) */
  [0, 1, 2].forEach((k) =>
    add({ key: `format-${k}`, kind: "format", index: k, face: "format", lag: k * 0.08 }, [
      { at: AT.history, position: [pileX, 0.6 - k * 0.6, 0.62], rotation: [0.1, -0.32, 0], size: [1.1, 0.52, 0.03], alpha: 0, texture: 1 },
      { at: AT.go - 0.45 },
      {
        at: AT.go,
        position: narrow ? [pileX + 1.15, 1.5 - k * 0.75, 1.4 + k * 0.2] : [pileX + 1.75, 1.2 - k * 0.85, 1.4 + k * 0.25],
        rotation: [0.1, -0.32, -0.1 + k * 0.1], alpha: 1, late: 0.3,
      },
    ]),
  );

  /* one tile per feature: they come round their circle from behind the sheets, keep circling, and travel on behind them again */
  const tileWidth = narrow ? 1.5 : 2;
  const tileSize: Vec3 = [tileWidth, tileWidth * TILE_RATIO, 0.03];
  const rings = narrow ? [2.3, 2.9] : [3.2, 4.1];
  const tiles = lite
    ? []
    : Array.from({ length: featureCount }, (_, i) => {
        const angle = (i / featureCount) * TAU;
        const radius = rings[i % 2];
        const x = centre + radius * Math.sin(angle);
        const z = 0.2 + radius * Math.cos(angle);
        const height = lerp(-2.1, 2.1, ((i * 7) % featureCount) / Math.max(1, featureCount - 1));
        return add({ key: `tile-${i}`, kind: "tile", index: i, face: "tile", axis: [centre, 0.2], lag: i * 0.02, haze: 0.3 }, [
          { at: AT.feats - TILES_HIDDEN - 0.06, position: [x, height * 0.5, z], size: tileSize, alpha: 0, texture: 1, orbit: 1, behind: -1 },
          { at: AT.feats - TILES_HIDDEN, alpha: 1 },
          { at: AT.feats, position: [x, height, z], behind: 0 },
          { at: AT.feats + 0.08 },
          { at: AT.feats + TILES_HIDDEN, position: [x, height * 0.5, z], behind: 1 },
          { at: AT.feats + TILES_HIDDEN + 0.06, alpha: 0 },
        ]);
      });

  /* the browser window is not keyed: it follows a sheet (see placeBrowserFrame) */
  const frame = add({ key: "frame", kind: "frame", index: 0, face: "web" }, [{ at: 0, alpha: 0, texture: 1 }]);

  /* one camera per slot. shiftX/shiftY move the picture on screen so the text has room; halfWidth is what must stay visible. */
  const cameras: Camera[] = [
    { eye: [0, 0.3, 11], target: [0, 0, -1.5], shiftX: 0.23, shiftY: 0.04, halfWidth: 4.4 },
    { eye: [0, 0.4, 11], target: [0, 0, -0.5], shiftX: 0.2, shiftY: 0.03, halfWidth: narrow ? 2.6 : 4.6 },
    { eye: [2.8, 3.4, 8.6], target: [0, 0.1, 0], shiftX: 0.2, shiftY: 0.04, halfWidth: 2.3 },
    { eye: [3.6, 2.6, 8.8], target: [0.3, 0, 0], shiftX: 0.18, shiftY: 0.04, halfWidth: 3.4 },
    { eye: [1.6, 0.9, 10], target: [0.8, 0, -0.6], shiftX: 0.1, shiftY: 0.06, halfWidth: 4.5 },
    { eye: [0, 0.5, 15.5], target: [0, 0, 0], shiftX: 0, shiftY: narrow ? 0.06 : 0.33, halfWidth: narrow ? 3.5 : 5.6 },
    { eye: [-1.6, 0.6, 9.4], target: [0.3, 0.1, -0.4], shiftX: 0.17, shiftY: 0.05, halfWidth: 3.4 },
    { eye: [0, 0.5, 12], target: [centre, 0, 0.2], shiftX: 0.2, shiftY: 0.03, halfWidth: narrow ? 3.3 : 5.4 },
    { eye: [0.6, 0.5, 10.5], target: [pileX - 0.6, 0, 0], shiftX: 0.2, shiftY: narrow ? 0.26 : 0.03, halfWidth: narrow ? 4.4 : 3.6 },
  ];

  return { things, cards, picks, sheets, snaps, tiles, frame, cameras, narrow, lite };
}

/* ---------- labels pinned to objects: [group, index] names the object, offset is measured from its centre ---------- */

export type LabelSpec = {
  key: string;
  on: ["cards" | "picks" | "sheets" | "snaps", number];
  offset: Vec3;
  from: number;
  to?: number;
  anchor?: "start" | "end" | "above" | "middle";
  wideOnly?: boolean;
  url?: boolean;
};

export function buildLabels(lite: boolean): LabelSpec[] {
  const lastPick = pickedEntries(lite).length - 1;
  return [
    { key: "file-0", on: ["cards", 0], offset: [0.9, 1.3, 0], from: AT.start },
    { key: "file-1", on: ["cards", 1], offset: [0.9, 1.3, 0], from: AT.start, wideOnly: true },
    { key: "file-3", on: ["cards", HERO], offset: [0.9, 1.3, 0], from: AT.start, wideOnly: true },
    { key: "file-4", on: ["cards", 4], offset: [-0.9, 1.3, 0], from: AT.start, anchor: "end", wideOnly: true },
    { key: "base", on: ["cards", 0], offset: [1.45, 0.3, 0], from: AT.base, to: AT.pick },
    { key: "picked", on: ["picks", lastPick], offset: [1.5, -0.3, 0], from: AT.pick, wideOnly: true },
    { key: "version-1", on: ["sheets", 1], offset: [0, 2.3, 0], from: AT.versions, anchor: "above" },
    { key: "version-0", on: ["sheets", 0], offset: [0, 2.85, 0], from: AT.versions, anchor: "above", wideOnly: true },
    { key: "version-2", on: ["sheets", 2], offset: [0, 2.3, 0], from: AT.versions, anchor: "above" },
    { key: "snapshot-3", on: ["sheets", 0], offset: [0.7, 2.25, 0], from: AT.history, anchor: "above" },
    { key: "snapshot-2", on: ["snaps", 0], offset: [-1.5, 2.3, 0], from: AT.history, anchor: "end" },
    { key: "snapshot-1", on: ["snaps", 1], offset: [-1.5, 2.3, 0], from: AT.history, anchor: "end", wideOnly: true },
    { key: "url", on: ["sheets", 0], offset: [-0.3, -1.25, 0.3], from: AT.go, anchor: "middle", url: true },
  ];
}

/* ---------- running the timeline ---------- */

export const INTRO_SECONDS = 2.4;
export const ORBIT_SPEED = 0.16;
export const FIELD_OF_VIEW = 0.66;
const NARROW_LIFT = 0.34;
const AIR = { gain: 0.042, limit: 0.24, stiffness: 70, damping: 8 };
/** The browser window is a little larger than its sheet, lifted toward its title bar and set just behind it. */
export const BROWSER = { arrive: 0.12, leave: 0.3, grow: [1.12, 1.165] as const, lift: 0.054, behind: 0.05 };

/** how far a timeline position is from a range of slots */
export const distanceFrom = (progress: number, from: number, to = from) =>
  progress < from ? from - progress : progress > to ? progress - to : 0;

/** pose a thing at a timeline position (in slots) */
export function samplePose(thing: Thing, at: number) {
  const keys = thing.keys;
  let i = 0;
  while (i < keys.length - 2 && at >= keys[i + 1].at) i += 1;
  const from = keys[i];
  const to = keys[i + 1] || from;
  const local = clamp((at - from.at) / (to.at - from.at || 1));
  const t = smooth(clamp(local * (1 + thing.lag) - thing.lag));
  const pose = thing.pose;
  VECTORS.forEach((name) => {
    for (let k = 0; k < 3; k += 1) pose[name][k] = lerp(from[name][k], to[name][k], t);
  });
  SCALARS.forEach((name) => {
    pose[name] = lerp(from[name], to[name], t);
  });
  pose.alpha = lerp(from.alpha, to.alpha, to.late ? clamp((t - to.late) / (1 - to.late)) : t);
}

export type Clock = { time: number; intro: number; progress: number; orbitFlow: number };

/** motion that is not keyed: circling the axis, the opening vortex, floating in place */
export function applyMotion(thing: Thing, dt: number, clock: Clock) {
  const pose = thing.pose;
  const [axisX, axisZ] = thing.axis;
  if (!pose.behind) thing.orbitAngle += dt * ORBIT_SPEED * pose.orbit * clock.orbitFlow;
  if (pose.orbit < 0.01) thing.orbitAngle -= (thing.orbitAngle - TAU * Math.round(thing.orbitAngle / TAU)) * 0.08;
  let turn = pose.swirl + thing.orbitAngle;
  let spread = 1;
  if (pose.behind) {
    const angle = Math.atan2(pose.position[0] - axisX, pose.position[2] - axisZ) + turn;
    const gap = ((((pose.behind > 0 ? Math.PI - angle : angle - Math.PI) % TAU) + TAU) % TAU);
    turn += gap * pose.behind;
  }
  if (thing.introOrder && clock.intro < 1) {
    const remaining = (1 - smooth(clock.intro)) * clamp(1 - clock.progress * 2);
    turn += remaining * (TAU * 1.4 + thing.introOrder * 0.35);
    spread = 1 - remaining * 0.85;
    pose.position[1] = lerp(pose.position[1], (thing.introOrder - 6) * 0.22, remaining);
    pose.alpha *= clamp(clock.intro * 4 + clock.progress * 2);
  }
  if (turn || spread !== 1) {
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    const dx = (pose.position[0] - axisX) * spread;
    const dz = (pose.position[2] - axisZ) * spread;
    pose.position[0] = axisX + dx * cos + dz * sin;
    pose.position[2] = axisZ - dx * sin + dz * cos;
  }
  if (pose.drift) {
    const phase = thing.introOrder || 0;
    pose.position[1] += Math.sin(clock.time * 0.6 + phase * 1.7) * 0.13 * pose.drift;
    pose.rotation[1] += Math.sin(clock.time * 0.4 + phase) * 0.09 * pose.drift;
    pose.rotation[0] += Math.cos(clock.time * 0.5 + phase * 2.1) * 0.05 * pose.drift;
  }
}

/** the wind a sheet feels is its own movement turned round, along its three axes; a spring makes the bend lag and swing */
export function feelAir(thing: Thing, dt: number) {
  const { pose, air, airSpeed } = thing;
  const last = thing.lastPosition || pose.position;
  const facing = modelMatrix([0, 0, 0], pose.rotation, [1, 1, 1]);
  for (let k = 0; k < 3 && dt > 0; k += 1) {
    const speed =
      ((pose.position[0] - last[0]) * facing[k * 4] +
        (pose.position[1] - last[1]) * facing[k * 4 + 1] +
        (pose.position[2] - last[2]) * facing[k * 4 + 2]) / dt;
    const wind = clamp(-speed * AIR.gain, -AIR.limit, AIR.limit);
    airSpeed[k] += ((wind - air[k]) * AIR.stiffness - airSpeed[k] * AIR.damping) * dt;
    air[k] += airSpeed[k] * dt;
  }
  thing.lastPosition = [...pose.position] as Vec3;
}

/** The browser window marks a sheet as a LiveCV: first the hero file, later the assembled one. Returns how it is traced. */
export function placeBrowserFrame(scene: Scene, progress: number): "cycle" | "once" | "off" {
  const frame = scene.frame;
  const cycles = progress < AT.base;
  const framed = cycles ? scene.cards[HERO] : scene.sheets[0];
  const sheet = framed.pose;
  const away = cycles ? distanceFrom(progress, AT.livecv) : distanceFrom(progress, AT.ready, AT.versions);
  const shown = away < BROWSER.leave;
  const facing = modelMatrix([0, 0, 0], sheet.rotation, [1, 1, 1]);
  const lift = sheet.size[1] * BROWSER.lift;
  const pose = frame.pose;
  for (let k = 0; k < 3; k += 1) {
    pose.position[k] = sheet.position[k] + facing[4 + k] * lift - facing[8 + k] * BROWSER.behind;
    pose.rotation[k] = sheet.rotation[k];
  }
  pose.size = [sheet.size[0] * BROWSER.grow[0], sheet.size[1] * BROWSER.grow[1], 0.02];
  pose.alpha = (shown ? clamp(1 - away / BROWSER.leave) : 0) * sheet.alpha;
  pose.texture = 1;
  pose.dim = sheet.dim;
  frame.air = framed.air;
  if (!shown) return "off";
  return cycles ? "cycle" : "once";
}

/* ---------- camera ---------- */

export type View = {
  /** projection * view, for projecting points to the screen */
  matrix: Mat4;
  /** view alone */
  view: Mat4;
  eye: Vec3;
  fogNear: number;
  fogFar: number;
  /** lens shift in NDC (the picture moves, its vanishing point with it) */
  shiftX: number;
  shiftY: number;
  /** CSS perspective in px for the height the scene is drawn into */
  focal: number;
};

/** inArea: the stacked phone layout draws the scene into a band above the text, so nothing shifts vertically */
export function viewAt(scene: Scene, at: number, width: number, height: number, gaze: { x: number; y: number }, inArea = false): View {
  const cameras = scene.cameras;
  const i = Math.min(cameras.length - 2, Math.floor(at));
  const t = smooth((clamp(at - i) - 0.1) / 0.8);
  const a = cameras[i];
  const b = cameras[i + 1];
  const aspect = width / height;
  const wide = clamp((aspect - 0.9) / 0.6);
  const shiftX = lerp(a.shiftX, b.shiftX, t) * wide;
  const shiftY = inArea ? 0 : lerp(a.shiftY, b.shiftY, t) + (1 - wide) * NARROW_LIFT;
  const target = lerp3(a.target, b.target, t);
  const offset = lerp3(a.eye, b.eye, t).map((v, k) => v - target[k]) as Vec3;
  const reach = Math.hypot(...offset);
  const halfWidth = lerp(a.halfWidth, b.halfWidth, t);
  const lens = Math.tan(FIELD_OF_VIEW / 2) * reach * 0.9;
  const pullBack = Math.max(1, halfWidth / (lens * aspect * (1 - Math.abs(shiftX))), inArea ? (halfWidth * 0.95) / lens : 0);
  const eye: Vec3 = [target[0] + offset[0] * pullBack + gaze.x * 0.6, target[1] + offset[1] * pullBack - gaze.y * 0.4, target[2] + offset[2] * pullBack];
  const projection = perspective(FIELD_OF_VIEW, aspect, 0.1, 120);
  projection[8] = -shiftX;
  projection[9] = -shiftY;
  const view = lookAt(eye, target);
  const distance = reach * pullBack;
  return {
    matrix: multiply(projection, view),
    view,
    eye,
    fogNear: distance * 0.8,
    fogFar: distance * 2.7,
    shiftX,
    shiftY,
    focal: height / 2 / Math.tan(FIELD_OF_VIEW / 2),
  };
}

/** where a point of the scene lands on a width x height area, in pixels; null when behind the camera */
export function toScreen(view: View, width: number, height: number, x: number, y: number, z: number): [number, number] | null {
  const m = view.matrix;
  const w = m[3] * x + m[7] * y + m[11] * z + m[15];
  if (w <= 0) return null;
  return [
    (((m[0] * x + m[4] * y + m[8] * z + m[12]) / w) * 0.5 + 0.5) * width,
    (1 - (((m[1] * x + m[5] * y + m[9] * z + m[13]) / w) * 0.5 + 0.5)) * height,
  ];
}

/** share of the distance haze a box at this distance takes: 0 clear .. 1 the background colour */
export function fogAt(view: View, position: Vec3, dim: number, haze: number) {
  const dist = distance3(position, view.eye);
  const t = clamp((dist - view.fogNear) / (view.fogFar - view.fogNear));
  const hazed = haze * t * t * (3 - 2 * t);
  return clamp(1 - dim * (1 - hazed));
}

/* ---------- following the scroll (as in the mockup; epic #190 decision 4, amended) ---------- */

/** the mockup's FOLLOW: each frame the timeline closes a tenth of the way to the scroll position */
export const FOLLOW = 0.1;

/** follow the scroll as the mockup does, corrected for the frame rate so a 120Hz screen moves at the same speed */
export function follow(position: number, target: number, dt: number) {
  const next = position + (target - position) * (1 - Math.pow(1 - FOLLOW, dt * 60));
  return Math.abs(target - next) < 0.0004 ? target : next;
}

/* ---------- CSS ---------- */

const n = (value: number) => (Math.abs(value) < 1e-9 ? 0 : Number(value.toFixed(5)));
export const matrix3d = (m: Mat4) => `matrix3d(${m.map(n).join(",")})`;

/**
 * CSS for the world element: maps world px (k px per unit, y down) into the space of an element
 * with `perspective: focal` whose viewer sits at the camera.
 */
export function worldMatrix(view: View, k: number): Mat4 {
  const toCss = [k, 0, 0, 0, 0, -k, 0, 0, 0, 0, k, 0, 0, 0, view.focal, 1];
  const fromCss = [1 / k, 0, 0, 0, 0, -1 / k, 0, 0, 0, 0, 1 / k, 0, 0, 0, 0, 1];
  return multiply(toCss, multiply(view.view, fromCss));
}

/**
 * CSS for one object inside the world element. The element is base[0] x base[1] px with
 * its face at z = 0 and depth base[2] px (faces at +/- base[2] / 2); its transform maps it onto
 * the box the model describes.
 */
export function objectMatrix(pose: Pose, base: Vec3, k: number, extraRotation: Vec3 = [0, 0, 0]): Mat4 {
  const rotation: Vec3 = [pose.rotation[0] + extraRotation[0], pose.rotation[1] + extraRotation[1], pose.rotation[2] + extraRotation[2]];
  const model = modelMatrix(pose.position, rotation, pose.size);
  const toCss = [k, 0, 0, 0, 0, -k, 0, 0, 0, 0, k, 0, 0, 0, 0, 1];
  const fromElement = [1 / base[0], 0, 0, 0, 0, -1 / base[1], 0, 0, 0, 0, 1 / Math.max(base[2], 1e-6), 0, 0, 0, 0, 1];
  return multiply(toCss, multiply(model, fromElement));
}

/** The light of the mockup's renderer for a face whose local normal is n: 0.38 (in shade) .. 1.08 */
const LIGHT: Vec3 = (() => {
  const l: Vec3 = [0.35, 0.8, 0.5];
  const len = Math.hypot(...l);
  return [l[0] / len, l[1] / len, l[2] / len];
})();
export function faceLight(pose: Pose, normal: Vec3) {
  const r = modelMatrix([0, 0, 0], pose.rotation, [1, 1, 1]);
  const nx = r[0] * normal[0] + r[4] * normal[1] + r[8] * normal[2];
  const ny = r[1] * normal[0] + r[5] * normal[1] + r[9] * normal[2];
  const nz = r[2] * normal[0] + r[6] * normal[1] + r[10] * normal[2];
  return Math.max(nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2], 0) * 0.7 + 0.38;
}

/** A sheet in the air sways with the wind it feels (the mockup bends it; a DOM plane turns instead). */
export function airSway(thing: Thing): Vec3 {
  if (!thing.sheet) return [0, 0, 0];
  const k = thing.pose.texture * 1.4;
  return [thing.air[1] * k, -thing.air[0] * k, 0];
}
