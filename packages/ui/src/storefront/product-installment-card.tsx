"use client";

import { forwardRef, useEffect, useMemo, useState } from "react";

import { Button } from "../primitives/button";
import { formatAzn } from "../utils/format-azn";

const DEFAULT_INSTALLMENT_MONTHS = [6, 12, 18, 24] as const;

type InstallmentProviderId = "birbank" | "tamkart" | "leobank";

type InstallmentProvider = {
  id: InstallmentProviderId;
  label: string;
  logoSrc: string;
  logoClassName: string;
  buttonClassName?: string;
  installmentMonths: readonly number[];
};

const INSTALLMENT_PROVIDERS: readonly InstallmentProvider[] = [
  {
    id: "birbank",
    label: "Birbank",
    logoSrc: "/images/birbank-logo.png",
    logoClassName: "ui-product-installment__provider-logo--birbank",
    installmentMonths: [3, 6, 12, 18, 24],
  },
  {
    id: "tamkart",
    label: "Tam Kart",
    logoSrc: "/images/tam-kart-logo.png",
    logoClassName: "ui-product-installment__provider-logo--tamkart",
    buttonClassName: "ui-product-installment__provider--tamkart",
    installmentMonths: [6, 12, 18, 24],
  },
  {
    id: "leobank",
    label: "Leobank",
    logoSrc: "/images/leobank-logo.png",
    logoClassName: "ui-product-installment__provider-logo--leobank",
    buttonClassName: "ui-product-installment__provider--leobank",
    installmentMonths: [6, 12, 18, 24],
  },
] as const;

type PurchaseMode = "installment" | "partial";

export type ProductInstallmentCardCopy = {
  aria: string;
  modeLabel: string;
  buyInstallment: string;
  buyPartial: string;
  description: string;
  partialDescription: string;
  providerDescription: string; // "{provider} taksit kartı ilə..."
  initialPayment: string;
  initialPaymentPlaceholder: string;
  selectBank: string;
  tableAria: string;
  choice: string;
  rate: string;
  initial: string;
  term: string;
  monthly: string;
  total: string;
  monthsUnit: string;
  planAria?: string; // "{months} {unit}, {amount}"
};

export const defaultProductInstallmentCardCopy: ProductInstallmentCardCopy = {
  aria: "Hissə-hissə ödəniş",
  modeLabel: "Ödəniş növü",
  buyInstallment: "Taksitlə al",
  buyPartial: "Hissə-hissə al",
  description: "Taksit kartı ilə aylara bölərək ödəyin.",
  partialDescription: "Məhsulu hissə-hissə ödəyərək alın.",
  providerDescription: "{provider} taksit kartı ilə aylara bölərək ödəyin.",
  initialPayment: "İlkin ödəniş (məcburi deyil)",
  initialPaymentPlaceholder: "Məs. 100",
  selectBank: "Mümkün taksit müddətlərini görmək üçün bank seçin.",
  tableAria: "Hissə-hissə planları",
  choice: "Seçim",
  rate: "%",
  initial: "İlkin",
  term: "Müddət",
  monthly: "Aylıq",
  total: "Yekun",
  monthsUnit: "ay",
  planAria: "{months} {unit}, aylıq {amount}",
};

type ProductInstallmentCardProps = {
  totalAmount: number;
  cartId: string;
  variantId: string;
  quantity: number;
  buyNowAction: (formData: FormData) => void | Promise<void>;
  /** Stok mövcud olmayanda alış düyməsi deaktiv olur. */
  purchaseDisabled?: boolean;
  installmentMonths?: readonly number[];
  copy?: Partial<ProductInstallmentCardCopy>;
};

const PURCHASE_MODE_IDS: readonly PurchaseMode[] = [
  "installment",
  "partial",
] as const;

function parseInitialPayment(value: string): number {
  const normalized = value.replace(",", ".").trim();
  if (normalized.length === 0) {
    return 0;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

function getPurchaseModeDescription(
  mode: PurchaseMode,
  provider: InstallmentProvider | null,
  copy: ProductInstallmentCardCopy,
): string {
  if (mode === "partial") {
    return copy.partialDescription;
  }

  return provider
    ? copy.providerDescription.replace("{provider}", provider.label)
    : copy.description;
}

function getProviderButtonClassName(
  provider: InstallmentProvider,
  isSelected: boolean,
): string {
  return [
    "ui-product-installment__provider",
    provider.buttonClassName,
    isSelected ? "ui-product-installment__provider--selected" : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function getDefaultMonths(
  providerMonths: readonly number[],
  fallbackMonths: readonly number[],
): number {
  const availableMonths = providerMonths.filter((months) =>
    fallbackMonths.includes(months),
  );

  if (availableMonths.length > 0) {
    return availableMonths[availableMonths.length - 1] ?? availableMonths[0] ?? 6;
  }

  return providerMonths[providerMonths.length - 1] ?? providerMonths[0] ?? 6;
}

function buildPlanAria(
  copy: ProductInstallmentCardCopy,
  months: number,
  monthlyAmount: number,
): string {
  const template =
    copy.planAria ?? "{months} {unit}, aylıq {amount}";
  return template
    .replace("{months}", String(months))
    .replace("{unit}", copy.monthsUnit)
    .replace("{amount}", formatAzn(monthlyAmount));
}

export const ProductInstallmentCard = forwardRef<
  HTMLElement,
  ProductInstallmentCardProps
>(function ProductInstallmentCard(
  {
    totalAmount,
    cartId,
    variantId,
    quantity,
    buyNowAction,
    purchaseDisabled = false,
    installmentMonths = DEFAULT_INSTALLMENT_MONTHS,
    copy: copyProp,
  },
  ref,
) {
  const copy = { ...defaultProductInstallmentCardCopy, ...copyProp };
  const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>("installment");
  const [initialPayment, setInitialPayment] = useState("");
  const [selectedProviderId, setSelectedProviderId] =
    useState<InstallmentProviderId>("birbank");

  const selectedProvider = useMemo(
    () =>
      INSTALLMENT_PROVIDERS.find((provider) => provider.id === selectedProviderId) ??
      null,
    [selectedProviderId],
  );

  const isInstallmentMode = purchaseMode === "installment";
  const modeLabels: Record<PurchaseMode, string> = {
    installment: copy.buyInstallment,
    partial: copy.buyPartial,
  };

  const initialPaymentAmount = useMemo(() => {
    if (isInstallmentMode) {
      return 0;
    }

    return Math.min(parseInitialPayment(initialPayment), totalAmount);
  }, [initialPayment, isInstallmentMode, totalAmount]);

  const plans = useMemo(() => {
    if (isInstallmentMode) {
      if (!selectedProvider) {
        return [];
      }

      const availableMonths = selectedProvider.installmentMonths.filter((months) =>
        installmentMonths.includes(months),
      );
      const monthsToShow =
        availableMonths.length > 0
          ? availableMonths
          : [...selectedProvider.installmentMonths];

      return monthsToShow.map((months) => ({
        months,
        initialPaymentAmount: 0,
        monthlyAmount: totalAmount / months,
      }));
    }

    const remainingAmount = Math.max(totalAmount - initialPaymentAmount, 0);

    return installmentMonths.map((months) => ({
      months,
      initialPaymentAmount,
      monthlyAmount: remainingAmount / months,
    }));
  }, [
    initialPaymentAmount,
    installmentMonths,
    isInstallmentMode,
    selectedProvider,
    totalAmount,
  ]);

  const [selectedMonths, setSelectedMonths] = useState(
    getDefaultMonths(
      INSTALLMENT_PROVIDERS[0]?.installmentMonths ?? DEFAULT_INSTALLMENT_MONTHS,
      installmentMonths,
    ),
  );

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.months === selectedMonths) ?? plans[plans.length - 1] ?? null,
    [plans, selectedMonths],
  );

  useEffect(() => {
    if (isInstallmentMode) {
      setInitialPayment("");
    }
  }, [isInstallmentMode]);

  useEffect(() => {
    if (isInstallmentMode) {
      if (!selectedProvider) {
        return;
      }

      setSelectedMonths(
        getDefaultMonths(selectedProvider.installmentMonths, installmentMonths),
      );
      return;
    }

    setSelectedMonths(getDefaultMonths(installmentMonths, installmentMonths));
  }, [installmentMonths, isInstallmentMode, selectedProvider]);

  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return null;
  }

  return (
    <section
      ref={ref}
      id="product-installment"
      className={[
        "ui-product-installment",
        isInstallmentMode
          ? `ui-product-installment--${selectedProviderId}`
          : "ui-product-installment--partial",
      ].join(" ")}
      aria-label={copy.aria}
    >
      <div className="ui-product-installment__header">
        <div
          className="ui-product-installment__mode"
          role="tablist"
          aria-label={copy.modeLabel}
        >
          {PURCHASE_MODE_IDS.map((modeId) => {
            const isSelected = purchaseMode === modeId;

            return (
              <button
                key={modeId}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={
                  isSelected
                    ? "ui-product-installment__mode-btn ui-product-installment__mode-btn--active"
                    : "ui-product-installment__mode-btn"
                }
                onClick={() => setPurchaseMode(modeId)}
              >
                {modeLabels[modeId]}
              </button>
            );
          })}
        </div>
        <div className="ui-product-installment__intro">
          <p className="ui-product-installment__subtitle">
            {getPurchaseModeDescription(purchaseMode, selectedProvider, copy)}
          </p>
          {isInstallmentMode ? (
            <span className="ui-product-installment__rate-badge">
              0{copy.rate}
            </span>
          ) : null}
        </div>
        {!isInstallmentMode ? (
          <div className="ui-field ui-product-installment__initial-payment">
            <label htmlFor="product-initial-payment">{copy.initialPayment}</label>
            <input
              id="product-initial-payment"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={initialPayment}
              onChange={(event) => setInitialPayment(event.currentTarget.value)}
              placeholder={copy.initialPaymentPlaceholder}
            />
          </div>
        ) : null}
      </div>

      {isInstallmentMode ? (
        <div
          className="ui-product-installment__providers"
          role="group"
          aria-label={copy.selectBank}
        >
          {INSTALLMENT_PROVIDERS.map((provider) => {
            const isSelected = selectedProviderId === provider.id;

            return (
              <button
                key={provider.id}
                type="button"
                className={getProviderButtonClassName(provider, isSelected)}
                aria-label={provider.label}
                aria-pressed={isSelected}
                onClick={() => setSelectedProviderId(provider.id)}
              >
                <img
                  src={provider.logoSrc}
                  alt=""
                  className={`ui-product-installment__provider-logo ${provider.logoClassName}`}
                  width={provider.id === "tamkart" ? 1034 : 600}
                  height={
                    provider.id === "tamkart"
                      ? 336
                      : provider.id === "leobank"
                        ? 240
                        : 300
                  }
                  loading="lazy"
                  decoding="async"
                />
              </button>
            );
          })}
        </div>
      ) : null}

      {isInstallmentMode && !selectedProvider ? (
        <p className="ui-product-installment__hint">{copy.selectBank}</p>
      ) : null}

      {plans.length > 0 ? (
        <div className="ui-product-installment__plans-block">
          <div
            className="ui-product-installment__plans"
            role="radiogroup"
            aria-label={copy.tableAria}
          >
            {plans.map((plan) => {
              const isSelected = selectedMonths === plan.months;

              return (
                <button
                  key={plan.months}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={buildPlanAria(copy, plan.months, plan.monthlyAmount)}
                  className={
                    isSelected
                      ? "ui-product-installment__plan ui-product-installment__plan--selected"
                      : "ui-product-installment__plan"
                  }
                  onClick={() => setSelectedMonths(plan.months)}
                >
                  <span className="ui-product-installment__plan-term">
                    {plan.months} {copy.monthsUnit}
                  </span>
                  <span className="ui-product-installment__plan-amount">
                    <span className="ui-product-installment__plan-monthly">
                      {formatAzn(plan.monthlyAmount)}
                    </span>
                    <span className="ui-product-installment__plan-period">
                      {copy.monthly}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {selectedPlan ? (
            <dl className="ui-product-installment__summary">
              {!isInstallmentMode && selectedPlan.initialPaymentAmount > 0 ? (
                <div className="ui-product-installment__summary-row">
                  <dt>{copy.initial}</dt>
                  <dd>{formatAzn(selectedPlan.initialPaymentAmount)}</dd>
                </div>
              ) : null}
              <div className="ui-product-installment__summary-row ui-product-installment__summary-row--total">
                <dt>{copy.total}</dt>
                <dd>{formatAzn(totalAmount)}</dd>
              </div>
            </dl>
          ) : null}
        </div>
      ) : null}

      <div className="ui-product-installment__actions">
        {purchaseDisabled ? (
          <Button
            type="button"
            block
            className="ui-product-installment__buy"
            disabled
          >
            {modeLabels[purchaseMode]}
          </Button>
        ) : (
          <form action={buyNowAction} className="ui-product-installment__buy-form">
            <input type="hidden" name="cartId" value={cartId} />
            <input type="hidden" name="variantId" value={variantId} />
            <input type="hidden" name="quantity" value={quantity} />
            <input type="hidden" name="installmentMonths" value={selectedMonths} />
            {!isInstallmentMode ? (
              <input type="hidden" name="initialPayment" value={initialPayment} />
            ) : null}
            <Button
              type="submit"
              block
              className="ui-product-installment__buy"
              disabled={isInstallmentMode && !selectedProvider}
            >
              {modeLabels[purchaseMode]}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
});
