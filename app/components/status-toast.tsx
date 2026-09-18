"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type StatusToastVariant = "success" | "warning" | "error";

export type StatusToastLink = { href: string; label: string };

export type StatusToastMessage = {
  id: number;
  message: string;
  variant: StatusToastVariant;
  link?: StatusToastLink;
};

type StatusToastProps = {
  toast: StatusToastMessage | null;
  onClose: () => void;
};

export function useStatusToast() {
  const nextId = useRef(0);
  const [toast, setToast] = useState<StatusToastMessage | null>(null);

  const showToast = useCallback((message: string, variant: StatusToastVariant = "success", link?: StatusToastLink) => {
    if (!message) {
      setToast(null);
      return;
    }
    nextId.current += 1;
    setToast({ id: nextId.current, message, variant, link });
  }, []);

  const closeToast = useCallback(() => {
    setToast(null);
  }, []);

  return { toast, showToast, closeToast };
}

export function StatusToast({ toast, onClose }: StatusToastProps) {
  if (!toast) {
    return null;
  }

  return <StatusToastContent key={toast.id} toast={toast} onClose={onClose} />;
}

function StatusToastContent({ toast, onClose }: { toast: StatusToastMessage; onClose: () => void }) {
  const [isClosing, setIsClosing] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const startClose = useCallback(() => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
    }
    setIsClosing(true);
    closeTimer.current = window.setTimeout(onClose, 180);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (closeTimer.current) {
        window.clearTimeout(closeTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    // A toast carrying a link stays until the user dismisses it - 5s isn't
    // enough time to read the message and follow the link.
    if (!toast || toast.link) {
      return undefined;
    }

    const timer = window.setTimeout(startClose, 5000);
    return () => window.clearTimeout(timer);
  }, [toast, startClose]);

  return (
    <div
      className={`status-toast status-toast--${toast.variant}${isClosing ? " status-toast--leaving" : ""}`}
      role={toast.variant === "error" ? "alert" : "status"}
    >
      <p>
        {toast.message}
        {toast.link ? (
          <>
            {" "}
            <a href={toast.link.href} target="_blank" rel="noopener noreferrer">
              {toast.link.label}
            </a>
          </>
        ) : null}
      </p>
      <button type="button" className="status-toast__close" aria-label="Close notification" onClick={startClose}>
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  );
}
