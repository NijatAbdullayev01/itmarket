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

export type ProductAvailabilityRequestModalCopy = {
  stockAlertTitle: string;
  stockAlertLead: string;
  stockAlertSubmit: string;
  stockAlertSuccess: string;
  stockAlertDuplicate: string;
  preorderTitle: string;
  preorderLead: string;
  preorderSubmit: string;
  preorderSuccess: string;
  preorderDuplicate: string;
  productLabel: string;
  variantLabel: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  emailOptional: string;
  emailPlaceholder: string;
  close: string;
  cancel: string;
  sending: string;
  firstNameMin: string;
  lastNameMin: string;
  phoneInvalid: string;
};

export const defaultProductAvailabilityRequestModalCopy: ProductAvailabilityRequestModalCopy =
  {
    stockAlertTitle: "Mövcud olanda bildir",
    stockAlertLead:
      "Məhsul stoka gələndə sizə bildiriş göndərilməsi üçün əlaqə məlumatlarınızı daxil edin.",
    stockAlertSubmit: "Bildirişə yazıl",
    stockAlertSuccess:
      "Sorğunuz qəbul edildi. Məhsul stoka gələndə sizə bildiriş göndəriləcək.",
    stockAlertDuplicate:
      "Bu məhsul üçün artıq bildiriş sorğunuz qeydə alınıb.",
    preorderTitle: "Ön sifariş",
    preorderLead:
      "Ön sifariş tərəfdaşlarımızın anbarında olan məhsullar üçündür. Sorğunuz qəbul edildikdən sonra tezliklə sizinlə əlaqə saxlanılacaq.",
    preorderSubmit: "Ön sifariş ver",
    preorderSuccess:
      "Ön sifariş sorğunuz qəbul edildi. Tezliklə sizinlə əlaqə saxlanılacaq.",
    preorderDuplicate:
      "Bu məhsul üçün artıq ön sifariş sorğunuz qeydə alınıb.",
    productLabel: "Məhsul:",
    variantLabel: "Variant:",
    firstName: "Ad",
    lastName: "Soyad",
    phone: "Telefon nömrəsi",
    email: "E-poçt",
    emailOptional: "(istəyə bağlı)",
    emailPlaceholder: "ornek@mail.az",
    close: "Bağla",
    cancel: "Ləğv et",
    sending: "Göndərilir...",
    firstNameMin: "Ad ən azı 2 simvol olmalıdır",
    lastNameMin: "Soyad ən azı 2 simvol olmalıdır",
    phoneInvalid: "Telefon nömrəsi düzgün deyil",
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
  copy?: Partial<ProductAvailabilityRequestModalCopy>;
};

function modeLabels(
  mode: ProductAvailabilityRequestMode,
  copy: ProductAvailabilityRequestModalCopy,
) {
  if (mode === "stock_alert") {
    return {
      title: copy.stockAlertTitle,
      lead: copy.stockAlertLead,
      submit: copy.stockAlertSubmit,
      success: copy.stockAlertSuccess,
      duplicate: copy.stockAlertDuplicate,
    };
  }
  return {
    title: copy.preorderTitle,
    lead: copy.preorderLead,
    submit: copy.preorderSubmit,
    success: copy.preorderSuccess,
    duplicate: copy.preorderDuplicate,
  };
}

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
  copy: copyProp,
}: ProductAvailabilityRequestModalProps) {
  const copy = {
    ...defaultProductAvailabilityRequestModalCopy,
    ...copyProp,
  };
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
  const labels = modeLabels(mode, copy);

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

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(firstNameFieldId)?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    open,
    defaultFirstName,
    defaultLastName,
    defaultPhone,
    defaultEmail,
    firstNameFieldId,
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

    if (normalizedFirstName.length < 2) {
      setError(copy.firstNameMin);
      return;
    }
    if (normalizedLastName.length < 2) {
      setError(copy.lastNameMin);
      return;
    }

    if (!isCompleteAzMobilePhone(normalizedPhone)) {
      setError(copy.phoneInvalid);
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set("type", mode === "stock_alert" ? "STOCK_ALERT" : "PREORDER");
    formData.set("phone", normalizedPhone);
    formData.set("firstName", normalizedFirstName);
    formData.set("lastName", normalizedLastName);
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

  const productSummary = (
    <p className="ui-availability-request__summary">
      {copy.productLabel} <strong>{productName}</strong>
      {variantName ? (
        <>
          <br />
          {copy.variantLabel} <strong>{variantName}</strong>
        </>
      ) : null}
    </p>
  );

  return createPortal(
    <div className="ui-modal" role="presentation">
      <button
        type="button"
        className="ui-modal__backdrop"
        aria-label={copy.close}
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
          aria-label={copy.close}
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
              {productSummary}
              <Button type="button" block onClick={onClose}>
                {copy.close}
              </Button>
            </div>
          ) : (
            <form className="ui-availability-request__form" onSubmit={handleSubmit}>
              <input type="hidden" name="productId" value={productId} />
              <input type="hidden" name="variantId" value={variantId} />

              {productSummary}

              {error ? <Alert variant="error">{error}</Alert> : null}

              <div className="ui-field-row">
                <div className="ui-field">
                  <label htmlFor={firstNameFieldId}>
                    {copy.firstName}{" "}
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
                    {copy.lastName}{" "}
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

              <PhoneNumberField
                id={phoneFieldId}
                label={copy.phone}
                value={phone}
                onChange={setPhone}
                required
                autoComplete="tel"
                indicateSuccess={false}
              />

              <div className="ui-field">
                <label htmlFor={`${titleId}-email`}>
                  {copy.email}{" "}
                  <span className="ui-field__optional">{copy.emailOptional}</span>
                </label>
                <input
                  id={`${titleId}-email`}
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.currentTarget.value)}
                  placeholder={copy.emailPlaceholder}
                  autoComplete="email"
                  inputMode="email"
                />
              </div>

              <div className="ui-availability-request__actions">
                <Button type="submit" block disabled={pending}>
                  {pending ? copy.sending : labels.submit}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  block
                  onClick={onClose}
                  disabled={pending}
                >
                  {copy.cancel}
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
