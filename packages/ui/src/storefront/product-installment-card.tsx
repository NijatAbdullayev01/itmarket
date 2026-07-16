"use client";

import { forwardRef, useEffect, useMemo, useState } from "react";

import { Button } from "../primitives/button";

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

type ProductInstallmentCardProps = {
  totalAmount: number;
  cartId: string;
  variantId: string;
  quantity: number;
  buyNowAction: (formData: FormData) => void | Promise<void>;
  installmentMonths?: readonly number[];
};

function formatInstallmentAmount(amount: number): string {
  return amount.toFixed(2);
}

function getProviderDescription(provider: InstallmentProvider): string {
  return `${provider.label} taksit kartı ilə aylara bölərək ödəyin.`;
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
    installmentMonths = DEFAULT_INSTALLMENT_MONTHS,
  },
  ref,
) {
  const [selectedProviderId, setSelectedProviderId] = useState<InstallmentProviderId>("birbank");

  const selectedProvider = useMemo(
    () => INSTALLMENT_PROVIDERS.find((provider) => provider.id === selectedProviderId) ?? null,
    [selectedProviderId],
  );

  const plans = useMemo(() => {
    if (!selectedProvider) {
      return [];
    }

    const availableMonths = selectedProvider.installmentMonths.filter((months) =>
      installmentMonths.includes(months),
    );
    const monthsToShow =
      availableMonths.length > 0 ? availableMonths : [...selectedProvider.installmentMonths];

    return monthsToShow.map((months) => ({
      months,
      monthlyAmount: totalAmount / months,
    }));
  }, [installmentMonths, selectedProvider, totalAmount]);

  const [selectedMonths, setSelectedMonths] = useState(
    getDefaultMonths(
      INSTALLMENT_PROVIDERS[0]?.installmentMonths ?? DEFAULT_INSTALLMENT_MONTHS,
      installmentMonths,
    ),
  );

  useEffect(() => {
    if (!selectedProvider) {
      return;
    }

    setSelectedMonths(getDefaultMonths(selectedProvider.installmentMonths, installmentMonths));
  }, [installmentMonths, selectedProvider]);

  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return null;
  }

  return (
    <section
      ref={ref}
      id="product-installment"
      className={`ui-product-installment ui-product-installment--${selectedProviderId}`}
      aria-label="Hissə-hissə ödəniş"
    >
      <div className="ui-product-installment__header">
        <h2 className="ui-product-installment__title">Taksitlə aylara bölərək ödə!</h2>
        {selectedProvider ? (
          <p className="ui-product-installment__subtitle">
            {getProviderDescription(selectedProvider)}
          </p>
        ) : null}
      </div>

      <div className="ui-product-installment__providers">
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
                height={provider.id === "tamkart" ? 336 : provider.id === "leobank" ? 240 : 300}
                decoding="async"
              />
            </button>
          );
        })}
      </div>

      {!selectedProvider ? (
        <p className="ui-product-installment__hint">
          Mümkün taksit müddətlərini görmək üçün bank seçin.
        </p>
      ) : null}

      {selectedProvider && plans.length > 0 ? (
      <div className="ui-product-installment__table" role="table" aria-label="Hissə-hissə planları">
        <div className="ui-product-installment__head" role="row">
          <span role="columnheader">Seçim</span>
          <span role="columnheader" className="ui-product-installment__rate">Faiz</span>
          <span role="columnheader">Müddət</span>
          <span role="columnheader">Aylıq ödəniş</span>
          <span role="columnheader">Yekun məbləğ</span>
        </div>

        {plans.map((plan) => {
          const inputId = `installment-${selectedProvider.id}-${plan.months}`;
          const isSelected = selectedMonths === plan.months;

          return (
            <label
              key={plan.months}
              className={
                isSelected
                  ? "ui-product-installment__row ui-product-installment__row--selected"
                  : "ui-product-installment__row"
              }
              role="row"
            >
              <span className="ui-product-installment__choice" role="cell">
                <input
                  id={inputId}
                  type="radio"
                  name="installmentPlan"
                  className="ui-product-installment__radio"
                  checked={isSelected}
                  onChange={() => setSelectedMonths(plan.months)}
                />
              </span>
              <span role="cell" className="ui-product-installment__rate">0</span>
              <span role="cell">{plan.months} ay</span>
              <span role="cell">{formatInstallmentAmount(plan.monthlyAmount)}</span>
              <span role="cell">{formatInstallmentAmount(totalAmount)}</span>
            </label>
          );
        })}
      </div>
      ) : null}

      <div className="ui-product-installment__actions">
        <form action={buyNowAction} className="ui-product-installment__buy-form">
          <input type="hidden" name="cartId" value={cartId} />
          <input type="hidden" name="variantId" value={variantId} />
          <input type="hidden" name="quantity" value={quantity} />
          <input type="hidden" name="installmentMonths" value={selectedMonths} />
          <Button
            type="submit"
            block
            className="ui-product-installment__buy"
            disabled={!selectedProvider}
          >
            Hissə-hissə al
          </Button>
        </form>
      </div>
    </section>
  );
});
