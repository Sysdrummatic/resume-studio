"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import Link from "../localized-link";
import RotatingWord from "../rotating-word";
import type { AppDictionary } from "../../i18n/types";
import {
  AT,
  INTRO_SECONDS,
  LAST_SLOT,
  STAGE_COUNT,
  applyMotion,
  airSway,
  buildLabels,
  buildScene,
  clamp,
  distanceFrom,
  faceLight,
  feelAir,
  fogAt,
  follow,
  matrix3d,
  objectMatrix,
  placeBrowserFrame,
  samplePose,
  smooth,
  targetFor,
  toScreen,
  viewAt,
  worldMatrix,
  type Clock,
  type LabelSpec,
  type Scene,
  type Thing,
  type Vec3,
  type View,
} from "./scene-model";
import { LIVE_URL, versionPath, type SceneCv } from "./scene-cv";
import { BASE, DEPTH_OF, FACES, FORMATS, K, SceneBox } from "./scene-faces";
import styles from "../../landing.module.css";

type Landing = AppDictionary["landing"];
type Props = Pick<Landing, "hero" | "story" | "features" | "cta"> & { cv: SceneCv };

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const COARSE_QUERY = "(pointer: coarse)";
const FILES = ["CV_final.pdf", "CV_EN_2024.docx", "CV_frontend.pdf", "CV_final_v2.pdf"];
const CAPTION_TRAVEL = 46;
const FLOOR_Y = -3.6;


type Layout = "wide" | "stacked" | "side";

function layoutFor(width: number, height: number): Layout {
  if (window.innerWidth <= 767 && width < height) return "stacked";
  if (window.innerHeight <= 500 && width >= height && (window.innerWidth <= 767 || window.matchMedia(COARSE_QUERY).matches)) {
    return "side";
  }
  return "wide";
}


/* the floor: the mockup's grid of lines, laid flat under the scene */
const GRID_LINES = Array.from({ length: 25 }, (_, i) => -24 + i * 2);
/* dust: seeded, so the server and the client place it the same way */
const DUST = (() => {
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: 70 }, () => ({
    x: (random() - 0.5) * 30,
    y: (random() - 0.5) * 16,
    z: (random() - 0.5) * 26 - 4,
    size: 0.4 + random() * 1.2,
  }));
})();

export default function LandingStory({ hero, story, features, cta, cv }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [openFeature, setOpenFeature] = useState<number | null>(null);
  const openRef = useRef<number | null>(null);
  const featureCount = features.items.length;
  const captions = useMemo(
    () => [{ id: "start", label: story.start_label }, ...story.stages.map(({ id, label }) => ({ id, label }))],
    [story],
  );
  /* the server renders the desktop scene; phones hide what their scene leaves out */
  const superset = useMemo(() => buildScene(false, false, featureCount), [featureCount]);
  const labels = useMemo(() => buildLabels(false), []);
  const picked = superset.picks.length;
  const total = superset.cards.length;

  const labelContent: Record<string, ReactNode> = {
    "file-0": FILES[0],
    "file-1": FILES[1],
    "file-3": FILES[2],
    "file-4": FILES[3],
    base: <b>{story.scene.base}</b>,
    picked: (
      <>
        <b>{story.scene.picked.replace("{count}", String(picked)).replace("{total}", String(total))}</b>
        {story.scene.picked_note}
      </>
    ),
    "version-0": (
      <>
        <b>{versionPath("fe")}</b>PL, EN
      </>
    ),
    "version-1": (
      <>
        <b>{versionPath("pf")}</b>EN
      </>
    ),
    "version-2": (
      <>
        <b>{versionPath("ai")}</b>PL
      </>
    ),
    "snapshot-3": (
      <>
        <b>{story.scene.snapshots[0]}</b>
        {story.scene.published}
      </>
    ),
    "snapshot-2": (
      <>
        <b>{story.scene.snapshots[1]}</b>
        {story.scene.saved}
      </>
    ),
    "snapshot-1": (
      <>
        <b>{story.scene.snapshots[2]}</b>
        {story.scene.saved}
      </>
    ),
    url: LIVE_URL,
  };

  const scrollToStage = useCallback((stage: number) => {
    const root = rootRef.current;
    const slot = root?.querySelectorAll<HTMLElement>("[data-slot]")[stage];
    const stageRoot = root?.querySelector<HTMLElement>("[data-stage-root]");
    if (!root || !slot || !stageRoot) return;
    const stickyTop = parseFloat(getComputedStyle(stageRoot).top) || 0;
    const top = root.getBoundingClientRect().top + window.scrollY + slot.offsetTop - stickyTop;
    window.scrollTo({ top, behavior: window.matchMedia(REDUCED_QUERY).matches ? "auto" : "smooth" });
  }, []);

  useEffect(() => {
    openRef.current = openFeature;
  }, [openFeature]);

  /*
   * The frame loop (ADR 0026, amended for #290): scroll picks the stage, the timeline position
   * follows it over ~600ms, and every frame poses the scene there exactly as the mockup does.
   * The loop sleeps once a stage has settled and nothing restless is on screen, off screen,
   * and on a hidden tab. Only transform and opacity are written.
   */
  useEffect(() => {
    const root = rootRef.current;
    const stageEl = root?.querySelector<HTMLElement>("[data-stage-root]");
    const lens = root?.querySelector<HTMLElement>("[data-lens]");
    const world = root?.querySelector<HTMLElement>("[data-world]");
    const card = root?.querySelector<HTMLElement>("[data-feature-card]");
    const nextEl = root?.querySelector<HTMLElement>("[data-next]");
    const railEl = root?.querySelector<HTMLElement>("[data-rail]");
    if (!root || !stageEl || !lens || !world || !card || !nextEl || !railEl) return;

    type Box = { el: HTMLElement; faces: Array<{ el: HTMLElement; normal: Vec3; light: string }>; last: Record<string, string> };
    const boxes = new Map<string, Box>();
    root.querySelectorAll<HTMLElement>("[data-obj]").forEach((el) => {
      const faces = [...el.querySelectorAll<HTMLElement>("[data-face]")].map((face) => ({
        el: face,
        normal: FACES.find((f) => f.name === face.dataset.face)?.normal ?? ([0, 0, 1] as Vec3),
        light: "",
      }));
      boxes.set(el.dataset.obj as string, { el, faces, last: {} });
    });
    const labelEls = new Map<string, HTMLElement>();
    root.querySelectorAll<HTMLElement>("[data-label]").forEach((el) => labelEls.set(el.dataset.label as string, el));
    const captionEls = [...root.querySelectorAll<HTMLElement>("[data-caption]")];
    const dustEls = [...root.querySelectorAll<HTMLElement>("[data-dust]")];

    /* the static parts of the world: the floor grid and the dust */
    root.querySelectorAll<HTMLElement>("[data-grid-x]").forEach((el) => {
      el.style.transform = `translate3d(${Number(el.dataset.gridX) * K}px, ${-FLOOR_Y * K}px, ${-8 * K}px) rotateX(90deg)`;
    });
    root.querySelectorAll<HTMLElement>("[data-grid-z]").forEach((el) => {
      el.style.transform = `translate3d(0px, ${-FLOOR_Y * K}px, ${(Number(el.dataset.gridZ) * 0.9 - 8) * K}px) rotateX(90deg)`;
    });
    dustEls.forEach((el) => {
      const dot = DUST[Number(el.dataset.dust)];
      el.style.transform = `translate3d(${dot.x * K}px, ${-dot.y * K}px, ${dot.z * K}px) scale(${dot.size.toFixed(2)})`;
      el.style.animationDuration = `${(40 / (0.2 + dot.size * 0.25)).toFixed(1)}s`;
      el.style.animationDelay = `${(-dot.size * 37).toFixed(1)}s`;
    });

    const reduced = window.matchMedia(REDUCED_QUERY);
    const clock: Clock = { time: 0, intro: 1, progress: 0, orbitFlow: 1 };
    let scene: Scene = superset;
    let sceneLabels: LabelSpec[] = labels;
    let layout: Layout = "wide";
    let width = 0;
    let height = 0;
    let target = 0;
    let frame = 0;
    let last = 0;
    let running = false;
    let inView = true;
    let shownStage = -1;
    let hovered = -1;
    let trace = "";
    let skipping = false;
    let fade = 0;
    const pointer = { x: 0, y: 0 };
    const gaze = { x: 0, y: 0 };

    const fixed = (value: number) => String(Number(value.toFixed(3)));
    const set = (box: Box, name: string, value: string) => {
      if (box.last[name] === value) return;
      box.last[name] = value;
      if (name === "transform") box.el.style.transform = value;
      else if (name === "opacity") box.el.style.opacity = value;
      else box.el.style.setProperty(name, value);
    };

    /* sizes, layout and, on an upright phone, the band above the text the scene is drawn into */
    function fit() {
      const stageWidth = stageEl!.clientWidth;
      const stageHeight = stageEl!.clientHeight;
      if (!stageWidth || !stageHeight) return false;
      const nextLayout = layoutFor(stageWidth, stageHeight);
      let top = 0;
      let bandHeight = stageHeight;
      if (nextLayout === "stacked") {
        const reach = Math.max(...captionEls.map((el) => el.offsetHeight + (parseFloat(getComputedStyle(el).bottom) || 0)));
        top = railEl!.offsetTop + railEl!.offsetHeight + 6;
        bandHeight = Math.max(140, stageHeight - reach - 14 - top);
        stageEl!.style.setProperty("--veil", `${Math.round(reach + 10)}px`);
      }
      if (width !== stageWidth || height !== bandHeight) {
        lens!.style.top = `${top}px`;
        lens!.style.height = `${bandHeight}px`;
      }
      const narrow = stageWidth / bandHeight < 0.8;
      const lite = nextLayout !== "wide";
      if (narrow !== scene.narrow || lite !== scene.lite) {
        scene = buildScene(narrow, lite, featureCount);
        sceneLabels = buildLabels(lite);
        const keys = new Set(scene.things.map((thing) => thing.key));
        boxes.forEach((box, key) => {
          box.el.hidden = !keys.has(key);
          box.last = {};
        });
      }
      if (nextLayout !== layout) {
        layout = nextLayout;
        stageEl!.dataset.layout = layout;
      }
      width = stageWidth;
      height = bandHeight;
      return true;
    }

    function measureTarget() {
      const slots = root!.querySelectorAll<HTMLElement>("[data-slot]");
      const slotHeight = slots.length > 1 ? slots[1].offsetTop - slots[0].offsetTop : window.innerHeight;
      const stickyTop = parseFloat(getComputedStyle(stageEl!).top) || 0;
      return targetFor((stickyTop - root!.getBoundingClientRect().top) / Math.max(1, slotHeight));
    }

    function paintThing(thing: Thing, view: View) {
      const box = boxes.get(thing.key);
      if (!box) return;
      const pose = thing.pose;
      const visible = pose.alpha > 0.012;
      set(box, "opacity", visible ? fixed(pose.alpha) : "0");
      if (!visible) return;
      const size: Vec3 = [pose.size[0], pose.size[1], pose.size[2]];
      const base: Vec3 = [BASE[thing.kind][0], BASE[thing.kind][1], DEPTH_OF[thing.kind] * K];
      set(box, "transform", matrix3d(objectMatrix({ ...pose, size }, base, K, airSway(thing))));
      const lit = thing.kind === "tile" && (thing.index === hovered || thing.index === openRef.current);
      set(box, "--sel", fixed(pose.selected));
      set(box, "--paper", fixed(pose.texture));
      set(box, "--edge", fixed(lit ? 1 : pose.edges));
      set(box, "--fog", fixed(fogAt(view, pose.position, pose.dim, thing.haze)));
      box.faces.forEach((face) => {
        const shade = fixed(clamp((1 - faceLight(pose, face.normal)) * 0.75));
        if (face.light !== shade) {
          face.light = shade;
          face.el.style.setProperty("--light", shade);
        }
      });
    }

    function render(dt: number) {
      if (!fit()) return;
      clock.time += dt;
      const view = viewAt(scene, clock.progress, width, height, gaze, layout === "stacked");
      lens!.style.perspective = `${view.focal.toFixed(1)}px`;
      lens!.style.transform = `translate(${(view.shiftX * width * 0.5).toFixed(1)}px, ${(-view.shiftY * height * 0.5).toFixed(1)}px)`;
      world!.style.transform = matrix3d(worldMatrix(view, K));
      const held = hovered >= 0 || openRef.current !== null;
      clock.orbitFlow += ((held ? 0 : 1) - clock.orbitFlow) * (1 - Math.exp(-dt * 9));
      scene.things.forEach((thing) => {
        if (thing.kind === "frame") return;
        samplePose(thing, clock.progress);
        applyMotion(thing, dt, clock);
        if (thing.sheet) feelAir(thing, dt);
      });
      const nextTrace = placeBrowserFrame(scene, clock.progress);
      if (nextTrace !== trace) {
        trace = nextTrace;
        boxes.get("frame")?.el.setAttribute("data-trace", trace);
      }
      scene.things.forEach((thing) => paintThing(thing, view));
      dustEls.forEach((el) => {
        const dot = DUST[Number(el.dataset.dust)];
        const opacity = fixed(0.7 * (1 - fogAt(view, [dot.x, dot.y, dot.z], 1, 1)));
        if (el.dataset.o !== opacity) {
          el.dataset.o = opacity;
          el.style.opacity = opacity;
        }
      });

      /* labels: a point beside an object, projected to the screen every frame */
      sceneLabels.forEach((label) => {
        const el = labelEls.get(label.key);
        const thing = scene[label.on[0]][label.on[1]];
        if (!el) return;
        if (!thing) {
          el.style.opacity = "0";
          return;
        }
        const pose = thing.pose;
        const yaw = pose.rotation[1];
        const [dx, dy, dz] = label.offset;
        const point = toScreen(
          view, width, height,
          pose.position[0] + dx * Math.cos(yaw) + dz * Math.sin(yaw),
          pose.position[1] + dy,
          pose.position[2] - dx * Math.sin(yaw) + dz * Math.cos(yaw),
        );
        const opacity =
          !point || (label.wideOnly && scene.lite)
            ? 0
            : clamp(1 - distanceFrom(clock.progress, label.from, label.to) * 2.6) * clamp(pose.alpha * 1.6);
        el.style.opacity = fixed(opacity);
        if (opacity && point) {
          /* the labels sit inside the lens, which already carries the lens shift */
          let x = point[0] - view.shiftX * width * 0.5;
          if (scene.lite) {
            /* a phone keeps every label inside the screen */
            const w = el.offsetWidth;
            const share = label.anchor === "end" ? -1 : label.anchor === "above" || label.anchor === "middle" ? -0.5 : 0;
            const left = x + w * share;
            x += Math.max(0, 8 - left) - Math.max(0, left + w - (width - 8));
          }
          el.style.transform = `translate3d(${x.toFixed(1)}px, ${(point[1] + view.shiftY * height * 0.5).toFixed(1)}px, 0)`;
        }
      });

      /* the open feature card grows out of its tile and stays on it */
      const open = openRef.current;
      const tile = open === null ? undefined : scene.tiles[open];
      if (tile) {
        const centre = toScreen(view, width, height, ...tile.pose.position);
        if (centre) {
          const left = clamp(centre[0] - card!.offsetWidth / 2, 16, width - card!.offsetWidth - 16);
          const top = clamp(centre[1] - card!.offsetHeight / 2, 16, height - card!.offsetHeight - 16);
          card!.style.translate = `${left.toFixed(1)}px ${top.toFixed(1)}px`;
        }
      }

      /* captions fade and travel with the timeline; the first waits for the opening vortex */
      const settled = smooth((clock.intro - 0.35) / 0.45);
      captionEls.forEach((el, index) => {
        const opacity = clamp(1 - distanceFrom(clock.progress, index) * 2.3) * (index === 0 ? settled : 1);
        el.style.opacity = fixed(opacity);
        el.style.transform = reduced.matches ? "" : `translate3d(0, ${((index - clock.progress) * CAPTION_TRAVEL).toFixed(1)}px, 0)`;
        el.style.pointerEvents = opacity > 0.5 ? "auto" : "none";
      });
      nextEl!.style.opacity = fixed(settled);
      const stage = Math.round(clock.progress);
      if (stage !== shownStage) {
        shownStage = stage;
        stageEl!.dataset.stage = String(stage);
        setActive(stage);
        if (stage !== AT.feats) setOpenFeature(null);
      }
    }

    /* motion that keeps going while a stage rests: drift, orbits, the vortex, the air settling */
    function restless() {
      const stage = Math.round(clock.progress);
      const airMoving = scene.things.some((thing) => Math.abs(thing.airSpeed[0]) + Math.abs(thing.airSpeed[1]) + Math.abs(thing.airSpeed[2]) > 0.002);
      return (
        clock.progress !== target ||
        clock.intro < 1 ||
        stage === AT.start ||
        stage === AT.livecv ||
        stage === AT.feats ||
        airMoving ||
        Math.abs(gaze.x - pointer.x) + Math.abs(gaze.y - pointer.y) > 0.001
      );
    }

    function tick(now: number) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      target = measureTarget();
      if (!skipping && Math.abs(target - clock.progress) > 1.5) {
        /* a fast scroll goes straight to its stage: a quick fade instead of a trip through every stage between */
        skipping = true;
        lens!.style.opacity = "0";
        window.setTimeout(() => {
          clock.progress = target - Math.sign(target - clock.progress) * 0.35;
          lens!.style.opacity = "";
          skipping = false;
        }, 160);
      }
      if (!skipping) clock.progress = follow(clock.progress, target, dt);
      clock.intro = clamp(clock.intro + dt / INTRO_SECONDS);
      gaze.x += (pointer.x - gaze.x) * 0.05;
      gaze.y += (pointer.y - gaze.y) * 0.05;
      render(dt);
      if (restless() || skipping) frame = window.requestAnimationFrame(tick);
      else running = false;
    }

    /* reduced motion: a static frame per stage and a crossfade between them */
    function stillFrame(force = false) {
      const next = Math.round(measureTarget());
      if (!force && next === clock.progress && shownStage >= 0) return;
      window.clearTimeout(fade);
      lens!.style.opacity = "0";
      fade = window.setTimeout(() => {
        clock.progress = next;
        clock.intro = 1;
        render(0);
        lens!.style.opacity = "";
      }, shownStage < 0 ? 0 : 200);
    }

    function wake() {
      if (!inView || document.hidden) return;
      if (reduced.matches) {
        stillFrame();
        return;
      }
      if (running) return;
      running = true;
      last = performance.now();
      frame = window.requestAnimationFrame(tick);
    }

    /* the CSS loops (dust, traced outlines) idle with the frame loop: off screen and on a hidden tab */
    const idle = () => {
      stageEl.dataset.idle = inView && !document.hidden ? "run" : "paused";
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      idle();
      if (inView) wake();
      else {
        running = false;
        window.cancelAnimationFrame(frame);
      }
    });
    observer.observe(stageEl);

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const rect = stageEl.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / rect.width - 0.5;
      pointer.y = (event.clientY - rect.top) / rect.height - 0.5;
      const tileEl = (event.target as HTMLElement).closest<HTMLElement>("[data-tile]");
      hovered = tileEl && stageEl.dataset.stage === String(AT.feats) ? Number(tileEl.dataset.tile) : -1;
      stageEl.dataset.pointing = hovered >= 0 ? "tile" : "";
      wake();
    };
    const onPointerLeave = () => {
      pointer.x = 0;
      pointer.y = 0;
      hovered = -1;
      wake();
    };
    const onVisibility = () => {
      idle();
      if (document.hidden) running = false;
      else wake();
    };
    const onLayout = () => {
      if (reduced.matches) stillFrame(true);
      else {
        render(0);
        wake();
      }
    };

    fit();
    target = measureTarget();
    clock.progress = Math.round(target * 1000) / 1000;
    clock.intro = reduced.matches || clock.progress > 0.5 ? 1 : 0;
    render(0);
    stageEl.dataset.ready = "";
    wake();

    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", onLayout, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    stageEl.addEventListener("pointermove", onPointerMove, { passive: true });
    stageEl.addEventListener("pointerleave", onPointerLeave);
    reduced.addEventListener("change", onLayout);
    document.fonts?.ready.then(onLayout).catch(() => undefined);

    return () => {
      running = false;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(fade);
      observer.disconnect();
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", onLayout);
      document.removeEventListener("visibilitychange", onVisibility);
      stageEl.removeEventListener("pointermove", onPointerMove);
      stageEl.removeEventListener("pointerleave", onPointerLeave);
      reduced.removeEventListener("change", onLayout);
    };
  }, [featureCount, labels, superset]);

  useEffect(() => {
    if (openFeature === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenFeature(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openFeature]);

  const onSceneClick = (event: MouseEvent) => {
    const tile = (event.target as HTMLElement).closest<HTMLElement>("[data-tile]");
    setOpenFeature(tile ? Number(tile.dataset.tile) : null);
  };

  /* Keyboard and screen-reader users can reach any caption; reaching one brings its stage. */
  const onCaptionFocus = (stage: number) => {
    if (stage !== active) scrollToStage(stage);
  };

  const feature = openFeature === null ? null : features.items[openFeature];
  const cardId = "lp-feature-card";

  return (
    <section ref={rootRef} className={styles.story} aria-label={story.aria_label}>
      <div className={styles.stage} data-stage-root data-stage="0" data-layout="wide">
        <div className={styles.lens} data-lens data-crossfade aria-hidden="true">
          <div className={styles.world} data-world data-scene aria-hidden="true" onClick={onSceneClick}>
            {GRID_LINES.map((g) => (
              <i key={`x${g}`} className={styles.gridZ} data-grid-x={g} />
            ))}
            {GRID_LINES.map((g) => (
              <i key={`z${g}`} className={styles.gridX} data-grid-z={g} />
            ))}
            {DUST.map((_, index) => (
              <i key={index} className={styles.dust} data-dust={index} />
            ))}
            {superset.things.map((thing) => (
              <SceneBox key={thing.key} thing={thing} cv={cv} feature={thing.kind === "tile" ? features.items[thing.index] : undefined} />
            ))}
          </div>
          <div className={styles.labels}>
            {labels.map((label) => (
              <div
                key={label.key}
                className={`${styles.label} ${label.url ? styles.labelUrl : ""}`}
                data-label={label.key}
                data-anchor={label.anchor ?? "start"}
              >
                {labelContent[label.key]}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.captions}>
          {captions.map((caption, index) => {
            const onFocus = () => onCaptionFocus(index);
            if (caption.id === "start") {
              return (
                <article
                  key="start"
                  className={`${styles.caption} ${styles.captionStart}`}
                  data-caption
                  data-stage="start"
                  data-crossfade
                  onFocus={onFocus}
                >
                  <h1 className={styles.title}>
                    <span>{hero.title}</span>{" "}
                    <span>
                      {hero.title_prefix} <RotatingWord words={hero.rotating_words} paused={active !== 0} />
                    </span>{" "}
                    <span>{hero.title_suffix}</span>
                  </h1>
                  <p className={styles.lead}>{hero.lead}</p>
                  <div className={styles.actions}>
                    <Link href="/login?mode=signup" className={`${styles.button} ${styles.buttonPrimary}`}>
                      {hero.primary_action}
                    </Link>
                    <Link href="/resume" className={styles.button}>
                      {hero.secondary_action}
                    </Link>
                  </div>
                  <p className={styles.free}>{hero.free_note}</p>
                </article>
              );
            }
            const stage = story.stages[index - 1];
            return (
              <article key={stage.id} className={styles.caption} data-caption data-stage={stage.id} data-crossfade onFocus={onFocus}>
                <h2 className={styles.title}>{stage.title}</h2>
                <p className={styles.lead}>{stage.body}</p>
                {stage.id === "feats" ? (
                  <ul className={styles.featureList} aria-label={features.list_label}>
                    {features.items.map((item, featureIndex) => (
                      <li key={item.title}>
                        <button
                          type="button"
                          className={styles.featureButton}
                          data-feature={featureIndex}
                          aria-expanded={openFeature === featureIndex}
                          aria-controls={cardId}
                          onClick={() => setOpenFeature(openFeature === featureIndex ? null : featureIndex)}
                        >
                          <b>{item.title}</b>
                          <span>{item.chip}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {stage.id === "go" ? (
                  <>
                    <p className={styles.formats} aria-label={story.formats_label}>
                      {FORMATS.map((format) => (
                        <span key={format}>{format}</span>
                      ))}
                    </p>
                    <div className={styles.actions}>
                      <Link href="/login?mode=signup" className={`${styles.button} ${styles.buttonPrimary}`}>
                        {cta.primary_action}
                      </Link>
                    </div>
                    <p className={styles.free}>{hero.free_note}</p>
                  </>
                ) : null}
              </article>
            );
          })}
        </div>

        <article id={cardId} className={styles.featureCard} data-feature-card hidden={!feature} aria-live="polite">
          {feature ? (
            <>
              <button type="button" className={styles.iconButton} aria-label={features.close} onClick={() => setOpenFeature(null)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
              <p className={styles.tag}>{feature.tag}</p>
              <p className={styles.chip}>{feature.chip}</p>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </>
          ) : null}
        </article>

        <nav className={styles.rail} aria-label={story.rail_label} data-rail>
          <ol>
            {captions.map((caption, index) => (
              <li key={caption.id} className={index === active ? styles.railOn : undefined}>
                <button type="button" aria-current={index === active ? "step" : undefined} onClick={() => scrollToStage(index)}>
                  <span>{caption.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <button
          type="button"
          className={`${styles.next} ${active === LAST_SLOT ? styles.nextBack : ""}`}
          data-next
          onClick={() => scrollToStage(active === LAST_SLOT ? 0 : active + 1)}
        >
          <svg className={styles.nextRing} aria-hidden="true">
            <rect pathLength={1} />
          </svg>
          <span>{active === LAST_SLOT ? story.back : story.next}</span>
          <svg className={styles.nextIcon} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <button type="button" className={styles.faqButton} data-faq-open>
          {story.faq}
        </button>
      </div>
      {/* Scroll slots: one per stage. Snap points, and the distances the scroll position is measured in. */}
      {Array.from({ length: STAGE_COUNT }, (_, index) => (
        <span key={index} className={styles.slot} data-slot aria-hidden="true" />
      ))}
    </section>
  );
}
