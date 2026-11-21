"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  FIELD_OF_VIEW,
  SHEET,
  airSway,
  clamp,
  faceLight,
  feelAir,
  fogAt,
  lookAt,
  matrix3d,
  multiply,
  objectMatrix,
  perspective,
  type Thing,
  type Vec3,
  type View,
} from "./scene-model";
import { BASE, DEPTH_OF, FACES, K, SceneBox } from "./scene-faces";
import type { SceneCv } from "./scene-cv";
import styles from "../../landing.module.css";

/* The sheets of the start page in a small scene of their own (the mockup's "sheets in the air"). */
const COUNT = 10;
const EYE: Vec3 = [0, 0.6, 12.5];
const DIM = 0.62;
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function makeSheets(): Thing[] {
  return Array.from({ length: COUNT }, (_, i) => ({
    key: `ambient-${i}`,
    kind: "card" as const,
    index: i,
    face: i % 4 === 1 ? ("fe" as const) : ("doc" as const),
    tone: "file" as const,
    sheet: true,
    lag: 0,
    haze: 1,
    axis: [0, 0] as [number, number],
    introOrder: 0,
    keys: [],
    pose: {
      position: [0, 0, 0] as Vec3, rotation: [0, 0, 0] as Vec3, size: [...SHEET] as Vec3, alpha: 1, texture: 1, edges: 0,
      selected: 0, dim: DIM, swirl: 0, orbit: 0, behind: 0, drift: 0,
    },
    orbitAngle: 0,
    air: [0, 0, 0] as Vec3,
    airSpeed: [0, 0, 0] as Vec3,
  }));
}

/**
 * Loose CV sheets drifting slowly behind /login (epic #190, issue #290). Decorative only.
 * The loop sleeps on a hidden tab; reduced motion draws one still frame.
 */
export default function FloatingSheets({ cv }: { cv: SceneCv }) {
  const ref = useRef<HTMLDivElement>(null);
  const sheets = useMemo(() => makeSheets(), []);

  useEffect(() => {
    const root = ref.current;
    const lens = root?.querySelector<HTMLElement>("[data-lens]");
    const world = root?.querySelector<HTMLElement>("[data-world]");
    if (!root || !lens || !world) return;
    const boxes = sheets.map((sheet) => {
      const el = root.querySelector<HTMLElement>(`[data-obj="${sheet.key}"]`) as HTMLElement;
      return { el, faces: [...el.querySelectorAll<HTMLElement>("[data-face]")].map((face) => ({ el: face, normal: FACES.find((f) => f.name === face.dataset.face)!.normal })) };
    });
    const reduced = window.matchMedia(REDUCED_QUERY);
    let clock = 0;
    let last = 0;
    let frame = 0;

    function draw(dt: number) {
      const width = root!.clientWidth;
      const height = root!.clientHeight;
      if (!width || !height) return;
      clock += dt;
      const aspect = width / height;
      const wide = aspect > 1.1;
      const reach = Math.hypot(...EYE);
      const viewMatrix = lookAt(EYE, [0, 0, 0]);
      const view: View = {
        matrix: multiply(perspective(FIELD_OF_VIEW, aspect, 0.1, 120), viewMatrix),
        view: viewMatrix,
        eye: EYE,
        fogNear: reach * 0.8,
        fogFar: reach * 2.7,
        shiftX: 0,
        shiftY: 0,
        focal: height / 2 / Math.tan(FIELD_OF_VIEW / 2),
      };
      lens!.style.perspective = `${view.focal.toFixed(1)}px`;
      const toCss = [K, 0, 0, 0, 0, -K, 0, 0, 0, 0, K, 0, 0, 0, view.focal, 1];
      const fromCss = [1 / K, 0, 0, 0, 0, -1 / K, 0, 0, 0, 0, 1 / K, 0, 0, 0, 0, 1];
      world!.style.transform = matrix3d(multiply(toCss, multiply(viewMatrix, fromCss)));
      const centre = wide ? 1 : 0;
      sheets.forEach((sheet, i) => {
        const angle = i * 2.4 + clock * (i % 2 ? 0.1 : 0.07);
        const radius = (wide ? 1.9 : 1.1) + (i % 3) * 0.8;
        const pose = sheet.pose;
        pose.position = [
          centre + Math.sin(angle) * radius * 1.25,
          (((i * 37) % COUNT) / COUNT - 0.5) * 4.6 + Math.sin(clock * 0.5 + i) * 0.16,
          Math.cos(angle) * radius - 2,
        ];
        pose.rotation = [Math.sin(clock * 0.3 + i) * 0.08, Math.sin(angle) * 0.32, ((i % 5) - 2) * 0.06];
        feelAir(sheet, dt);
        const box = boxes[i];
        box.el.style.opacity = "1";
        box.el.style.transform = matrix3d(objectMatrix(pose, [BASE.card[0], BASE.card[1], DEPTH_OF.card * K], K, airSway(sheet)));
        box.el.style.setProperty("--paper", "1");
        box.el.style.setProperty("--fog", fogAt(view, pose.position, DIM, 1).toFixed(3));
        box.faces.forEach((face) => face.el.style.setProperty("--light", clamp((1 - faceLight(pose, face.normal)) * 0.75).toFixed(3)));
      });
    }

    function tick(now: number) {
      frame = 0;
      if (document.hidden) return;
      draw(Math.min(0.05, (now - last) / 1000));
      last = now;
      if (!reduced.matches) frame = window.requestAnimationFrame(tick);
    }
    function wake() {
      if (frame || document.hidden) return;
      last = performance.now();
      frame = window.requestAnimationFrame(tick);
    }

    wake();
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("resize", wake);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("resize", wake);
    };
  }, [sheets]);

  return (
    <div ref={ref} className={styles.ambient} aria-hidden="true">
      <div className={styles.ambientLens} data-lens>
        <div className={styles.world} data-world>
          {sheets.map((sheet) => (
            <SceneBox key={sheet.key} thing={sheet} cv={cv} />
          ))}
        </div>
      </div>
    </div>
  );
}
