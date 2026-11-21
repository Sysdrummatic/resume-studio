"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import Link from "../localized-link";
import RotatingWord from "../rotating-word";
import type { AppDictionary } from "../../i18n/types";
import {
  STAGE_COUNT,
  buildCameras,
  buildLabels,
  buildScene,
  cameraTransform,
  labelTransform,
  labelVisible,
  mixCamera,
  mixPose,
  poseTransform,
  stageFromProgress,
  type SceneLayout,
  type SceneObject,
} from "./scene-poses";
import styles from "../../landing.module.css";

type Landing = AppDictionary["landing"];
type Props = Pick<Landing, "hero" | "story" | "features" | "cta">;

/* Same conditions as the phone layouts in landing.module.css. */
const STACKED_QUERY = "(max-width: 767px)";
const SIDE_QUERY = "(orientation: landscape) and (max-height: 500px) and (pointer: coarse)";
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";
const TILT_MAX = 4;

/* Sample values a machine could read; the same in every language. */
const FILES = ["CV_final.pdf", "CV_EN_2024.docx", "CV_frontend.pdf", "CV_final_v2.pdf"];
const LIVE_URL = "opencivera.com/ariana-holt/fe7k2";
const VERSIONS = [
  { path: "/ariana-holt/fe7k2", languages: "PL, EN" },
  { path: "/ariana-holt/pm3x8", languages: "EN" },
  { path: "/ariana-holt/ds9q4", languages: "PL" },
];
const FORMATS = ["PDF", "YAML", "TXT"];

function readLayout(): SceneLayout {
  if (window.matchMedia(SIDE_QUERY).matches) return "side";
  return window.matchMedia(STACKED_QUERY).matches ? "stacked" : "wide";
}

/* Poses are written by the controller below, never rendered: the scene shows once it is posed. */
function SceneObjectView({ object, tile }: { object: SceneObject; tile?: Landing["features"]["items"][number] }) {
  const common = { "data-obj": object.key };

  switch (object.group) {
    case "card":
      return (
        <div {...common} className={`${styles.obj} ${styles.card}`} data-look={object.looks?.[0]}>
          <div className={styles.drift} data-drift>
            <div className={`${styles.face} ${styles.faceFile}`} />
            <div className={`${styles.face} ${styles.faceSlab}`} />
            <div className={`${styles.face} ${styles.facePicked}`} />
            <div className={styles.edge} />
            <div className={styles.shade} data-shade />
          </div>
        </div>
      );
    case "pick":
      return (
        <div {...common} className={`${styles.obj} ${styles.card} ${styles.pick}`} data-look="picked">
          <div className={`${styles.face} ${styles.facePicked}`} />
          <div className={styles.edge} />
        </div>
      );
    case "paper":
    case "snap":
      return (
        <div {...common} className={`${styles.obj} ${styles.paper}`} data-variant={object.key}>
          <div className={styles.paperHead}>
            <i />
            <i />
          </div>
          <div className={styles.paperRows}>
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <i key={row} />
            ))}
          </div>
          <div className={styles.shade} data-shade />
        </div>
      );
    case "format":
      return (
        <div {...common} className={`${styles.obj} ${styles.format}`}>
          {FORMATS[object.index]}
        </div>
      );
    case "frame":
      return (
        <div {...common} className={`${styles.obj} ${styles.frame}`}>
          <div className={styles.frameBar}>
            <i />
            <i />
            <i />
            <span className={styles.frameUrl}>
              <span>{LIVE_URL}</span>
              <span className={styles.frameCover} />
            </span>
          </div>
        </div>
      );
    case "tile":
      return (
        <div {...common} className={`${styles.obj} ${styles.tile}`} data-tile={object.index}>
          <div className={styles.tileFace}>
            <span className={styles.tileTag}>{tile?.tag}</span>
            <b>{tile?.title}</b>
            <span className={styles.tileChip}>{tile?.chip}</span>
          </div>
        </div>
      );
    default:
      return null;
  }
}

export default function LandingStory({ hero, story, features, cta }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [openFeature, setOpenFeature] = useState<number | null>(null);
  const featureCount = features.items.length;
  const captions = useMemo(
    () => [{ id: "start", label: story.start_label }, ...story.stages.map(({ id, label }) => ({ id, label }))],
    [story],
  );
  /* The server renders the desktop scene; phones hide what their layout leaves out. */
  const scene = useMemo(() => buildScene("wide", featureCount), [featureCount]);
  const labels = useMemo(() => buildLabels("wide"), []);
  const picked = scene.filter((object) => object.group === "pick").length;
  const total = scene.filter((object) => object.group === "card").length;

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
        <b>{VERSIONS[0].path}</b>
        {VERSIONS[0].languages}
      </>
    ),
    "version-1": (
      <>
        <b>{VERSIONS[1].path}</b>
        {VERSIONS[1].languages}
      </>
    ),
    "version-2": (
      <>
        <b>{VERSIONS[2].path}</b>
        {VERSIONS[2].languages}
      </>
    ),
    "snapshot-3": (
      <>
        <b>v3</b>
        {story.scene.published}
      </>
    ),
    "snapshot-2": (
      <>
        <b>v2</b>
        {story.scene.saved}
      </>
    ),
    "snapshot-1": (
      <>
        <b>v1</b>
        {story.scene.saved}
      </>
    ),
    url: LIVE_URL,
  };

  const scrollToStage = useCallback((stage: number, instant = false) => {
    const root = rootRef.current;
    const slots = root?.querySelectorAll<HTMLElement>("[data-slot]");
    const slot = slots?.[stage];
    if (!root || !slot) return;
    const stickyTop = parseFloat(getComputedStyle(root.querySelector("[data-stage-root]") as Element).top) || 0;
    const top = root.getBoundingClientRect().top + window.scrollY + slot.offsetTop - stickyTop;
    const reduce = window.matchMedia(REDUCED_QUERY).matches;
    window.scrollTo({ top, behavior: instant || reduce ? "auto" : "smooth" });
  }, []);

  /* The single source of truth: the scroll position picks the stage and the lean. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const stageRoot = root.querySelector<HTMLElement>("[data-stage-root]");
    const viewport = root.querySelector<HTMLElement>("[data-viewport]");
    const world = root.querySelector<HTMLElement>("[data-world]");
    const tilt = root.querySelector<HTMLElement>("[data-tilt]");
    if (!stageRoot || !viewport || !world || !tilt) return;

    const elements = new Map<string, HTMLElement>();
    root.querySelectorAll<HTMLElement>("[data-obj]").forEach((element) => {
      elements.set(element.dataset.obj as string, element);
    });
    const labelElements = new Map<string, HTMLElement>();
    root.querySelectorAll<HTMLElement>("[data-label]").forEach((element) => {
      labelElements.set(element.dataset.label as string, element);
    });

    const reduced = window.matchMedia(REDUCED_QUERY);
    let layout = readLayout();
    let objects = new Map<string, SceneObject>();
    let cameras = buildCameras(layout);
    let sceneLabels = buildLabels(layout);
    let current = -1;
    let frame = 0;
    let fade = 0;

    const rebuild = () => {
      layout = readLayout();
      stageRoot.dataset.layout = layout;
      objects = new Map(buildScene(layout, featureCount).map((object) => [object.key, object]));
      cameras = buildCameras(layout);
      sceneLabels = buildLabels(layout);
      elements.forEach((element, key) => {
        const object = objects.get(key);
        element.hidden = !object;
        if (!object) return;
        element.style.transitionDelay = `${object.delay}ms`;
        const drift = element.querySelector<HTMLElement>("[data-drift]");
        if (drift) drift.style.animationDelay = `${(object.index * -0.73).toFixed(2)}s`;
      });
    };

    const pose = (stage: number, toward: number, lean: number) => {
      const camera = mixCamera(cameras[stage], cameras[toward], lean);
      world.style.transform = cameraTransform(camera);
      objects.forEach((object, key) => {
        const element = elements.get(key);
        if (!element) return;
        const next = mixPose(object.poses[stage], object.poses[toward], lean);
        element.style.transform = poseTransform(next);
        element.style.opacity = String(Number(next.o.toFixed(3)));
        const shade = element.querySelector<HTMLElement>("[data-shade]");
        if (shade) shade.style.opacity = String(Number(next.d.toFixed(3)));
        if (object.looks) element.dataset.look = object.looks[stage];
      });
      sceneLabels.forEach((label) => {
        const element = labelElements.get(label.key);
        if (!element) return;
        element.style.transform = labelTransform(label.anchor, camera);
        element.style.opacity = labelVisible(label, stage, layout) ? "1" : "0";
      });
    };

    const measure = () => {
      const slots = root.querySelectorAll<HTMLElement>("[data-slot]");
      const slotHeight = slots.length > 1 ? slots[1].offsetTop - slots[0].offsetTop : window.innerHeight;
      const stickyTop = parseFloat(getComputedStyle(stageRoot).top) || 0;
      return (stickyTop - root.getBoundingClientRect().top) / Math.max(1, slotHeight);
    };

    const update = (force = false) => {
      frame = 0;
      const { stage, toward, lean } = stageFromProgress(measure(), STAGE_COUNT);
      const changed = stage !== current;
      if (changed) {
        current = stage;
        stageRoot.dataset.stage = String(stage);
        setActive(stage);
      }
      if (reduced.matches) {
        /* A static frame per stage and a crossfade between them. */
        if (!changed && !force) return;
        window.clearTimeout(fade);
        viewport.style.opacity = "0";
        fade = window.setTimeout(() => {
          pose(stage, stage, 0);
          viewport.style.opacity = "1";
        }, force ? 0 : 200);
        return;
      }
      pose(stage, toward, lean);
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(() => update());
    };
    const onLayout = () => {
      rebuild();
      update(true);
    };

    /* Idle loops (drifting files) run only while the story is on screen and the tab is visible. */
    let onScreen = true;
    const idle = () => {
      stageRoot.dataset.idle = onScreen && !document.hidden ? "run" : "paused";
    };
    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      idle();
    });
    observer.observe(stageRoot);

    /* A subtle tilt toward the pointer, desktop only. */
    const fine = window.matchMedia(FINE_POINTER_QUERY);
    let tiltFrame = 0;
    const onPointer = (event: PointerEvent) => {
      if (!fine.matches || reduced.matches || tiltFrame) return;
      tiltFrame = window.requestAnimationFrame(() => {
        tiltFrame = 0;
        const box = stageRoot.getBoundingClientRect();
        const dx = (event.clientX - box.left) / box.width - 0.5;
        const dy = (event.clientY - box.top) / box.height - 0.5;
        tilt.style.transform = `rotateX(${(-dy * 2 * TILT_MAX).toFixed(2)}deg) rotateY(${(dx * 2 * TILT_MAX).toFixed(2)}deg)`;
      });
    };
    const onPointerLeave = () => {
      tilt.style.transform = "";
    };

    const media = [window.matchMedia(STACKED_QUERY), window.matchMedia(SIDE_QUERY), reduced];
    rebuild();
    pose(0, 0, 0);
    update(true);
    viewport.style.opacity = "";
    /* Transitions switch on one frame after the first pose, so nothing flies in from the origin. */
    const ready = window.requestAnimationFrame(() => {
      stageRoot.dataset.ready = "";
    });
    idle();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    document.addEventListener("visibilitychange", idle);
    stageRoot.addEventListener("pointermove", onPointer, { passive: true });
    stageRoot.addEventListener("pointerleave", onPointerLeave);
    media.forEach((query) => query.addEventListener("change", onLayout));

    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(tiltFrame);
      window.cancelAnimationFrame(ready);
      window.clearTimeout(fade);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("visibilitychange", idle);
      stageRoot.removeEventListener("pointermove", onPointer);
      stageRoot.removeEventListener("pointerleave", onPointerLeave);
      media.forEach((query) => query.removeEventListener("change", onLayout));
    };
  }, [featureCount]);

  const featsStage = captions.findIndex((caption) => caption.id === "feats");
  const shownFeature = active === featsStage ? openFeature : null;

  useEffect(() => {
    if (shownFeature === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenFeature(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [shownFeature]);

  const onSceneClick = (event: MouseEvent) => {
    const tile = (event.target as HTMLElement).closest<HTMLElement>("[data-tile]");
    if (tile) setOpenFeature(Number(tile.dataset.tile));
  };

  /* Keyboard and screen-reader users can reach any caption; reaching one brings its stage. */
  const onCaptionFocus = (stage: number) => {
    if (stage !== active) scrollToStage(stage, true);
  };

  const last = STAGE_COUNT - 1;
  const feature = shownFeature === null ? null : features.items[shownFeature];
  const cardId = "lp-feature-card";

  return (
    <section ref={rootRef} className={styles.story} aria-label={story.aria_label}>
      <div className={styles.stage} data-stage-root data-stage="0" data-layout="wide" data-idle="run">
        <div className={styles.viewport} data-viewport data-crossfade aria-hidden="true">
          <div className={styles.tilt} data-tilt>
            <div className={styles.world} data-world data-scene aria-hidden="true" onClick={onSceneClick}>
              <div className={styles.floor} />
              {scene.map((object) => (
                <SceneObjectView
                  key={object.key}
                  object={object}
                  tile={object.group === "tile" ? features.items[object.index] : undefined}
                />
              ))}
              {labels.map((label) => (
                <div
                  key={label.key}
                  className={`${styles.label} ${label.key === "url" ? styles.labelUrl : ""}`}
                  data-label={label.key}
                >
                  {labelContent[label.key]}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.captions}>
          {captions.map((caption, index) => {
            const isActive = index === active;
            const className = `${styles.caption} ${isActive ? styles.captionOn : ""}`;
            const onFocus = () => onCaptionFocus(index);
            if (caption.id === "start") {
              return (
                <article key="start" className={`${className} ${styles.captionStart}`} data-stage="start" data-crossfade onFocus={onFocus}>
                  <h1 className={styles.title}>
                    <span>{hero.title}</span>{" "}
                    <span>
                      {hero.title_prefix} <RotatingWord words={hero.rotating_words} paused={!isActive} />
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
              <article key={stage.id} className={className} data-stage={stage.id} data-crossfade onFocus={onFocus}>
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
                          aria-expanded={shownFeature === featureIndex}
                          aria-controls={cardId}
                          onClick={() => setOpenFeature(shownFeature === featureIndex ? null : featureIndex)}
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

        <article id={cardId} className={styles.featureCard} hidden={!feature} aria-live="polite">
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

        <nav className={styles.rail} aria-label={story.rail_label}>
          <ol>
            {captions.map((caption, index) => (
              <li key={caption.id} className={index === active ? styles.railOn : undefined}>
                <button
                  type="button"
                  aria-current={index === active ? "step" : undefined}
                  onClick={() => scrollToStage(index)}
                >
                  <span>{caption.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <button
          type="button"
          className={`${styles.next} ${active === last ? styles.nextBack : ""}`}
          onClick={() => scrollToStage(active === last ? 0 : active + 1)}
        >
          <span>{active === last ? story.back : story.next}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <button type="button" className={styles.faqButton} data-faq-open>
          {story.faq}
        </button>
      </div>
      {/* Scroll slots: one per stage. Snap points, and the distances the scroll position is measured in. */}
      {captions.map((caption) => (
        <span key={caption.id} className={styles.slot} data-slot aria-hidden="true" />
      ))}
    </section>
  );
}
