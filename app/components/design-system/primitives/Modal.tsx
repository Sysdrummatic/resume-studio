"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cx } from "./cx";

const EXIT_FALLBACK_MS = 400;
const EXIT_ANIMATION = "ocv-sink";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  size?: "default" | "small" | "wide";
  closeLabel: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, description, footer, size = "default", closeLabel, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const openRef = useRef(open);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    openRef.current = open;
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.removeAttribute("data-closing");
      if (!dialog.open) {
        dialog.showModal();
        titleRef.current?.focus();
      }
      return;
    }

    if (!dialog.open) return;

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      dialog.removeEventListener("animationend", onAnimationEnd);
      dialog.removeAttribute("data-closing");
      dialog.close();
    };
    const onAnimationEnd = (event: AnimationEvent) => {
      if (event.target === dialog && event.animationName === EXIT_ANIMATION) finish();
    };
    dialog.setAttribute("data-closing", "");
    dialog.addEventListener("animationend", onAnimationEnd);
    const timer = window.setTimeout(finish, EXIT_FALLBACK_MS);
    return () => {
      window.clearTimeout(timer);
      dialog.removeEventListener("animationend", onAnimationEnd);
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={cx("ocv-modal", size !== "default" && `ocv-modal--${size}`)}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (openRef.current) onClose();
      }}
    >
      <div className="ocv-modal__box">
        <header className="ocv-modal__head">
          <div>
            <h2 id={titleId} ref={titleRef} tabIndex={-1} className="ocv-heading ocv-modal__title">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="ocv-meta">
                {description}
              </p>
            ) : null}
          </div>
          <button type="button" className="ocv-icon-btn" aria-label={closeLabel} title={closeLabel} onClick={onClose}>
            <svg
              className="ocv-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        <div className="ocv-modal__body">{children}</div>
        {footer ? <footer className="ocv-modal__foot">{footer}</footer> : null}
      </div>
    </dialog>
  );
}
