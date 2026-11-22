"use client";

import { useEffect, useRef } from "react";
import styles from "../../landing.module.css";
import { LIVE_URL } from "./scene-cv";

/* a computer can enlarge its window; a phone in landscape already has its own layout */
const SHORT_SCREEN_QUERY = "(max-height: 560px) and (pointer: fine)";
const LINES = 10;

type Props = {
  copy: { title: string; text: string; action: string };
  name: string;
  /** the visitor chose the simplified version over enlarging the window */
  onSimplify: () => void;
};

/**
 * Full screen over the landing while the window is too short for the story. It opens and closes
 * with the window height; once dismissed (button or Esc) it stays closed until the page reloads.
 */
export default function ShortWindowScreen({ copy, name, onSimplify }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const dismissed = useRef(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const query = window.matchMedia(SHORT_SCREEN_QUERY);
    const sync = () => {
      if (query.matches && !dismissed.current && !dialog.open) dialog.showModal();
      if (!query.matches && dialog.open) dialog.close();
    };
    /* Esc closes the screen the same way as its button: into the simplified version */
    const dismiss = () => {
      dismissed.current = true;
      onSimplify();
    };
    sync();
    query.addEventListener("change", sync);
    dialog.addEventListener("cancel", dismiss);
    return () => {
      query.removeEventListener("change", sync);
      dialog.removeEventListener("cancel", dismiss);
    };
  }, [onSimplify]);

  const close = () => {
    dismissed.current = true;
    ref.current?.close();
    onSimplify();
  };

  return (
    <dialog ref={ref} className={styles.shortScreen} aria-labelledby="short-screen-title">
      <div className={styles.shortScreenArt} aria-hidden="true">
        <div className={styles.shortScreenWindow}>
          <span className={styles.shortScreenTrace} />
          <div className={styles.shortScreenBar}>
            <i />
            <i />
            <i />
            <span>{LIVE_URL}</span>
          </div>
          <div className={styles.shortScreenView}>
            <div className={`ocv-paper ${styles.shortScreenSheet}`}>
              <b>{name}</b>
              {Array.from({ length: LINES }, (_, index) => (
                <span key={index} />
              ))}
            </div>
          </div>
        </div>
        <div className={styles.shortScreenMeasure}>
          <span>560 px</span>
        </div>
      </div>
      <div className={styles.shortScreenCopy}>
        <h2 id="short-screen-title">{copy.title}</h2>
        <p>{copy.text}</p>
        <button type="button" className={`${styles.button} ${styles.buttonPrimary}`} onClick={close}>
          {copy.action}
        </button>
      </div>
    </dialog>
  );
}
