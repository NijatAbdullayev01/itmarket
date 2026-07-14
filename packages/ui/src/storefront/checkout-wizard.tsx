"use client";

import { useEffect, useMemo, useState } from "react";

import { Alert } from "../primitives/alert";
import { Button } from "../primitives/button";
import { OrderSummary } from "./order-summary";
import { formatAzn } from "../utils/format-azn";

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
};

const steps = [
  { id: 1, label: "Təhvil" },
  { id: 2, label: "Əlaqə və ünvan" },
  { id: 3, label: "Ödəniş" },
  { id: 4, label: "Təsdiq" },
] as const;

function normalizeAdministrativeArea(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === "" ? undefined : normalized;
}

export function CheckoutWizard({
  cartId,
  subtotal,
  initialFulfillment,
  paymentMethods,
  checkoutCashAction,
  checkoutOnlineAction,
}: CheckoutWizardProps) {
  const cardOption = paymentMethods.find((method) => method.method === "CARD");
  const installmentOption = paymentMethods.find(
    (method) => method.method === "INSTALLMENT",
  );
  const [step, setStep] = useState(1);
  const [fulfillmentType, setFulfillmentType] = useState<"DELIVERY" | "PICKUP">(
    initialFulfillment.deliveryZones[0] ? "DELIVERY" : "PICKUP",
  );
  const [administrativeArea, setAdministrativeArea] = useState("baku");
  const [fulfillment, setFulfillment] = useState(initialFulfillment);
  const [deliveryZoneId, setDeliveryZoneId] = useState(
    initialFulfillment.deliveryZones[0]?.id ?? "",
  );
  const [pickupLocationId, setPickupLocationId] = useState(
    initialFulfillment.pickupLocations[0]?.id ?? "",
  );
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "INSTALLMENT">(
    cardOption?.method ?? installmentOption?.method ?? "CARD",
  );
  const [installmentMonths, setInstallmentMonths] = useState(
    installmentOption?.installmentMonths[0]?.toString() ?? "",
  );
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [notes, setNotes] = useState("");
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
          if (
            current !== "" &&
            nextOptions.pickupLocations.some((pickup) => pickup.id === current)
          ) {
            return current;
          }
          return nextOptions.pickupLocations[0]?.id ?? "";
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
  const selectedPickupLocation = useMemo(
    () =>
      fulfillment.pickupLocations.find((pickup) => pickup.id === pickupLocationId) ??
      null,
    [fulfillment.pickupLocations, pickupLocationId],
  );

  const canProceedStep1 =
    fulfillmentType === "DELIVERY"
      ? selectedDeliveryZone !== null
      : selectedPickupLocation !== null;
  const canProceedStep2 =
    recipientName.trim() !== "" &&
    phone.trim() !== "" &&
    addressLine.trim() !== "" &&
    (fulfillmentType !== "DELIVERY" || administrativeArea.trim() !== "");
  const canSubmitCash = canProceedStep1 && canProceedStep2;
  const canSubmitOnline =
    canSubmitCash &&
    paymentMethods.length > 0 &&
    (paymentMethod !== "INSTALLMENT" || installmentMonths !== "");

  return (
    <div>
      <ol className="ui-checkout-steps" aria-label="Checkout addımları">
        {steps.map((entry) => {
          const state =
            entry.id < step
              ? "done"
              : entry.id === step
                ? "active"
                : "upcoming";
          return (
            <li
              key={entry.id}
              className={
                state === "active"
                  ? "ui-checkout-step ui-checkout-step--active"
                  : state === "done"
                    ? "ui-checkout-step ui-checkout-step--done"
                    : "ui-checkout-step"
              }
              aria-current={state === "active" ? "step" : undefined}
            >
              {entry.id}. {entry.label}
            </li>
          );
        })}
      </ol>

      <form className="ui-card ui-checkout-panel">
        <input type="hidden" name="cartId" value={cartId} />
        <input type="hidden" name="fulfillmentType" value={fulfillmentType} />
        <input type="hidden" name="recipientName" value={recipientName} />
        <input type="hidden" name="phone" value={phone} />
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="addressLine" value={addressLine} />
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

        {step === 1 ? (
          <>
            <h2>Təhvil seçimi</h2>
            <div className="ui-field">
              <label htmlFor="fulfillmentType">Təhvil alma növü</label>
              <select
                id="fulfillmentType"
                name="fulfillmentType"
                value={fulfillmentType}
                onChange={(event) => {
                  setOptionsError(null);
                  setFulfillmentType(
                    event.currentTarget.value as "DELIVERY" | "PICKUP",
                  );
                }}
              >
                <option
                  disabled={fulfillment.deliveryZones.length === 0}
                  value="DELIVERY"
                >
                  Ünvana çatdırılma
                </option>
                <option
                  disabled={fulfillment.pickupLocations.length === 0}
                  value="PICKUP"
                >
                  Mağazadan götürmə
                </option>
              </select>
            </div>
            {fulfillmentType === "DELIVERY" ? (
              <>
                <div className="ui-field">
                  <label htmlFor="administrativeArea">Rayon/ərazi</label>
                  <input
                    id="administrativeArea"
                    name="administrativeArea"
                    value={administrativeArea}
                    onChange={(event) =>
                      setAdministrativeArea(event.currentTarget.value)
                    }
                    required
                  />
                </div>
                <div className="ui-field">
                  <label htmlFor="deliveryZoneId">Çatdırılma zonası</label>
                  <select
                    id="deliveryZoneId"
                    name="deliveryZoneId"
                    value={deliveryZoneId}
                    onChange={(event) => setDeliveryZoneId(event.currentTarget.value)}
                    required
                  >
                    <option value="">Seçilməyib</option>
                    {fulfillment.deliveryZones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name} · {formatAzn(Number(zone.fee))} ·{" "}
                        {zone.estimatedMinDays}-{zone.estimatedMaxDays} gün
                      </option>
                    ))}
                  </select>
                </div>
                {selectedDeliveryZone ? (
                  <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
                    Çatdırılma haqqı:{" "}
                    <strong>{formatAzn(Number(selectedDeliveryZone.fee))}</strong>
                  </p>
                ) : (
                  <Alert variant="info">
                    Seçilmiş rayon üçün aktiv çatdırılma zonası yoxdur.
                  </Alert>
                )}
              </>
            ) : (
              <div className="ui-field">
                <label htmlFor="pickupLocationId">Pickup məntəqəsi</label>
                <select
                  id="pickupLocationId"
                  name="pickupLocationId"
                  value={pickupLocationId}
                  onChange={(event) => setPickupLocationId(event.currentTarget.value)}
                  required
                >
                  <option value="">Seçilməyib</option>
                  {fulfillment.pickupLocations.map((pickup) => (
                    <option key={pickup.id} value={pickup.id}>
                      {pickup.name} · {pickup.addressLine}
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
            <div className="ui-checkout-actions">
              <Button
                type="button"
                disabled={!canProceedStep1}
                onClick={() => setStep(2)}
              >
                Davam et
              </Button>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h2>Əlaqə və ünvan</h2>
            <div className="ui-field">
              <label htmlFor="recipientName">Ad və soyad</label>
              <input
                id="recipientName"
                name="recipientName"
                value={recipientName}
                onChange={(event) => setRecipientName(event.currentTarget.value)}
                required
              />
            </div>
            <div className="ui-field">
              <label htmlFor="phone">Telefon</label>
              <input
                id="phone"
                name="phone"
                value={phone}
                onChange={(event) => setPhone(event.currentTarget.value)}
                placeholder="+994..."
                required
              />
            </div>
            <div className="ui-field">
              <label htmlFor="email">E-poçt</label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.currentTarget.value)}
              />
            </div>
            <div className="ui-field">
              <label htmlFor="addressLine">Ünvan</label>
              <textarea
                id="addressLine"
                name="addressLine"
                value={addressLine}
                onChange={(event) => setAddressLine(event.currentTarget.value)}
                required
              />
            </div>
            <div className="ui-field">
              <label htmlFor="notes">Qeyd</label>
              <textarea
                id="notes"
                name="notes"
                value={notes}
                onChange={(event) => setNotes(event.currentTarget.value)}
              />
            </div>
            <div className="ui-checkout-actions">
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                Geri
              </Button>
              <Button
                type="button"
                disabled={!canProceedStep2}
                onClick={() => setStep(3)}
              >
                Davam et
              </Button>
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <h2>Ödəniş üsulu</h2>
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
            <OrderSummary
              subtotal={subtotal}
              deliveryFee={
                fulfillmentType === "DELIVERY" && selectedDeliveryZone
                  ? selectedDeliveryZone.fee
                  : "0"
              }
            />
            <div className="ui-checkout-actions">
              <Button type="button" variant="secondary" onClick={() => setStep(2)}>
                Geri
              </Button>
              <Button type="button" onClick={() => setStep(4)}>
                Təsdiqə keç
              </Button>
            </div>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <h2>Sifarişi təsdiqləyin</h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              {recipientName} · {phone}
              <br />
              {fulfillmentType === "DELIVERY"
                ? selectedDeliveryZone?.name
                : selectedPickupLocation?.name}
            </p>
            <OrderSummary
              subtotal={subtotal}
              deliveryFee={
                fulfillmentType === "DELIVERY" && selectedDeliveryZone
                  ? selectedDeliveryZone.fee
                  : "0"
              }
            />
            <div className="ui-checkout-actions">
              <Button type="button" variant="secondary" onClick={() => setStep(3)}>
                Geri
              </Button>
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
          </>
        ) : null}
      </form>
    </div>
  );
}
