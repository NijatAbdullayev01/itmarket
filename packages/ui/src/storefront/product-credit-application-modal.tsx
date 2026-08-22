"use client";

import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";
import { createPortal } from "react-dom";

import { Alert } from "../primitives/alert";
import { Button } from "../primitives/button";
import { Price } from "../primitives/price";
import { formatAznValue } from "../utils/format-azn";
import { IconClose } from "./icons";

export type CreditApplicationResult = {
  error?: string;
  success?: boolean;
};

export type ProductCreditApplicationModalCopy = {
  title: string;
  lead: string;
  success: string;
  productLabel: string;
  amountLabel: string;
  finLabel: string;
  finPlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  submit: string;
  submitting: string;
  cancel: string;
  close: string;
  finInvalid: string;
  phoneInvalid: string;
  emailInvalid: string;
};

export const defaultProductCreditApplicationModalCopy: ProductCreditApplicationModalCopy = {
  title: "Kreditə müraciət",
  lead: "{productName} üçün kredit müraciəti göndərmək üçün FIN kodu, telefon nömrənizi və e-poçtunuzu daxil edin.",
  success: "Kredit müraciətiniz qəbul edildi. Bank tərəfindən əlaqə saxlanılacaq.",
  productLabel: "Məhsul",
  amountLabel: "Məbləğ",
  finLabel: "FIN kod",
  finPlaceholder: "Məs: 5ABC123",
  phoneLabel: "Telefon nömrəsi",
  phonePlaceholder: "+994...",
  emailLabel: "E-poçt",
  emailPlaceholder: "ad@nümunə.az",
  submit: "Müraciət et",
  submitting: "Göndərilir...",
  cancel: "Ləğv et",
  close: "Bağla",
  finInvalid: "FIN kod 7 simvoldan ibarət olmalıdır",
  phoneInvalid: "Telefon nömrəsi düzgün deyil",
  emailInvalid: "E-poçt ünvanı düzgün deyil",
};

export type ProductCreditApplicationModalProps = {
  open: boolean;
  onClose: () => void;
  productName: string;
  amount: number;
  cartId: string;
  productId: string;
  variantId: string;
  quantity: number;
  onSubmit: (formData: FormData) => Promise<CreditApplicationResult>;
  copy?: Partial<ProductCreditApplicationModalCopy>;
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
  copy,
}: ProductCreditApplicationModalProps) {
  const resolvedCopy: ProductCreditApplicationModalCopy = {
    ...defaultProductCreditApplicationModalCopy,
    ...copy,
  };
  const titleId = useId();
  const descriptionId = useId();
  const finInputRef = useRef<HTMLInputElement>(null);
  const [finCode, setFinCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
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
    setEmail("");

    const frame = window.requestAnimationFrame(() => {
      finInputRef.current?.focus({ preventScroll: true });
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

  if (!open || typeof document === "undefined") {
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
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedFin.length !== 7) {
      setError(resolvedCopy.finInvalid);
      return;
    }

    if (normalizedPhone.length < 7) {
      setError(resolvedCopy.phoneInvalid);
      return;
    }

    if (!normalizedEmail.includes("@") || normalizedEmail.length < 5) {
      setError(resolvedCopy.emailInvalid);
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set("finCode", normalizedFin);
    formData.set("phone", normalizedPhone);
    formData.set("email", normalizedEmail);

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

  return createPortal(
    <div className="ui-modal" role="presentation">
      <button
        type="button"
        className="ui-modal__backdrop"
        aria-label={resolvedCopy.close}
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
          aria-label={resolvedCopy.close}
          onClick={onClose}
          disabled={pending}
        >
          <IconClose width={20} height={20} />
        </Button>

        <div className="ui-credit-application__header">
          <h2 className="ui-credit-application__title" id={titleId}>
            {resolvedCopy.title}
          </h2>
          <p className="ui-credit-application__lead" id={descriptionId}>
            {resolvedCopy.lead.replace("{productName}", productName)}
          </p>
        </div>

        {success ? (
          <div className="ui-credit-application__success">
            <Alert variant="success">
              {resolvedCopy.success}
            </Alert>
            <p className="ui-credit-application__summary">
              {resolvedCopy.productLabel}: <strong>{productName}</strong>
              <br />
              {resolvedCopy.amountLabel}:{" "}
              <Price
                value={amountLabel}
                className="ui-credit-application__amount"
              />
            </p>
            <Button type="button" block onClick={onClose}>
              {resolvedCopy.close}
            </Button>
          </div>
        ) : (
          <form className="ui-credit-application__form" onSubmit={handleSubmit}>
            <input type="hidden" name="cartId" value={cartId} />
            <input type="hidden" name="productId" value={productId} />
            <input type="hidden" name="variantId" value={variantId} />
            <input type="hidden" name="quantity" value={quantity} />

            <div className="ui-credit-application__summary">
              {resolvedCopy.productLabel}: <strong>{productName}</strong>
              <br />
              {resolvedCopy.amountLabel}:{" "}
              <Price
                value={amountLabel}
                className="ui-credit-application__amount"
              />
            </div>

            {error ? <Alert variant="error">{error}</Alert> : null}

            <div className="ui-field">
              <label htmlFor={`${titleId}-fin`}>{resolvedCopy.finLabel}</label>
              <input
                ref={finInputRef}
                id={`${titleId}-fin`}
                name="finCode"
                value={finCode}
                onChange={(event) => setFinCode(normalizeFinCode(event.currentTarget.value))}
                placeholder={resolvedCopy.finPlaceholder}
                autoComplete="off"
                inputMode="text"
                maxLength={7}
                required
              />
            </div>

            <div className="ui-field">
              <label htmlFor={`${titleId}-phone`}>{resolvedCopy.phoneLabel}</label>
              <input
                id={`${titleId}-phone`}
                name="phone"
                value={phone}
                onChange={(event) => setPhone(event.currentTarget.value)}
                placeholder={resolvedCopy.phonePlaceholder}
                autoComplete="tel"
                inputMode="tel"
                required
              />
            </div>

            <div className="ui-field">
              <label htmlFor={`${titleId}-email`}>{resolvedCopy.emailLabel}</label>
              <input
                id={`${titleId}-email`}
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.currentTarget.value)}
                placeholder={resolvedCopy.emailPlaceholder}
                autoComplete="email"
                inputMode="email"
                required
              />
            </div>

            <div className="ui-credit-application__actions">
              <Button type="submit" block disabled={pending}>
                {pending ? resolvedCopy.submitting : resolvedCopy.submit}
              </Button>
              <Button
                type="button"
                variant="secondary"
                block
                onClick={onClose}
                disabled={pending}
              >
                {resolvedCopy.cancel}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
