"use client";

import {
  ORDER_NAV_BUCKET_LABELS,
  orderMatchesNavBucket,
  type OrderSummaryContract,
} from "@itmarket/contracts";
import { Price, getProductImageAlt, getProductImageUrl } from "@itmarket/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { IconChevronLeft, IconFilter } from "./bo-icons";
import { useBoNavCounts } from "./bo-nav-counts-context";
import {
  formatOrderItemLabel,
  orderCheckoutFields,
  type OrderCheckoutItem,
  type OrderCheckoutSummary,
} from "../../lib/order-checkout-display";
import {
  downloadAndPrintOrderItemDeliveryLabelPdf,
  preloadOrderItemDeliveryLabelPdfEngine,
  type OrderItemDeliveryLabelContext,
} from "../../lib/order-item-delivery-label-pdf";

export type OrderSummary = OrderCheckoutSummary & {
  id: string;
  currency: string;
  updatedAt: string;
};

export type OrderDetails = OrderCheckoutSummary & {
  id: string;
  currency: string;
  updatedAt: string;
  customerId: string | null;
  discountTotal: string;
  taxTotal: string;
  address: {
    recipientName: string;
    phone: string;
    administrativeArea: string | null;
    addressLine: string;
    notes: string | null;
  } | null;
  payment: {
    id: string;
    provider: string;
    method: "CASH" | "CARD" | "INSTALLMENT";
    status: string;
    amount: string;
    currency: string;
    providerPaymentId: string | null;
    installmentMonths: number | null;
  } | null;
  items: OrderCheckoutItem[];
  reservations: {
    id: string;
    quantity: number;
    status: string;
    location: { id: string; code: string; name: string };
  }[];
  statusHistory: {
    id: string;
    orderStatus: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    reason: string;
    createdAt: string;
  }[];
  fulfillmentEvents: {
    id: string;
    orderStatus: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    eventType: string;
    reason: string;
    actorStaffId: string | null;
    payload: unknown;
    createdAt: string;
  }[];
};

type OrdersListPanelProps = {
  orders: OrderSummary[];
  formatMoney: (value: string | number) => string;
};

type OrderDetailPanelProps = {
  order: OrderDetails | null;
  loading: boolean;
  orderTransitionPending: boolean;
  canFulfill: boolean;
  canRefund: boolean;
  orderReason: string;
  orderRefundReason: string;
  orderRefundAmount: string;
  formatMoney: (value: string | number) => string;
  onOrderRefundReasonChange: (value: string) => void;
  onOrderRefundAmountChange: (value: string) => void;
  onOrderTransition: (action: string, reason: string) => void;
  onOrderRefund: () => void;
};

const ORDER_MONEY_FIELD_LABELS = new Set(["Cəmi", "Çatdırılma"]);
const ORDER_CANCEL_REASON_MIN_LENGTH = 3;
const ORDER_CANCEL_REASON_MAX_LENGTH = 240;

type OrderCancelDialogProps = {
  open: boolean;
  orderNumber: string;
  reason: string;
  onReasonChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
};

function OrderCancelDialog({
  open,
  orderNumber,
  reason,
  onReasonChange,
  onConfirm,
  onClose,
}: OrderCancelDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const fieldId = useId();
  const trimmedReason = reason.trim();
  const canSubmit =
    trimmedReason.length >= ORDER_CANCEL_REASON_MIN_LENGTH &&
    trimmedReason.length <= ORDER_CANCEL_REASON_MAX_LENGTH;

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="ui-modal" role="presentation">
      <button
        type="button"
        className="ui-modal__backdrop"
        aria-label="Bağla"
        onClick={onClose}
      />
      <form
        className="ui-modal__dialog ui-confirm-dialog ui-order-cancel-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) {
            onConfirm();
          }
        }}
      >
        <h2 className="ui-confirm-dialog__title" id={titleId}>
          Sifarişi ləğv et
        </h2>
        <p className="ui-confirm-dialog__message" id={descriptionId}>
          #{orderNumber} sifarişini ləğv etmək üçün müştəriyə göndəriləcək səbəbi
          qeyd edin.
        </p>
        <label className="ui-order-cancel-dialog__field" htmlFor={fieldId}>
          <span className="ui-order-cancel-dialog__label">Ləğv səbəbi</span>
          <textarea
            id={fieldId}
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            minLength={ORDER_CANCEL_REASON_MIN_LENGTH}
            maxLength={ORDER_CANCEL_REASON_MAX_LENGTH}
            rows={4}
            required
            autoFocus
            placeholder="Məsələn: tələb olunan məhsul anbarda yoxdur"
          />
        </label>
        <div className="ui-confirm-dialog__actions">
          <button
            type="button"
            className="ui-confirm-dialog__cancel"
            onClick={onClose}
          >
            Bağla
          </button>
          <button
            type="submit"
            className="ui-confirm-dialog__confirm"
            disabled={!canSubmit}
          >
            Sifarişi ləğv et
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
const ORDER_CANCELLED_LABEL = "Ləğv edildi";
const ORDER_OUT_FOR_DELIVERY_LABEL = "Təslim edilib";

type OrderStatusFilter = OrderSummaryContract["status"];

const ORDER_LIST_STATUS_FILTERS: ReadonlyArray<{
  status: OrderStatusFilter;
  label: string;
}> = [
  { status: "PENDING_PAYMENT", label: "Yeni" },
  { status: "UNDER_REVIEW", label: "Təsdiqləmədə" },
  { status: "CONFIRMED", label: "Təsdiqlənmiş" },
  { status: "PROCESSING", label: "Paketlənmədədir" },
  { status: "READY_FOR_PICKUP", label: "Götürülməyə hazır" },
  { status: "READY_FOR_DELIVERY", label: "Təhvilə hazırdır" },
  { status: "OUT_FOR_DELIVERY", label: "Kuryerdə" },
  { status: "COMPLETED", label: "Tamamlanıb" },
  { status: "CANCELLED", label: "Ləğv edilib" },
];

function toggleStatusFilter(
  current: ReadonlySet<OrderStatusFilter>,
  status: OrderStatusFilter,
): Set<OrderStatusFilter> {
  const next = new Set(current);
  if (next.has(status)) {
    next.delete(status);
  } else {
    next.add(status);
  }
  return next;
}

function OrderMoney({
  value,
  formatMoney,
}: {
  value: string | number;
  formatMoney: (value: string | number) => string;
}) {
  return <Price value={formatMoney(value)} />;
}

function OrderCheckoutFields({
  order,
  formatMoney,
}: {
  order: OrderCheckoutSummary;
  formatMoney: (value: string | number) => string;
}) {
  const fields = orderCheckoutFields(order);

  return (
    <dl className="order-checkout-fields">
      {fields.map((field) => (
        <div key={field.label} className="order-checkout-fields__row">
          <dt>{field.label}</dt>
          <dd>
            {ORDER_MONEY_FIELD_LABELS.has(field.label) ? (
              <OrderMoney value={field.value} formatMoney={formatMoney} />
            ) : (
              field.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function resolveOrderItemUnitPrice(item: OrderCheckoutItem) {
  if (item.unitPrice !== undefined) {
    return item.unitPrice;
  }

  const quantity = item.quantity > 0 ? item.quantity : 1;
  const lineTotal = Number.parseFloat(item.lineTotal);
  if (!Number.isFinite(lineTotal)) {
    return item.lineTotal;
  }

  return (lineTotal / quantity).toFixed(2);
}

function OrderItemsList({
  items,
  formatMoney,
  detailed = false,
  boxedItemIds,
  onAddToBox,
  deliveryLabelContext,
}: {
  items: OrderCheckoutItem[];
  formatMoney: (value: string | number) => string;
  detailed?: boolean;
  boxedItemIds?: ReadonlySet<string>;
  onAddToBox?: (itemId: string) => void;
  deliveryLabelContext?: OrderItemDeliveryLabelContext;
}) {
  const showBoxActions =
    onAddToBox !== undefined && boxedItemIds !== undefined;
  const showDeliveryLabelAction = deliveryLabelContext !== undefined;
  const [deliveryLabelPendingItemId, setDeliveryLabelPendingItemId] = useState<
    string | null
  >(null);
  const [deliveryLabelError, setDeliveryLabelError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (showDeliveryLabelAction) {
      preloadOrderItemDeliveryLabelPdfEngine();
    }
  }, [showDeliveryLabelAction]);

  async function handleDeliveryLabelDownload(item: OrderCheckoutItem) {
    if (deliveryLabelContext === undefined || deliveryLabelPendingItemId !== null) {
      return;
    }

    setDeliveryLabelPendingItemId(item.id);
    setDeliveryLabelError(null);
    try {
      await downloadAndPrintOrderItemDeliveryLabelPdf({
        order: deliveryLabelContext,
        item,
      });
    } catch (error) {
      setDeliveryLabelError(
        error instanceof Error
          ? error.message
          : "Çatdırılma etiketi hazırlanmadı",
      );
    } finally {
      setDeliveryLabelPendingItemId(null);
    }
  }
  if (items.length === 0) {
    return <p className="pos-empty">Sifariş sətirləri tapılmadı.</p>;
  }

  if (!detailed) {
    return (
      <div className="receipt-lines">
        {items.map((item) => (
          <div key={item.id} className="receipt-line">
            <span>{formatOrderItemLabel(item)}</span>
            <strong>
              <OrderMoney value={item.lineTotal} formatMoney={formatMoney} />
            </strong>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="order-item-lines">
      {deliveryLabelError !== null ? (
        <p className="order-item-line__delivery-label-error" role="alert">
          {deliveryLabelError}
        </p>
      ) : null}
      {items.map((item) => {
        const hasVariant = item.variantName.trim().length > 0;
        const unitPrice = resolveOrderItemUnitPrice(item);
        const showLineTotal = item.quantity > 1;

        const isBoxed = boxedItemIds?.has(item.id) ?? false;

        return (
          <article
            key={item.id}
            className={`order-item-line${
              isBoxed ? " order-item-line--boxed" : ""
            }`}
          >
            <div className="order-item-line__media">
              <img
                src={getProductImageUrl(item.image)}
                alt={getProductImageAlt(item.image, item.productName)}
                loading="lazy"
                decoding="async"
              />
            </div>

            <div className="order-item-line__body">
              <dl className="order-item-line__facts">
                <div className="order-item-line__header">
                  <div className="order-item-line__heading">
                    <h4 className="order-item-line__title">{item.productName}</h4>
                    {hasVariant ? (
                      <span className="order-item-line__variant">
                        {item.variantName}
                      </span>
                    ) : null}
                  </div>
                  {showDeliveryLabelAction || showBoxActions ? (
                    <div className="order-item-line__actions">
                      {showDeliveryLabelAction ? (
                        <button
                          type="button"
                          className="order-item-line__delivery-label-action"
                          disabled={deliveryLabelPendingItemId === item.id}
                          aria-busy={deliveryLabelPendingItemId === item.id}
                          onClick={() => void handleDeliveryLabelDownload(item)}
                        >
                          {deliveryLabelPendingItemId === item.id
                            ? "PDF hazırlanır…"
                            : "Çatdırılma etiketi"}
                        </button>
                      ) : null}
                      {showBoxActions ? (
                        <button
                          type="button"
                          className="order-item-line__box-action"
                          disabled={isBoxed}
                          aria-pressed={isBoxed}
                          onClick={() => onAddToBox(item.id)}
                        >
                          {isBoxed ? "Qutuda" : "Qutuya əlavə et"}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="order-item-line__fact">
                  <dt>Miqdar</dt>
                  <dd>{item.quantity} ədəd</dd>
                </div>
                <div className="order-item-line__fact">
                  <dt>Qiymət</dt>
                  <dd>
                    <OrderMoney value={unitPrice} formatMoney={formatMoney} />
                  </dd>
                </div>
                <div className="order-item-line__fact order-item-line__fact--mono">
                  <dt>SKU</dt>
                  <dd>{item.sku}</dd>
                </div>
                <div className="order-item-line__fact order-item-line__fact--mono">
                  <dt>Barkod</dt>
                  <dd>{item.barcode?.trim() ? item.barcode : "—"}</dd>
                </div>
              </dl>

              {showLineTotal ? (
                <footer className="order-item-line__footer">
                  <span className="order-item-line__footer-label">Cəmi</span>
                  <strong className="order-item-line__footer-total">
                    <OrderMoney
                      value={item.lineTotal}
                      formatMoney={formatMoney}
                    />
                  </strong>
                  <span className="order-item-line__footer-breakdown">
                    <OrderMoney value={unitPrice} formatMoney={formatMoney} /> ×{" "}
                    {item.quantity}
                  </span>
                </footer>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function orderIsNew(order: OrderSummary) {
  return (
    orderMatchesNavBucket(
      order.status as OrderSummaryContract["status"],
      "new",
    ) && order.status !== "CANCELLED"
  );
}

function orderIsCancelled(order: OrderSummary) {
  return order.status === "CANCELLED";
}

function orderIsOutForDelivery(order: OrderSummary) {
  return order.status === "OUT_FOR_DELIVERY";
}

export function OrdersListPanel({ orders, formatMoney }: OrdersListPanelProps) {
  const { newArrivalOrderIds } = useBoNavCounts();
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [appliedStatusFilters, setAppliedStatusFilters] = useState<
    Set<OrderStatusFilter>
  >(new Set());
  const [draftStatusFilters, setDraftStatusFilters] = useState<
    Set<OrderStatusFilter>
  >(new Set());
  const isFiltering = appliedStatusFilters.size > 0;
  const filteredOrders = useMemo(() => {
    if (!isFiltering) {
      return orders;
    }

    return orders.filter((order) =>
      appliedStatusFilters.has(order.status as OrderStatusFilter),
    );
  }, [appliedStatusFilters, isFiltering, orders]);

  function openFilters() {
    setDraftStatusFilters(new Set(appliedStatusFilters));
    setFiltersOpen(true);
  }

  function handleApplyFilters() {
    setAppliedStatusFilters(new Set(draftStatusFilters));
    setFiltersOpen(false);
  }

  function handleClearFilters() {
    setDraftStatusFilters(new Set());
  }

  useEffect(() => {
    if (!filtersOpen) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (filterMenuRef.current?.contains(target)) {
        return;
      }

      setFiltersOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setFiltersOpen(false);
      }
    }

    const frame = window.requestAnimationFrame(() => {
      document.addEventListener("pointerdown", onPointerDown);
    });
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [filtersOpen]);

  return (
    <section className="orders-section" aria-label="Sifarişlər">
      <div className="catalog-subcategories-board orders-list-board">
        <header className="catalog-subcategories-form__head">
          <div>
            <h2>Son sifarişlər</h2>
          </div>
          <div className="orders-list-filter-menu" ref={filterMenuRef}>
            <button
              type="button"
              className={[
                "orders-list-filter-menu__trigger",
                filtersOpen ? "is-open" : "",
                isFiltering ? "is-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-expanded={filtersOpen}
              aria-controls="orders-list-filters"
              onClick={() => {
                if (filtersOpen) {
                  setFiltersOpen(false);
                  return;
                }
                openFilters();
              }}
            >
              <IconFilter className="bo-icon--sm" aria-hidden="true" />
              <span>Filtr</span>
            </button>
            {filtersOpen ? (
              <div
                id="orders-list-filters"
                className="orders-list-filter-menu__panel"
                role="dialog"
                aria-label="Sifariş filtrləri"
              >
                <div className="orders-list-filter-menu__options">
                  {ORDER_LIST_STATUS_FILTERS.map(({ status, label }) => (
                    <label key={status} className="orders-list-filter">
                      <input
                        type="checkbox"
                        checked={draftStatusFilters.has(status)}
                        onChange={() =>
                          setDraftStatusFilters((current) =>
                            toggleStatusFilter(current, status),
                          )
                        }
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                <div className="orders-list-filter-menu__actions">
                  <button
                    type="button"
                    className="orders-list-filter-menu__clear"
                    onClick={handleClearFilters}
                  >
                    Təmizlə
                  </button>
                  <button
                    type="button"
                    className="orders-list-filter-menu__apply"
                    onClick={handleApplyFilters}
                  >
                    Tətbiq et
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </header>
        {orders.length === 0 ? (
          <p className="pos-empty">Bu rola görünən sifariş yoxdur.</p>
        ) : filteredOrders.length === 0 ? (
          <p className="pos-empty">Filtrə uyğun sifariş tapılmadı.</p>
        ) : (
          <div className="orders-list">
            {filteredOrders.map((order) => {
              const isNewArrival = newArrivalOrderIds.has(order.id);
              const isCancelledOrder = orderIsCancelled(order);
              const isOutForDeliveryOrder = orderIsOutForDelivery(order);
              const showNewBadge = orderIsNew(order);

              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className={`order-row order-row--compact order-row--link${
                    isNewArrival ? " order-row--new-arrival" : ""
                  }`}
                  aria-label={
                    showNewBadge
                      ? `${order.orderNumber}, yeni sifariş`
                      : isCancelledOrder
                        ? `${order.orderNumber}, ${ORDER_CANCELLED_LABEL}`
                        : isOutForDeliveryOrder
                          ? `${order.orderNumber}, ${ORDER_OUT_FOR_DELIVERY_LABEL}`
                          : undefined
                  }
                >
                  <span className="order-row__lead">
                    <strong>{order.orderNumber}</strong>
                    {showNewBadge ? (
                      <span className="order-row__new-badge">
                        {ORDER_NAV_BUCKET_LABELS.new}
                      </span>
                    ) : null}
                    {isCancelledOrder ? (
                      <span className="order-row__cancelled-badge">
                        {ORDER_CANCELLED_LABEL}
                      </span>
                    ) : null}
                    {isOutForDeliveryOrder ? (
                      <span className="order-row__out-for-delivery-badge">
                        {ORDER_OUT_FOR_DELIVERY_LABEL}
                      </span>
                    ) : null}
                  </span>
                  <OrderMoney value={order.grandTotal} formatMoney={formatMoney} />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export function OrderDetailPanel({
  order,
  loading,
  orderTransitionPending,
  canFulfill,
  canRefund,
  orderReason,
  orderRefundReason,
  orderRefundAmount,
  formatMoney,
  onOrderRefundReasonChange,
  onOrderRefundAmountChange,
  onOrderTransition,
  onOrderRefund,
}: OrderDetailPanelProps) {
  const router = useRouter();
  const [isOrderInfoExpanded, setIsOrderInfoExpanded] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [boxedItemIds, setBoxedItemIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setBoxedItemIds(new Set());
  }, [order?.id]);

  const showPackagingItemActions =
    canFulfill && order !== null && order.status === "PROCESSING";

  const allItemsBoxed =
    order !== null &&
    order.items.length > 0 &&
    order.items.every((item) => boxedItemIds.has(item.id));

  function handleAddToBox(itemId: string) {
    setBoxedItemIds((current) => {
      if (current.has(itemId)) {
        return current;
      }
      const next = new Set(current);
      next.add(itemId);
      return next;
    });
  }

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/orders");
  }

  return (
    <section className="orders-section" aria-label="Sifariş detalı">
      <article className="operation-card order-detail-card">
        <div className="order-detail-card__toolbar">
          <button
            type="button"
            className="order-detail-card__back"
            onClick={handleBack}
          >
            <IconChevronLeft
              className="bo-icon--sm order-detail-card__back-icon"
              aria-hidden="true"
            />
            <span className="order-detail-card__back-label">Geri qayıt</span>
          </button>
          {!loading && order !== null && canFulfill ? (
            <div className="order-detail-card__toolbar-actions action-row">
              {order.status === "UNDER_REVIEW" && (
                <button
                  type="button"
                  className="order-detail-card__confirm"
                  disabled={orderTransitionPending}
                  onClick={() => onOrderTransition("CONFIRM", orderReason)}
                >
                  {orderTransitionPending
                    ? "Qablaşdırmaya ötürülür…"
                    : "Sifarişi təsdiqlə"}
                </button>
              )}
              {order.status === "PROCESSING" &&
                order.fulfillmentType === "PICKUP" && (
                  <button
                    type="button"
                    className="order-detail-card__confirm"
                    disabled={orderTransitionPending || !allItemsBoxed}
                    onClick={() =>
                      onOrderTransition("MARK_READY_FOR_PICKUP", orderReason)
                    }
                  >
                    {orderTransitionPending
                      ? "Pickup üçün hazırlanır…"
                      : "Pickup üçün hazır et"}
                  </button>
                )}
              {order.status === "PROCESSING" &&
                order.fulfillmentType === "DELIVERY" && (
                  <button
                    type="button"
                    className="order-detail-card__confirm"
                    disabled={orderTransitionPending || !allItemsBoxed}
                    onClick={() =>
                      onOrderTransition("MARK_READY_FOR_DELIVERY", orderReason)
                    }
                  >
                    {orderTransitionPending
                      ? "Təhvilə ötürülür…"
                      : "Təhvilə hazırdır"}
                  </button>
                )}
              {order.status === "READY_FOR_DELIVERY" &&
                order.fulfillmentType === "DELIVERY" && (
                  <button
                    type="button"
                    className="order-detail-card__confirm"
                    disabled={orderTransitionPending}
                    onClick={() =>
                      onOrderTransition("MARK_OUT_FOR_DELIVERY", orderReason)
                    }
                  >
                    {orderTransitionPending
                      ? "Kuryerə təhvil verilir…"
                      : "Kuryerə təhvil ver"}
                  </button>
                )}
              {(order.status === "UNDER_REVIEW" ||
                order.status === "CONFIRMED") && (
                <button
                  type="button"
                  className="order-detail-card__cancel"
                  onClick={() => {
                    setCancelReason("");
                    setCancelDialogOpen(true);
                  }}
                >
                  Sifarişi ləğv et
                </button>
              )}
            </div>
          ) : null}
        </div>

        {loading ? (
          <p className="pos-empty" aria-busy="true">
            Sifariş məlumatları yüklənir…
          </p>
        ) : order === null ? (
          <p className="pos-empty">Sifariş tapılmadı.</p>
        ) : (
          <>
            <div className="order-block">
              <h3>Məhsul</h3>
              <OrderItemsList
                items={order.items}
                formatMoney={formatMoney}
                detailed
                boxedItemIds={showPackagingItemActions ? boxedItemIds : undefined}
                onAddToBox={
                  showPackagingItemActions ? handleAddToBox : undefined
                }
                deliveryLabelContext={
                  order.fulfillmentType === "DELIVERY"
                    ? {
                        orderNumber: order.orderNumber,
                        recipientName: order.recipientName,
                        phone: order.phone,
                        guestPhone: order.guestPhone,
                        administrativeArea: order.administrativeArea,
                        addressLine: order.addressLine,
                      }
                    : undefined
                }
              />
            </div>

            <div
              className={`order-block order-block--collapsible${
                isOrderInfoExpanded ? " is-expanded" : ""
              }`}
            >
              <header className="order-block__head">
                <button
                  type="button"
                  className="order-block__toggle"
                  aria-expanded={isOrderInfoExpanded}
                  aria-controls="order-checkout-fields"
                  onClick={() => setIsOrderInfoExpanded((expanded) => !expanded)}
                >
                  <span className="order-block__chevron" aria-hidden="true" />
                  <h3>Şifariş məlumatları</h3>
                </button>
              </header>
              <div
                id="order-checkout-fields"
                className="order-block__body"
                aria-hidden={!isOrderInfoExpanded}
              >
                <div className="order-block__body-inner">
                  <OrderCheckoutFields
                    order={order}
                    formatMoney={formatMoney}
                  />
                </div>
              </div>
            </div>

            {order.payment !== null && (
              <div className="order-block">
                <h3>Online payment</h3>
                <p className="pos-meta">
                  {order.payment.provider} · {order.payment.method} ·{" "}
                  {order.payment.status}
                </p>
                <p className="pos-meta">
                  <OrderMoney
                    value={order.payment.amount}
                    formatMoney={formatMoney}
                  />{" "}
                  · {order.payment.providerPaymentId ?? "provider id yoxdur"}
                </p>
                {order.payment.installmentMonths !== null && (
                  <p className="pos-meta">
                    Taksit müddəti: {order.payment.installmentMonths} ay
                  </p>
                )}
              </div>
            )}

            {canRefund &&
              order.payment !== null &&
              (order.paymentStatus === "PAID" ||
                order.paymentStatus === "PARTIALLY_REFUNDED") && (
                <div className="order-actions">
                  <h3>Online refund</h3>
                  <label>
                    Refund səbəbi
                    <textarea
                      value={orderRefundReason}
                      onChange={(event) =>
                        onOrderRefundReasonChange(event.target.value)
                      }
                      minLength={3}
                    />
                  </label>
                  <label>
                    Qismən məbləğ (boş buraxılsa tam refund)
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={order.payment.amount}
                      value={orderRefundAmount}
                      onChange={(event) =>
                        onOrderRefundAmountChange(event.target.value)
                      }
                    />
                  </label>
                  <div className="action-row">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Bu online ödəniş üçün refund başlatmaq istədiyinizə əminsiniz?",
                          )
                        ) {
                          onOrderRefund();
                        }
                      }}
                    >
                      Refund et
                    </button>
                  </div>
                </div>
              )}

          </>
        )}
      </article>
      {order !== null ? (
        <OrderCancelDialog
          open={cancelDialogOpen}
          orderNumber={order.orderNumber}
          reason={cancelReason}
          onReasonChange={setCancelReason}
          onClose={() => {
            setCancelDialogOpen(false);
            setCancelReason("");
          }}
          onConfirm={() => {
            onOrderTransition("CANCEL", cancelReason.trim());
            setCancelDialogOpen(false);
            setCancelReason("");
          }}
        />
      ) : null}
    </section>
  );
}
