export type ProductSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: { name: string; slug: string };
  brand: { name: string; slug: string } | null;
  price: string | null;
  previousPrice: string | null;
  currency: "AZN";
  available: number;
};

export type ProductDetail = ProductSummary & {
  variants: {
    id: string;
    sku: string;
    barcode: string | null;
    name: string;
    attributes: Record<string, string>;
    price: string;
    previousPrice: string | null;
    currency: "AZN";
    available: number;
  }[];
};

export type Cart = {
  id: string;
  guestToken: string | null;
  status: "ACTIVE" | "CHECKED_OUT" | "ABANDONED";
  subtotal: string;
  currency: "AZN";
  items: {
    id: string;
    variantId: string;
    productName: string;
    productSlug: string;
    variantName: string;
    sku: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
    currency: "AZN";
    available: number;
  }[];
};

export type FulfillmentOptions = {
  deliveryZones: {
    id: string;
    code: string;
    name: string;
    fee: string;
    freeDeliveryMinimum: string | null;
    estimatedMinDays: number;
    estimatedMaxDays: number;
  }[];
  pickupLocations: {
    id: string;
    code: string;
    name: string;
    addressLine: string;
  }[];
};

export type CashOrder = {
  id: string;
  orderNumber: string;
  grandTotal: string;
  currency: "AZN";
};

export type PaymentOption = {
  method: "CARD" | "INSTALLMENT";
  label: string;
  installmentMonths: number[];
  minimumAmount?: string;
};

export type PaymentOptions = {
  provider: string;
  sandbox: boolean;
  methods: PaymentOption[];
};

export type OnlineOrder = {
  id: string;
  orderNumber: string;
  grandTotal: string;
  currency: "AZN";
  checkoutUrl: string;
  paymentMethod: "CARD" | "INSTALLMENT";
  provider: string;
  sandbox: boolean;
};

export type OrderStatus = {
  orderId: string;
  orderNumber: string;
  orderStatus:
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
  paymentMethod: "CASH" | "CARD" | "INSTALLMENT" | null;
  provider: string | null;
  sandbox: boolean;
};

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"
).replace(/\/+$/, "");

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API request failed with ${response.status}`);
  }
  return (await response.json()) as T;
}

export function listProducts(search?: string) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  return api<{ items: ProductSummary[]; nextCursor: string | null }>(
    `/storefront/catalog/products?${params.toString()}`,
  );
}

export function getProduct(slug: string) {
  return api<ProductDetail>(`/storefront/catalog/products/${slug}`);
}

export function createCart() {
  return api<{ id: string; guestToken: string; status: string }>(
    "/storefront/cart",
    { method: "POST", body: "{}" },
  );
}

export function getCart(cartId: string) {
  return api<Cart>(`/storefront/cart/${cartId}`);
}

export function upsertCartItem(input: {
  cartId: string;
  variantId: string;
  quantity: number;
}) {
  return api<Cart>(`/storefront/cart/${input.cartId}/items`, {
    method: "POST",
    body: JSON.stringify({
      variantId: input.variantId,
      quantity: input.quantity,
    }),
  });
}

export function getFulfillmentOptions(cartId: string) {
  const params = new URLSearchParams({ cartId });
  return api<FulfillmentOptions>(
    `/storefront/fulfillment/options?${params.toString()}`,
  );
}

export function createCashOrder(input: {
  cartId: string;
  fulfillmentType: "DELIVERY" | "PICKUP";
  deliveryZoneId?: string;
  pickupLocationId?: string;
  recipientName: string;
  phone: string;
  email?: string;
  administrativeArea?: string;
  addressLine: string;
  notes?: string;
  idempotencyKey: string;
}) {
  const { idempotencyKey, ...body } = input;
  return api<CashOrder>("/storefront/checkout/cash", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(body),
  });
}

export function getPaymentOptions(cartId: string) {
  const params = new URLSearchParams({ cartId });
  return api<PaymentOptions>(`/payments/options?${params.toString()}`);
}

export function createOnlineOrder(input: {
  cartId: string;
  fulfillmentType: "DELIVERY" | "PICKUP";
  deliveryZoneId?: string;
  pickupLocationId?: string;
  recipientName: string;
  phone: string;
  email?: string;
  administrativeArea?: string;
  addressLine: string;
  notes?: string;
  paymentMethod: "CARD" | "INSTALLMENT";
  installmentMonths?: number;
  idempotencyKey: string;
}) {
  const { idempotencyKey, ...body } = input;
  return api<OnlineOrder>("/storefront/checkout/online", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(body),
  });
}

export function completeMockPayment(input: {
  attemptToken: string;
  scenario: "success" | "failure" | "cancel" | "timeout";
}) {
  return api<OrderStatus>(
    `/payments/mock/attempts/${input.attemptToken}/complete`,
    {
      method: "POST",
      body: JSON.stringify({ scenario: input.scenario }),
    },
  );
}

export function getOrderStatus(orderNumber: string) {
  return api<OrderStatus>(`/payments/orders/${orderNumber}/status`);
}
