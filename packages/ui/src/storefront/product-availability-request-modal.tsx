"use client";

import {
  useEffect,
  useId,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";

import { Alert } from "../primitives/alert";
import { Button } from "../primitives/button";
import { isCompleteAzMobilePhone } from "../utils/international-phone";
import { IconClose } from "./icons";
import { PhoneNumberField } from "./phone-number-field";

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
  defaultFirstName?: string;
  defaultLastName?: string;
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
  defaultFirstName = "",
  defaultLastName = "",
  defaultPhone = "",
  defaultEmail = "",
  onSubmit,
}: ProductAvailabilityRequestModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const firstNameFieldId = `${titleId}-first-name`;
  const lastNameFieldId = `${titleId}-last-name`;
  const phoneFieldId = `${titleId}-phone`;
  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);
  const [phone, setPhone] = useState(defaultPhone);
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [pending, startTransition] = useTransition();
  const labels = copy[mode];
  const requiresName = mode === "preorder";

  useEffect(() => {
    if (!open) {
      return;
    }

    setError(null);
    setSuccess(false);
    setDuplicate(false);
    setFirstName(defaultFirstName);
    setLastName(defaultLastName);
    setPhone(defaultPhone);
    setEmail(defaultEmail);

    const focusId = requiresName ? firstNameFieldId : phoneFieldId;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(focusId)?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    open,
    defaultFirstName,
    defaultLastName,
    defaultPhone,
    defaultEmail,
    firstNameFieldId,
    phoneFieldId,
    requiresName,
  ]);

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const normalizedPhone = phone.trim();
    const normalizedEmail = email.trim();

    if (requiresName) {
      if (normalizedFirstName.length < 2) {
        setError("Ad ən azı 2 simvol olmalıdır");
        return;
      }
      if (normalizedLastName.length < 2) {
        setError("Soyad ən azı 2 simvol olmalıdır");
        return;
      }
    }

    if (!isCompleteAzMobilePhone(normalizedPhone)) {
      setError("Telefon nömrəsi düzgün deyil");
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set("type", mode === "stock_alert" ? "STOCK_ALERT" : "PREORDER");
    formData.set("phone", normalizedPhone);
    if (requiresName) {
      formData.set("firstName", normalizedFirstName);
      formData.set("lastName", normalizedLastName);
    }
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

  return createPortal(
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

        <div className="ui-availability-request__body">
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

              {requiresName ? (
                <div className="ui-field-row">
                  <div className="ui-field">
                    <label htmlFor={firstNameFieldId}>
                      Ad{" "}
                      <span className="ui-field__required" aria-hidden="true">
                        *
                      </span>
                    </label>
                    <input
                      id={firstNameFieldId}
                      name="firstName"
                      value={firstName}
                      onChange={(event) =>
                        setFirstName(event.currentTarget.value)
                      }
                      autoComplete="given-name"
                      required
                    />
                  </div>
                  <div className="ui-field">
                    <label htmlFor={lastNameFieldId}>
                      Soyad{" "}
                      <span className="ui-field__required" aria-hidden="true">
                        *
                      </span>
                    </label>
                    <input
                      id={lastNameFieldId}
                      name="lastName"
                      value={lastName}
                      onChange={(event) =>
                        setLastName(event.currentTarget.value)
                      }
                      autoComplete="family-name"
                      required
                    />
                  </div>
                </div>
              ) : null}

              <PhoneNumberField
                id={phoneFieldId}
                label="Telefon nömrəsi"
                value={phone}
                onChange={setPhone}
                required
                autoComplete="tel"
                indicateSuccess={false}
              />

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
    </div>,
    document.body,
  );
}
