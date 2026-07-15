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
  createdAt: string;
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
  openingFloat: string;
  expectedCash: string;
  countedCash: string | null;
  discrepancy: string | null;
  openedAt: string;
  closingStartedAt: string | null;
  closedAt: string | null;
}

export interface PosSaleItemContract {
  id: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  barcode: string | null;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  currency: "AZN";
}

export interface PosSaleContract {
  id: string;
  saleNumber: string;
  receiptNumber: string;
  paymentMethod: "CASH" | "CARD" | "INSTALLMENT";
  subtotal: string;
  grandTotal: string;
  currency: "AZN";
  createdAt: string;
  items: PosSaleItemContract[];
}

export interface OrderSummaryContract {
  id: string;
  orderNumber: string;
  status:
    | "PENDING_PAYMENT"
    | "CONFIRMED"
    | "PROCESSING"
    | "READY_FOR_PICKUP"
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
    | "OUT_FOR_DELIVERY"
    | "FULFILLED"
    | "CANCELLED";
  fulfillmentType: "DELIVERY" | "PICKUP";
  recipientName: string | null;
  itemCount: number;
  grandTotal: string;
  currency: "AZN";
  createdAt: string;
  updatedAt: string;
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

export interface OrderDetailsContract extends OrderSummaryContract {
  customerId: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  subtotal: string;
  discountTotal: string;
  deliveryFee: string;
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

export interface SalesReportContract {
  range: {
    from: string;
    to: string;
    timeZone: "Asia/Baku";
  };
  summary: ReportMetricsContract;
  byDay: Array<ReportMetricsContract & { day: string }>;
  byMonth: Array<ReportMetricsContract & { month: string }>;
  byChannel: Array<ReportMetricsContract & { channel: "ONLINE" | "POS" }>;
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
      | "CONFIRMED"
      | "PROCESSING"
      | "READY_FOR_PICKUP"
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
