export interface ApiErrorEnvelope {
  code: string;
  message: string;
  details: unknown;
  correlationId: string;
}

export interface LivenessResponse {
  status: "ok";
}

export interface ReadinessResponse {
  status: "ready" | "not-ready";
  dependencies: {
    database: "up" | "down";
    redis: "up" | "down";
  };
}

export type StaffRole =
  "ADMIN" | "MANAGER" | "CASHIER" | "WAREHOUSE" | "REPORT_VIEWER";

export interface StaffSessionPrincipal {
  id: string;
  email: string;
  displayName: string;
  role: StaffRole;
  permissions: string[];
  sessionId: string;
}

export interface CustomerProfileContract {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
}

export interface CustomerAddressContract {
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
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface CategoryContract {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  sortOrder?: number;
  updatedAt?: string;
}

export interface BrandContract {
  id: string;
  name: string;
  slug: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  logoObjectKey?: string | null;
  logoScalePercent?: number | null;
  logoOffsetX?: number | null;
  logoOffsetY?: number | null;
  updatedAt?: string;
}

export interface StorefrontReviewSummaryContract {
  averageRating: number | null;
  count: number;
}

export interface StorefrontProductSummaryContract {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  category: { name: string; slug: string; parentId?: string | null };
  brand: { name: string; slug: string } | null;
  price: string | null;
  previousPrice: string | null;
  currency: "AZN";
  available: number;
  defaultVariantId: string | null;
  sku?: string | null;
  barcode?: string | null;
  variantName?: string;
  variantAttributes?: Record<string, string>;
  updatedAt?: string;
  reviewSummary: StorefrontReviewSummaryContract;
}

export interface ProductVariantContract {
  id: string;
  productId: string;
  sku: string;
  barcode: string | null;
  name: string;
  price: string;
  previousPrice: string | null;
  cost: string | null;
  currency: "AZN";
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
}

export interface InventoryMovementContract {
  id: string;
  variantId: string;
  locationId: string;
  type: "RECEIPT" | "ADJUSTMENT" | "TRANSFER_OUT" | "TRANSFER_IN" | "SALE";
  quantityDelta: number;
  sourceType: string;
  sourceDocumentId: string;
  reason: string;
  actorStaff: {
    id: string;
    displayName: string;
    email: string;
  } | null;
  createdAt: string;
  variant: {
    sku: string;
    barcode: string | null;
    name: string;
    attributes?: unknown;
    product: {
      name: string;
      brand: { id: string; name: string } | null;
    };
  } | null;
}

export type CashShiftStatus = "OPEN" | "CLOSING" | "CLOSED";

export type CashMovementType =
  "OPENING_FLOAT" | "CASH_IN" | "CASH_OUT" | "SALE";

export interface CashRegisterContract {
  id: string;
  code: string;
  name: string;
  locationId: string;
  active: boolean;
}

export interface CashShiftContract {
  id: string;
  status: CashShiftStatus;
  businessDate: string;
  openingFloat: string;
  expectedCash: string;
  countedCash: string | null;
  discrepancy: string | null;
  openedAt: string;
  closingStartedAt: string | null;
  closedAt: string | null;
}

export interface PosDailyLedgerContract {
  businessDate: string;
  register: {
    id: string;
    code: string;
    name: string;
    location: { id: string; code: string; name: string };
  };
  cashSales: string;
  cardSales: string;
  transferSales: string;
  woltSales: string;
  birmarketSales: string;
  installmentSales: string;
  cashRefunds: string;
  cardRefunds: string;
  installmentRefunds: string;
  refundTotal: string;
  saleCount: number;
  returnCount: number;
  sales: Array<{
    id: string;
    saleNumber: string;
    grandTotal: string;
    channel: "CASH" | "CARD" | "TRANSFER" | "WOLT" | "BIRMARKET";
    paymentMethod: "CASH" | "CARD" | "INSTALLMENT";
    /** Cashier-entered kassa qəbzi (or hesab-faktura for TRANSFER). */
    externalTerminalReference?: string | null;
    createdAt: string;
    /** Remaining returnable units across all lines (sold − already returned). */
    returnableQuantity?: number;
    /** Line snapshots for return-picker product search (name / SKU / barcode). */
    items?: Array<{
      productName: string;
      variantName: string;
      sku: string;
      barcode: string | null;
    }>;
  }>;
  byHour: Array<{
    hour: number;
    cashSales: string;
    cardSales: string;
    transferSales: string;
    woltSales: string;
    birmarketSales: string;
    installmentSales: string;
    saleCount: number;
  }>;
}

export interface PosSaleItemContract {
  id: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  barcode: string | null;
  quantity: number;
  /** Already refunded against this sale line. */
  returnedQuantity: number;
  /** quantity - returnedQuantity; max allowed on the next return. */
  returnableQuantity: number;
  unitPrice: string;
  lineTotal: string;
  currency: "AZN";
}

export interface PosSaleContract {
  id: string;
  saleNumber: string;
  receiptNumber: string;
  channel: "CASH" | "CARD" | "TRANSFER" | "WOLT" | "BIRMARKET";
  paymentMethod: "CASH" | "CARD" | "INSTALLMENT";
  subtotal: string;
  grandTotal: string;
  currency: "AZN";
  createdAt: string;
  items: PosSaleItemContract[];
}

export interface OrderCheckoutItemSummaryContract {
  id: string;
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  lineTotal: string;
}

export interface OrderSummaryContract {
  id: string;
  orderNumber: string;
  status:
    | "PENDING_PAYMENT"
    | "UNDER_REVIEW"
    | "CONFIRMED"
    | "PROCESSING"
    | "READY_FOR_PICKUP"
    | "READY_FOR_DELIVERY"
    | "OUT_FOR_DELIVERY"
    | "COMPLETED"
    | "CANCELLED";
  paymentStatus:
    | "PENDING"
    | "AUTHORIZED"
    | "PAID"
    | "FAILED"
    | "CANCELLED"
    | "PARTIALLY_REFUNDED"
    | "REFUNDED";
  fulfillmentStatus:
    | "PENDING"
    | "RESERVED"
    | "READY_FOR_PICKUP"
    | "READY_FOR_DELIVERY"
    | "OUT_FOR_DELIVERY"
    | "FULFILLED"
    | "CANCELLED";
  fulfillmentType: "DELIVERY" | "PICKUP";
  recipientName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  /** Present for INSTALLMENT (hissə-hissə) orders. */
  finCode: string | null;
  phone: string | null;
  administrativeArea: string | null;
  addressLine: string | null;
  notes: string | null;
  deliveryZone: {
    id: string;
    code: string;
    name: string;
  } | null;
  pickupLocation: {
    id: string;
    code: string;
    name: string;
  } | null;
  paymentMethod: "CASH" | "CARD" | "INSTALLMENT" | null;
  installmentMonths: number | null;
  itemCount: number;
  quantityTotal: number;
  items: OrderCheckoutItemSummaryContract[];
  subtotal: string;
  deliveryFee: string;
  grandTotal: string;
  currency: "AZN";
  cancelledByCustomer?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerOrderItemReviewContract {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface CustomerOrderItemSummaryContract
  extends OrderCheckoutItemSummaryContract {
  productId: string;
  productSlug: string;
  review: CustomerOrderItemReviewContract | null;
}

export interface CustomerOrderSummaryContract
  extends Omit<OrderSummaryContract, "items"> {
  items: CustomerOrderItemSummaryContract[];
}

export interface CustomerProductReviewContract {
  id: string;
  orderId: string;
  orderItemId: string;
  productId: string;
  variantId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface FulfillmentEventContract {
  id: string;
  orderStatus: OrderSummaryContract["status"];
  paymentStatus: OrderSummaryContract["paymentStatus"];
  fulfillmentStatus: OrderSummaryContract["fulfillmentStatus"];
  eventType: string;
  reason: string;
  actorStaffId: string | null;
  payload: unknown;
  createdAt: string;
}

export interface OrderDetailsContract
  extends Omit<OrderSummaryContract, "items"> {
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
    status:
      | "PENDING"
      | "AUTHORIZED"
      | "PAID"
      | "FAILED"
      | "CANCELLED"
      | "PARTIALLY_REFUNDED"
      | "REFUNDED";
    amount: string;
    currency: "AZN";
    providerPaymentId: string | null;
    installmentMonths: number | null;
  } | null;
  items: Array<{
    id: string;
    variantId: string;
    productName: string;
    variantName: string;
    sku: string;
    barcode: string | null;
    quantity: number;
    unitPrice: string;
    discountTotal: string;
    taxTotal: string;
    lineTotal: string;
    currency: "AZN";
    image: {
      id: string;
      objectKey: string;
      url?: string;
      altText: string;
      mimeType: string;
      byteSize: number;
      sortOrder: number;
    } | null;
  }>;
  reservations: Array<{
    id: string;
    variantId: string;
    locationId: string;
    location: {
      id: string;
      code: string;
      name: string;
    };
    quantity: number;
    status: "ACTIVE" | "RELEASED" | "CONSUMED" | "EXPIRED";
    expiresAt: string;
    releasedAt: string | null;
  }>;
  statusHistory: Array<{
    id: string;
    orderStatus: OrderSummaryContract["status"];
    paymentStatus: OrderSummaryContract["paymentStatus"];
    fulfillmentStatus: OrderSummaryContract["fulfillmentStatus"];
    reason: string;
    actorType?: string | null;
    createdAt: string;
  }>;
  fulfillmentEvents: FulfillmentEventContract[];
}

export interface DeliveryZoneContract {
  id: string;
  code: string;
  name: string;
  fee: string;
  freeDeliveryMinimum: string | null;
  estimatedMinDays: number;
  estimatedMaxDays: number;
  coveredAdministrativeAreas: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PickupLocationContract {
  id: string;
  code: string;
  name: string;
  locationId: string;
  addressLine: string;
  workingHours: Record<string, unknown>;
  contactLabel: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  location: {
    id: string;
    code: string;
    name: string;
    type: "STORE" | "WAREHOUSE";
    active: boolean;
  };
}

export interface RefundOrderRequestContract {
  reason: string;
  amount?: string;
}

export interface PaymentMethodOptionContract {
  method: "CASH" | "CARD" | "INSTALLMENT";
  label: string;
  installmentMonths: number[];
  minimumAmount?: string;
}

export interface PaymentOptionsContract {
  provider: string;
  sandbox: boolean;
  methods: PaymentMethodOptionContract[];
}

export interface OrderStatusSummaryContract {
  orderId: string;
  orderNumber: string;
  orderStatus: OrderSummaryContract["status"];
  paymentStatus: OrderSummaryContract["paymentStatus"];
  fulfillmentStatus: OrderSummaryContract["fulfillmentStatus"];
  fulfillmentType: "DELIVERY" | "PICKUP";
  paymentMethod: PaymentMethodOptionContract["method"] | null;
  provider: string | null;
  sandbox: boolean;
}

export interface OnlineCheckoutContract {
  id: string;
  orderNumber: string;
  grandTotal: string;
  currency: "AZN";
  checkoutUrl: string;
  paymentMethod: Exclude<PaymentMethodOptionContract["method"], "CASH">;
  provider: string;
  sandbox: boolean;
}

export interface PaymentContinueContract {
  nextUrl: string;
  kind: "provider_redirect" | "status";
}

export interface ReportMetricsContract {
  transactionCount: number;
  quantity: number;
  grossSales: string;
  discountTotal: string;
  deliveryFeeTotal: string;
  taxTotal: string;
  refundTotal: string;
  netSales: string;
}

export type SalesReportChannelContract = "ONLINE" | "POS";

export type SalesReportChannelMetricsContract = ReportMetricsContract & {
  channel: SalesReportChannelContract;
};

export interface SalesReportContract {
  range: {
    from: string;
    to: string;
    timeZone: "Asia/Baku";
  };
  summary: ReportMetricsContract;
  byDay: Array<
    ReportMetricsContract & {
      day: string;
      channels: SalesReportChannelMetricsContract[];
    }
  >;
  byMonth: Array<
    ReportMetricsContract & {
      month: string;
      channels: SalesReportChannelMetricsContract[];
    }
  >;
  byChannel: Array<SalesReportChannelMetricsContract>;
  byPaymentMethod: Array<
    ReportMetricsContract & {
      paymentMethod: "CASH" | "CARD" | "INSTALLMENT";
    }
  >;
  byCashier: Array<
    ReportMetricsContract & {
      staffUserId: string;
      displayName: string;
      email: string;
    }
  >;
  byProduct: Array<
    ReportMetricsContract & {
      variantId: string;
      sku: string;
      productName: string;
      variantName: string;
    }
  >;
  orderStatuses: Array<{
    status:
      | "PENDING_PAYMENT"
      | "UNDER_REVIEW"
      | "CONFIRMED"
      | "PROCESSING"
      | "READY_FOR_PICKUP"
      | "READY_FOR_DELIVERY"
      | "OUT_FOR_DELIVERY"
      | "COMPLETED"
      | "CANCELLED";
    transactionCount: number;
    netSales: string;
  }>;
  deliveryZones: Array<{
    code: string;
    name: string;
    transactionCount: number;
    deliveryFeeTotal: string;
    netSales: string;
  }>;
  notes: string[];
}

export interface LowStockItemContract {
  variantId: string;
  sku: string;
  barcode: string | null;
  productName: string;
  variantName: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  onHand: number;
  reserved: number;
  available: number;
  updatedAt: string;
}

export interface LowStockReportContract {
  threshold: number;
  items: LowStockItemContract[];
}

export interface InventoryMovementReportItemContract {
  id: string;
  type: "RECEIPT" | "ADJUSTMENT" | "TRANSFER_OUT" | "TRANSFER_IN" | "SALE";
  quantityDelta: number;
  sourceType: string;
  sourceDocumentId: string;
  reason: string;
  createdAt: string;
  businessDay: string;
  variant: {
    id: string;
    sku: string;
    barcode: string | null;
    name: string;
    productName: string;
  };
  location: {
    id: string;
    code: string;
    name: string;
  };
}

export interface InventoryMovementReportContract {
  range: {
    from: string;
    to: string;
    timeZone: "Asia/Baku";
  };
  items: InventoryMovementReportItemContract[];
}

export {
  buildProductCatalogDisplayTitle,
  getProductCatalogDisplayTitle,
  type BuildProductCatalogDisplayTitleInput,
  type ProductCatalogDisplayTitleInput,
} from "./product-catalog-display.js";

export {
  ITMARKET_PICKUP_28MAY_LOCATION_CODE,
  ITMARKET_STORE_28MAY_DISPLAY_NAME,
  ITMARKET_STORE_28MAY_LOCATION_CODE,
  isItmarketStore28MayLocation,
  resolveInventoryLocationDisplayName,
  type InventoryLocationNameLike,
} from "./inventory-location-display.js";

export {
  ORDER_NAV_ALL_LABEL,
  ORDER_NAV_BUCKET_LABELS,
  ORDER_NAV_BUCKET_STATUSES,
  orderMatchesNavBucket,
  resolveOrderNavBucket,
  type OrderNavBucket,
  type OrderNavCountsContract,
} from "./order-nav-buckets.js";

export {
  BACKOFFICE_CUSTOMER_CANCELLED_LABEL,
  BACKOFFICE_STAFF_CANCELLED_LABEL,
  CUSTOMER_CANCELLABLE_ORDER_STATUSES,
  CUSTOMER_ORDER_CANCELLATION_ACTOR_TYPE,
  CUSTOMER_ORDER_CANCELLATION_REASON,
  ORDER_CANCEL_REASON_MAX_LENGTH,
  ORDER_CANCEL_REASON_MIN_LENGTH,
  STAFF_ORDER_CANCELLATION_ACTOR_TYPE,
  backofficeCancelledOrderLabel,
  canCustomerCancelOrderStatus,
  customerCancelTriggersAutoRefund,
  orderCancelledByCustomer,
  type CancelCustomerOrderRequestContract,
  type CustomerCancellableOrderStatus,
} from "./order-cancellation.js";

export type {
  CustomerNavCountsContract,
  StaffCustomerSummaryContract,
  StaffUnregisteredCustomerSummaryContract,
} from "./staff-customers.js";

export type {
  StaffAvailabilityRequestNavCountsContract,
  StaffAvailabilityRequestStatus,
  StaffAvailabilityRequestSummaryContract,
  StaffAvailabilityRequestType,
} from "./staff-availability-requests.js";

export type {
  StaffCreditApplicationStatus,
  StaffCreditApplicationSummaryContract,
} from "./staff-credit-applications.js";

export type { StaffProductReviewSummaryContract } from "./staff-product-reviews.js";

export type {
  StaffSupportMessageNavCountsContract,
  StaffSupportMessageStatus,
  StaffSupportMessageSummaryContract,
  StaffSupportThreadDetailContract,
  SupportChatMessageContract,
  SupportChatRealtimeEvent,
  SupportChatSenderType,
} from "./staff-support-messages.js";

export type {
  CatalogPriceImportItemContract,
  CatalogPriceImportRequestContract,
  CatalogPriceImportResponseContract,
  CatalogPriceImportRowResultContract,
  CatalogPriceImportRowStatus,
  CatalogPriceImportSummaryContract,
} from "./catalog-price-import.js";
