"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
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
import { GroupedSearchSelectField } from "./grouped-search-select-field";
import {
  BAKU_DISTRICT_AREAS,
  CHECKOUT_ADMINISTRATIVE_AREA_GROUPS,
  isBakuAdministrativeArea,
  isBakuDistrictAdministrativeArea,
  resolveAdministrativeAreaLabel,
  resolveCheckoutBakuDistrictAdministrativeArea,
  resolveCheckoutMainAdministrativeArea,
} from "../data/azerbaijan-administrative-areas";
import {
  resolvePickupLocations,
} from "../data/default-pickup-location";
import { formatAzn, formatAznValue, parseAznAmount } from "../utils/format-azn";
import { isCompleteEmail } from "../utils/is-complete-email";
import { isCompleteInternationalPhone, parseInternationalPhone } from "../utils/international-phone";
import { OrderSummary } from "./order-summary";
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
    buttonClassName: "ui-checkout-installment-provider--birbank",
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

export type CheckoutWizardCopy = {
  stepCompleted: string;
  personalInfoTitle: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  fulfillmentTitle: string;
  fulfillmentTypeLabel: string;
  deliveryOption: string;
  pickupOption: string;
  deliverySpeedLabel: string;
  speedStandard: string;
  speedExpress: string;
  expressHint: string;
  standardHint: string;
  cityDistrictLabel: string;
  cityDistrictPlaceholder: string;
  cityDistrictListAria: string;
  cityDistrictRequired: string;
  bakuDistrictLabel: string;
  bakuDistrictPlaceholder: string;
  bakuDistrictListAria: string;
  bakuDistrictRequired: string;
  addressLabel: string;
  addressPlaceholder: string;
  addressMinLength: string;
  republicDistrictNotice: string;
  deliveryFreePrefix: string;
  deliveryFreeValue: string;
  deliveryFeePrefix: string;
  feeBreakdownStandard: string;
  feeBreakdownExpress: string;
  noDeliveryZone: string;
  branchLabel: string;
  branchEmpty: string;
  optionsLoading: string;
  optionsError: string;
  notesLabel: string;
  notesAddLabel: string;
  notesOptional: string;
  paymentTitle: string;
  paymentMethodLabel: string;
  debitCard: string;
  installmentCard: string;
  paymentModeLabel: string;
  installmentProviderLabel: string;
  installmentDurationOnline: string;
  installmentDurationOffline: string;
  monthsUnit: string;
  monthlyAria: string;
  initialPaymentLabel: string;
  initialPaymentPlaceholder: string;
  finCodeLabel: string;
  finCodePlaceholder: string;
  finCodeHint: string;
  termsDisclaimerBefore: string;
  termsLink: string;
  termsDisclaimerAfter: string;
  submitOrder: string;
  cardFallbackLabel: string;
  installmentFallbackLabel: string;
};

export const defaultCheckoutWizardCopy: CheckoutWizardCopy = {
  stepCompleted: "Tamamlandı",
  personalInfoTitle: "Şəxsi məlumatlar",
  firstName: "Ad",
  lastName: "Soyad",
  phone: "Mobil nömrə",
  email: "E-poçt",
  fulfillmentTitle: "Təhvil",
  fulfillmentTypeLabel: "Təhvil alma növü",
  deliveryOption: "Ünvana çatdırılma",
  pickupOption: "Mağazadan götürmə",
  deliverySpeedLabel: "Çatdırılma növü",
  speedStandard: "Standart",
  speedExpress: "Təcili",
  expressHint: "2 saat içində çatdırılma · {fee}",
  standardHint: "2-5 iş günü ərzində çatdırılma",
  cityDistrictLabel: "Şəhər / Rayon",
  cityDistrictPlaceholder: "Şəhər və ya rayon axtarın",
  cityDistrictListAria: "Şəhər və rayonlar",
  cityDistrictRequired: "Şəhər / Rayon seçilməyib",
  bakuDistrictLabel: "Rayon",
  bakuDistrictPlaceholder: "Rayon axtarın",
  bakuDistrictListAria: "Rayonlar",
  bakuDistrictRequired: "Rayon seçilməyib",
  addressLabel: "Ünvan",
  addressPlaceholder: "Küçə, ev, mənzil",
  addressMinLength: "Ünvan ən azı 5 simvol olmalıdır",
  republicDistrictNotice: "Bakıdan kənar rayon və şəhərlərə çatdırılma poçt vasitəsilə aparılır və ödənişlidir.",
  deliveryFreePrefix: "Çatdırılma:",
  deliveryFreeValue: "Ödənişsiz",
  deliveryFeePrefix: "Çatdırılma haqqı:",
  feeBreakdownStandard: "standart",
  feeBreakdownExpress: "təcili",
  noDeliveryZone: "Seçilmiş ərazi üçün çatdırılma mövcud deyil.",
  branchLabel: "Filial",
  branchEmpty: "Seçilməyib",
  optionsLoading: "Uyğun seçimlər yenilənir...",
  optionsError: "Təhvil seçimləri yenilənmədi. Bir az sonra yenidən yoxlayın.",
  notesLabel: "Qeyd",
  notesAddLabel: "Qeyd əlavə et",
  notesOptional: "istəyə bağlı",
  paymentTitle: "Ödəniş",
  paymentMethodLabel: "Ödəniş üsulunu seçin",
  debitCard: "Debt kartı",
  installmentCard: "Taksit kartı",
  paymentModeLabel: "Ödəniş növünü seç",
  installmentProviderLabel: "Taksit kartını seç",
  installmentDurationOnline: "Taksit müddəti",
  installmentDurationOffline: "Müddəti seçin",
  monthsUnit: "ay",
  monthlyAria: "{months} ay, aylıq {amount}",
  initialPaymentLabel: "İlkin ödəniş (məcburi deyil)",
  initialPaymentPlaceholder: "Məs. 100",
  finCodeLabel: "FİN kod",
  finCodePlaceholder: "Məs. 0A1B2C3",
  finCodeHint: "Hissə-hissə alış üçün şəxsiyyət vəsiqənizdəki 7 simvollu FİN kodu tələb olunur.",
  termsDisclaimerBefore: "Sifarişi rəsmiləşdirərək,",
  termsLink: "şərtləri",
  termsDisclaimerAfter: "qəbul edirsiniz",
  submitOrder: "Sifarişi tamamla",
  cardFallbackLabel: "Kartla ödə",
  installmentFallbackLabel: "Hissə-hissə al",
};

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
  /** When set, rendered beside the form; submit CTA is placed under it. */
  aside?: ReactNode;
  onDeliveryFeeChange?: (fee: string) => void;
  onStepCompletionChange?: (completedSteps: readonly number[]) => void;
  initialCustomer?: CheckoutCustomerPrefill | null;
  copy?: Partial<CheckoutWizardCopy>;
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
  completedLabel?: string;
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
  completedLabel = "Tamamlandı",
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
            aria-label={isComplete ? completedLabel : undefined}
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

function normalizeCheckoutFinCode(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 7);
}

function isCompleteCheckoutFinCode(value: string): boolean {
  return /^[A-Z0-9]{7}$/.test(normalizeCheckoutFinCode(value));
}

type DeliverySpeed = "STANDARD" | "EXPRESS";

const EXPRESS_DELIVERY_SURCHARGE_AZN = 10;

export function CheckoutWizard({
  cartId,
  subtotal,
  initialFulfillment,
  paymentMethods,
  checkoutCashAction,
  checkoutOnlineAction,
  hideInlineSummary = false,
  aside = null,
  onDeliveryFeeChange,
  onStepCompletionChange,
  initialCustomer = null,
  copy,
}: CheckoutWizardProps) {
  const formId = useId();
  const c = { ...defaultCheckoutWizardCopy, ...copy };
  const submitOutsideForm = aside !== null;
  const cardOption = paymentMethods.find((method) => method.method === "CARD");
  const installmentOption = paymentMethods.find(
    (method) => method.method === "INSTALLMENT",
  );
  const [fulfillmentType, setFulfillmentType] = useState<"DELIVERY" | "PICKUP">(
    initialFulfillment.deliveryZones[0] ? "DELIVERY" : "PICKUP",
  );
  const [deliverySpeed, setDeliverySpeed] = useState<DeliverySpeed>("STANDARD");
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
  const [finCode, setFinCode] = useState("");
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
  const [isNotesOpen, setIsNotesOpen] = useState(
    () => (initialCustomer?.notes?.trim() ?? "") !== "",
  );
  const [isPersonalInfoExpanded, setIsPersonalInfoExpanded] = useState(true);
  const [isDeliveryInfoExpanded, setIsDeliveryInfoExpanded] = useState(true);
  const [isPaymentInfoExpanded, setIsPaymentInfoExpanded] = useState(true);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const checkoutMainAdministrativeArea = useMemo(
    () => resolveCheckoutMainAdministrativeArea(administrativeArea),
    [administrativeArea],
  );
  const checkoutBakuDistrictAdministrativeArea = useMemo(
    () => resolveCheckoutBakuDistrictAdministrativeArea(administrativeArea),
    [administrativeArea],
  );
  const showBakuDistrictField = isBakuAdministrativeArea(administrativeArea);

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
        setOptionsError(c.optionsError);
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
  const isAddressComplete = addressLine.trim().length >= 5;
  const isBakuDistrictComplete =
    !isBakuAdministrativeArea(administrativeArea) ||
    isBakuDistrictAdministrativeArea(administrativeArea);
  const isFulfillmentStepComplete =
    fulfillmentType === "DELIVERY"
      ? administrativeArea.trim() !== "" &&
        isBakuDistrictComplete &&
        isAddressComplete
      : pickupLocationId.trim() !== "";
  const isDeliveryReadyForSubmit =
    fulfillmentType !== "DELIVERY" || resolvedDeliveryZone !== null;
  const isPaymentReadyForSubmit = isOnlinePaymentSelected
    ? paymentMethod === "CARD" ||
      (paymentMethod === "INSTALLMENT" &&
        installmentProviderId !== null &&
        installmentMonths !== "" &&
        isCompleteCheckoutFinCode(finCode))
    : paymentMethod !== "INSTALLMENT" ||
      (installmentMonths !== "" && isCompleteCheckoutFinCode(finCode));
  const isPaymentStepComplete =
    isOnlinePaymentSelected ||
    (paymentMethod === "INSTALLMENT" &&
      installmentMonths !== "" &&
      isCompleteCheckoutFinCode(finCode));
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

  useEffect(() => {
    if (!onStepCompletionChange) return;

    const completedSteps: number[] = [];
    if (canProceedPersonalInfo) completedSteps.push(1);
    if (isFulfillmentStepComplete) completedSteps.push(2);
    if (isPaymentStepComplete) completedSteps.push(3);
    onStepCompletionChange(completedSteps);
  }, [
    canProceedPersonalInfo,
    isFulfillmentStepComplete,
    isPaymentStepComplete,
    onStepCompletionChange,
  ]);

  const personalInfoSummary = useMemo(() => {
    return [recipientName, phone.trim(), email.trim()].join(" · ");
  }, [email, phone, recipientName]);
  const deliveryInfoSummary = useMemo(() => {
    if (fulfillmentType === "DELIVERY") {
      return [
        c.deliveryOption,
        deliverySpeed === "EXPRESS" ? c.speedExpress : c.speedStandard,
        resolveAdministrativeAreaLabel(administrativeArea),
        addressLine.trim(),
      ]
        .filter(Boolean)
        .join(" · ");
    }

    return [
      c.pickupOption,
      selectedPickupLocation?.name ?? "",
    ]
      .filter(Boolean)
      .join(" · ");
  }, [
    addressLine,
    administrativeArea,
    c.deliveryOption,
    c.pickupOption,
    c.speedExpress,
    c.speedStandard,
    deliverySpeed,
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
        return [cardOption?.label ?? c.cardFallbackLabel, c.debitCard]
          .filter(Boolean)
          .join(" · ");
      }

      return [
        cardOption?.label ?? c.cardFallbackLabel,
        c.installmentCard,
        installmentProviderLabel,
        installmentMonths ? `${installmentMonths} ${c.monthsUnit}` : "",
      ]
        .filter(Boolean)
        .join(" · ");
    }

    if (paymentMethod === "INSTALLMENT") {
      return [
        installmentOption?.label ?? c.installmentFallbackLabel,
        installmentMonths ? `${installmentMonths} ${c.monthsUnit}` : "",
      ]
        .filter(Boolean)
        .join(" · ");
    }

    return "";
  }, [
    c.cardFallbackLabel,
    c.debitCard,
    c.installmentCard,
    c.installmentFallbackLabel,
    c.monthsUnit,
    cardOption?.label,
    installmentMonths,
    installmentOption?.label,
    installmentProviderId,
    isOnlinePaymentSelected,
    paymentMethod,
  ]);
  const deliveryFee = useMemo(() => {
    if (fulfillmentType !== "DELIVERY" || resolvedDeliveryZone === null) {
      return "0";
    }

    // Zone fee from fulfillment options is already resolved for STANDARD
    // (Baku: free at/above threshold, paid below; outside Baku: always paid).
    const standardFee = parseAznAmount(resolvedDeliveryZone.fee) ?? 0;

    if (deliverySpeed === "EXPRESS") {
      return (standardFee + EXPRESS_DELIVERY_SURCHARGE_AZN).toFixed(2);
    }

    return standardFee.toFixed(2);
  }, [deliverySpeed, fulfillmentType, resolvedDeliveryZone]);

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
    if (paymentMethod !== "INSTALLMENT") {
      setFinCode("");
    }
  }, [paymentMethod]);

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

  const submitBlock = (
    <div
      className={[
        "ui-checkout-submit",
        submitOutsideForm ? "ui-checkout-submit--aside" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="ui-order-summary-disclaimer ui-checkout-submit__disclaimer">
        {c.termsDisclaimerBefore}{" "}
        <Link className="ui-order-summary-disclaimer__link" href="/terms">
          {c.termsLink}
        </Link>{" "}
        {c.termsDisclaimerAfter}
      </p>
      <Button
        type="submit"
        className="ui-product-purchase__cta"
        disabled={!canSubmit}
        form={submitOutsideForm ? formId : undefined}
        formAction={
          isOnlinePaymentSelected ? checkoutOnlineAction : checkoutCashAction
        }
      >
        <IconCart width={20} height={20} />
        {c.submitOrder}
      </Button>
    </div>
  );

  return (
    <>
      <div className="ui-cart-layout__main">
      <form id={formId} className="ui-checkout-panel">
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
          name="installmentProvider"
          value={
            paymentMethod === "INSTALLMENT" && installmentProviderId !== null
              ? installmentProviderId
              : ""
          }
        />
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
          name="deliverySpeed"
          value={fulfillmentType === "DELIVERY" ? deliverySpeed : ""}
        />
        <input
          type="hidden"
          name="pickupLocationId"
          value={fulfillmentType === "PICKUP" ? pickupLocationId : ""}
        />

        <CheckoutStepSection
          step={1}
          title={c.personalInfoTitle}
          icon={<IconUser />}
          isComplete={canProceedPersonalInfo}
          isExpanded={isPersonalInfoExpanded}
          onToggle={() => setIsPersonalInfoExpanded((current) => !current)}
          summary={personalInfoSummary}
          completedLabel={c.stepCompleted}
        >
          <div className="ui-checkout-step-section__fields ui-checkout-step-section__fields--personal">
          <div className="ui-field-row ui-field-row--split">
            <div className="ui-field">
              <label htmlFor="firstName">
                {c.firstName}{" "}
                <span className="ui-field__required" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="firstName"
                value={firstName}
                onChange={(event) => setFirstName(event.currentTarget.value)}
                autoComplete="given-name"
                required
              />
            </div>
            <div className="ui-field">
              <label htmlFor="lastName">
                {c.lastName}{" "}
                <span className="ui-field__required" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="lastName"
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
              label={c.phone}
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
                {c.email}{" "}
                <span className="ui-field__required" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="email"
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
          title={c.fulfillmentTitle}
          icon={<IconMapPin />}
          isComplete={isFulfillmentStepComplete}
          isExpanded={isDeliveryInfoExpanded}
          onToggle={() => setIsDeliveryInfoExpanded((current) => !current)}
          summary={deliveryInfoSummary}
          completedLabel={c.stepCompleted}
        >
          <div className="ui-checkout-step-section__fields ui-checkout-step-section__fields--fulfillment">
              <div className="ui-checkout-fulfillment-controls">
                <div className="ui-field">
                  <span
                    id="fulfillmentType-label"
                    className="ui-checkout-fulfillment-toggle__label"
                  >
                    {c.fulfillmentTypeLabel}
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
                      {c.deliveryOption}
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
                        setDeliverySpeed("STANDARD");
                      }}
                    >
                      <IconStore width={16} height={16} />
                      {c.pickupOption}
                    </button>
                  </div>
                </div>
                {fulfillmentType === "DELIVERY" ? (
                  <div className="ui-field">
                    <span
                      id="deliverySpeed-label"
                      className="ui-checkout-installment-plans__label"
                    >
                      {c.deliverySpeedLabel}
                    </span>
                    <div
                      className="ui-checkout-payment-mode-toggle"
                      role="group"
                      aria-labelledby="deliverySpeed-label"
                    >
                      <button
                        type="button"
                        aria-pressed={deliverySpeed === "STANDARD"}
                        className={[
                          "ui-checkout-payment-mode-toggle__option",
                          deliverySpeed === "STANDARD"
                            ? "ui-checkout-payment-mode-toggle__option--active"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => setDeliverySpeed("STANDARD")}
                      >
                        <span
                          className="ui-checkout-payment-mode-toggle__radio"
                          aria-hidden="true"
                        />
                        {c.speedStandard}
                      </button>
                      <button
                        type="button"
                        aria-pressed={deliverySpeed === "EXPRESS"}
                        className={[
                          "ui-checkout-payment-mode-toggle__option",
                          deliverySpeed === "EXPRESS"
                            ? "ui-checkout-payment-mode-toggle__option--active"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => setDeliverySpeed("EXPRESS")}
                      >
                        <span
                          className="ui-checkout-payment-mode-toggle__radio"
                          aria-hidden="true"
                        />
                        {c.speedExpress}
                      </button>
                    </div>
                    <p className="ui-checkout-delivery-speed__hint">
                      {deliverySpeed === "EXPRESS"
                        ? c.expressHint.replace(
                            "{fee}",
                            formatAzn(EXPRESS_DELIVERY_SURCHARGE_AZN),
                          )
                        : c.standardHint}
                    </p>
                  </div>
                ) : null}
              </div>
              {fulfillmentType === "DELIVERY" ? (
                <>
                  <GroupedSearchSelectField
                    id="administrativeArea"
                    label={c.cityDistrictLabel}
                    value={checkoutMainAdministrativeArea}
                    onChange={setAdministrativeArea}
                    groups={CHECKOUT_ADMINISTRATIVE_AREA_GROUPS}
                    placeholder={c.cityDistrictPlaceholder}
                    listAriaLabel={c.cityDistrictListAria}
                    required
                    requiredErrorMessage={c.cityDistrictRequired}
                  />
                  {showBakuDistrictField ? (
                    <GroupedSearchSelectField
                      id="bakuDistrictAdministrativeArea"
                      label={c.bakuDistrictLabel}
                      value={checkoutBakuDistrictAdministrativeArea}
                      onChange={setAdministrativeArea}
                      groups={[{ label: "", areas: BAKU_DISTRICT_AREAS }]}
                      placeholder={c.bakuDistrictPlaceholder}
                      listAriaLabel={c.bakuDistrictListAria}
                      required
                      requiredErrorMessage={c.bakuDistrictRequired}
                    />
                  ) : null}
                  <div
                    className={[
                      "ui-field",
                      "ui-field--checkout-address",
                      addressLine.trim() !== "" && !isAddressComplete
                        ? "ui-field--error"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <label htmlFor="addressLine">
                      {c.addressLabel}{" "}
                      <span className="ui-field__required" aria-hidden="true">
                        *
                      </span>
                    </label>
                    <textarea
                      id="addressLine"
                      value={addressLine}
                      onChange={(event) =>
                        setAddressLine(event.currentTarget.value)
                      }
                      placeholder={c.addressPlaceholder}
                      required
                      minLength={5}
                      rows={2}
                      aria-invalid={
                        addressLine.trim() !== "" && !isAddressComplete
                      }
                    />
                    {addressLine.trim() !== "" && !isAddressComplete ? (
                      <p className="ui-field__error" role="status">
                        {c.addressMinLength}
                      </p>
                    ) : null}
                  </div>
                  {administrativeArea.trim() !== "" &&
                  !isBakuAdministrativeArea(administrativeArea) ? (
                    <p
                      className="ui-checkout-delivery-notice"
                      role="status"
                    >
                      {c.republicDistrictNotice}
                    </p>
                  ) : null}
                  {resolvedDeliveryZone ? (
                    (parseAznAmount(deliveryFee) ?? 0) === 0 ? (
                      <p className="ui-checkout-delivery-fee">
                        {c.deliveryFreePrefix}{" "}
                        <strong>{c.deliveryFreeValue}</strong>
                      </p>
                    ) : (
                      <p className="ui-checkout-delivery-fee">
                        {c.deliveryFeePrefix}{" "}
                        <strong>{formatAznValue(deliveryFee) ?? "—"}</strong>
                        {deliverySpeed === "EXPRESS" ? (
                          <>
                            {" "}
                            ({c.feeBreakdownStandard}{" "}
                            {formatAznValue(resolvedDeliveryZone.fee) ?? "—"} +{" "}
                            {c.feeBreakdownExpress}{" "}
                            {formatAzn(EXPRESS_DELIVERY_SURCHARGE_AZN)})
                          </>
                        ) : null}
                      </p>
                    )
                  ) : administrativeArea.trim() !== "" &&
                    !isLoadingOptions &&
                    optionsError === null &&
                    isBakuAdministrativeArea(administrativeArea) ? (
                    <p className="ui-checkout-delivery-fee">
                      {c.noDeliveryZone}
                    </p>
                  ) : null}
                </>
              ) : (
                <div className="ui-field">
                  <label htmlFor="pickupLocationId">{c.branchLabel}</label>
                  <select
                    id="pickupLocationId"
                    value={pickupLocationId}
                    onChange={(event) =>
                      setPickupLocationId(event.currentTarget.value)
                    }
                    required
                  >
                    <option value="">{c.branchEmpty}</option>
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
                <p className="ui-checkout-delivery-fee">{c.optionsLoading}</p>
              ) : null}
              {isNotesOpen ? (
                <div className="ui-field ui-field--checkout-notes">
                  <label htmlFor="notes">
                    {c.notesLabel}{" "}
                    <span className="ui-field__optional">({c.notesOptional})</span>
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(event) => setNotes(event.currentTarget.value)}
                    rows={2}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className="ui-checkout-notes-trigger"
                  onClick={() => {
                    setIsNotesOpen(true);
                    window.setTimeout(() => {
                      document.getElementById("notes")?.focus();
                    }, 0);
                  }}
                >
                  <span aria-hidden="true">+</span>
                  {c.notesAddLabel}
                </button>
              )}
          </div>
        </CheckoutStepSection>

        <CheckoutStepSection
          step={3}
          title={c.paymentTitle}
          icon={<IconCreditCard />}
          isComplete={isPaymentStepComplete}
          isExpanded={isPaymentInfoExpanded}
          onToggle={() => setIsPaymentInfoExpanded((current) => !current)}
          summary={paymentInfoSummary}
          completedLabel={c.stepCompleted}
        >
            <div className="ui-field">
              <span
                id="paymentMethod-label"
                className="ui-checkout-payment-options__label"
              >
                {c.paymentMethodLabel}
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
                      {c.paymentModeLabel}
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
                        {c.debitCard}
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
                        {c.installmentCard}
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
                      {c.installmentProviderLabel}
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
                  {isOnlinePaymentSelected ? c.installmentDurationOnline : c.installmentDurationOffline}
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
                        aria-label={c.monthlyAria.replace("{months}", String(plan.months)).replace("{amount}", formatAzn(plan.monthlyAmount))}
                        className={[
                          "ui-checkout-installment-plan",
                          isSelected ? "ui-checkout-installment-plan--active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => setInstallmentMonths(planValue)}
                      >
                        <span className="ui-checkout-installment-plan__months">
                          {plan.months} {c.monthsUnit}
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
            {paymentMethod === "INSTALLMENT" &&
            (!isOnlinePaymentSelected || installmentProviderId !== null) ? (
              <div className="ui-field ui-field--fin-code">
                <label htmlFor="finCode">{c.finCodeLabel}</label>
                <input
                  id="finCode"
                  name="finCode"
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={7}
                  required
                  aria-required="true"
                  aria-describedby="finCode-hint"
                  value={finCode}
                  onChange={(event) =>
                    setFinCode(normalizeCheckoutFinCode(event.currentTarget.value))
                  }
                  placeholder={c.finCodePlaceholder}
                />
                <p id="finCode-hint" className="ui-field__hint">
                  {c.finCodeHint}
                </p>
              </div>
            ) : null}
            {paymentMethod === "INSTALLMENT" && !isOnlinePaymentSelected ? (
              <div className="ui-field ui-field--initial-payment">
                <label htmlFor="initialPayment">{c.initialPaymentLabel}</label>
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
                  placeholder={c.initialPaymentPlaceholder}
                />
              </div>
            ) : null}
          {hideInlineSummary ? null : (
            <OrderSummary subtotal={subtotal} deliveryFee={deliveryFee} />
          )}
        </CheckoutStepSection>
        {submitOutsideForm ? null : submitBlock}
      </form>
      </div>
      {submitOutsideForm ? (
        <div className="ui-cart-layout__aside">
          {aside}
          {submitBlock}
        </div>
      ) : null}
    </>
  );
}
