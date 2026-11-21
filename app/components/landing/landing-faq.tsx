"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import type { AppDictionary } from "../../i18n/types";
import styles from "../../landing.module.css";

/**
 * FAQ drawer (native <dialog>: focus trap, Escape and inert page for free). Opens from
 * any "/#faq" link or [data-faq-open] button on the page, and on arrival at /#faq.
 */
export default function LandingFaq({ faq }: { faq: AppDictionary["landing"]["faq"] }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const open = () => {
      if (!dialog.open) dialog.showModal();
    };
    const onClick = (event: globalThis.MouseEvent) => {
      const trigger = (event.target as Element | null)?.closest('a[href$="#faq"], [data-faq-open]');
      if (!trigger) return;
      event.preventDefault();
      open();
    };
    const onClose = () => {
      if (window.location.hash === "#faq") {
        window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
      }
    };
    document.addEventListener("click", onClick, true);
    dialog.addEventListener("close", onClose);
    if (window.location.hash === "#faq") open();
    return () => {
      document.removeEventListener("click", onClick, true);
      dialog.removeEventListener("close", onClose);
    };
  }, []);

  const closeOnBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  };

  return (
    <dialog id="faq" ref={ref} className={styles.drawer} aria-labelledby="faq-title" onClick={closeOnBackdrop}>
      <div className={styles.drawerInner}>
        <header className={styles.drawerHead}>
          <h2 id="faq-title">{faq.title}</h2>
          <button type="button" className={styles.iconButton} aria-label={faq.close} onClick={() => ref.current?.close()}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <div className={styles.faq}>
          {faq.items.map((item) => (
            <details id={item.id} key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </dialog>
  );
}
