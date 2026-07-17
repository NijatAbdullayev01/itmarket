"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { Alert } from "../primitives/alert";
import { Button } from "../primitives/button";
import {
  IconCheck,
  IconChevronDown,
  IconCreditCard,
  IconCart,
  IconDelivery,
  IconInstallmentPayment,
  IconMapPin,
  IconStore,
  IconUser,
} from "./icons";
import { OrderSummary } from "./order-summary";
import { AZERBAIJAN_ADMINISTRATIVE_AREA_GROUPS } from "../data/azerbaijan-administrative-areas";
import {
  resolvePickupLocations,
} from "../data/default-pickup-location";
import { formatAzn, formatAznValue, parseAznAmount } from "../utils/format-azn";
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

type InstallmentProviderId = "birbank" | "tamkart" | "leobank";

type CheckoutInstallmentProvider = {
  id: InstallmentProviderId;
  label: string;
  logoSrc: string;
  logoClassName: string;
  buttonClassName?: string;
  installmentMonths: readonly number[];
  logoWidth: number;
  logoHeight: number;
};

const CHECKOUT_INSTALLMENT_PROVIDERS: readonly CheckoutInstallmentProvider[] = [
  {
    id: "birbank",
    label: "Birbank",
    logoSrc: "/images/birbank-logo.png",
    logoClassName: "ui-checkout-installment-provider__logo--birbank",
    installmentMonths: [3, 6, 12, 18, 24],
    logoWidth: 600,
    logoHeight: 300,
  },
  {
    id: "tamkart",
    label: "Tam Kart",
    logoSrc: "/images/tam-kart-logo.png",
    logoClassName: "ui-checkout-installment-provider__logo--tamkart",
    buttonClassName: "ui-checkout-installment-provider--tamkart",
    installmentMonths: [6, 12, 18, 24],
    logoWidth: 1034,
    logoHeight: 336,
  },
  {
    id: "leobank",
    label: "Leobank",
    logoSrc: "/images/leobank-logo.png",
    logoClassName: "ui-checkout-installment-provider__logo--leobank",
    buttonClassName: "ui-checkout-installment-provider--leobank",
    installmentMonths: [6, 12, 18, 24],
    logoWidth: 600,
    logoHeight: 240,
  },
] as const;

export type CheckoutCustomerPrefill = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  administrativeArea?: string;
  addressLine?: string;
  notes?: string;
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
  initialCustomer?: CheckoutCustomerPrefill | null;
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
          <span
            className="ui-checkout-step-section__num"
            aria-hidden={isComplete ? undefined : true}
            aria-label={isComplete ? "Tamamlandı" : undefined}
          >
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

const REPUBLIC_DISTRICT_GROUP_LABEL = "Respublika tabeli rayonlar";

function resolveAdministrativeAreaLabel(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "") return "";

  for (const group of AZERBAIJAN_ADMINISTRATIVE_AREA_GROUPS) {
    const match = group.areas.find((area) => area.value === normalized);
    if (match) return match.label;
  }

  return value.trim();
}

function isRepublicDistrictAdministrativeArea(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "") return false;

  const group = AZERBAIJAN_ADMINISTRATIVE_AREA_GROUPS.find(
    (entry) => entry.label === REPUBLIC_DISTRICT_GROUP_LABEL,
  );
  return group?.areas.some((area) => area.value === normalized) ?? false;
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
  initialCustomer = null,
}: CheckoutWizardProps) {
  const cardOption = paymentMethods.find((method) => method.method === "CARD");
  const installmentOption = paymentMethods.find(
    (method) => method.method === "INSTALLMENT",
  );
  const [fulfillmentType, setFulfillmentType] = useState<"DELIVERY" | "PICKUP">(
    initialFulfillment.deliveryZones[0] ? "DELIVERY" : "PICKUP",
  );
  const [administrativeArea, setAdministrativeArea] = useState(
    initialCustomer?.administrativeArea?.trim() ?? "",
  );
  const [fulfillment, setFulfillment] = useState(initialFulfillment);
  const [deliveryZoneId, setDeliveryZoneId] = useState(
    initialFulfillment.deliveryZones[0]?.id ?? "",
  );
  const [pickupLocationId, setPickupLocationId] = useState("");
  const [isOnlinePaymentSelected, setIsOnlinePaymentSelected] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "INSTALLMENT">(
    "CARD",
  );
  const [installmentMonths, setInstallmentMonths] = useState(
    installmentOption?.installmentMonths[0]?.toString() ?? "",
  );
  const [installmentProviderId, setInstallmentProviderId] =
    useState<InstallmentProviderId | null>(null);
  const [initialPayment, setInitialPayment] = useState("");
  const [firstName, setFirstName] = useState(
    initialCustomer?.firstName?.trim() ?? "",
  );
  const [lastName, setLastName] = useState(
    initialCustomer?.lastName?.trim() ?? "",
  );
  const [phone, setPhone] = useState(initialCustomer?.phone?.trim() ?? "");
  const [email, setEmail] = useState(initialCustomer?.email?.trim() ?? "");
  const [addressLine, setAddressLine] = useState(
    initialCustomer?.addressLine?.trim() ?? "",
  );
  const [notes, setNotes] = useState(initialCustomer?.notes?.trim() ?? "");
  const [isPersonalInfoExpanded, setIsPersonalInfoExpanded] = useState(true);
  const [isDeliveryInfoExpanded, setIsDeliveryInfoExpanded] = useState(true);
  const [isPaymentInfoExpanded, setIsPaymentInfoExpanded] = useState(true);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  useEffect(() => {
    if (fulfillmentType !== "DELIVERY") return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsLoadingOptions(true);
      setOptionsError(null);
      try {
        const params = new URLSearchParams({ cartId });
        const normalizedArea = normalizeAdministrativeArea(administrativeArea);
        if (normalizedArea) params.set("administrativeArea", normalizedArea);
        const response = await fetch(`/api/fulfillment-options?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Fulfillment options request failed");
        const nextOptions = (await response.json()) as typeof initialFulfillment;
        if (controller.signal.aborted) return;
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
      } catch (error) {
        if (controller.signal.aborted) return;
        setOptionsError(
          "Təhvil seçimləri yenilənmədi. Bir az sonra yenidən yoxlayın.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoadingOptions(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [administrativeArea, cartId, fulfillmentType]);

  const selectedDeliveryZone = useMemo(
    () =>
      fulfillment.deliveryZones.find((zone) => zone.id === deliveryZoneId) ??
      null,
    [deliveryZoneId, fulfillment.deliveryZones],
  );
  const resolvedDeliveryZone = useMemo(() => {
    if (fulfillmentType !== "DELIVERY") return null;
    if (administrativeArea.trim() === "") return null;
    if (fulfillment.deliveryZones.length === 0) return null;

    return selectedDeliveryZone ?? fulfillment.deliveryZones[0] ?? null;
  }, [
    administrativeArea,
    fulfillment.deliveryZones,
    fulfillmentType,
    selectedDeliveryZone,
  ]);
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
  const isFulfillmentStepComplete =
    fulfillmentType === "DELIVERY"
      ? administrativeArea.trim() !== "" && addressLine.trim() !== ""
      : pickupLocationId.trim() !== "";
  const isDeliveryReadyForSubmit =
    fulfillmentType !== "DELIVERY" || resolvedDeliveryZone !== null;
  const isPaymentReadyForSubmit = isOnlinePaymentSelected
    ? paymentMethod === "CARD" ||
      (paymentMethod === "INSTALLMENT" &&
        installmentProviderId !== null &&
        installmentMonths !== "")
    : paymentMethod !== "INSTALLMENT" || installmentMonths !== "";
  const isPaymentStepComplete =
    isOnlinePaymentSelected ||
    (paymentMethod === "INSTALLMENT" && installmentMonths !== "");
  const canSubmit =
    canProceedPersonalInfo &&
    isFulfillmentStepComplete &&
    isDeliveryReadyForSubmit &&
    isPaymentReadyForSubmit;

  useEffect(() => {
    if (fulfillmentType !== "DELIVERY") return;
    if (resolvedDeliveryZone === null) {
      if (deliveryZoneId !== "") {
        setDeliveryZoneId("");
      }
      return;
    }

    if (deliveryZoneId !== resolvedDeliveryZone.id) {
      setDeliveryZoneId(resolvedDeliveryZone.id);
    }
  }, [deliveryZoneId, fulfillmentType, resolvedDeliveryZone]);

  useEffect(() => {
    if (!canProceedPersonalInfo) {
      setIsPersonalInfoExpanded(true);
    }
  }, [canProceedPersonalInfo]);

  useEffect(() => {
    if (!isFulfillmentStepComplete) {
      setIsDeliveryInfoExpanded(true);
    }
  }, [isFulfillmentStepComplete]);

  useEffect(() => {
    if (!isPaymentReadyForSubmit) {
      setIsPaymentInfoExpanded(true);
    }
  }, [isPaymentReadyForSubmit]);

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
  const paymentInfoSummary = useMemo(() => {
    const installmentProviderLabel =
      CHECKOUT_INSTALLMENT_PROVIDERS.find(
        (provider) => provider.id === installmentProviderId,
      )?.label ?? "";

    if (isOnlinePaymentSelected) {
      if (paymentMethod === "CARD") {
        return [cardOption?.label ?? "Online ödə", "Nağdsız ödəniş"]
          .filter(Boolean)
          .join(" · ");
      }

      return [
        cardOption?.label ?? "Online ödə",
        "Taksitlə",
        installmentProviderLabel,
        installmentMonths ? `${installmentMonths} ay` : "",
      ]
        .filter(Boolean)
        .join(" · ");
    }

    if (paymentMethod === "INSTALLMENT") {
      return [
        installmentOption?.label ?? "Hissə-hissə al",
        installmentMonths ? `${installmentMonths} ay` : "",
      ]
        .filter(Boolean)
        .join(" · ");
    }

    return "";
  }, [
    cardOption?.label,
    installmentMonths,
    installmentOption?.label,
    installmentProviderId,
    isOnlinePaymentSelected,
    paymentMethod,
  ]);
  const deliveryFee =
    fulfillmentType === "DELIVERY" && resolvedDeliveryZone
      ? resolvedDeliveryZone.fee
      : "0";

  const checkoutTotalAmount = useMemo(() => {
    const subtotalAmount = parseAznAmount(subtotal);
    if (subtotalAmount === null) return null;

    const deliveryAmount = parseAznAmount(deliveryFee) ?? 0;
    return subtotalAmount + deliveryAmount;
  }, [deliveryFee, subtotal]);

  const selectedInstallmentProvider = useMemo(
    () =>
      CHECKOUT_INSTALLMENT_PROVIDERS.find(
        (provider) => provider.id === installmentProviderId,
      ) ?? null,
    [installmentProviderId],
  );

  const installmentPlans = useMemo(() => {
    if (checkoutTotalAmount === null || paymentMethod !== "INSTALLMENT") {
      return [];
    }

    if (isOnlinePaymentSelected) {
      if (selectedInstallmentProvider === null) {
        return [];
      }

      const availableMonths = selectedInstallmentProvider.installmentMonths.filter(
        (months) => (installmentOption?.installmentMonths ?? []).includes(months),
      );
      const monthsToShow =
        availableMonths.length > 0
          ? availableMonths
          : [...selectedInstallmentProvider.installmentMonths];

      return monthsToShow.map((months) => ({
        months,
        monthlyAmount: checkoutTotalAmount / months,
      }));
    }

    return (installmentOption?.installmentMonths ?? []).map((months) => ({
      months,
      monthlyAmount: checkoutTotalAmount / months,
    }));
  }, [
    checkoutTotalAmount,
    installmentOption?.installmentMonths,
    isOnlinePaymentSelected,
    paymentMethod,
    selectedInstallmentProvider,
  ]);

  useEffect(() => {
    onDeliveryFeeChange?.(deliveryFee);
  }, [deliveryFee, onDeliveryFeeChange]);

  useEffect(() => {
    if (paymentMethod !== "INSTALLMENT" || isOnlinePaymentSelected) {
      setInitialPayment("");
    }
  }, [isOnlinePaymentSelected, paymentMethod]);

  useEffect(() => {
    if (paymentMethod !== "INSTALLMENT" || !isOnlinePaymentSelected) {
      setInstallmentProviderId(null);
      return;
    }

    setInstallmentProviderId("birbank");
  }, [isOnlinePaymentSelected, paymentMethod]);

  useEffect(() => {
    if (paymentMethod !== "INSTALLMENT") return;

    let monthsToShow: number[] = [];

    if (isOnlinePaymentSelected) {
      if (installmentProviderId === null) return;

      const selectedProvider =
        CHECKOUT_INSTALLMENT_PROVIDERS.find(
          (provider) => provider.id === installmentProviderId,
        ) ?? null;
      if (selectedProvider === null) return;

      const availableMonths = selectedProvider.installmentMonths.filter((months) =>
        (installmentOption?.installmentMonths ?? []).includes(months),
      );
      monthsToShow =
        availableMonths.length > 0
          ? availableMonths
          : [...selectedProvider.installmentMonths];
    } else {
      monthsToShow = installmentOption?.installmentMonths ?? [];
    }

    if (monthsToShow.length === 0) return;

    setInstallmentMonths((current) => {
      const selectedMonths = Number(current);
      if (current === "" || !monthsToShow.includes(selectedMonths)) {
        return monthsToShow[0].toString();
      }

      return current;
    });
  }, [
    checkoutTotalAmount,
    installmentOption?.installmentMonths,
    installmentProviderId,
    isOnlinePaymentSelected,
    paymentMethod,
  ]);

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
          <div className="ui-checkout-step-section__fields">
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
          isComplete={isFulfillmentStepComplete}
          isExpanded={isDeliveryInfoExpanded}
          onToggle={() => setIsDeliveryInfoExpanded((current) => !current)}
          summary={deliveryInfoSummary}
        >
          <div className="ui-checkout-step-section__fields">
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
                  {isRepublicDistrictAdministrativeArea(administrativeArea) ? (
                    <p
                      className="ui-checkout-delivery-notice"
                      role="status"
                    >
                      Bu əraziyə çatdırılma əlavə ödənişlidir.
                    </p>
                  ) : null}
                  {resolvedDeliveryZone ? (
                    <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
                      Çatdırılma haqqı:{" "}
                      <strong>
                        {formatAznValue(resolvedDeliveryZone.fee) ?? "—"}
                      </strong>
                    </p>
                  ) : administrativeArea.trim() !== "" &&
                    !isLoadingOptions &&
                    optionsError === null &&
                    !isRepublicDistrictAdministrativeArea(administrativeArea) ? (
                    <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
                      Seçilmiş ərazi üçün çatdırılma mövcud deyil.
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

        <CheckoutStepSection
          step={3}
          title="Ödəniş üsulu"
          icon={<IconCreditCard />}
          isComplete={isPaymentStepComplete}
          isExpanded={isPaymentInfoExpanded}
          onToggle={() => setIsPaymentInfoExpanded((current) => !current)}
          summary={paymentInfoSummary}
        >
            <div className="ui-field">
              <span
                id="paymentMethod-label"
                className="ui-checkout-payment-options__label"
              >
                Ödəniş üsulunu seçin
              </span>
              <div className="ui-checkout-payment-picker">
                <div
                  className="ui-checkout-payment-options"
                  role="radiogroup"
                  aria-labelledby="paymentMethod-label"
                >
                {cardOption ? (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isOnlinePaymentSelected}
                    className={[
                      "ui-checkout-payment-option",
                      isOnlinePaymentSelected
                        ? "ui-checkout-payment-option--active"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => {
                      setIsOnlinePaymentSelected(true);
                      setPaymentMethod("CARD");
                    }}
                  >
                    <span className="ui-checkout-payment-option__card" aria-hidden="true">
                      <IconCreditCard />
                    </span>
                    <span className="ui-checkout-payment-option__label">
                      {cardOption.label}
                    </span>
                  </button>
                ) : null}
                {installmentOption &&
                installmentOption.installmentMonths.length > 0 ? (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={
                      !isOnlinePaymentSelected && paymentMethod === "INSTALLMENT"
                    }
                    className={[
                      "ui-checkout-payment-option",
                      !isOnlinePaymentSelected && paymentMethod === "INSTALLMENT"
                        ? "ui-checkout-payment-option--active"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => {
                      setIsOnlinePaymentSelected(false);
                      setPaymentMethod("INSTALLMENT");
                    }}
                  >
                    <span className="ui-checkout-payment-option__card" aria-hidden="true">
                      <IconInstallmentPayment />
                    </span>
                    <span className="ui-checkout-payment-option__label">
                      {installmentOption.label}
                    </span>
                  </button>
                ) : null}
                </div>
                {isOnlinePaymentSelected ? (
                  <>
                    <span
                      id="paymentMode-label"
                      className="ui-checkout-installment-plans__label"
                    >
                      Ödəniş rejimini seç
                    </span>
                    <div
                      className="ui-checkout-payment-mode-toggle"
                      role="group"
                      aria-labelledby="paymentMode-label"
                    >
                    {cardOption ? (
                      <button
                        type="button"
                        aria-pressed={paymentMethod === "CARD"}
                        className={[
                          "ui-checkout-payment-mode-toggle__option",
                          paymentMethod === "CARD"
                            ? "ui-checkout-payment-mode-toggle__option--active"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => setPaymentMethod("CARD")}
                      >
                        <span
                          className="ui-checkout-payment-mode-toggle__radio"
                          aria-hidden="true"
                        />
                        Nağdsız ödəniş
                      </button>
                    ) : null}
                    {installmentOption &&
                    installmentOption.installmentMonths.length > 0 ? (
                      <button
                        type="button"
                        aria-pressed={paymentMethod === "INSTALLMENT"}
                        className={[
                          "ui-checkout-payment-mode-toggle__option",
                          paymentMethod === "INSTALLMENT"
                            ? "ui-checkout-payment-mode-toggle__option--active"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => setPaymentMethod("INSTALLMENT")}
                      >
                        <span
                          className="ui-checkout-payment-mode-toggle__radio"
                          aria-hidden="true"
                        />
                        Taksitlə
                      </button>
                    ) : null}
                    </div>
                  </>
                ) : null}
                {paymentMethod === "INSTALLMENT" && isOnlinePaymentSelected ? (
                  <>
                    <span
                      id="installmentProvider-label"
                      className="ui-checkout-installment-plans__label"
                    >
                      Taksit kartını seç
                    </span>
                    <div
                      className="ui-checkout-installment-providers"
                      role="group"
                      aria-labelledby="installmentProvider-label"
                    >
                    {CHECKOUT_INSTALLMENT_PROVIDERS.map((provider) => {
                      const isSelected = installmentProviderId === provider.id;

                      return (
                        <button
                          key={provider.id}
                          type="button"
                          aria-label={provider.label}
                          aria-pressed={isSelected}
                          className={[
                            "ui-checkout-installment-provider",
                            provider.buttonClassName,
                            isSelected
                              ? "ui-checkout-installment-provider--selected"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => setInstallmentProviderId(provider.id)}
                        >
                          <img
                            src={provider.logoSrc}
                            alt=""
                            className={[
                              "ui-checkout-installment-provider__logo",
                              provider.logoClassName,
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            width={provider.logoWidth}
                            height={provider.logoHeight}
                            decoding="async"
                          />
                        </button>
                      );
                    })}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
            {paymentMethod === "INSTALLMENT" &&
            (!isOnlinePaymentSelected || installmentProviderId !== null) &&
            installmentPlans.length > 0 ? (
              <div className="ui-field ui-field--installment-plans">
                <span
                  id="installmentMonths-label"
                  className="ui-checkout-installment-plans__label"
                >
                  {isOnlinePaymentSelected ? "Taksit müddəti" : "Müddəti seçin"}
                </span>
                <div
                  className="ui-checkout-installment-plans"
                  role="radiogroup"
                  aria-labelledby="installmentMonths-label"
                  aria-required={paymentMethod === "INSTALLMENT"}
                >
                  {installmentPlans.map((plan) => {
                    const planValue = plan.months.toString();
                    const isSelected = installmentMonths === planValue;

                    return (
                      <button
                        key={plan.months}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={`${plan.months} ay, aylıq ${formatAzn(plan.monthlyAmount)}`}
                        className={[
                          "ui-checkout-installment-plan",
                          isSelected ? "ui-checkout-installment-plan--active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => setInstallmentMonths(planValue)}
                      >
                        <span className="ui-checkout-installment-plan__months">
                          {plan.months} ay
                        </span>
                        <span className="ui-checkout-installment-plan__amount">
                          {formatAzn(plan.monthlyAmount)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {paymentMethod === "INSTALLMENT" && !isOnlinePaymentSelected ? (
              <div className="ui-field ui-field--initial-payment">
                <label htmlFor="initialPayment">İlkin ödəniş (məcburi deyil)</label>
                <input
                  id="initialPayment"
                  name="initialPayment"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={initialPayment}
                  onChange={(event) =>
                    setInitialPayment(event.currentTarget.value)
                  }
                  placeholder="Məs. 100"
                />
              </div>
            ) : null}
          {hideInlineSummary ? null : (
            <OrderSummary subtotal={subtotal} deliveryFee={deliveryFee} />
          )}
        </CheckoutStepSection>
        <div className="ui-checkout-submit">
          <p className="ui-order-summary-disclaimer ui-checkout-submit__disclaimer">
            Sifarişi rəsmiləşdirərək,{" "}
            <Link className="ui-order-summary-disclaimer__link" href="/terms">
              şərtləri
            </Link>{" "}
            qəbul edirsiniz
          </p>
          <Button
            type="submit"
            className="ui-product-purchase__cta"
            disabled={!canSubmit}
            formAction={
              isOnlinePaymentSelected ? checkoutOnlineAction : checkoutCashAction
            }
          >
            <IconCart width={20} height={20} />
            Sifarişi tamamla
          </Button>
        </div>
      </form>
    </div>
  );
}
