"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { Button, Modal } from "../components/design-system/primitives";

type Pending = { message: string };

type ConfirmLabels = { title: string; confirm: string; cancel: string; close: string };

/**
 * Promise-based replacement for window.confirm: `await confirm(message)` resolves true only on the
 * confirm button; Escape, the close button and Cancel resolve false. Render `dialog` once.
 */
export function useConfirm(labels: ConfirmLabels): {
  confirm: (message: string) => Promise<boolean>;
  dialog: ReactNode;
} {
  const [pending, setPending] = useState<Pending | null>(null);
  // Kept after settle so the body does not go blank during the exit animation.
  const [message, setMessage] = useState("");
  const resolver = useRef<((answer: boolean) => void) | null>(null);

  const settle = useCallback((answer: boolean) => {
    resolver.current?.(answer);
    resolver.current = null;
    setPending(null);
  }, []);

  const confirm = useCallback((message: string) => {
    resolver.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setMessage(message);
      setPending({ message });
    });
  }, []);

  const dialog = (
    <Modal
      open={pending !== null}
      size="small"
      title={labels.title}
      closeLabel={labels.close}
      onClose={() => settle(false)}
      footer={
        <>
          <Button variant="secondary" onClick={() => settle(false)}>
            {labels.cancel}
          </Button>
          <Button variant="danger" onClick={() => settle(true)}>
            {labels.confirm}
          </Button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  );

  return { confirm, dialog };
}
