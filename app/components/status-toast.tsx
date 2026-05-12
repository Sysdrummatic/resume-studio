"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type StatusToastVariant = "success" | "warning" | "error";

export type StatusToastMessage = {
  id: number;
  message: string;
  variant: StatusToastVariant;
};

type StatusToastProps = {
  toast: StatusToastMessage | null;
  onClose: () => void;
};

export function useStatusToast() {
  const nextId = useRef(0);
  const [toast, setToast] = useState<StatusToastMessage | null>(null);

  const showToast = useCallback((message: string, variant: StatusToastVariant = "success") => {
    if (!message) {
      setToast(null);
      return;
    }
    nextId.current += 1;
    setToast({ id: nextId.current, message, variant });
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
    if (!toast) {
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
      <p>{toast.message}</p>
      <button type="button" className="status-toast__close" aria-label="Close notification" onClick={startClose}>
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  );
}
