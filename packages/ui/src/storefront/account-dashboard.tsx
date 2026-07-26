"use client";

import { canCustomerCancelOrderStatus } from "@itmarket/contracts";
import { useRouter } from "next/navigation";
import {
  useEffect,
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
  type OrderStatusLabelMaps,
} from "../order-status";
import { Alert } from "../primitives/alert";
import { Button } from "../primitives/button";
import { EmptyState, EmptyStateLink } from "../primitives/empty-state";
import { OrderCancelReasonDialog } from "../primitives/order-cancel-reason-dialog";
import { useConfirmDialog } from "../primitives/use-confirm-dialog";
import { formatAzDateTime } from "../utils/format-az-date";
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

export type AccountOrderItemReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

export type AccountOrderItem = {
  id: string;
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  lineTotal: string;
  productId: string;
  productSlug: string;
  review: AccountOrderItemReview | null;
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
  items: AccountOrderItem[];
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

export type AccountDashboardCopy = {
  title: string;
  logout: string;
  greeting: string;
  lead: string;
  tabsAria: string;
  profileTab: string;
  ordersTab: string;
  addressesTab: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneLabel: string;
  saving: string;
  save: string;
  profileUpdated: string;
  addressPhoneRequired: string;
  addressAdded: string;
  addressUpdated: string;
  deleteAddressTitle: string;
  deleteAddressMessage: string;
  addressDeleted: string;
  orderCancelled: string;
  noOrdersTitle: string;
  noOrdersDescription: string;
  viewProducts: string;
  orderDelivery: string;
  orderPickup: string;
  productCountSuffix: string;
  recipientLabel: string;
  cancelOrder: string;
  leaveReview: string;
  leaveReviewPending: string;
  reviewTitle: string;
  reviewTitlePlural: string;
  reviewPerProductHint: string;
  yourReviews: string;
  reviewCommentLabel: string;
  reviewCommentPlaceholder: string;
  reviewSubmit: string;
  reviewSubmitting: string;
  reviewSubmitted: string;
  reviewSuccess: string;
  reviewRatingRequired: string;
  reviewRatingAria: string;
  cityDistrictLabel: string;
  selectEmpty: string;
  addressLabel: string;
  notesLabel: string;
  makeDefault: string;
  cancelButton: string;
  noAddressesTitle: string;
  noAddressesDescription: string;
  addAddress: string;
  defaultBadge: string;
  addressFallback: string;
  editButton: string;
  deleteButton: string;
};

export const defaultAccountDashboardCopy: AccountDashboardCopy = {
  title: "Hesabım",
  logout: "Çıxış",
  greeting: "Salam, {name}.",
  lead: "Şəxsi məlumatlarınızı, sifarişlərinizi və ünvanlarınızı buradan idarə edin.",
  tabsAria: "Hesab bölmələri",
  profileTab: "Şəxsi məlumatlar",
  ordersTab: "Sifarişlər",
  addressesTab: "Ünvanlar",
  firstName: "Ad",
  lastName: "Soyad",
  email: "E-poçt",
  phoneLabel: "Telefon",
  saving: "Yadda saxlanılır...",
  save: "Yadda saxla",
  profileUpdated: "Şəxsi məlumatlar yeniləndi",
  addressPhoneRequired: "Ünvan əlavə etmək üçün şəxsi məlumatlarda telefon nömrənizi yazın",
  addressAdded: "Ünvan əlavə olundu",
  addressUpdated: "Ünvan yeniləndi",
  deleteAddressTitle: "Ünvanı sil",
  deleteAddressMessage: "\"{label}\" ünvanını silmək istəyirsiniz? Bu əməliyyat geri qaytarıla bilməz.",
  addressDeleted: "Ünvan silindi",
  orderCancelled: "Sifariş ləğv edildi",
  noOrdersTitle: "Sifariş yoxdur",
  noOrdersDescription: "Hələ sifariş verməmisiniz? İndi məhsullara baxın və alış veriş edin.",
  viewProducts: "Məhsullara bax",
  orderDelivery: "Çatdırılma",
  orderPickup: "Mağazadan götürmə",
  productCountSuffix: "məhsul",
  recipientLabel: "Alıcı:",
  cancelOrder: "Sifarişi ləğv et",
  leaveReview: "Rəy bildir",
  leaveReviewPending: "Rəy bildir ({count})",
  reviewTitle: "Məhsul rəyi",
  reviewTitlePlural: "Məhsul rəyləri",
  reviewPerProductHint: "Hər məhsul üçün ayrıca rəy yazın",
  yourReviews: "Rəyləriniz",
  reviewCommentLabel: "Şərh (istəyə bağlı)",
  reviewCommentPlaceholder: "Məhsul haqqında fikrinizi yazın",
  reviewSubmit: "Göndər",
  reviewSubmitting: "Göndərilir...",
  reviewSubmitted: "Rəyiniz qəbul olundu",
  reviewSuccess: "Bu məhsul üçün rəyiniz göndərildi",
  reviewRatingRequired: "Reytinq seçin",
  reviewRatingAria: "{rating} ulduzdan 5",
  cityDistrictLabel: "Şəhər / Rayon",
  selectEmpty: "Seçin",
  addressLabel: "Ünvan",
  notesLabel: "Qeyd",
  makeDefault: "Əsas ünvan et",
  cancelButton: "Ləğv et",
  noAddressesTitle: "Ünvan yoxdur",
  noAddressesDescription: "Çatdırılma ünvanlarınızı əlavə edin ki, növbəti sifarişdə daha tez doldurasınız.",
  addAddress: "Ünvan əlavə et",
  defaultBadge: "Əsas",
  addressFallback: "Ünvan",
  editButton: "Redaktə",
  deleteButton: "Sil",
};

type ActionResult = {
  error?: string;
  success?: boolean;
  review?: AccountOrderItemReview & {
    orderItemId: string;
  };
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
  onCreateReview: (formData: FormData) => Promise<ActionResult>;
  onLogout: () => Promise<ActionResult>;
  copy?: Partial<AccountDashboardCopy>;
  statusLabelMaps?: OrderStatusLabelMaps;
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

function displayName(profile: AccountCustomerProfile) {
  const parts = [profile.firstName, profile.lastName].filter(
    (part): part is string => typeof part === "string" && part.trim() !== "",
  );
  return parts.length > 0 ? parts.join(" ") : profile.email;
}

function canCustomerCancelOrder(order: AccountOrder) {
  return canCustomerCancelOrderStatus(order.status);
}

function canLeaveOrderReview(order: AccountOrder) {
  return order.status === "COMPLETED" && order.paymentStatus === "PAID";
}

function orderHasPendingReviews(order: AccountOrder) {
  return order.items.some((item) => item.review === null);
}

function countPendingReviews(order: AccountOrder) {
  return order.items.filter((item) => item.review === null).length;
}

function orderProductLabel(item: AccountOrderItem) {
  if (
    item.variantName.trim() !== "" &&
    item.variantName !== item.productName
  ) {
    return `${item.productName} · ${item.variantName}`;
  }
  return item.productName;
}

function ReviewStarsDisplay({
  rating,
  ariaLabel,
}: {
  rating: number;
  ariaLabel: string;
}) {
  return (
    <div className="ui-account-orders__review-stars" aria-label={ariaLabel}>
      {Array.from({ length: 5 }, (_, index) => {
        const filled = index < rating;

        return (
          <svg
            key={index}
            viewBox="0 0 20 20"
            aria-hidden="true"
            className="ui-account-orders__review-star"
          >
            <path
              d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.77l-4.94 2.94.94-5.5-4-3.9 5.53-.8L10 1.5z"
              fill={filled ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </div>
  );
}

function ReviewStarPicker({
  value,
  onChange,
  disabled,
  ariaLabelTemplate,
}: {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  ariaLabelTemplate: string;
}) {
  return (
    <div className="ui-account-orders__review-picker" role="group">
      {Array.from({ length: 5 }, (_, index) => {
        const rating = index + 1;
        const filled = rating <= value;

        return (
          <button
            key={rating}
            type="button"
            className="ui-account-orders__review-picker-btn"
            disabled={disabled}
            data-filled={filled ? "true" : "false"}
            aria-label={ariaLabelTemplate.replace("{rating}", String(rating))}
            aria-pressed={filled}
            onClick={() => onChange(rating)}
          >
            <svg
              viewBox="0 0 20 20"
              aria-hidden="true"
              className="ui-account-orders__review-star"
            >
              <path
                d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.77l-4.94 2.94.94-5.5-4-3.9 5.53-.8L10 1.5z"
                fill={filled ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
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
  onCreateReview,
  onLogout,
  copy,
  statusLabelMaps,
}: AccountDashboardProps) {
  const c = { ...defaultAccountDashboardCopy, ...copy };
  const router = useRouter();
  const formId = useId();
  const [tab, setTab] = useState<AccountTab>("profile");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [cancelOrderTarget, setCancelOrderTarget] = useState<AccountOrder | null>(
    null,
  );
  const [cancelOrderReason, setCancelOrderReason] = useState("");
  const [cancelOrderPending, setCancelOrderPending] = useState(false);
  const [ordersState, setOrdersState] = useState(orders);
  const [reviewOpenByOrderId, setReviewOpenByOrderId] = useState<
    Record<string, boolean>
  >({});
  const [reviewRatings, setReviewRatings] = useState<Record<string, number>>(
    {},
  );
  const [reviewComments, setReviewComments] = useState<Record<string, string>>(
    {},
  );
  const [reviewErrors, setReviewErrors] = useState<Record<string, string>>(
    {},
  );
  const [submittingReviewItemId, setSubmittingReviewItemId] = useState<
    string | null
  >(null);
  const { requestConfirm, confirmDialog } = useConfirmDialog();

  useEffect(() => {
    setOrdersState(orders);
  }, [orders]);

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
      setSuccess(c.profileUpdated);
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
      setError(c.addressPhoneRequired);
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
        editingAddressId === null ? c.addressAdded : c.addressUpdated,
      );
      setShowAddressForm(false);
      setEditingAddressId(null);
      router.refresh();
    });
  }

  function confirmDeleteAddress(address: AccountAddress) {
    requestConfirm({
      title: c.deleteAddressTitle,
      message: c.deleteAddressMessage.replace("{label}", address.label ?? ""),
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
              setSuccess(c.addressDeleted);
              router.refresh();
            }
            resolve();
          });
        });
      },
    });
  }

  function openCancelOrderDialog(order: AccountOrder) {
    clearMessages();
    setCancelOrderReason("");
    setCancelOrderTarget(order);
  }

  function closeCancelOrderDialog() {
    if (cancelOrderPending) {
      return;
    }
    setCancelOrderTarget(null);
    setCancelOrderReason("");
  }

  function submitCancelOrder() {
    if (cancelOrderTarget === null) {
      return;
    }

    clearMessages();
    const formData = new FormData();
    formData.set("orderId", cancelOrderTarget.id);
    formData.set("reason", cancelOrderReason.trim());

    setCancelOrderPending(true);
    startTransition(async () => {
      try {
        const result = await onCancelOrder(formData);
        if (result.error !== undefined) {
          setError(result.error);
          return;
        }

        setSuccess(c.orderCancelled);
        setCancelOrderTarget(null);
        setCancelOrderReason("");
        router.refresh();
      } finally {
        setCancelOrderPending(false);
      }
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
            <h1 className="ui-account-dashboard__title">{c.title}</h1>
            <Button
              type="button"
              variant="danger"
              className="ui-account-dashboard__logout"
              disabled={pending}
              onClick={handleLogout}
            >
              {c.logout}
              <IconLogout width={14} height={14} />
            </Button>
          </div>
          <p className="ui-account-dashboard__lead">
            {c.greeting.replace("{name}", displayName(profile))}
            <br />
            <span className="ui-account-dashboard__lead-line">
              {c.lead}
            </span>
          </p>
        </div>
      </header>

      <div
        className="ui-account-dashboard__tabs"
        role="tablist"
        aria-label={c.tabsAria}
      >
        {(
          [
            ["profile", c.profileTab],
            ["orders", c.ordersTab],
            ["addresses", c.addressesTab],
          ] as [AccountTab, string][]
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
                {c.firstName} <span className="ui-field__required">*</span>
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
                {c.lastName} <span className="ui-field__required">*</span>
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
            <span>{c.email}</span>
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
            label={c.phoneLabel}
            value={phone}
            onChange={setPhone}
            autoComplete="tel"
          />

          <Button
            type="submit"
            disabled={pending}
            className="ui-product-purchase__cta"
          >
            {pending ? c.saving : c.save}
          </Button>
        </form>
      ) : null}

      {tab === "orders" ? (
        <div className="ui-account-dashboard__panel">
          {ordersState.length === 0 ? (
            <EmptyState
              title={c.noOrdersTitle}
              description={c.noOrdersDescription}
              icon={<IconCart width={40} height={40} />}
              action={<EmptyStateLink href="/" label={c.viewProducts} />}
            />
          ) : (
            <ul className="ui-account-orders">
              {ordersState.map((order) => {
                const reviewable = canLeaveOrderReview(order);
                const pendingReviewCount = reviewable
                  ? countPendingReviews(order)
                  : 0;
                const hasPendingReviews = pendingReviewCount > 0;
                const reviewOpen =
                  reviewOpenByOrderId[order.id] ?? hasPendingReviews;
                const multiProductOrder = order.items.length > 1;
                const leaveReviewLabel =
                  pendingReviewCount > 1
                    ? c.leaveReviewPending.replace(
                        "{count}",
                        String(pendingReviewCount),
                      )
                    : c.leaveReview;

                return (
                  <li key={order.id} className="ui-account-orders__item">
                    <div className="ui-account-orders__layout">
                      <div className="ui-account-orders__main">
                        <div className="ui-account-orders__top">
                          <p className="ui-account-orders__number">
                            #{order.orderNumber}
                          </p>
                          <p className="ui-account-orders__meta">
                            {formatAzDateTime(order.createdAt, order.createdAt)} ·{" "}
                            {order.fulfillmentType === "DELIVERY"
                              ? c.orderDelivery
                              : c.orderPickup}
                            {order.itemCount > 0
                              ? ` · ${order.itemCount} ${c.productCountSuffix}`
                              : ""}
                          </p>
                        </div>
                        <div className="ui-account-orders__badges">
                          <span
                            className={accountStatusBadgeClass(order.status)}
                            data-order-status={order.status}
                          >
                            {customerOrderStatusLabel(
                              order.status,
                              order.fulfillmentType,
                              statusLabelMaps,
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
                      canCustomerCancelOrder(order) ||
                      reviewable ? (
                        <div className="ui-account-orders__footer">
                          {order.recipientName !== null ? (
                            <p className="ui-account-orders__recipient">
                              {c.recipientLabel} {order.recipientName}
                            </p>
                          ) : null}
                          <div className="ui-account-orders__footer-actions">
                            {reviewable ? (
                              <Button
                                type="button"
                                variant="ghost"
                                className="ui-account-orders__review-toggle"
                                aria-expanded={reviewOpen}
                                onClick={() =>
                                  setReviewOpenByOrderId((current) => ({
                                    ...current,
                                    [order.id]: !reviewOpen,
                                  }))
                                }
                              >
                                {hasPendingReviews
                                  ? leaveReviewLabel
                                  : c.yourReviews}
                              </Button>
                            ) : null}
                            {canCustomerCancelOrder(order) ? (
                              <Button
                                type="button"
                                variant="ghost"
                                className="ui-account-orders__cancel"
                                disabled={pending}
                                onClick={() => openCancelOrderDialog(order)}
                              >
                                {c.cancelOrder}
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    {reviewable && reviewOpen ? (
                      <div className="ui-account-orders__review">
                        <p className="ui-account-orders__review-title">
                          {hasPendingReviews
                            ? multiProductOrder
                              ? c.reviewTitlePlural
                              : c.reviewTitle
                            : c.yourReviews}
                        </p>
                        {hasPendingReviews && multiProductOrder ? (
                          <p className="ui-account-orders__review-hint">
                            {c.reviewPerProductHint}
                          </p>
                        ) : null}
                        <ul className="ui-account-orders__review-list">
                          {order.items.map((item) => {
                            const productLabel = orderProductLabel(item);

                            if (item.review !== null) {
                              return (
                                <li
                                  key={item.id}
                                  className="ui-account-orders__review-item"
                                  data-order-item-id={item.id}
                                  data-review-status="submitted"
                                >
                                  <p className="ui-account-orders__review-product">
                                    {productLabel}
                                  </p>
                                  <ReviewStarsDisplay
                                    rating={item.review.rating}
                                    ariaLabel={c.reviewRatingAria.replace(
                                      "{rating}",
                                      String(item.review.rating),
                                    )}
                                  />
                                  {item.review.comment !== null &&
                                  item.review.comment.trim() !== "" ? (
                                    <p className="ui-account-orders__review-comment">
                                      {item.review.comment}
                                    </p>
                                  ) : null}
                                  <p className="ui-account-orders__review-status">
                                    {c.reviewSubmitted}
                                  </p>
                                </li>
                              );
                            }

                            const selectedRating = reviewRatings[item.id] ?? 0;
                            const submitting =
                              submittingReviewItemId === item.id;
                            const itemError = reviewErrors[item.id];

                            return (
                              <li
                                key={item.id}
                                className="ui-account-orders__review-item"
                                data-order-item-id={item.id}
                                data-review-status="pending"
                              >
                                <p className="ui-account-orders__review-product">
                                  {productLabel}
                                </p>
                                <ReviewStarPicker
                                  value={selectedRating}
                                  disabled={submitting}
                                  ariaLabelTemplate={c.reviewRatingAria}
                                  onChange={(rating) => {
                                    setReviewRatings((current) => ({
                                      ...current,
                                      [item.id]: rating,
                                    }));
                                    setReviewErrors((current) => {
                                      if (current[item.id] === undefined) {
                                        return current;
                                      }
                                      const next = { ...current };
                                      delete next[item.id];
                                      return next;
                                    });
                                  }}
                                />
                                {itemError !== undefined ? (
                                  <p
                                    className="ui-account-orders__review-error"
                                    role="alert"
                                  >
                                    {itemError}
                                  </p>
                                ) : null}
                                <label
                                  className="ui-field ui-account-orders__review-field"
                                  htmlFor={`${formId}-review-${item.id}`}
                                >
                                  <span>{c.reviewCommentLabel}</span>
                                  <textarea
                                    id={`${formId}-review-${item.id}`}
                                    name={`comment-${item.id}`}
                                    rows={3}
                                    maxLength={1000}
                                    placeholder={c.reviewCommentPlaceholder}
                                    disabled={submitting}
                                    value={reviewComments[item.id] ?? ""}
                                    onChange={(event) =>
                                      setReviewComments((current) => ({
                                        ...current,
                                        [item.id]: event.target.value,
                                      }))
                                    }
                                  />
                                </label>
                                <Button
                                  type="button"
                                  className="ui-product-purchase__cta ui-account-orders__review-submit"
                                  disabled={submitting}
                                  onClick={() => {
                                    if (selectedRating < 1) {
                                      setReviewErrors((current) => ({
                                        ...current,
                                        [item.id]: c.reviewRatingRequired,
                                      }));
                                      return;
                                    }
                                    const formData = new FormData();
                                    formData.set("orderId", order.id);
                                    formData.set("orderItemId", item.id);
                                    formData.set(
                                      "productSlug",
                                      item.productSlug,
                                    );
                                    formData.set(
                                      "rating",
                                      String(selectedRating),
                                    );
                                    const comment = (
                                      reviewComments[item.id] ?? ""
                                    ).trim();
                                    if (comment !== "") {
                                      formData.set("comment", comment);
                                    }
                                    clearMessages();
                                    setReviewErrors((current) => {
                                      if (current[item.id] === undefined) {
                                        return current;
                                      }
                                      const next = { ...current };
                                      delete next[item.id];
                                      return next;
                                    });
                                    setSubmittingReviewItemId(item.id);
                                    setReviewOpenByOrderId((current) => ({
                                      ...current,
                                      [order.id]: true,
                                    }));
                                    void (async () => {
                                      const result =
                                        await onCreateReview(formData);
                                      setSubmittingReviewItemId(null);
                                      if (result.error !== undefined) {
                                        setReviewErrors((current) => ({
                                          ...current,
                                          [item.id]: result.error as string,
                                        }));
                                        return;
                                      }
                                      const submittedReview =
                                        result.review ?? {
                                          id: `local-${item.id}`,
                                          orderItemId: item.id,
                                          rating: selectedRating,
                                          comment:
                                            comment === "" ? null : comment,
                                          createdAt: new Date().toISOString(),
                                        };
                                      setOrdersState((current) =>
                                        current.map((entry) => {
                                          if (entry.id !== order.id) {
                                            return entry;
                                          }
                                          return {
                                            ...entry,
                                            items: entry.items.map(
                                              (orderItem) =>
                                                orderItem.id === item.id
                                                  ? {
                                                      ...orderItem,
                                                      review: {
                                                        id: submittedReview.id,
                                                        rating:
                                                          submittedReview.rating,
                                                        comment:
                                                          submittedReview.comment,
                                                        createdAt:
                                                          submittedReview.createdAt,
                                                      },
                                                    }
                                                  : orderItem,
                                            ),
                                          };
                                        }),
                                      );
                                      setSuccess(c.reviewSuccess);
                                      setReviewRatings((current) => {
                                        const next = { ...current };
                                        delete next[item.id];
                                        return next;
                                      });
                                      setReviewComments((current) => {
                                        const next = { ...current };
                                        delete next[item.id];
                                        return next;
                                      });
                                      router.refresh();
                                    })();
                                  }}
                                >
                                  {submitting
                                    ? c.reviewSubmitting
                                    : c.reviewSubmit}
                                </Button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : null}
                  </li>
                );
              })}
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
                <span>{c.cityDistrictLabel}</span>
                <select
                  id={`${formId}-address-area`}
                  name="administrativeArea"
                  defaultValue={editingAddress?.administrativeArea ?? ""}
                >
                  <option value="">{c.selectEmpty}</option>
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
                  {c.addressLabel} <span className="ui-field__required">*</span>
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
                <span>{c.notesLabel}</span>
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
                <span>{c.makeDefault}</span>
              </label>
              <div className="ui-account-address-form__actions">
                <Button
                  type="submit"
                  disabled={pending}
                  className="ui-product-purchase__cta"
                >
                  {pending ? c.saving : c.save}
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
                  {c.cancelButton}
                </Button>
              </div>
            </form>
          ) : null}

          {!showAddressForm && addresses.length === 0 ? (
            <EmptyState
              title={c.noAddressesTitle}
              description={c.noAddressesDescription}
              icon={<IconMapPin width={40} height={40} />}
              action={
                <Button type="button" onClick={openCreateAddress}>
                  {c.addAddress}
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
                {c.addAddress}
              </Button>
              <ul className="ui-account-addresses">
                {addresses.map((address) => (
                  <li key={address.id} className="ui-account-addresses__item">
                    <div className="ui-account-addresses__body">
                      <div className="ui-account-addresses__title-row">
                        <p className="ui-account-addresses__title">
                          {resolveAdministrativeAreaLabel(
                            address.administrativeArea,
                          ) || c.addressFallback}
                        </p>
                        {address.isDefault ? (
                          <span className="ui-account-addresses__default">
                            {c.defaultBadge}
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
                        {c.editButton}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => confirmDeleteAddress(address)}
                        disabled={pending}
                      >
                        {c.deleteButton}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

        </div>
      ) : null}
      <OrderCancelReasonDialog
        open={cancelOrderTarget !== null}
        orderNumber={cancelOrderTarget?.orderNumber ?? ""}
        reason={cancelOrderReason}
        onReasonChange={setCancelOrderReason}
        onConfirm={submitCancelOrder}
        onClose={closeCancelOrderDialog}
        pending={cancelOrderPending || pending}
      />
      {confirmDialog}
    </section>
  );
}
