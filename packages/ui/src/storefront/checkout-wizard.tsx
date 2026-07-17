"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { Alert } from "../primitives/alert";
import { Button } from "../primitives/button";
import {
  IconCheck,
  IconChevronDown,
  IconDelivery,
  IconMapPin,
  IconStore,
  IconUser,
} from "./icons";
import { OrderSummary } from "./order-summary";
import { AZERBAIJAN_ADMINISTRATIVE_AREA_GROUPS } from "../data/azerbaijan-administrative-areas";
import {
  resolvePickupLocations,
} from "../data/default-pickup-location";
import { formatAznValue } from "../utils/format-azn";
import { isCompleteEmail } from "../utils/is-complete-email";
import { isCompleteInternationalPhone, parseInternationalPhone } from "../utils/international-phone";
import { PhoneNumberField } from "./phone-number-field";

type FulfillmentZone = {
  id: string;
  name: string;
  fee: string;
  freeDeliveryMinimum: string | null;
  estimatedMinDays: number;
  estimatedMaxDays: number;
};

type PickupLocation = {
  id: string;
  name: string;
  addressLine: string;
};

type PaymentMethod = {
  method: "CARD" | "INSTALLMENT";
  label: string;
  installmentMonths: number[];
};

type CheckoutWizardProps = {
  cartId: string;
  subtotal: string;
  initialFulfillment: {
    deliveryZones: FulfillmentZone[];
    pickupLocations: PickupLocation[];
  };
  paymentMethods: PaymentMethod[];
  checkoutCashAction: (formData: FormData) => void | Promise<void>;
  checkoutOnlineAction: (formData: FormData) => void | Promise<void>;
  hideInlineSummary?: boolean;
  onDeliveryFeeChange?: (fee: string) => void;
};

type CheckoutStepSectionProps = {
  step: number;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  isComplete?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  summary?: ReactNode;
};

function CheckoutStepSection({
  step,
  title,
  icon,
  children,
  isComplete = false,
  isExpanded = true,
  onToggle,
  summary,
}: CheckoutStepSectionProps) {
  const isCollapsed = isComplete && !isExpanded;
  const sectionClassName = [
    "ui-card",
    "ui-checkout-step-section",
    isComplete ? "ui-checkout-step-section--complete" : "",
    isCollapsed ? "ui-checkout-step-section--collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const handleHeaderKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!onToggle) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle();
    }
  };

  const headerClassName = [
    "ui-checkout-step-section__header",
    isComplete ? "ui-checkout-step-section__header--toggle" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={sectionClassName} aria-label={title}>
      <header
        className={headerClassName}
        {...(isComplete && onToggle
          ? {
              role: "button",
              tabIndex: 0,
              "aria-expanded": isExpanded,
              onClick: onToggle,
              onKeyDown: handleHeaderKeyDown,
            }
          : {})}
      >
        <h2 className="ui-checkout-step-section__title">
          {icon ? (
            <span className="ui-checkout-step-section__title-icon" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          {title}
        </h2>
        <div className="ui-checkout-step-section__header-actions">
          {isComplete ? (
            <IconChevronDown
              className={[
                "ui-checkout-step-section__chevron",
                isExpanded ? "ui-checkout-step-section__chevron--expanded" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-hidden="true"
            />
          ) : null}
          <span className="ui-checkout-step-section__num" aria-hidden="true">
            {isComplete ? <IconCheck /> : step}
          </span>
        </div>
      </header>
      {isCollapsed && summary ? (
        <p className="ui-checkout-step-section__summary">{summary}</p>
      ) : null}
      {!isCollapsed ? (
        <div className="ui-checkout-step-section__body">{children}</div>
      ) : null}
    </section>
  );
}

function normalizeAdministrativeArea(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === "" ? undefined : normalized;
}

function resolveAdministrativeAreaLabel(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "") return "";

  for (const group of AZERBAIJAN_ADMINISTRATIVE_AREA_GROUPS) {
    const match = group.areas.find((area) => area.value === normalized);
    if (match) return match.label;
  }

  return value.trim();
}

export function CheckoutWizard({
  cartId,
  subtotal,
  initialFulfillment,
  paymentMethods,
  checkoutCashAction,
  checkoutOnlineAction,
  hideInlineSummary = false,
  onDeliveryFeeChange,
}: CheckoutWizardProps) {
  const cardOption = paymentMethods.find((method) => method.method === "CARD");
  const installmentOption = paymentMethods.find(
    (method) => method.method === "INSTALLMENT",
  );
  const [fulfillmentType, setFulfillmentType] = useState<"DELIVERY" | "PICKUP">(
    initialFulfillment.deliveryZones[0] ? "DELIVERY" : "PICKUP",
  );
  const [administrativeArea, setAdministrativeArea] = useState("");
  const [fulfillment, setFulfillment] = useState(initialFulfillment);
  const [deliveryZoneId, setDeliveryZoneId] = useState(
    initialFulfillment.deliveryZones[0]?.id ?? "",
  );
  const [pickupLocationId, setPickupLocationId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "INSTALLMENT">(
    cardOption?.method ?? installmentOption?.method ?? "CARD",
  );
  const [installmentMonths, setInstallmentMonths] = useState(
    installmentOption?.installmentMonths[0]?.toString() ?? "",
  );
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [notes, setNotes] = useState("");
  const [isPersonalInfoExpanded, setIsPersonalInfoExpanded] = useState(true);
  const [isDeliveryInfoExpanded, setIsDeliveryInfoExpanded] = useState(true);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  useEffect(() => {
    if (fulfillmentType !== "DELIVERY") return;

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setIsLoadingOptions(true);
      setOptionsError(null);
      try {
        const params = new URLSearchParams({ cartId });
        const normalizedArea = normalizeAdministrativeArea(administrativeArea);
        if (normalizedArea) params.set("administrativeArea", normalizedArea);
        const response = await fetch(`/api/fulfillment-options?${params}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Fulfillment options request failed");
        const nextOptions = (await response.json()) as typeof initialFulfillment;
        if (cancelled) return;
        setFulfillment(nextOptions);
        setDeliveryZoneId((current) => {
          if (
            current !== "" &&
            nextOptions.deliveryZones.some((zone) => zone.id === current)
          ) {
            return current;
          }
          return nextOptions.deliveryZones[0]?.id ?? "";
        });
        setPickupLocationId((current) => {
          const pickupLocations = resolvePickupLocations(
            nextOptions.pickupLocations,
          );
          if (
            current !== "" &&
            pickupLocations.some((pickup) => pickup.id === current)
          ) {
            return current;
          }
          return "";
        });
      } catch {
        if (!cancelled) {
          setOptionsError(
            "Təhvil seçimləri yenilənmədi. Bir az sonra yenidən yoxlayın.",
          );
        }
      } finally {
        if (!cancelled) setIsLoadingOptions(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [administrativeArea, cartId, fulfillmentType]);

  const selectedDeliveryZone = useMemo(
    () =>
      fulfillment.deliveryZones.find((zone) => zone.id === deliveryZoneId) ??
      null,
    [deliveryZoneId, fulfillment.deliveryZones],
  );
  const pickupLocations = useMemo(
    () => resolvePickupLocations(fulfillment.pickupLocations),
    [fulfillment.pickupLocations],
  );
  const selectedPickupLocation = useMemo(
    () =>
      pickupLocations.find((pickup) => pickup.id === pickupLocationId) ?? null,
    [pickupLocationId, pickupLocations],
  );
  const resolvedAddressLine = useMemo(() => {
    if (fulfillmentType === "PICKUP") {
      return selectedPickupLocation?.addressLine ?? "";
    }

    return addressLine;
  }, [addressLine, fulfillmentType, selectedPickupLocation]);

  const recipientName = useMemo(
    () => [firstName.trim(), lastName.trim()].filter(Boolean).join(" "),
    [firstName, lastName],
  );
  const parsedPhone = useMemo(() => parseInternationalPhone(phone), [phone]);
  const isPhoneComplete = isCompleteInternationalPhone(
    parsedPhone.countryIso2,
    parsedPhone.localNumber,
  );
  const isEmailComplete = isCompleteEmail(email);
  const canProceedPersonalInfo =
    firstName.trim() !== "" &&
    lastName.trim() !== "" &&
    isPhoneComplete &&
    isEmailComplete;
  const canProceedFulfillmentAndAddress =
    fulfillmentType === "DELIVERY"
      ? selectedDeliveryZone !== null &&
        administrativeArea.trim() !== "" &&
        addressLine.trim() !== ""
      : selectedPickupLocation !== null;

  useEffect(() => {
    if (!canProceedPersonalInfo) {
      setIsPersonalInfoExpanded(true);
    }
  }, [canProceedPersonalInfo]);

  useEffect(() => {
    if (!canProceedFulfillmentAndAddress) {
      setIsDeliveryInfoExpanded(true);
    }
  }, [canProceedFulfillmentAndAddress]);

  const handlePersonalInfoFocusOut = (event: FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && event.currentTarget.contains(nextTarget)) return;
    if (canProceedPersonalInfo) {
      setIsPersonalInfoExpanded(false);
    }
  };

  const handleDeliveryInfoFocusOut = (event: FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && event.currentTarget.contains(nextTarget)) return;
    if (canProceedFulfillmentAndAddress) {
      setIsDeliveryInfoExpanded(false);
    }
  };

  const personalInfoSummary = useMemo(() => {
    return [recipientName, phone.trim(), email.trim()].join(" · ");
  }, [email, phone, recipientName]);
  const deliveryInfoSummary = useMemo(() => {
    if (fulfillmentType === "DELIVERY") {
      return [
        "Ünvana çatdırılma",
        resolveAdministrativeAreaLabel(administrativeArea),
        addressLine.trim(),
      ]
        .filter(Boolean)
        .join(" · ");
    }

    return [
      "Mağazadan götürmə",
      selectedPickupLocation?.name ?? "",
    ]
      .filter(Boolean)
      .join(" · ");
  }, [
    addressLine,
    administrativeArea,
    fulfillmentType,
    selectedPickupLocation,
  ]);
  const canSubmitCash =
    canProceedPersonalInfo && canProceedFulfillmentAndAddress;
  const canSubmitOnline =
    canSubmitCash &&
    paymentMethods.length > 0 &&
    (paymentMethod !== "INSTALLMENT" || installmentMonths !== "");

  const deliveryFee =
    fulfillmentType === "DELIVERY" && selectedDeliveryZone
      ? selectedDeliveryZone.fee
      : "0";

  useEffect(() => {
    onDeliveryFeeChange?.(deliveryFee);
  }, [deliveryFee, onDeliveryFeeChange]);

  return (
    <div>
      <form className="ui-checkout-panel">
        <input type="hidden" name="cartId" value={cartId} />
        <input type="hidden" name="fulfillmentType" value={fulfillmentType} />
        <input type="hidden" name="recipientName" value={recipientName} />
        <input type="hidden" name="phone" value={phone} />
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="addressLine" value={resolvedAddressLine} />
        <input type="hidden" name="notes" value={notes} />
        <input type="hidden" name="paymentMethod" value={paymentMethod} />
        <input type="hidden" name="installmentMonths" value={installmentMonths} />
        <input
          type="hidden"
          name="administrativeArea"
          value={fulfillmentType === "DELIVERY" ? administrativeArea : ""}
        />
        <input
          type="hidden"
          name="deliveryZoneId"
          value={fulfillmentType === "DELIVERY" ? deliveryZoneId : ""}
        />
        <input
          type="hidden"
          name="pickupLocationId"
          value={fulfillmentType === "PICKUP" ? pickupLocationId : ""}
        />

        <CheckoutStepSection
          step={1}
          title="Şəxsi məlumatlar"
          icon={<IconUser />}
          isComplete={canProceedPersonalInfo}
          isExpanded={isPersonalInfoExpanded}
          onToggle={() => setIsPersonalInfoExpanded((current) => !current)}
          summary={personalInfoSummary}
        >
          <div className="ui-checkout-step-section__fields" onBlur={handlePersonalInfoFocusOut}>
          <div className="ui-field-row">
            <div className="ui-field">
              <label htmlFor="firstName">
                Ad{" "}
                <span className="ui-field__required" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="firstName"
                name="firstName"
                value={firstName}
                onChange={(event) => setFirstName(event.currentTarget.value)}
                autoComplete="given-name"
                required
              />
            </div>
            <div className="ui-field">
              <label htmlFor="lastName">
                Soyad{" "}
                <span className="ui-field__required" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="lastName"
                name="lastName"
                value={lastName}
                onChange={(event) => setLastName(event.currentTarget.value)}
                autoComplete="family-name"
                required
              />
            </div>
          </div>
          <div className="ui-field-row">
            <PhoneNumberField
              id="phone"
              label="Mobil nömrə"
              value={phone}
              onChange={setPhone}
              required
            />
            <div
              className={
                isEmailComplete
                  ? "ui-field ui-field--success"
                  : "ui-field"
              }
            >
              <label htmlFor="email">
                E-poçt{" "}
                <span className="ui-field__required" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.currentTarget.value)}
                autoComplete="email"
                required
                aria-invalid={email.trim() !== "" && !isEmailComplete}
              />
            </div>
          </div>
          </div>
        </CheckoutStepSection>

        <CheckoutStepSection
          step={2}
          title="Çatdırılma məlumatları"
          icon={<IconMapPin />}
          isComplete={canProceedFulfillmentAndAddress}
          isExpanded={isDeliveryInfoExpanded}
          onToggle={() => setIsDeliveryInfoExpanded((current) => !current)}
          summary={deliveryInfoSummary}
        >
          <div
            className="ui-checkout-step-section__fields"
            onBlur={handleDeliveryInfoFocusOut}
          >
              <div className="ui-field">
                <span
                  id="fulfillmentType-label"
                  className="ui-checkout-fulfillment-toggle__label"
                >
                  Təhvil alma növü
                </span>
                <div
                  className="ui-checkout-fulfillment-toggle"
                  role="radiogroup"
                  aria-labelledby="fulfillmentType-label"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={fulfillmentType === "DELIVERY"}
                    className={
                      fulfillmentType === "DELIVERY"
                        ? "ui-checkout-fulfillment-toggle__option ui-checkout-fulfillment-toggle__option--active"
                        : "ui-checkout-fulfillment-toggle__option"
                    }
                    onClick={() => {
                      setOptionsError(null);
                      setFulfillmentType("DELIVERY");
                    }}
                  >
                    <IconDelivery width={16} height={16} />
                    Ünvana çatdırılma
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={fulfillmentType === "PICKUP"}
                    className={
                      fulfillmentType === "PICKUP"
                        ? "ui-checkout-fulfillment-toggle__option ui-checkout-fulfillment-toggle__option--active"
                        : "ui-checkout-fulfillment-toggle__option"
                    }
                    onClick={() => {
                      setOptionsError(null);
                      setFulfillmentType("PICKUP");
                    }}
                  >
                    <IconStore width={16} height={16} />
                    Mağazadan götürmə
                  </button>
                </div>
              </div>
              {fulfillmentType === "DELIVERY" ? (
                <>
                  <div className="ui-field">
                    <label htmlFor="administrativeArea">Şəhər / rayon</label>
                    <select
                      id="administrativeArea"
                      name="administrativeArea"
                      value={administrativeArea}
                      onChange={(event) =>
                        setAdministrativeArea(event.currentTarget.value)
                      }
                      required
                    >
                      <option value="">Şəhər rayon seçin</option>
                      {AZERBAIJAN_ADMINISTRATIVE_AREA_GROUPS.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.areas.map((area) => (
                            <option key={area.value} value={area.value}>
                              {area.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div className="ui-field">
                    <label htmlFor="addressLine">Ünvan</label>
                    <textarea
                      id="addressLine"
                      name="addressLine"
                      value={addressLine}
                      onChange={(event) =>
                        setAddressLine(event.currentTarget.value)
                      }
                      placeholder="Ünvanı daxil edin"
                      required
                    />
                  </div>
                  {selectedDeliveryZone ? (
                    <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
                      Çatdırılma haqqı:{" "}
                      <strong>
                        {formatAznValue(selectedDeliveryZone.fee) ?? "—"}
                      </strong>
                    </p>
                  ) : null}
                </>
              ) : (
                <div className="ui-field">
                  <label htmlFor="pickupLocationId">Filial</label>
                  <select
                    id="pickupLocationId"
                    name="pickupLocationId"
                    value={pickupLocationId}
                    onChange={(event) =>
                      setPickupLocationId(event.currentTarget.value)
                    }
                    required
                  >
                    <option value="">Seçilməyib</option>
                    {pickupLocations.map((pickup) => (
                      <option key={pickup.id} value={pickup.id}>
                        {pickup.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {optionsError ? <Alert variant="error">{optionsError}</Alert> : null}
              {isLoadingOptions ? (
                <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
                  Uyğun seçimlər yenilənir...
                </p>
              ) : null}
          <div className="ui-field">
            <label htmlFor="notes">Qeyd</label>
            <textarea
              id="notes"
              name="notes"
              value={notes}
              onChange={(event) => setNotes(event.currentTarget.value)}
            />
          </div>
          </div>
        </CheckoutStepSection>

        <CheckoutStepSection step={3} title="Ödəniş üsulu">
            <div className="ui-field">
              <label htmlFor="paymentMethod">Online ödəniş növü</label>
              <select
                id="paymentMethod"
                name="paymentMethod"
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(
                    event.currentTarget.value as "CARD" | "INSTALLMENT",
                  )
                }
              >
                {cardOption ? (
                  <option value={cardOption.method}>{cardOption.label}</option>
                ) : null}
                {installmentOption &&
                installmentOption.installmentMonths.length > 0 ? (
                  <option value={installmentOption.method}>
                    {installmentOption.label}
                  </option>
                ) : null}
              </select>
            </div>
            <div className="ui-field">
              <label htmlFor="installmentMonths">Taksit ayı</label>
              <select
                id="installmentMonths"
                name="installmentMonths"
                value={installmentMonths}
                onChange={(event) => setInstallmentMonths(event.currentTarget.value)}
                disabled={paymentMethod !== "INSTALLMENT"}
                required={paymentMethod === "INSTALLMENT"}
              >
                <option value="">Seçilməyib</option>
                {(installmentOption?.installmentMonths ?? []).map((months) => (
                  <option key={months} value={months}>
                    {months} ay
                  </option>
                ))}
              </select>
            </div>
          {hideInlineSummary ? null : (
            <OrderSummary subtotal={subtotal} deliveryFee={deliveryFee} />
          )}
        </CheckoutStepSection>

        <CheckoutStepSection step={4} title="Sifarişi təsdiqləyin">
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              {recipientName} · {phone}
              <br />
              {email}
              <br />
              {fulfillmentType === "DELIVERY"
                ? selectedDeliveryZone?.name
                : selectedPickupLocation?.name}
            </p>
            {hideInlineSummary ? null : (
              <OrderSummary subtotal={subtotal} deliveryFee={deliveryFee} />
            )}
          <div className="ui-checkout-actions">
            <Button
              type="submit"
              disabled={!canSubmitCash}
              formAction={checkoutCashAction}
            >
              Nağd sifariş və rezerv yarat
            </Button>
            <Button
              type="submit"
              variant="secondary"
              disabled={!canSubmitOnline}
              formAction={checkoutOnlineAction}
            >
              Kart / taksit ilə davam et
            </Button>
          </div>
        </CheckoutStepSection>
      </form>
    </div>
  );
}
