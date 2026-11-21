import type { AppDictionary } from "../../i18n/types";
import { BRICK, PAPER, SHEET, TILE_RATIO, type Thing, type Vec3 } from "./scene-model";
import { LIVE_URL, versionSections, type SceneCv, type SceneCvVersionKey } from "./scene-cv";
import styles from "../../landing.module.css";

/** px per scene unit inside the world element */
export const K = 100;
export const FORMATS = ["PDF", "YAML", "TXT"];
const TILE_WIDTH = 2;

/* element sizes in px; a box's transform maps them onto the size the model gives. Printed faces are
   laid out at twice the world scale so their text stays sharp when the camera comes close. */
const SHARP = 2;
export const BASE: Record<Thing["kind"], Vec3> = {
  card: [SHEET[0] * K * SHARP, SHEET[1] * K * SHARP, BRICK[2] * K],
  pick: [BRICK[0] * K, BRICK[1] * K, BRICK[2] * K],
  sheet: [PAPER[0] * K * SHARP, PAPER[1] * K * SHARP, PAPER[2] * K],
  snap: [PAPER[0] * K * SHARP, PAPER[1] * K * SHARP, PAPER[2] * K],
  tile: [TILE_WIDTH * K * SHARP, TILE_WIDTH * TILE_RATIO * K * SHARP, 3],
  frame: [PAPER[0] * 1.12 * K * SHARP, PAPER[1] * 1.165 * K * SHARP, 2],
  format: [110 * SHARP, 52 * SHARP, 3],
};
/* the depth of a card element is a brick's; its size scales it down to a sheet's thinness */
export const DEPTH_OF: Record<Thing["kind"], number> = { card: 0.22, pick: 0.22, sheet: 0.03, snap: 0.03, tile: 0.03, frame: 0.02, format: 0.03 };
/* faces of a box and their normals in the box's own axes (front is +z) */
export const FACES: Array<{ name: string; normal: Vec3 }> = [
  { name: "front", normal: [0, 0, 1] },
  { name: "back", normal: [0, 0, -1] },
  { name: "right", normal: [1, 0, 0] },
  { name: "left", normal: [-1, 0, 0] },
  { name: "top", normal: [0, 1, 0] },
  { name: "bottom", normal: [0, -1, 0] },
];

/* the DOM for one box of the scene; all poses are written by the frame loop, never rendered */
export function SceneBox({
  thing,
  cv,
  feature,
}: {
  thing: Pick<Thing, "key" | "kind" | "tone" | "index" | "face">;
  cv: SceneCv;
  feature?: AppDictionary["landing"]["features"]["items"][number];
}) {
  const solid = thing.kind === "card" || thing.kind === "pick";
  /* thin boxes never turn their back far enough to show it: one face, half the layer memory */
  const faces = solid ? FACES : FACES.slice(0, 1);
  const front = (() => {
    if (thing.face === "doc") return <DocFace />;
    if (thing.face === "fe" || thing.face === "pf" || thing.face === "ai") return <CvFace cv={cv} version={thing.face} />;
    if (thing.face === "web") return <WebFace />;
    if (thing.face === "tile" && feature) return <TileFace feature={feature} />;
    if (thing.face === "format") return <span className={styles.formatFace}>{FORMATS[thing.index]}</span>;
    return null;
  })();
  return (
    <div
      className={styles.box}
      data-obj={thing.key}
      data-kind={thing.kind}
      data-tone={thing.tone}
      data-tile={thing.kind === "tile" ? thing.index : undefined}
    >
      {faces.map(({ name }) => (
        <div key={name} className={styles.face} data-face={name}>
          {thing.kind === "card" || thing.kind === "pick" || thing.kind === "sheet" || thing.kind === "snap" ? (
            <>
              <i className={styles.layerSlab} />
              <i className={styles.layerSel} />
            </>
          ) : null}
          {name === "front" || name === "back" ? <div className={styles.layerPaper}>{name === "front" ? front : null}</div> : null}
          {solid || thing.kind === "tile" ? (
            <>
              <i className={styles.layerEdge} />
              <i className={styles.layerEdgeSel} />
            </>
          ) : null}
          <i className={styles.layerLight} />
          <i className={styles.layerFog} />
        </div>
      ))}
      {thing.kind === "frame" ? <i className={styles.trace} /> : null}
    </div>
  );
}

/* What is printed on the faces of the scene's boxes, as real DOM text (the mockup paints the same onto textures). */

/** an anonymous CV file: a name bar, a subtitle and lines of grey text */
export function DocFace() {
  return (
    <div className={styles.doc}>
      <i />
      <i />
      {Array.from({ length: 15 }, (_, line) => (
        <i key={line} />
      ))}
    </div>
  );
}

/** a real CV: the entries one LiveCV picked from the base */
export function CvFace({ cv, version }: { cv: SceneCv; version: SceneCvVersionKey }) {
  return (
    <div className={styles.cv}>
      <b className={styles.cvName}>{cv.name}</b>
      <span className={styles.cvRole}>{cv.versions[version].title}</span>
      <span className={styles.cvContact}>{cv.contact}</span>
      {versionSections(cv, version).map((section) => (
        <div key={section.type} className={styles.cvSection} data-type={section.type}>
          <span className={styles.cvHeading}>{section.heading}</span>
          {section.entries.map((entry) => (
            <div key={entry.id} className={styles.cvEntry}>
              <span className={styles.cvTitle}>
                <span>{entry.title}</span>
                {entry.when ? <span className={styles.cvWhen}>{entry.when}</span> : null}
              </span>
              {entry.org ? <span className={styles.cvOrg}>{entry.org}</span> : null}
              {entry.line ? <span className={styles.cvLine}>{entry.line}</span> : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** a browser window with an address bar; the CV sheet sits in front of its page area */
export function WebFace() {
  return (
    <div className={styles.web}>
      <div className={styles.webBar}>
        <i />
        <i />
        <i />
        <span className={styles.webUrl}>{LIVE_URL}</span>
      </div>
    </div>
  );
}

/** one feature as on its card: tag, chip, title and the first line of the description */
export function TileFace({ feature }: { feature: AppDictionary["landing"]["features"]["items"][number] }) {
  return (
    <div className={styles.tileFace}>
      <span className={styles.tileTag}>{feature.tag}</span>
      <span className={styles.tileChip}>{feature.chip}</span>
      <b className={styles.tileTitle}>{feature.title}</b>
      <span className={styles.tileAbout}>{feature.description}</span>
    </div>
  );
}
