/**
 * The landing scene as data (epic #190, issue #290): one pose per object per stage.
 * The client applies a pose as a CSS transform plus an opacity; CSS transitions do
 * the motion, so a new target retargets mid-flight and a fast scroll goes straight
 * to the stage it lands on. Pure module: no DOM, testable in Node.
 *
 * Units: x right, y up, z toward the viewer, all in `--u` (one scene unit, set in
 * CSS from the stage size). Angles in degrees.
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
const S = Object.fromEntries(STAGE_IDS.map((id, index) => [id, index])) as Record<StageId, number>;

/** wide: desktop and tablets; stacked: phone upright; side: phone on its side. */
export type SceneLayout = "wide" | "stacked" | "side";

export type Pose = {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  sx: number;
  sy: number;
  /** opacity */
  o: number;
  /** opacity of the object's shade layer: 0 lit .. 1 sunk into the background */
  d: number;
};

/** Which face a Experience Base entry shows: a CV file, an indigo slab, a teal (picked) slab. */
export type Look = "file" | "slab" | "picked";

export type SceneGroup = "card" | "pick" | "paper" | "snap" | "format" | "frame" | "tile" | "label";

export type SceneObject = {
  key: string;
  group: SceneGroup;
  index: number;
  /** transition-delay in ms: the stagger */
  delay: number;
  poses: Pose[];
  looks?: Look[];
};

export type Camera = {
  /** target the camera looks at */
  tx: number;
  ty: number;
  tz: number;
  /** distance from the target */
  dist: number;
  /** degrees; positive looks down */
  pitch: number;
  /** degrees; positive looks from the right */
  yaw: number;
  /** picture shift on screen, percent of the stage, so the caption has room */
  shiftX: number;
  shiftY: number;
};

/** Distance of the viewer from the z = 0 plane: CSS `perspective`, in units. */
export const PERSPECTIVE = 11;

const REST: Pose = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, o: 1, d: 0 };
const rad = (deg: number) => (deg * Math.PI) / 180;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const at = (pose: Partial<Pose>): Pose => ({ ...REST, ...pose });

/* Shapes: a CV file is 1.7 x 2.4, an entry lying flat is a 1.5 x 2.6 slab, a LiveCV is 3 x 4.24. */
const SLAB = { sx: 1.5 / 1.7, sy: 2.6 / 2.4 };
const FLAT = 90;
const YAW = 35;
const LIVE = { x: 1.5, y: 0, z: 0.2, ry: -17 };

/* Twelve files hovering at the start (the first eight on phones). */
const HOVER: Array<[number, number, number]> = [
  [-4.8, 1.7, -2.2], [-2.3, -1.5, 0.4], [-0.4, 2.1, -3.6], [2.3, 0.9, -1], [4.7, -1.3, -2.6], [0.9, -2.1, 1.1],
  [-3.7, -0.3, -5.2], [3.4, 2.6, -5.5], [-1.6, 0.5, -7], [6.2, 1.5, -6.5], [-6.4, 2.5, -6], [1.3, -0.5, -8.5],
];
const TILT: Array<[number, number, number]> = [
  [11, 29, 9], [-17, -23, -11], [6, 52, 17], [-9, -34, 6], [20, 17, -14], [-14, 40, 11],
  [6, -46, -6], [11, -23, 11], [-6, 34, -9], [14, -40, 6], [-11, 29, 11], [9, 17, -6],
];

export function entryCount(layout: SceneLayout): number {
  return layout === "wide" ? 12 : 8;
}

/** The entries picked for the LiveCV; the base keeps all of them. */
export function pickedEntries(layout: SceneLayout): number[] {
  return layout === "wide" ? [0, 1, 3, 6, 8, 10] : [0, 2, 5, 7];
}

const HERO = 3;

export function hasTiles(layout: SceneLayout): boolean {
  return layout === "wide";
}

function stackY(index: number, count: number): number {
  return ((count - 1) / 2 - index) * 0.34;
}

/** Fills a per-stage list forward: a stage without its own key keeps the previous pose. */
function track(keys: Array<[number, Partial<Pose>]>): Pose[] {
  const poses: Pose[] = [];
  let previous = REST;
  let k = 0;
  for (let stage = 0; stage < STAGE_COUNT; stage += 1) {
    while (k < keys.length && keys[k][0] === stage) {
      previous = { ...previous, ...keys[k][1] };
      k += 1;
    }
    poses.push(previous);
  }
  return poses;
}

function looksFor(picked: boolean): Look[] {
  return STAGE_IDS.map((_, stage) =>
    stage < S.base ? "file" : stage >= S.pick && picked ? "picked" : "slab",
  );
}

export function buildScene(layout: SceneLayout, featureCount: number): SceneObject[] {
  const narrow = layout === "stacked";
  const count = entryCount(layout);
  const picked = pickedEntries(layout);
  const centre = narrow ? 0.2 : 1.1;
  const pileX = narrow ? 0.5 : 2;
  const objects: SceneObject[] = [];

  /* Experience Base entries: CV files that swirl, lie down and become the base. */
  for (let i = 0; i < count; i += 1) {
    const y = stackY(i, count);
    const place = i - (i > HERO ? 1 : 0);
    const angle = ((place + 0.5) / (count - 1)) * 2 * Math.PI;
    const ring = i === HERO
      ? { x: 0.4, y: 0, z: 4.2, rx: 0, ry: -6, rz: 0, sx: 1.18, sy: 1.18, d: 0 }
      : { x: 4.4 * Math.sin(angle), y: [-1.6, 0.3, 1.9][place % 3], z: -1.5 + 4.4 * Math.cos(angle),
          rx: 0, ry: Math.sin(angle) * 29, rz: 0, sx: 0.85, sy: 0.85, d: 0.5 };
    const flat = { rx: FLAT, rz: 0, ...SLAB };
    objects.push({
      key: `card-${i}`,
      group: "card",
      index: i,
      delay: i * 14,
      looks: looksFor(picked.includes(i)),
      poses: track([
        [S.start, { x: HOVER[i][0], y: HOVER[i][1], z: HOVER[i][2], rx: TILT[i][0], ry: TILT[i][1], rz: TILT[i][2] }],
        [S.livecv, ring],
        [S.base, { x: 0, y, z: 0, ry: YAW, d: 0, ...flat }],
        [S.pick, { x: -1.9, z: -3.2, d: 0.6 }],
        [S.ready, { x: -2.2, y: y * 0.8 - 0.1, z: -4.6, ry: 54, sx: SLAB.sx * 0.8, sy: SLAB.sy * 0.8 }],
        [S.versions, { x: 0, y: y * 0.7 - 0.5, z: -7.5, ry: YAW }],
        [S.history, { x: -2.6, y: y * 0.7 - 1.2, z: -7, ry: 52, sx: SLAB.sx * 0.75, sy: SLAB.sy * 0.75, o: 0 }],
      ]),
    });
  }

  /* Bright copies of the picked entries: they leave the base and become the LiveCV's rows. */
  const rows = picked.map((_, j) => lerp(1.45, -1.5, picked.length > 1 ? j / (picked.length - 1) : 0));
  picked.forEach((entry, j) => {
    const y = stackY(entry, count);
    const row = {
      x: LIVE.x + 0.06 * Math.sin(rad(LIVE.ry)),
      y: rows[j],
      z: LIVE.z + 0.06 * Math.cos(rad(LIVE.ry)),
      rx: 0, ry: LIVE.ry, rz: 90, sx: 0.42 / 1.7, sy: 2.5 / 2.4, o: 0,
    };
    objects.push({
      key: `pick-${j}`,
      group: "pick",
      index: j,
      delay: j * 45,
      poses: track([
        [S.start, { x: 0, y, z: 0, rx: FLAT, ry: YAW, ...SLAB, o: 0 }],
        [S.pick, { x: narrow ? 1.15 : 1.9, z: 0.1, sx: SLAB.sx * 0.82, sy: SLAB.sy * 0.82, o: 1 }],
        [S.ready, row],
      ]),
    });
  });

  /* The LiveCV and, one stage later, two more versions from the same base. */
  const hidden = { x: LIVE.x, y: LIVE.y, z: LIVE.z, ry: LIVE.ry, o: 0 };
  objects.push({
    key: "paper-0",
    group: "paper",
    index: 0,
    delay: 120,
    poses: track([
      [S.start, hidden],
      [S.ready, { o: 1 }],
      [S.versions, { x: 0, y: 0, z: 0.5, ry: 0 }],
      [S.history, { x: 1.1, y: -0.05, z: 0.6, ry: -18 }],
      [S.feats, { x: centre, y: 0, z: 0.8, ry: -6, d: 0.14 }],
      [S.go, { x: pileX, y: 0, z: 0.6, rx: 6, ry: -18, d: 0 }],
    ]),
  });
  const spread = narrow ? 1.95 : 3.55;
  const depth = narrow ? -2.2 : -0.7;
  const fan = narrow ? 29 : 24;
  [-1, 1].forEach((side, n) => {
    objects.push({
      key: `paper-${n + 1}`,
      group: "paper",
      index: n + 1,
      delay: 80 + n * 80,
      poses: track([
        [S.start, hidden],
        [S.versions, { x: side * spread, y: 0, z: depth, ry: -side * fan, o: 1 }],
        [S.history, { x: side * 8, z: -2.5, ry: -side * 40, o: 0 }],
      ]),
    });
  });

  /* Earlier snapshots of the LiveCV: behind it on the time axis, then under it in the pile. */
  [1, 2].forEach((n) => {
    objects.push({
      key: `snap-${n}`,
      group: "snap",
      index: n,
      delay: n * 70,
      poses: track([
        [S.start, { x: 0, y: 0, z: 0.4, o: 0 }],
        [S.history, { x: 1.1 - 0.62 * n, y: -0.05 + 0.36 * n, z: 0.6 - 1.05 * n, ry: -18, o: 1, d: 0.18 * n }],
        [S.feats, { x: centre + (n === 1 ? -0.8 : 0.8), y: 0.12, z: 0.8 - 0.35 * n, ry: -6, rz: n === 1 ? 5 : -5, d: 0.3 }],
        [S.go, { x: pileX - 0.26 * n, y: -0.16 * n, z: 0.6 - 0.5 * n, rx: 6, ry: -18, rz: 0, d: 0.19 * n }],
      ]),
    });
  });

  /* PDF, YAML and TXT peel off the published LiveCV in the last stage. */
  [0, 1, 2].forEach((k) => {
    const from = { x: pileX, y: 0.6 - k * 0.6, z: 0.62, rx: 6, ry: -18, rz: 0, o: 0 };
    objects.push({
      key: `format-${k}`,
      group: "format",
      index: k,
      delay: 260 + k * 90,
      poses: track([
        [S.start, from],
        [S.go, narrow
          ? { x: pileX + 1.15, y: 1.5 - k * 0.75, z: 1.4 + k * 0.2, rz: -4 + k * 4, o: 1 }
          : { x: pileX + 1.55, y: 1.1 - k * 0.85, z: 1.5 + k * 0.2, rz: -6 + k * 6, o: 1 }],
      ]),
    });
  });

  /* The browser window marks a sheet as a LiveCV: the hero file first, later the assembled one. */
  const frameOn = (pose: Partial<Pose>) => ({ ...pose, o: 1 });
  objects.push({
    key: "frame",
    group: "frame",
    index: 0,
    delay: 0,
    poses: track([
      [S.start, { x: 0.4, y: 0, z: 4.2, ry: -6, sx: 2 / 3, sy: 2 / 3, o: 0 }],
      [S.livecv, frameOn({ x: 0.4, y: 0, z: 4.2, ry: -6, sx: 2 / 3, sy: 2 / 3 })],
      [S.base, { o: 0 }],
      [S.ready, frameOn({ x: LIVE.x, y: LIVE.y, z: LIVE.z, ry: LIVE.ry, sx: 1, sy: 1 })],
      [S.versions, { x: 0, y: 0, z: 0.5, ry: 0 }],
      [S.history, { x: 1.1, y: -0.05, z: 0.6, ry: -18, o: 0 }],
      [S.go, frameOn({ x: pileX, y: 0, z: 0.6, rx: 6, ry: -18 })],
    ]),
  });

  /* Feature tiles: two arcs around the sheets, behind them until the features stage. */
  if (hasTiles(layout)) {
    for (let i = 0; i < featureCount; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const step = Math.floor(i / 2);
      const steps = Math.ceil(featureCount / 2);
      const angle = rad(side * lerp(78, 152, steps > 1 ? step / (steps - 1) : 0));
      const radius = [2.6, 3.3][step % 2];
      const x = centre + 0.7 + radius * Math.sin(angle);
      const z = 0.2 + radius * Math.cos(angle);
      const y = lerp(-2.1, 2.1, ((i * 7) % featureCount) / Math.max(1, featureCount - 1));
      objects.push({
        key: `tile-${i}`,
        group: "tile",
        index: i,
        delay: i * 24,
        poses: track([
          [S.start, { x, y: y * 0.5, z: z - 1.6, sx: 0.9, sy: 0.9, o: 0 }],
          [S.feats, { y, z, sx: 1, sy: 1, o: 1 }],
          [S.go, { y: y * 0.5, z: z - 1.6, sx: 0.9, sy: 0.9, o: 0 }],
        ]),
      });
    }
  }

  return objects;
}

/* Labels pinned beside objects, shown for one stage (or a range). */
export type SceneLabel = { key: string; from: StageId; to?: StageId; wideOnly?: boolean; anchor: Pose };

export function buildLabels(layout: SceneLayout): SceneLabel[] {
  const narrow = layout === "stacked";
  const count = entryCount(layout);
  const picked = pickedEntries(layout);
  const spread = narrow ? 1.95 : 3.55;
  const depth = narrow ? -2.2 : -0.7;
  const pileX = narrow ? 0.5 : 2;
  const fileLabel = (i: number, dx: number) => at({ x: HOVER[i][0] + dx, y: HOVER[i][1] + 1.3, z: HOVER[i][2] });
  return [
    { key: "file-0", from: "start", anchor: fileLabel(0, 0.9) },
    { key: "file-1", from: "start", wideOnly: true, anchor: fileLabel(1, 0.9) },
    { key: "file-3", from: "start", wideOnly: true, anchor: fileLabel(HERO, 0.9) },
    { key: "file-4", from: "start", wideOnly: true, anchor: fileLabel(4, -2.4) },
    { key: "base", from: "base", anchor: at({ x: 1.45, y: stackY(0, count) + 0.4, z: 0 }) },
    { key: "picked", from: "pick", wideOnly: true, anchor: at({ x: 3.1, y: stackY(picked[picked.length - 1], count) - 0.3, z: 0.9 }) },
    { key: "version-1", from: "versions", anchor: at({ x: -spread - 0.9, y: 2.75, z: depth + 0.6 }) },
    { key: "version-0", from: "versions", wideOnly: true, anchor: at({ x: -0.9, y: 3.35, z: 0.8 }) },
    { key: "version-2", from: "versions", anchor: at({ x: spread - 0.9, y: 2.75, z: depth + 0.6 }) },
    { key: "snapshot-3", from: "history", anchor: at({ x: 1.6, y: 2.3, z: 0.6 }) },
    { key: "snapshot-2", from: "history", anchor: at({ x: -1.7, y: 2.6, z: -0.45 }) },
    { key: "snapshot-1", from: "history", wideOnly: true, anchor: at({ x: -2.3, y: 3, z: -1.5 }) },
    { key: "url", from: "go", anchor: at({ x: pileX - 1.6, y: -1.85, z: 1.2 }) },
  ];
}

/* One camera per stage; computed from an eye and a target as in the mockup. */
function look(eye: [number, number, number], target: [number, number, number], shiftX: number, shiftY: number): Camera {
  const dx = eye[0] - target[0];
  const dy = eye[1] - target[1];
  const dz = eye[2] - target[2];
  const flat = Math.hypot(dx, dz);
  return {
    tx: target[0],
    ty: target[1],
    tz: target[2],
    dist: Math.hypot(flat, dy),
    pitch: (Math.atan2(dy, flat) * 180) / Math.PI,
    yaw: (Math.atan2(dx, dz) * 180) / Math.PI,
    shiftX,
    shiftY,
  };
}

export function buildCameras(layout: SceneLayout): Camera[] {
  const narrow = layout === "stacked";
  const centre = narrow ? 0.2 : 1.1;
  const pileX = narrow ? 0.5 : 2;
  const sx = (value: number) => (narrow ? 0 : value);
  const far = narrow ? 1.1 : 1;
  const away = (eye: [number, number, number], target: [number, number, number]): [number, number, number] =>
    [target[0] + (eye[0] - target[0]) * far, target[1] + (eye[1] - target[1]) * far, target[2] + (eye[2] - target[2]) * far];
  const cam = (eye: [number, number, number], target: [number, number, number], shiftX: number, shiftY = 0) =>
    look(away(eye, target), target, sx(shiftX), shiftY);
  return [
    cam([0, 0.3, 11], [0, 0, -1.5], 11.5),
    cam([0, 0.4, 11], [0, 0, -0.5], 10),
    cam([2.8, 3.4, 8.6], [0, 0.1, 0], 10),
    cam([3.6, 2.6, 8.8], [0.3, 0, 0], 9),
    cam([1.6, 0.9, 10], [0.8, 0, -0.6], 5),
    cam([0, 0.5, 15.5], [0, 0, 0], 0, narrow ? 0 : -8),
    cam([-1.6, 0.6, 9.4], [0.3, 0.1, -0.4], 8.5),
    cam([0, 0.5, 12], [centre, 0, 0.2], 5),
    cam([0.6, 0.5, narrow ? 13.5 : 10.5], [pileX - 0.6, 0, 0], 6, narrow ? -6 : 0),
  ];
}

/**
 * Scroll position (in stages, 0 .. STAGE_COUNT - 1) → the stage on screen, plus a
 * small lean (at most 10%) toward the neighbour it is approaching, which starts
 * once the scroll is 30% of a slot away from the stage's rest point.
 */
export const LEAN_MAX = 0.1;
const LEAN_FROM = 0.3;

export function stageFromProgress(progress: number, count = STAGE_COUNT) {
  const clamped = Math.min(Math.max(Number.isFinite(progress) ? progress : 0, 0), count - 1);
  const stage = Math.round(clamped);
  const offset = clamped - stage;
  const toward = offset > 0 ? Math.min(stage + 1, count - 1) : offset < 0 ? stage - 1 : stage;
  const share = Math.max(0, (Math.abs(offset) - LEAN_FROM) / (0.5 - LEAN_FROM));
  return { stage, toward, lean: toward === stage ? 0 : Math.min(share, 1) * LEAN_MAX };
}

export function mixPose(a: Pose, b: Pose, t: number): Pose {
  if (t <= 0) return a;
  return {
    x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t),
    rx: lerp(a.rx, b.rx, t), ry: lerp(a.ry, b.ry, t), rz: lerp(a.rz, b.rz, t),
    sx: lerp(a.sx, b.sx, t), sy: lerp(a.sy, b.sy, t), o: lerp(a.o, b.o, t), d: lerp(a.d, b.d, t),
  };
}

export function mixCamera(a: Camera, b: Camera, t: number): Camera {
  if (t <= 0) return a;
  return {
    tx: lerp(a.tx, b.tx, t), ty: lerp(a.ty, b.ty, t), tz: lerp(a.tz, b.tz, t),
    dist: lerp(a.dist, b.dist, t), pitch: lerp(a.pitch, b.pitch, t), yaw: lerp(a.yaw, b.yaw, t),
    shiftX: lerp(a.shiftX, b.shiftX, t), shiftY: lerp(a.shiftY, b.shiftY, t),
  };
}

const n = (value: number) => Number(value.toFixed(3));
const u = (value: number) => `calc(${n(value)} * var(--u))`;

export function poseTransform(pose: Pose): string {
  return (
    `translate3d(${u(pose.x)}, ${u(-pose.y)}, ${u(pose.z)}) ` +
    `rotateY(${n(pose.ry)}deg) rotateX(${n(pose.rx)}deg) rotateZ(${n(pose.rz)}deg) ` +
    `scale(${n(pose.sx)}, ${n(pose.sy)})`
  );
}

/** A label faces the camera: it undoes the camera's turn. */
export function labelTransform(anchor: Pose, camera: Camera): string {
  return (
    `translate3d(${u(anchor.x)}, ${u(-anchor.y)}, ${u(anchor.z)}) ` +
    `rotateY(${n(camera.yaw)}deg) rotateX(${n(camera.pitch)}deg)`
  );
}

export function cameraTransform(camera: Camera): string {
  return (
    `translate(${n(camera.shiftX)}%, ${n(camera.shiftY)}%) ` +
    `translateZ(${u(PERSPECTIVE - camera.dist)}) ` +
    `rotateX(${n(-camera.pitch)}deg) rotateY(${n(-camera.yaw)}deg) ` +
    `translate3d(${u(-camera.tx)}, ${u(camera.ty)}, ${u(-camera.tz)})`
  );
}

export function labelVisible(label: SceneLabel, stage: number, layout: SceneLayout): boolean {
  if (label.wideOnly && layout !== "wide") return false;
  const from = S[label.from];
  const to = S[label.to ?? label.from];
  return stage >= from && stage <= to;
}
