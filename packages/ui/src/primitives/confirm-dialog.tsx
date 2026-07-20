"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pendingLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Sil",
  cancelLabel = "Ləğv et",
  pendingLabel = "Silinir…",
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, pending, onCancel]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="ui-modal" role="presentation">
      <button
        type="button"
        className="ui-modal__backdrop"
        aria-label="Bağla"
        disabled={pending}
        onClick={() => {
          if (!pending) {
            onCancel();
          }
        }}
      />
      <div
        className="ui-modal__dialog ui-confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <h2 className="ui-confirm-dialog__title" id={titleId}>
          {title}
        </h2>
        <p className="ui-confirm-dialog__message" id={descriptionId}>
          {message}
        </p>
        <div className="ui-confirm-dialog__actions">
          <button
            type="button"
            className="ui-confirm-dialog__cancel"
            disabled={pending}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="ui-confirm-dialog__confirm"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
