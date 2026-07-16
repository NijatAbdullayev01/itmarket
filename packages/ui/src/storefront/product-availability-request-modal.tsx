"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";

import { Alert } from "../primitives/alert";
import { Button } from "../primitives/button";
import { IconClose } from "./icons";

export type ProductAvailabilityRequestMode = "stock_alert" | "preorder";

export type ProductAvailabilityRequestResult = {
  error?: string;
  success?: boolean;
  duplicate?: boolean;
};

type ProductAvailabilityRequestModalProps = {
  open: boolean;
  mode: ProductAvailabilityRequestMode;
  onClose: () => void;
  productName: string;
  variantName?: string;
  productId: string;
  variantId: string;
  defaultPhone?: string;
  defaultEmail?: string;
  onSubmit: (formData: FormData) => Promise<ProductAvailabilityRequestResult>;
};

const copy: Record<
  ProductAvailabilityRequestMode,
  {
    title: string;
    lead: string;
    submit: string;
    success: string;
    duplicate: string;
  }
> = {
  stock_alert: {
    title: "Mövcud olanda bildir",
    lead: "Məhsul stoka gələndə sizə bildiriş göndərilməsi üçün əlaqə məlumatlarınızı daxil edin.",
    submit: "Bildirişə yazıl",
    success: "Sorğunuz qəbul edildi. Məhsul stoka gələndə sizə bildiriş göndəriləcək.",
    duplicate: "Bu məhsul üçün artıq bildiriş sorğunuz qeydə alınıb.",
  },
  preorder: {
    title: "Ön sifariş",
    lead: "Məhsul hazırda stokda yoxdur. Ön sifariş sorğunuz administratora göndəriləcək.",
    submit: "Ön sifariş ver",
    success: "Ön sifariş sorğunuz qəbul edildi. Tezliklə sizinlə əlaqə saxlanılacaq.",
    duplicate: "Bu məhsul üçün artıq ön sifariş sorğunuz qeydə alınıb.",
  },
};

export function ProductAvailabilityRequestModal({
  open,
  mode,
  onClose,
  productName,
  variantName,
  productId,
  variantId,
  defaultPhone = "",
  defaultEmail = "",
  onSubmit,
}: ProductAvailabilityRequestModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const [phone, setPhone] = useState(defaultPhone);
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [pending, startTransition] = useTransition();
  const labels = copy[mode];

  useEffect(() => {
    if (!open) {
      return;
    }

    setError(null);
    setSuccess(false);
    setDuplicate(false);
    setPhone(defaultPhone);
    setEmail(defaultEmail);

    const frame = window.requestAnimationFrame(() => {
      phoneInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, defaultPhone, defaultEmail]);

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedPhone = phone.trim();
    const normalizedEmail = email.trim();

    if (normalizedPhone.length < 7) {
      setError("Telefon nömrəsi düzgün deyil");
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set("type", mode === "stock_alert" ? "STOCK_ALERT" : "PREORDER");
    formData.set("phone", normalizedPhone);
    if (normalizedEmail !== "") {
      formData.set("email", normalizedEmail);
    }

    startTransition(async () => {
      const result = await onSubmit(formData);
      if (result.error !== undefined) {
        setError(result.error);
        setSuccess(false);
        setDuplicate(false);
        return;
      }

      setError(null);
      setSuccess(true);
      setDuplicate(result.duplicate === true);
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
        className="ui-modal__dialog ui-availability-request"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <Button
          type="button"
          variant="ghost"
          className="ui-availability-request__close"
          aria-label="Bağla"
          onClick={onClose}
          disabled={pending}
        >
          <IconClose width={20} height={20} />
        </Button>

        <div className="ui-availability-request__header">
          <h2 className="ui-availability-request__title" id={titleId}>
            {labels.title}
          </h2>
          <p className="ui-availability-request__lead" id={descriptionId}>
            {labels.lead}
          </p>
        </div>

        {success ? (
          <div className="ui-availability-request__success">
            <Alert variant="success">
              {duplicate ? labels.duplicate : labels.success}
            </Alert>
            <p className="ui-availability-request__summary">
              Məhsul: <strong>{productName}</strong>
              {variantName ? (
                <>
                  <br />
                  Variant: <strong>{variantName}</strong>
                </>
              ) : null}
            </p>
            <Button type="button" block onClick={onClose}>
              Bağla
            </Button>
          </div>
        ) : (
          <form className="ui-availability-request__form" onSubmit={handleSubmit}>
            <input type="hidden" name="productId" value={productId} />
            <input type="hidden" name="variantId" value={variantId} />

            <div className="ui-availability-request__summary">
              Məhsul: <strong>{productName}</strong>
              {variantName ? (
                <>
                  <br />
                  Variant: <strong>{variantName}</strong>
                </>
              ) : null}
            </div>

            {error ? <Alert variant="error">{error}</Alert> : null}

            <div className="ui-field">
              <label htmlFor={`${titleId}-phone`}>Telefon nömrəsi</label>
              <input
                ref={phoneInputRef}
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

            <div className="ui-field">
              <label htmlFor={`${titleId}-email`}>
                E-poçt <span className="ui-field__optional">(istəyə bağlı)</span>
              </label>
              <input
                id={`${titleId}-email`}
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.currentTarget.value)}
                placeholder="ornek@mail.az"
                autoComplete="email"
                inputMode="email"
              />
            </div>

            <div className="ui-availability-request__actions">
              <Button type="submit" block disabled={pending}>
                {pending ? "Göndərilir..." : labels.submit}
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
