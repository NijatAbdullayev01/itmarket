"use client";

import {
  ORDER_NAV_BUCKET_LABELS,
  ORDER_NAV_BUCKET_STATUSES,
  backofficeCancelledOrderLabel,
  orderMatchesNavBucket,
  type OrderSummaryContract,
} from "@itmarket/contracts";
import {
  Price,
  OrderCancelReasonDialog,
  getProductImageAlt,
  getProductImageUrl,
  orderStatusLabels,
} from "@itmarket/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  IconChevronLeft,
  IconDocument,
  IconFilter,
  IconOpenBox,
} from "./bo-icons";
import "./orders-panel.css";
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
  cancelledByCustomer?: boolean;
};

export type OrderDetails = OrderCheckoutSummary & {
  id: string;
  currency: string;
  updatedAt: string;
  cancelledByCustomer?: boolean;
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
    actorType?: string | null;
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
  formatMoney: (value: string | number) => string;
  onOrderTransition: (action: string, reason: string) => void;
};

const ORDER_MONEY_FIELD_LABELS = new Set(["Cəmi", "Çatdırılma"]);

const ORDER_CANCELLED_LABEL = "Ləğv edildi";
const ORDER_OUT_FOR_DELIVERY_LABEL = "Kuryerə təslim edilib";
const ORDER_COMPLETED_LABEL = "Təslim edilib";
const ORDER_PACKAGING_LABEL = "Qablaşdırılır";

/** Statuses the API accepts for staff CANCEL (see OrdersService.cancelOrder). */
const ORDER_STAFF_CANCELABLE_STATUSES = new Set<OrderDetails["status"]>([
  "UNDER_REVIEW",
  "CONFIRMED",
  "PROCESSING",
  "READY_FOR_PICKUP",
  "READY_FOR_DELIVERY",
  "OUT_FOR_DELIVERY",
]);

function orderWillRefundOnCancel(
  order: Pick<OrderDetails, "payment" | "paymentStatus">,
) {
  return order.payment !== null && order.paymentStatus === "PAID";
}

type OrderStatusFilter = OrderSummaryContract["status"];
type OrderListFilterId =
  | keyof typeof ORDER_NAV_BUCKET_LABELS
  | "out_for_delivery"
  | "completed"
  | "cancelled";

const ORDER_LIST_FILTERS: ReadonlyArray<{
  id: OrderListFilterId;
  label: string;
  statuses: readonly OrderStatusFilter[];
}> = [
  {
    id: "new",
    label: ORDER_NAV_BUCKET_LABELS.new,
    statuses: ORDER_NAV_BUCKET_STATUSES.new,
  },
  {
    id: "packaging",
    label: ORDER_NAV_BUCKET_LABELS.packaging,
    statuses: ORDER_NAV_BUCKET_STATUSES.packaging,
  },
  {
    id: "ready",
    label: ORDER_NAV_BUCKET_LABELS.ready,
    statuses: ORDER_NAV_BUCKET_STATUSES.ready,
  },
  {
    id: "out_for_delivery",
    label: ORDER_OUT_FOR_DELIVERY_LABEL,
    statuses: ["OUT_FOR_DELIVERY"],
  },
  {
    id: "completed",
    label: ORDER_COMPLETED_LABEL,
    statuses: ["COMPLETED"],
  },
  {
    id: "cancelled",
    label: ORDER_CANCELLED_LABEL,
    statuses: ["CANCELLED"],
  },
];

function toggleListFilter(
  current: ReadonlySet<OrderListFilterId>,
  filterId: OrderListFilterId,
): Set<OrderListFilterId> {
  const next = new Set(current);
  if (next.has(filterId)) {
    next.delete(filterId);
  } else {
    next.add(filterId);
  }
  return next;
}

function statusesForListFilters(
  filters: ReadonlySet<OrderListFilterId>,
): Set<OrderStatusFilter> {
  const statuses = new Set<OrderStatusFilter>();
  for (const filter of ORDER_LIST_FILTERS) {
    if (!filters.has(filter.id)) {
      continue;
    }
    for (const status of filter.statuses) {
      statuses.add(status);
    }
  }
  return statuses;
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
  order: OrderCheckoutSummary & {
    payment?: { method: "CASH" | "CARD" | "INSTALLMENT" } | null;
  };
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

function OrderDeliveryLabelAction({
  context,
  items,
}: {
  context: OrderItemDeliveryLabelContext;
  items: OrderCheckoutItem[];
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    preloadOrderItemDeliveryLabelPdfEngine();
  }, []);

  async function handleDownload() {
    if (pending || items.length === 0) {
      return;
    }

    setPending(true);
    setError(null);
    try {
      await downloadAndPrintOrderItemDeliveryLabelPdf({
        order: context,
        items: items.map(
          ({ productName, variantName, sku, barcode, quantity }) => ({
            productName,
            variantName,
            sku,
            barcode,
            quantity,
          }),
        ),
      });
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Çatdırılma etiketi hazırlanmadı",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="order-delivery-label">
      <button
        type="button"
        className="order-item-line__delivery-label-action order-delivery-label__action"
        disabled={pending}
        aria-busy={pending}
        onClick={() => void handleDownload()}
      >
        <IconDocument className="bo-icon--sm" aria-hidden="true" />
        <span>{pending ? "PDF hazırlanır…" : "Çatdırılma etiketi"}</span>
      </button>
      {error !== null ? (
        <p
          className="order-item-line__delivery-label-error order-delivery-label__error"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function OrderItemsList({
  items,
  formatMoney,
  detailed = false,
  boxedItemIds,
  onToggleBox,
}: {
  items: OrderCheckoutItem[];
  formatMoney: (value: string | number) => string;
  detailed?: boolean;
  boxedItemIds?: ReadonlySet<string>;
  onToggleBox?: (itemId: string) => void;
}) {
  const showBoxActions =
    onToggleBox !== undefined && boxedItemIds !== undefined;
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
                  {showBoxActions ? (
                    <div className="order-item-line__actions">
                      <button
                        type="button"
                        className={`order-item-line__box-action${
                          isBoxed
                            ? " order-item-line__box-action--remove"
                            : ""
                        }`}
                        aria-pressed={isBoxed}
                        onClick={() => onToggleBox(item.id)}
                      >
                        <IconOpenBox
                          className="bo-icon--sm"
                          aria-hidden="true"
                        />
                        <span>
                          {isBoxed ? "Qutudan çıxar" : "Qutuya əlavə et"}
                        </span>
                      </button>
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

function orderCancelledBadgeLabel(order: OrderSummary) {
  return backofficeCancelledOrderLabel(order.cancelledByCustomer);
}

function orderIsOutForDelivery(order: OrderSummary) {
  return order.status === "OUT_FOR_DELIVERY";
}

function orderIsCompleted(order: OrderSummary) {
  return order.status === "COMPLETED";
}

function orderIsPackaging(order: OrderSummary) {
  return orderMatchesNavBucket(
    order.status as OrderSummaryContract["status"],
    "packaging",
  );
}

function orderIsReady(order: OrderSummary) {
  return orderMatchesNavBucket(
    order.status as OrderSummaryContract["status"],
    "ready",
  );
}

function orderReadyBadgeLabel(order: OrderSummary) {
  return orderStatusLabels[order.status] ?? ORDER_NAV_BUCKET_LABELS.ready;
}

export function OrdersListPanel({ orders, formatMoney }: OrdersListPanelProps) {
  const { newArrivalOrderIds } = useBoNavCounts();
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [appliedListFilters, setAppliedListFilters] = useState<
    Set<OrderListFilterId>
  >(new Set());
  const [draftListFilters, setDraftListFilters] = useState<
    Set<OrderListFilterId>
  >(new Set());
  const isFiltering = appliedListFilters.size > 0;
  const filteredOrders = useMemo(() => {
    if (!isFiltering) {
      return orders;
    }

    const allowedStatuses = statusesForListFilters(appliedListFilters);
    return orders.filter((order) =>
      allowedStatuses.has(order.status as OrderStatusFilter),
    );
  }, [appliedListFilters, isFiltering, orders]);

  function openFilters() {
    setDraftListFilters(new Set(appliedListFilters));
    setFiltersOpen(true);
  }

  function handleApplyFilters() {
    setAppliedListFilters(new Set(draftListFilters));
    setFiltersOpen(false);
  }

  function handleClearFilters() {
    setDraftListFilters(new Set());
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
                  {ORDER_LIST_FILTERS.map(({ id, label }) => (
                    <label key={id} className="orders-list-filter">
                      <input
                        type="checkbox"
                        className="orders-list-filter__checkbox"
                        checked={draftListFilters.has(id)}
                        onChange={() =>
                          setDraftListFilters((current) =>
                            toggleListFilter(current, id),
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
              const cancelledBadgeLabel = orderCancelledBadgeLabel(order);
              const isOutForDeliveryOrder = orderIsOutForDelivery(order);
              const isCompletedOrder = orderIsCompleted(order);
              const isPackagingOrder = orderIsPackaging(order);
              const isReadyOrder = orderIsReady(order);
              const showNewBadge = orderIsNew(order);
              const readyBadgeLabel = orderReadyBadgeLabel(order);

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
                      : isPackagingOrder
                        ? `${order.orderNumber}, ${ORDER_PACKAGING_LABEL}`
                        : isCancelledOrder
                          ? `${order.orderNumber}, ${cancelledBadgeLabel}`
                          : isOutForDeliveryOrder
                            ? `${order.orderNumber}, ${ORDER_OUT_FOR_DELIVERY_LABEL}`
                            : isCompletedOrder
                              ? `${order.orderNumber}, ${ORDER_COMPLETED_LABEL}`
                              : isReadyOrder
                                ? `${order.orderNumber}, ${readyBadgeLabel}`
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
                    {isPackagingOrder ? (
                      <span className="order-row__packaging-badge">
                        {ORDER_PACKAGING_LABEL}
                      </span>
                    ) : null}
                    {isCancelledOrder ? (
                      <span className="order-row__cancelled-badge">
                        {cancelledBadgeLabel}
                      </span>
                    ) : null}
                    {isOutForDeliveryOrder ? (
                      <span className="order-row__out-for-delivery-badge">
                        {ORDER_OUT_FOR_DELIVERY_LABEL}
                      </span>
                    ) : null}
                    {isCompletedOrder ? (
                      <span className="order-row__completed-badge">
                        {ORDER_COMPLETED_LABEL}
                      </span>
                    ) : null}
                    {isReadyOrder ? (
                      <span className="order-row__ready-badge">
                        {readyBadgeLabel}
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
  formatMoney,
  onOrderTransition,
}: OrderDetailPanelProps) {
  const router = useRouter();
  const [isOrderInfoExpanded, setIsOrderInfoExpanded] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [boxedItemIds, setBoxedItemIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setBoxedItemIds(new Set());
    setCancelDialogOpen(false);
    setCancelReason("");
  }, [order?.id]);

  const showCancelDialog =
    cancelDialogOpen && order !== null && order.status !== "CANCELLED";

  const willRefundOnCancel =
    order !== null && orderWillRefundOnCancel(order);

  const canCancelOrder =
    canFulfill &&
    order !== null &&
    ORDER_STAFF_CANCELABLE_STATUSES.has(order.status) &&
    (!willRefundOnCancel || canRefund);

  const showPackagingItemActions =
    canFulfill && order !== null && order.status === "PROCESSING";

  const allItemsBoxed =
    order !== null &&
    order.items.length > 0 &&
    order.items.every((item) => boxedItemIds.has(item.id));

  function handleToggleBox(itemId: string) {
    setBoxedItemIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
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
              {(order.status === "UNDER_REVIEW" ||
                order.status === "CONFIRMED") && (
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
              {order.status === "OUT_FOR_DELIVERY" &&
                order.fulfillmentType === "DELIVERY" && (
                  <button
                    type="button"
                    className="order-detail-card__confirm"
                    disabled={orderTransitionPending}
                    onClick={() =>
                      onOrderTransition("COMPLETE", orderReason)
                    }
                  >
                    {orderTransitionPending
                      ? "Təslim edilir…"
                      : "Təslim edildi"}
                  </button>
                )}
              {order.status === "READY_FOR_PICKUP" &&
                order.fulfillmentType === "PICKUP" && (
                  <button
                    type="button"
                    className="order-detail-card__confirm"
                    disabled={orderTransitionPending}
                    onClick={() =>
                      onOrderTransition("COMPLETE", orderReason)
                    }
                  >
                    {orderTransitionPending
                      ? "Təslim edilir…"
                      : "Təslim edildi"}
                  </button>
                )}
              {canCancelOrder && (
                <button
                  type="button"
                  className="order-detail-card__cancel"
                  disabled={orderTransitionPending}
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
              <header className="order-block__head order-block__head--split">
                <h3>Məhsul</h3>
                {order.fulfillmentType === "DELIVERY" ? (
                  <OrderDeliveryLabelAction
                    context={{
                      orderNumber: order.orderNumber,
                      recipientName: order.recipientName,
                      phone: order.phone,
                      guestPhone: order.guestPhone,
                      administrativeArea: order.administrativeArea,
                      addressLine: order.addressLine,
                    }}
                    items={order.items}
                  />
                ) : null}
              </header>
              <OrderItemsList
                items={order.items}
                formatMoney={formatMoney}
                detailed
                boxedItemIds={showPackagingItemActions ? boxedItemIds : undefined}
                onToggleBox={
                  showPackagingItemActions ? handleToggleBox : undefined
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

          </>
        )}
      </article>
      {order !== null ? (
        <OrderCancelReasonDialog
          open={showCancelDialog}
          orderNumber={order.orderNumber}
          reason={cancelReason}
          onReasonChange={setCancelReason}
          pending={orderTransitionPending}
          title={
            willRefundOnCancel
              ? "Sifarişi ləğv et və ödənişi qaytar"
              : "Sifarişi ləğv et"
          }
          message={
            willRefundOnCancel && order.payment !== null
              ? `#${order.orderNumber} sifarişi ləğv ediləcək və online ödəniş (${formatMoney(order.payment.amount)}) müştəriyə qaytarılacaq. Müştəriyə göndəriləcək səbəbi qeyd edin.`
              : `#${order.orderNumber} sifarişini ləğv etmək üçün müştəriyə göndəriləcək səbəbi qeyd edin.`
          }
          fieldLabel={
            willRefundOnCancel ? "Ləğv / qaytarma səbəbi" : "Ləğv səbəbi"
          }
          fieldPlaceholder="Məsələn: tələb olunan məhsul anbarda yoxdur"
          confirmLabel={
            willRefundOnCancel
              ? "Ləğv et və ödənişi qaytar"
              : "Sifarişi ləğv et"
          }
          pendingLabel={
            willRefundOnCancel
              ? "Ödəniş qaytarılır…"
              : "Ləğv edilir…"
          }
          cancelLabel="Bağla"
          onClose={() => {
            if (orderTransitionPending) {
              return;
            }
            setCancelDialogOpen(false);
            setCancelReason("");
          }}
          onConfirm={() => {
            onOrderTransition("CANCEL", cancelReason.trim());
          }}
        />
      ) : null}
    </section>
  );
}
