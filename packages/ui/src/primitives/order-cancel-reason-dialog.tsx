"use client";

import {
  ORDER_CANCEL_REASON_MAX_LENGTH,
  ORDER_CANCEL_REASON_MIN_LENGTH,
} from "@itmarket/contracts";
import { useEffect, useId } from "react";
import { createPortal } from "react-dom";

export type OrderCancelReasonDialogProps = {
  open: boolean;
  orderNumber: string;
  reason: string;
  onReasonChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  pending?: boolean;
  title?: string;
  message?: string;
  fieldLabel?: string;
  fieldPlaceholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pendingLabel?: string;
  closeLabel?: string;
};

export function OrderCancelReasonDialog({
  open,
  orderNumber,
  reason,
  onReasonChange,
  onConfirm,
  onClose,
  pending = false,
  title = "Sifarişi ləğv et",
  message,
  fieldLabel = "Ləğv səbəbi",
  fieldPlaceholder = "Ləğv səbəbini qısa izah edin",
  confirmLabel = "Sifarişi ləğv et",
  cancelLabel = "Geri qayıt",
  pendingLabel = "Ləğv edilir…",
  closeLabel = "Bağla",
}: OrderCancelReasonDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const fieldId = useId();
  const trimmedReason = reason.trim();
  const canSubmit =
    !pending &&
    trimmedReason.length >= ORDER_CANCEL_REASON_MIN_LENGTH &&
    trimmedReason.length <= ORDER_CANCEL_REASON_MAX_LENGTH;
  const resolvedMessage =
    message ??
    `#${orderNumber} sifarişini ləğv etmək istəyirsiniz? Bu əməliyyat geri qaytarıla bilməz. Ləğv səbəbini qeyd edin.`;

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, pending, onClose]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="ui-modal" role="presentation">
      <button
        type="button"
        className="ui-modal__backdrop"
        aria-label={closeLabel}
        disabled={pending}
        onClick={() => {
          if (!pending) {
            onClose();
          }
        }}
      />
      <form
        className="ui-modal__dialog ui-confirm-dialog ui-order-cancel-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) {
            onConfirm();
          }
        }}
      >
        <h2 className="ui-confirm-dialog__title" id={titleId}>
          {title}
        </h2>
        <p className="ui-confirm-dialog__message" id={descriptionId}>
          {resolvedMessage}
        </p>
        <label className="ui-order-cancel-dialog__field" htmlFor={fieldId}>
          <span className="ui-order-cancel-dialog__label">{fieldLabel}</span>
          <textarea
            id={fieldId}
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            minLength={ORDER_CANCEL_REASON_MIN_LENGTH}
            maxLength={ORDER_CANCEL_REASON_MAX_LENGTH}
            rows={4}
            required
            disabled={pending}
            placeholder={fieldPlaceholder}
          />
        </label>
        <div className="ui-confirm-dialog__actions">
          <button
            type="button"
            className="ui-confirm-dialog__cancel"
            disabled={pending}
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            className="ui-confirm-dialog__confirm"
            disabled={!canSubmit}
            aria-busy={pending}
          >
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
