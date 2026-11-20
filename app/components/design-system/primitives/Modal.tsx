"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type FormEvent, type ReactNode } from "react";
import { cx } from "./cx";

const EXIT_FALLBACK_MS = 400;
const EXIT_ANIMATION = "ocv-sink";

export interface ModalProps {
  open: boolean;
  /**
   * Every close request: Escape, the close button or a `<form method="dialog">` submit (its value, else "").
   * Close by setting open={false}, now or after async work. Call `accept()` no later than that to make
   * this request's value the dialog's `returnValue`; any other close (refused request, independent
   * open={false}) leaves it "".
   */
  onClose: (returnValue: string, accept: () => void) => void;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  size?: "default" | "small" | "wide";
  closeLabel: string;
  children: ReactNode;
}

// Controlled: the dialog only closes when the parent sets open={false}. Every user close path is
// turned into one onClose call, and the native dialog is kept open until the parent agrees.
export function Modal({ open, onClose, title, description, footer, size = "default", closeLabel, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const openRef = useRef(open);
  // Set only by the parent's accept(); written to returnValue when open turns false.
  const acceptedValue = useRef("");
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    openRef.current = open;
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.removeAttribute("data-closing");
      if (!dialog.open) {
        acceptedValue.current = "";
        dialog.returnValue = "";
        dialog.showModal();
        titleRef.current?.focus();
      }
      return;
    }

    if (!dialog.open) return;

    dialog.returnValue = acceptedValue.current;
    acceptedValue.current = "";
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

  // Ignored while closing, so a second Escape during the exit animation is not a second request.
  const requestClose = (returnValue = "") => {
    if (!openRef.current) return;
    onClose(returnValue, () => {
      acceptedValue.current = returnValue;
    });
  };

  const onSubmit = (event: FormEvent<HTMLDialogElement>) => {
    const form = event.target as HTMLFormElement;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | HTMLInputElement | null;
    const method = submitter?.hasAttribute("formmethod") ? submitter.formMethod : form.method;
    // A nested modal's form is its own; React bubbles its submit up to this dialog too.
    if (event.defaultPrevented || method !== "dialog" || form.closest("dialog") !== event.currentTarget) return;
    // Same result the native form close would set, without closing behind the parent's back.
    event.preventDefault();
    requestClose(submitter?.getAttribute("value") ?? "");
  };

  return (
    <dialog
      ref={dialogRef}
      className={cx("ocv-modal", size !== "default" && `ocv-modal--${size}`)}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onSubmit={onSubmit}
      onCancel={(event) => {
        // cancel and close do not bubble in the DOM, but React passes a nested modal's up the tree.
        if (event.target !== event.currentTarget) return;
        // Chrome makes a repeated Escape uncancelable; that path closes natively and onClose below handles it.
        if (!event.nativeEvent.cancelable) return;
        event.preventDefault();
        requestClose();
      }}
      onClose={(event) => {
        const dialog = dialogRef.current;
        if (event.target !== event.currentTarget || !dialog || !openRef.current) return;
        // Closed natively while the parent still says open: restore it, then ask.
        dialog.showModal();
        titleRef.current?.focus();
        requestClose();
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
          <button type="button" className="ocv-icon-btn" aria-label={closeLabel} title={closeLabel} onClick={() => requestClose()}>
            <X className="ocv-icon" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </header>
        <div className="ocv-modal__body">{children}</div>
        {footer ? <footer className="ocv-modal__foot">{footer}</footer> : null}
      </div>
    </dialog>
  );
}
