import { cache } from "react";

export type ProductMedia = {
  id: string;
  objectKey: string;
  altText: string;
  mimeType: string;
  byteSize: number;
  sortOrder: number;
};

export type ProductSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: { name: string; slug: string };
  brand: { name: string; slug: string } | null;
  image: ProductMedia | null;
  price: string | null;
  previousPrice: string | null;
  currency: "AZN";
  available: number;
  defaultVariantId: string | null;
  variantName?: string;
  variantAttributes?: Record<string, string>;
  reviewSummary: {
    averageRating: number | null;
    count: number;
  };
};

export type CatalogFilter = {
  search?: string;
  category?: string;
  brand?: string;
  sort?: "newest" | "name" | "price";
};

export type CategorySummary = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
};

export type BrandSummary = {
  id: string;
  name: string;
  slug: string;
};

export type ProductReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  authorName: string;
};

export type ProductDetail = ProductSummary & {
  media: ProductMedia[];
  requiredSpecs?: { label: string; value: string }[];
  reviewSummary: {
    averageRating: number | null;
    count: number;
  };
  reviews: ProductReview[];
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
    image: ProductMedia | null;
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
    image: ProductMedia | null;
    variantName: string;
    sku: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
    linePreviousTotal: string | null;
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
    workingHours: string | null;
    stockLocation: {
      id: string;
      code: string;
      name: string;
    };
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
  paymentMethod: "CASH" | "CARD" | "INSTALLMENT" | null;
  provider: string | null;
  sandbox: boolean;
};

import { resolveApiBaseUrl } from "./resolve-api-base-url";

function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return resolveApiBaseUrl(process.env.NEXT_PUBLIC_API_URL, window.location);
  }

  return resolveApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);
}

export class ApiUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ApiUnavailableError";
  }
}

export type ApiErrorBody = {
  code?: string;
  message?: string;
  details?: unknown;
  correlationId?: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly details: unknown;
  readonly correlationId: string | undefined;

  constructor(
    message: string,
    options: {
      status: number;
      code?: string;
      details?: unknown;
      correlationId?: string;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options.cause });
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.correlationId = options.correlationId;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

function devServerErrorHint(status: number): string {
  if (process.env.NODE_ENV !== "development" || status < 500) {
    return "";
  }
  return ' API schema yenilənibsə, "pnpm db:migrate" işlədin.';
}

function formatApiErrorDetails(details: unknown): string {
  if (Array.isArray(details) && details.length > 0) {
    const parts = details.map((entry) =>
      typeof entry === "string" ? entry : JSON.stringify(entry),
    );
    return `: ${parts.join("; ")}`;
  }
  if (typeof details === "string" && details.trim() !== "") {
    return `: ${details}`;
  }
  return "";
}

async function parseApiErrorResponse(response: Response): Promise<ApiError> {
  const status = response.status;
  const text = await response.text();

  if (text) {
    try {
      const body = JSON.parse(text) as ApiErrorBody;
      if (body.message || body.code) {
        const baseMessage =
          body.message ?? `API request failed with ${status}`;
        return new ApiError(
          `${baseMessage}${formatApiErrorDetails(body.details)}${devServerErrorHint(status)}`,
          {
            status,
            code: body.code,
            details: body.details,
            correlationId: body.correlationId,
          },
        );
      }
    } catch {
      // Response body is not JSON.
    }

    return new ApiError(`${text}${devServerErrorHint(status)}`, { status });
  }

  return new ApiError(
    `API request failed with ${status}${devServerErrorHint(status)}`,
    { status },
  );
}

function isRetryableFetchError(error: unknown): boolean {
  if (!(error instanceof TypeError)) {
    return false;
  }

  const cause = (error as { cause?: { code?: string } }).cause;
  return (
    error.message === "fetch failed" ||
    cause?.code === "ECONNREFUSED" ||
    cause?.code === "ECONNRESET"
  );
}

async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  maxAttempts = process.env.NODE_ENV === "development" ? 5 : 1,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fetch(url, init);
    } catch (error) {
      lastError = error;
      if (!isRetryableFetchError(error) || attempt === maxAttempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 200));
    }
  }

  throw lastError;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;

  let response: Response;
  try {
    response = await fetchWithRetry(url, {
      ...init,
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        ...init?.headers,
      },
    });
  } catch (error) {
    if (isRetryableFetchError(error)) {
      throw new ApiUnavailableError(
        `API server is unreachable at ${getApiBaseUrl()}. Start it with "pnpm dev" or "pnpm --filter @itmarket/api dev".`,
        { cause: error },
      );
    }
    throw error;
  }

  if (!response.ok) {
    throw await parseApiErrorResponse(response);
  }
  return (await response.json()) as T;
}

export function listProducts(filters: CatalogFilter = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.category) params.set("category", filters.category);
  if (filters.brand) params.set("brand", filters.brand);
  if (filters.sort) params.set("sort", filters.sort);
  return api<{ items: ProductSummary[]; nextCursor: string | null }>(
    `/storefront/catalog/products?${params.toString()}`,
  );
}

export function listCategories() {
  return api<CategorySummary[]>("/storefront/catalog/categories");
}

export function listBrands() {
  return api<BrandSummary[]>("/storefront/catalog/brands");
}

export function fetchProductDetail(slug: string) {
  return api<ProductDetail>(`/storefront/catalog/products/${slug}`);
}

export const getProduct = cache((slug: string) => fetchProductDetail(slug));

export function listSimilarProducts(slug: string, limit = 8) {
  const params = new URLSearchParams({ limit: String(limit) });
  return api<{ items: ProductSummary[] }>(
    `/storefront/catalog/products/${slug}/similar?${params.toString()}`,
  );
}

export function listCompanionProducts(slug: string, limit = 4) {
  const params = new URLSearchParams({ limit: String(limit) });
  return api<{ items: ProductSummary[] }>(
    `/storefront/catalog/products/${slug}/companions?${params.toString()}`,
  );
}

export function createCart(guestToken?: string) {
  return api<{ id: string; guestToken: string; status: string }>(
    "/storefront/cart",
    {
      method: "POST",
      body:
        guestToken === undefined ? "{}" : JSON.stringify({ guestToken }),
    },
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

export function removeCartItem(input: { cartId: string; variantId: string }) {
  return api<Cart>(
    `/storefront/cart/${input.cartId}/items/${input.variantId}/remove`,
    {
      method: "POST",
    },
  );
}

export function getFulfillmentOptions(
  cartId: string,
  administrativeArea?: string,
) {
  const params = new URLSearchParams({ cartId });
  if (administrativeArea) {
    params.set("administrativeArea", administrativeArea);
  }
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
  email: string;
  administrativeArea?: string;
  addressLine?: string;
  notes?: string;
  paymentMethod?: "CASH" | "CARD" | "INSTALLMENT";
  installmentMonths?: number;
  idempotencyKey: string;
}) {
  const { idempotencyKey, ...body } = input;
  const payload = Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined),
  );
  return api<CashOrder>("/storefront/checkout/cash", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(payload),
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
  email: string;
  administrativeArea?: string;
  addressLine?: string;
  notes?: string;
  paymentMethod: "CARD" | "INSTALLMENT";
  installmentMonths?: number;
  installmentProvider?: "birbank" | "tamkart" | "leobank";
  idempotencyKey: string;
}) {
  const { idempotencyKey, ...body } = input;
  const payload = Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined),
  );
  return api<OnlineOrder>("/storefront/checkout/online", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(payload),
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

export type PaymentContinueResult = {
  nextUrl: string;
  kind: "provider_redirect" | "status";
};

export function continuePayment(input: {
  attemptToken: string;
  action: "proceed" | "cancel";
}) {
  return api<PaymentContinueResult>(
    `/payments/attempts/${input.attemptToken}/continue`,
    {
      method: "POST",
      body: JSON.stringify({ action: input.action }),
    },
  );
}

export function getOrderStatus(orderNumber: string) {
  return api<OrderStatus>(`/payments/orders/${orderNumber}/status`);
}

export type CreditApplication = {
  id: string;
  status: "PENDING" | "PROCESSING" | "APPROVED" | "REJECTED";
  amount: string;
  currency: "AZN";
};

export function submitCreditApplication(input: {
  finCode: string;
  phone: string;
  productId: string;
  variantId: string;
  quantity: number;
  cartId?: string;
}) {
  return api<CreditApplication>("/storefront/credit-applications", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type ProductAvailabilityRequest = {
  id: string;
  status: "PENDING" | "FULFILLED" | "CANCELLED";
  type: "STOCK_ALERT" | "PREORDER";
  duplicate?: boolean;
};

export function submitProductAvailabilityRequest(input: {
  type: "STOCK_ALERT" | "PREORDER";
  phone: string;
  email?: string;
  productId: string;
  variantId: string;
  quantity?: number;
  customerId?: string;
}) {
  return api<ProductAvailabilityRequest>(
    "/storefront/product-availability-requests",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}
