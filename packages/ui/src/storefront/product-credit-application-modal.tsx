"use client";

import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";

import { Alert } from "../primitives/alert";
import { Button } from "../primitives/button";
import { Price } from "../primitives/price";
import { formatAznValue } from "../utils/format-azn";
import { IconClose } from "./icons";

export type CreditApplicationResult = {
  error?: string;
  success?: boolean;
};

type ProductCreditApplicationModalProps = {
  open: boolean;
  onClose: () => void;
  productName: string;
  amount: number;
  cartId: string;
  productId: string;
  variantId: string;
  quantity: number;
  onSubmit: (formData: FormData) => Promise<CreditApplicationResult>;
};

function normalizeFinCode(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 7);
}

export function ProductCreditApplicationModal({
  open,
  onClose,
  productName,
  amount,
  cartId,
  productId,
  variantId,
  quantity,
  onSubmit,
}: ProductCreditApplicationModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const finInputRef = useRef<HTMLInputElement>(null);
  const [finCode, setFinCode] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }

    setError(null);
    setSuccess(false);
    setFinCode("");
    setPhone("");

    const frame = window.requestAnimationFrame(() => {
      finInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, pending]);

  if (!open) {
    return null;
  }

  const amountLabel = formatAznValue(amount);
  if (amountLabel === null) {
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedFin = normalizeFinCode(finCode);
    const normalizedPhone = phone.trim();

    if (normalizedFin.length !== 7) {
      setError("FIN kod 7 simvoldan ibarət olmalıdır");
      return;
    }

    if (normalizedPhone.length < 7) {
      setError("Telefon nömrəsi düzgün deyil");
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set("finCode", normalizedFin);
    formData.set("phone", normalizedPhone);

    startTransition(async () => {
      const result = await onSubmit(formData);
      if (result.error !== undefined) {
        setError(result.error);
        setSuccess(false);
        return;
      }

      setError(null);
      setSuccess(true);
    });
  }

  return (
    <div className="ui-modal" role="presentation">
      <button
        type="button"
        className="ui-modal__backdrop"
        aria-label="Bağla"
        onClick={() => {
          if (!pending) {
            onClose();
          }
        }}
      />
      <div
        className="ui-modal__dialog ui-credit-application"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <Button
          type="button"
          variant="ghost"
          className="ui-credit-application__close"
          aria-label="Bağla"
          onClick={onClose}
          disabled={pending}
        >
          <IconClose width={20} height={20} />
        </Button>

        <div className="ui-credit-application__header">
          <h2 className="ui-credit-application__title" id={titleId}>
            Kreditə müraciət
          </h2>
          <p className="ui-credit-application__lead" id={descriptionId}>
            {productName} üçün kredit müraciəti göndərmək üçün şəxsiyyət vəsiqənizdəki
            FIN kodu və telefon nömrənizi daxil edin.
          </p>
        </div>

        {success ? (
          <div className="ui-credit-application__success">
            <Alert variant="success">
              Kredit müraciətiniz qəbul edildi. Bank tərəfindən əlaqə saxlanılacaq.
            </Alert>
            <p className="ui-credit-application__summary">
              Məhsul: <strong>{productName}</strong>
              <br />
              Məbləğ:{" "}
              <Price
                value={amountLabel}
                className="ui-credit-application__amount"
              />
            </p>
            <Button type="button" block onClick={onClose}>
              Bağla
            </Button>
          </div>
        ) : (
          <form className="ui-credit-application__form" onSubmit={handleSubmit}>
            <input type="hidden" name="cartId" value={cartId} />
            <input type="hidden" name="productId" value={productId} />
            <input type="hidden" name="variantId" value={variantId} />
            <input type="hidden" name="quantity" value={quantity} />

            <div className="ui-credit-application__summary">
              Məhsul: <strong>{productName}</strong>
              <br />
              Məbləğ:{" "}
              <Price
                value={amountLabel}
                className="ui-credit-application__amount"
              />
            </div>

            {error ? <Alert variant="error">{error}</Alert> : null}

            <div className="ui-field">
              <label htmlFor={`${titleId}-fin`}>FIN kod</label>
              <input
                ref={finInputRef}
                id={`${titleId}-fin`}
                name="finCode"
                value={finCode}
                onChange={(event) => setFinCode(normalizeFinCode(event.currentTarget.value))}
                placeholder="Məs: 5ABC123"
                autoComplete="off"
                inputMode="text"
                maxLength={7}
                required
              />
            </div>

            <div className="ui-field">
              <label htmlFor={`${titleId}-phone`}>Telefon nömrəsi</label>
              <input
                id={`${titleId}-phone`}
                name="phone"
                value={phone}
                onChange={(event) => setPhone(event.currentTarget.value)}
                placeholder="+994..."
                autoComplete="tel"
                inputMode="tel"
                required
              />
            </div>

            <div className="ui-credit-application__actions">
              <Button type="submit" block disabled={pending}>
                {pending ? "Göndərilir..." : "Müraciət et"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                block
                onClick={onClose}
                disabled={pending}
              >
                Ləğv et
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
