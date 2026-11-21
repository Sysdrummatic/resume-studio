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
   * The parent closes by setting open={false}. `accept` is only meaningful with `explicitAccept`.
   */
  onClose: (returnValue: string, accept: () => void) => void;
  /**
   * Default (false): the latest request's value becomes `returnValue` when open turns false, as with a
   * native dialog. True: only a request the parent `accept()`s does (now or after `await`, no later
   * than open={false}); a refused request or an independent close leaves "". An `accept` expires
   * when a newer request is made or the modal closes or opens again.
   */
  explicitAccept?: boolean;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  size?: "default" | "small" | "wide";
  closeLabel: string;
  children: ReactNode;
}

// Controlled: the dialog only closes when the parent sets open={false}. Every user close path is
// turned into one onClose call, and the native dialog is kept open until the parent agrees.
export function Modal({
  open,
  onClose,
  explicitAccept = false,
  title,
  description,
  footer,
  size = "default",
  closeLabel,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const openRef = useRef(open);
  // Written to returnValue when open turns false. requestId expires older accept()s: it changes on
  // every request, opening and close.
  const closeValue = useRef("");
  const requestId = useRef(0);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    openRef.current = open;
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      requestId.current += 1;
      closeValue.current = "";
      dialog.removeAttribute("data-closing");
      if (!dialog.open) {
        dialog.returnValue = "";
        dialog.showModal();
        titleRef.current?.focus();
      }
      return;
    }

    if (!dialog.open) return;

    dialog.returnValue = closeValue.current;
    closeValue.current = "";
    requestId.current += 1;
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
    const id = ++requestId.current;
    closeValue.current = explicitAccept ? "" : returnValue;
    onClose(returnValue, () => {
      if (id === requestId.current) closeValue.current = returnValue;
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
