"use client";

import { useCallback, useState } from "react";

import { ConfirmDialog } from "./confirm-dialog";

export type ConfirmDialogRequest = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pendingLabel?: string;
  onConfirm: () => void | Promise<void>;
};

export function useConfirmDialog() {
  const [request, setRequest] = useState<ConfirmDialogRequest | null>(null);
  const [pending, setPending] = useState(false);

  const requestConfirm = useCallback((next: ConfirmDialogRequest) => {
    setPending(false);
    setRequest(next);
  }, []);

  const dismiss = useCallback(() => {
    if (pending) {
      return;
    }
    setRequest(null);
  }, [pending]);

  const handleConfirm = useCallback(async () => {
    if (!request) {
      return;
    }

    setPending(true);
    try {
      await request.onConfirm();
      setRequest(null);
    } finally {
      setPending(false);
    }
  }, [request]);

  const confirmDialog = (
    <ConfirmDialog
      open={request !== null}
      title={request?.title ?? ""}
      message={request?.message ?? ""}
      confirmLabel={request?.confirmLabel}
      cancelLabel={request?.cancelLabel}
      pendingLabel={request?.pendingLabel}
      pending={pending}
      onConfirm={() => {
        void handleConfirm();
      }}
      onCancel={dismiss}
    />
  );

  return { requestConfirm, confirmDialog };
}
