"use client";

import { useRouter } from "next/navigation";
import {
  useId,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from "react";

import { AZERBAIJAN_ADMINISTRATIVE_AREA_GROUPS } from "../data/azerbaijan-administrative-areas";
import {
  accountStatusBadgeClass,
  customerOrderStatusLabel,
} from "../order-status";
import { Alert } from "../primitives/alert";
import { Button } from "../primitives/button";
import { EmptyState, EmptyStateLink } from "../primitives/empty-state";
import { useConfirmDialog } from "../primitives/use-confirm-dialog";
import { formatAznValue } from "../utils/format-azn";
import { IconCart, IconLogout, IconMapPin } from "./icons";
import { PhoneNumberField } from "./phone-number-field";

export type AccountCustomerProfile = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
};

export type AccountOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  fulfillmentType: "DELIVERY" | "PICKUP";
  recipientName: string | null;
  itemCount: number;
  grandTotal: string;
  currency: "AZN";
  createdAt: string;
  updatedAt: string;
};

export type AccountAddress = {
  id: string;
  label: string | null;
  recipientName: string;
  phone: string;
  administrativeArea: string | null;
  addressLine: string;
  notes: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

type ActionResult = {
  error?: string;
  success?: boolean;
};

type AccountDashboardProps = {
  profile: AccountCustomerProfile;
  orders: AccountOrder[];
  addresses: AccountAddress[];
  onUpdateProfile: (formData: FormData) => Promise<ActionResult>;
  onCreateAddress: (formData: FormData) => Promise<ActionResult>;
  onUpdateAddress: (formData: FormData) => Promise<ActionResult>;
  onDeleteAddress: (formData: FormData) => Promise<ActionResult>;
  onCancelOrder: (formData: FormData) => Promise<ActionResult>;
  onLogout: () => Promise<ActionResult>;
};

type AccountTab = "profile" | "orders" | "addresses";

function resolveAdministrativeAreaLabel(value: string | null) {
  if (value === null || value.trim() === "") return null;
  for (const group of AZERBAIJAN_ADMINISTRATIVE_AREA_GROUPS) {
    const match = group.areas.find(
      (area) => area.value === value || area.label === value,
    );
    if (match) return match.label;
  }
  return value;
}

function formatOrderDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const parts = new Intl.DateTimeFormat("az-AZ", {
    timeZone: "Asia/Baku",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const lookup = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  const day = lookup.day;
  const month = lookup.month;
  const year = lookup.year;
  const hour = lookup.hour;
  const minute = lookup.minute;
  if (!day || !month || !year || !hour || !minute) {
    return value;
  }

  // Azərbaycan standartı: DD.MM.YYYY, HH:mm (Asia/Baku)
  return `${day}.${month}.${year}, ${hour}:${minute}`;
}

function displayName(profile: AccountCustomerProfile) {
  const parts = [profile.firstName, profile.lastName].filter(
    (part): part is string => typeof part === "string" && part.trim() !== "",
  );
  return parts.length > 0 ? parts.join(" ") : profile.email;
}

const CUSTOMER_CANCELLABLE_ORDER_STATUSES = new Set([
  "PENDING_PAYMENT",
  "UNDER_REVIEW",
  "CONFIRMED",
]);

function canCustomerCancelOrder(order: AccountOrder) {
  return CUSTOMER_CANCELLABLE_ORDER_STATUSES.has(order.status);
}

export function AccountDashboard({
  profile,
  orders,
  addresses,
  onUpdateProfile,
  onCreateAddress,
  onUpdateAddress,
  onDeleteAddress,
  onCancelOrder,
  onLogout,
}: AccountDashboardProps) {
  const router = useRouter();
  const formId = useId();
  const [tab, setTab] = useState<AccountTab>("profile");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const { requestConfirm, confirmDialog } = useConfirmDialog();

  const editingAddress = useMemo(
    () => addresses.find((address) => address.id === editingAddressId) ?? null,
    [addresses, editingAddressId],
  );

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  function switchTab(next: AccountTab) {
    setTab(next);
    clearMessages();
    setShowAddressForm(false);
    setEditingAddressId(null);
  }

  function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("phone", phone);
    clearMessages();
    startTransition(async () => {
      const result = await onUpdateProfile(formData);
      if (result.error !== undefined) {
        setError(result.error);
        return;
      }
      setSuccess("Şəxsi məlumatlar yeniləndi");
      router.refresh();
    });
  }

  function handleAddressSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const recipientName =
      editingAddress?.recipientName ?? displayName(profile);
    const addressPhone = editingAddress?.phone ?? profile.phone ?? "";
    clearMessages();
    if (addressPhone.trim().length < 7) {
      setError(
        "Ünvan əlavə etmək üçün şəxsi məlumatlarda telefon nömrənizi yazın",
      );
      return;
    }
    formData.set("recipientName", recipientName);
    formData.set("phone", addressPhone);
    if (editingAddress?.label !== null && editingAddress?.label !== undefined) {
      formData.set("label", editingAddress.label);
    }
    startTransition(async () => {
      const action =
        editingAddressId === null ? onCreateAddress : onUpdateAddress;
      const result = await action(formData);
      if (result.error !== undefined) {
        setError(result.error);
        return;
      }
      setSuccess(
        editingAddressId === null ? "Ünvan əlavə olundu" : "Ünvan yeniləndi",
      );
      setShowAddressForm(false);
      setEditingAddressId(null);
      router.refresh();
    });
  }

  function confirmDeleteAddress(address: AccountAddress) {
    requestConfirm({
      title: "Ünvanı sil",
      message: `"${address.label}" ünvanını silmək istəyirsiniz? Bu əməliyyat geri qaytarıla bilməz.`,
      onConfirm: async () => {
        clearMessages();
        const formData = new FormData();
        formData.set("addressId", address.id);
        await new Promise<void>((resolve) => {
          startTransition(async () => {
            const result = await onDeleteAddress(formData);
            if (result.error !== undefined) {
              setError(result.error);
            } else {
              setSuccess("Ünvan silindi");
              router.refresh();
            }
            resolve();
          });
        });
      },
    });
  }

  function confirmCancelOrder(order: AccountOrder) {
    requestConfirm({
      title: "Sifarişi ləğv et",
      message: `#${order.orderNumber} sifarişini ləğv etmək istəyirsiniz? Bu əməliyyat geri qaytarıla bilməz.`,
      confirmLabel: "Ləğv et",
      pendingLabel: "Ləğv edilir…",
      onConfirm: async () => {
        clearMessages();
        const formData = new FormData();
        formData.set("orderId", order.id);
        await new Promise<void>((resolve) => {
          startTransition(async () => {
            const result = await onCancelOrder(formData);
            if (result.error !== undefined) {
              setError(result.error);
            } else {
              setSuccess("Sifariş ləğv edildi");
              router.refresh();
            }
            resolve();
          });
        });
      },
    });
  }

  function openCreateAddress() {
    clearMessages();
    setEditingAddressId(null);
    setShowAddressForm(true);
  }

  function openEditAddress(address: AccountAddress) {
    clearMessages();
    setEditingAddressId(address.id);
    setShowAddressForm(true);
  }

  function handleLogout() {
    clearMessages();
    startTransition(async () => {
      const result = await onLogout();
      if (result.error !== undefined) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="ui-account-dashboard">
      <header className="ui-account-dashboard__header">
        <div className="ui-account-dashboard__intro">
          <div className="ui-account-dashboard__title-row">
            <h1 className="ui-account-dashboard__title">Hesabım</h1>
            <Button
              type="button"
              variant="danger"
              className="ui-account-dashboard__logout"
              disabled={pending}
              onClick={handleLogout}
            >
              Çıxış
              <IconLogout width={14} height={14} />
            </Button>
          </div>
          <p className="ui-account-dashboard__lead">
            Salam, {displayName(profile)}.
            <br />
            <span className="ui-account-dashboard__lead-line">
              Şəxsi məlumatlarınızı, sifarişlərinizi və ünvanlarınızı buradan
              idarə edin.
            </span>
          </p>
        </div>
      </header>

      <div
        className="ui-account-dashboard__tabs"
        role="tablist"
        aria-label="Hesab bölmələri"
      >
        {(
          [
            ["profile", "Şəxsi məlumatlar"],
            ["orders", "Sifarişlər"],
            ["addresses", "Ünvanlar"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            className={
              tab === value
                ? "ui-account-dashboard__tab ui-account-dashboard__tab--active"
                : "ui-account-dashboard__tab"
            }
            onClick={() => switchTab(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {error !== null ? <Alert variant="error">{error}</Alert> : null}
      {success !== null ? <Alert variant="success">{success}</Alert> : null}

      {tab === "profile" ? (
        <form
          className="ui-account-dashboard__panel"
          onSubmit={handleProfileSubmit}
        >
          <div className="ui-account-auth__name-row">
            <label className="ui-field" htmlFor={`${formId}-firstName`}>
              <span>
                Ad <span className="ui-field__required">*</span>
              </span>
              <input
                id={`${formId}-firstName`}
                name="firstName"
                type="text"
                autoComplete="given-name"
                required
                minLength={2}
                defaultValue={profile.firstName ?? ""}
              />
            </label>
            <label className="ui-field" htmlFor={`${formId}-lastName`}>
              <span>
                Soyad <span className="ui-field__required">*</span>
              </span>
              <input
                id={`${formId}-lastName`}
                name="lastName"
                type="text"
                autoComplete="family-name"
                required
                minLength={2}
                defaultValue={profile.lastName ?? ""}
              />
            </label>
          </div>

          <label className="ui-field" htmlFor={`${formId}-email`}>
            <span>E-poçt</span>
            <input
              id={`${formId}-email`}
              type="email"
              value={profile.email}
              disabled
              readOnly
            />
          </label>

          <PhoneNumberField
            id={`${formId}-phone`}
            label="Telefon"
            value={phone}
            onChange={setPhone}
            autoComplete="tel"
          />

          <Button
            type="submit"
            disabled={pending}
            className="ui-product-purchase__cta"
          >
            {pending ? "Yadda saxlanılır..." : "Yadda saxla"}
          </Button>
        </form>
      ) : null}

      {tab === "orders" ? (
        <div className="ui-account-dashboard__panel">
          {orders.length === 0 ? (
            <EmptyState
              title="Sifariş yoxdur"
              description="Hələ sifariş verməmisiniz? İndi məhsullara baxın və alış veriş edin."
              icon={<IconCart width={40} height={40} />}
              action={<EmptyStateLink href="/" label="Məhsullara bax" />}
            />
          ) : (
            <ul className="ui-account-orders">
              {orders.map((order) => (
                <li key={order.id} className="ui-account-orders__item">
                  <div className="ui-account-orders__layout">
                    <div className="ui-account-orders__main">
                      <div className="ui-account-orders__top">
                        <p className="ui-account-orders__number">
                          #{order.orderNumber}
                        </p>
                        <p className="ui-account-orders__meta">
                          {formatOrderDate(order.createdAt)} ·{" "}
                          {order.fulfillmentType === "DELIVERY"
                            ? "Çatdırılma"
                            : "Mağazadan götürmə"}
                          {order.itemCount > 0
                            ? ` · ${order.itemCount} məhsul`
                            : ""}
                        </p>
                      </div>
                      <div className="ui-account-orders__badges">
                        <span
                          className={accountStatusBadgeClass(order.status)}
                        >
                          {customerOrderStatusLabel(
                            order.status,
                            order.fulfillmentType,
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="ui-account-orders__aside">
                      <p className="ui-account-orders__total">
                        {formatAznValue(order.grandTotal) ?? order.grandTotal}
                      </p>
                    </div>
                    {order.recipientName !== null ||
                    canCustomerCancelOrder(order) ? (
                      <div className="ui-account-orders__footer">
                        {order.recipientName !== null ? (
                          <p className="ui-account-orders__recipient">
                            Alıcı: {order.recipientName}
                          </p>
                        ) : null}
                        {canCustomerCancelOrder(order) ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="ui-account-orders__cancel"
                            disabled={pending}
                            onClick={() => confirmCancelOrder(order)}
                          >
                            Sifarişi ləğv et
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {tab === "addresses" ? (
        <div className="ui-account-dashboard__panel">
          {showAddressForm ? (
            <form
              className="ui-account-address-form"
              onSubmit={handleAddressSubmit}
            >
              {editingAddressId !== null ? (
                <input type="hidden" name="addressId" value={editingAddressId} />
              ) : null}
              <label className="ui-field" htmlFor={`${formId}-address-area`}>
                <span>Şəhər / Rayon</span>
                <select
                  id={`${formId}-address-area`}
                  name="administrativeArea"
                  defaultValue={editingAddress?.administrativeArea ?? ""}
                >
                  <option value="">Seçin</option>
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
              </label>
              <label className="ui-field" htmlFor={`${formId}-address-line`}>
                <span>
                  Ünvan <span className="ui-field__required">*</span>
                </span>
                <textarea
                  id={`${formId}-address-line`}
                  name="addressLine"
                  required
                  minLength={5}
                  rows={3}
                  defaultValue={editingAddress?.addressLine ?? ""}
                />
              </label>
              <label className="ui-field" htmlFor={`${formId}-address-notes`}>
                <span>Qeyd</span>
                <textarea
                  id={`${formId}-address-notes`}
                  name="notes"
                  rows={2}
                  defaultValue={editingAddress?.notes ?? ""}
                />
              </label>
              <label className="ui-account-address-form__checkbox">
                <input
                  type="checkbox"
                  name="isDefault"
                  value="true"
                  defaultChecked={
                    editingAddress?.isDefault ?? addresses.length === 0
                  }
                />
                <span>Əsas ünvan et</span>
              </label>
              <div className="ui-account-address-form__actions">
                <Button
                  type="submit"
                  disabled={pending}
                  className="ui-product-purchase__cta"
                >
                  {pending ? "Yadda saxlanılır..." : "Yadda saxla"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    setShowAddressForm(false);
                    setEditingAddressId(null);
                  }}
                >
                  Ləğv et
                </Button>
              </div>
            </form>
          ) : null}

          {!showAddressForm && addresses.length === 0 ? (
            <EmptyState
              title="Ünvan yoxdur"
              description="Çatdırılma ünvanlarınızı əlavə edin ki, növbəti sifarişdə daha tez doldurasınız."
              icon={<IconMapPin width={40} height={40} />}
              action={
                <Button type="button" onClick={openCreateAddress}>
                  Ünvan əlavə et
                </Button>
              }
            />
          ) : null}

          {!showAddressForm && addresses.length > 0 ? (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={openCreateAddress}
              >
                Ünvan əlavə et
              </Button>
              <ul className="ui-account-addresses">
                {addresses.map((address) => (
                  <li key={address.id} className="ui-account-addresses__item">
                    <div className="ui-account-addresses__body">
                      <div className="ui-account-addresses__title-row">
                        <p className="ui-account-addresses__title">
                          {resolveAdministrativeAreaLabel(
                            address.administrativeArea,
                          ) || "Ünvan"}
                        </p>
                        {address.isDefault ? (
                          <span className="ui-account-addresses__default">
                            Əsas
                          </span>
                        ) : null}
                      </div>
                      <p className="ui-account-addresses__line">
                        {[
                          resolveAdministrativeAreaLabel(
                            address.administrativeArea,
                          ),
                          address.addressLine,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      {address.notes !== null && address.notes.trim() !== "" ? (
                        <p className="ui-account-addresses__notes">
                          {address.notes}
                        </p>
                      ) : null}
                    </div>
                    <div className="ui-account-addresses__actions">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => openEditAddress(address)}
                        disabled={pending}
                      >
                        Redaktə
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => confirmDeleteAddress(address)}
                        disabled={pending}
                      >
                        Sil
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

        </div>
      ) : null}
      {confirmDialog}
    </section>
  );
}
