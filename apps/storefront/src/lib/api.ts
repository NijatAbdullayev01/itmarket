import { cache } from "react";

export type ProductMedia = {
  id: string;
  objectKey: string;
  /** Resolved read URL from API (signed S3 or local public path). */
  url?: string;
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
  seoTitle?: string | null;
  seoDescription?: string | null;
  category: {
    name: string;
    slug: string;
    parentId?: string | null;
    parentSlug?: string | null;
  };
  brand: { name: string; slug: string } | null;
  image: ProductMedia | null;
  /** Extra gallery frames after primary `image` (Merchant additional_image_link). */
  additionalImages?: ProductMedia[];
  price: string | null;
  previousPrice: string | null;
  currency: "AZN";
  available: number;
  availableByOrder?: boolean;
  defaultVariantId: string | null;
  sku?: string | null;
  barcode?: string | null;
  variantName?: string;
  variantAttributes?: Record<string, string>;
  updatedAt?: string;
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
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onSale?: boolean;
  color?: string;
  ram?: string;
  storage?: string;
  cursor?: string;
  limit?: number;
  page?: number;
  gallery?: boolean;
};

export type CatalogProductList = {
  items: ProductSummary[];
  nextCursor: string | null;
  page: number | null;
  pageSize: number;
  totalCount: number | null;
  totalPages: number | null;
};

export type CategorySummary = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  updatedAt?: string;
};

export type BrandSummary = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  logoObjectKey?: string | null;
  logoScalePercent?: number | null;
  logoOffsetX?: number | null;
  logoOffsetY?: number | null;
  updatedAt?: string;
};

export type PickupLocationSummary = {
  name: string;
  addressLine: string;
  workingHours: unknown;
  contactLabel: string | null;
};

export type BannerSummary = {
  id: string;
  placement?: "HOME_HERO" | "CATALOG_SEARCH";
  altText: string;
  href: string;
  imageObjectKey: string;
  sortOrder: number;
};

export type ProductReview = {
  id: string;
  variantId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  authorName: string;
};

export type RequiredSpecEntry = {
  label: string;
  value: string;
  /** Opsiyonl: məhsulun xüsusiyyətinin rus dilində tərcüməsi. */
  labelRu?: string;
  valueRu?: string;
  /** Opsiyonl: məhsulun xüsusiyyətinin ingilis dilində tərcüməsi. */
  labelEn?: string;
  valueEn?: string;
};

export type ProductDetail = ProductSummary & {
  media: ProductMedia[];
  requiredSpecs?: RequiredSpecEntry[];
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
    availableByOrder?: boolean;
    media?: ProductMedia[];
    image: ProductMedia | null;
  }[];
};

export type Cart = {
  id: string;
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
  closed?: boolean;
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
import { resolveStorefrontOrigin } from "./site-origin";

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

type ApiRequestInit = RequestInit & {
  /** When set, uses Next.js fetch cache instead of `cache: "no-store"`. */
  revalidate?: number;
  /** Cache tags for on-demand revalidation via `/api/revalidate-catalog`. */
  tags?: string[];
};

async function api<T>(path: string, init?: ApiRequestInit): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  const { revalidate, tags, ...requestInit } = init ?? {};
  const method = (requestInit.method ?? "GET").toUpperCase();
  const isMutation = !["GET", "HEAD", "OPTIONS"].includes(method);
  const storefrontOrigin = resolveStorefrontOrigin();

  let response: Response;
  try {
    response = await fetchWithRetry(url, {
      ...requestInit,
      ...(revalidate === undefined
        ? { cache: "no-store" as const }
        : {
            next: {
              revalidate,
              ...(tags !== undefined && tags.length > 0 ? { tags } : {}),
            },
          }),
      headers: {
        "content-type": "application/json",
        ...(isMutation
          ? {
              Origin: storefrontOrigin,
              "sec-fetch-site": "same-origin",
            }
          : {}),
        ...requestInit.headers,
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

const CATALOG_REVALIDATE_SECONDS = 120;
const CATALOG_CACHE_TAG = "catalog";

export function listProducts(filters: CatalogFilter = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.category) params.set("category", filters.category);
  if (filters.brand) params.set("brand", filters.brand);
  if (filters.minPrice !== undefined) {
    params.set("minPrice", String(filters.minPrice));
  }
  if (filters.maxPrice !== undefined) {
    params.set("maxPrice", String(filters.maxPrice));
  }
  if (filters.inStock) params.set("inStock", "1");
  if (filters.onSale) params.set("onSale", "1");
  if (filters.color) params.set("color", filters.color);
  if (filters.ram) params.set("ram", filters.ram);
  if (filters.storage) params.set("storage", filters.storage);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.cursor) params.set("cursor", filters.cursor);
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  if (filters.page !== undefined) params.set("page", String(filters.page));
  if (filters.gallery) params.set("gallery", "1");
  return api<CatalogProductList>(
    `/storefront/catalog/products?${params.toString()}`,
    { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_CACHE_TAG] },
  );
}

export function listCategories() {
  return api<CategorySummary[]>("/storefront/catalog/categories", {
    revalidate: CATALOG_REVALIDATE_SECONDS,
    tags: [CATALOG_CACHE_TAG],
  });
}

export function listBrands() {
  return api<BrandSummary[]>("/storefront/catalog/brands", {
    revalidate: CATALOG_REVALIDATE_SECONDS,
    tags: [CATALOG_CACHE_TAG],
  });
}

export function listBanners() {
  return api<BannerSummary[]>("/storefront/catalog/banners", {
    revalidate: CATALOG_REVALIDATE_SECONDS,
    tags: [CATALOG_CACHE_TAG],
  });
}

export function listBestsellers() {
  return api<{ items: ProductSummary[] }>("/storefront/catalog/bestsellers", {
    revalidate: CATALOG_REVALIDATE_SECONDS,
    tags: [CATALOG_CACHE_TAG],
  });
}

export function listWeeklyDeals() {
  return api<{ items: ProductSummary[] }>("/storefront/catalog/weekly-deal", {
    revalidate: CATALOG_REVALIDATE_SECONDS,
    tags: [CATALOG_CACHE_TAG],
  });
}

export function getPrimaryPickupLocation() {
  return api<PickupLocationSummary | null>(
    "/storefront/catalog/pickup-location",
    { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_CACHE_TAG] },
  );
}

export function fetchProductDetail(slug: string) {
  return api<ProductDetail>(`/storefront/catalog/products/${slug}`, {
    revalidate: CATALOG_REVALIDATE_SECONDS,
    tags: [CATALOG_CACHE_TAG, `product:${slug}`],
  });
}

export const getProduct = cache((slug: string) => fetchProductDetail(slug));

export type CatalogSlugEntityType = "product" | "category" | "brand";

export type CatalogSlugRedirect = {
  entityType: "PRODUCT" | "CATEGORY" | "BRAND";
  oldSlug: string;
  newSlug: string;
  path: string;
};

export function fetchCatalogSlugRedirect(
  entityType: CatalogSlugEntityType,
  slug: string,
) {
  return api<CatalogSlugRedirect>(
    `/storefront/catalog/slug-redirects/${entityType}/${encodeURIComponent(slug)}`,
    { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_CACHE_TAG] },
  );
}

export const getCatalogSlugRedirect = cache(
  (entityType: CatalogSlugEntityType, slug: string) =>
    fetchCatalogSlugRedirect(entityType, slug),
);

export const listSimilarProducts = cache((slug: string, limit = 8) => {
  const params = new URLSearchParams({ limit: String(limit) });
  return api<{ items: ProductSummary[] }>(
    `/storefront/catalog/products/${slug}/similar?${params.toString()}`,
    {
      revalidate: CATALOG_REVALIDATE_SECONDS,
      tags: [CATALOG_CACHE_TAG, `product:${slug}`],
    },
  );
});

export const listCompanionProducts = cache((slug: string, limit = 4) => {
  const params = new URLSearchParams({ limit: String(limit) });
  return api<{ items: ProductSummary[] }>(
    `/storefront/catalog/products/${slug}/companions?${params.toString()}`,
    {
      revalidate: CATALOG_REVALIDATE_SECONDS,
      tags: [CATALOG_CACHE_TAG, `product:${slug}`],
    },
  );
});

const CART_GUEST_TOKEN_HEADER = "x-cart-guest-token";

function cartGuestHeaders(guestToken: string): Record<string, string> {
  return { [CART_GUEST_TOKEN_HEADER]: guestToken };
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

/** Request-memoized so header badge + page cart reads share one fetch. */
export const getCart = cache((cartId: string, guestToken: string) => {
  return api<Cart>(`/storefront/cart/${cartId}`, {
    headers: cartGuestHeaders(guestToken),
  });
});

export function upsertCartItem(input: {
  cartId: string;
  guestToken: string;
  variantId: string;
  quantity: number;
}) {
  return api<Cart>(`/storefront/cart/${input.cartId}/items`, {
    method: "POST",
    headers: cartGuestHeaders(input.guestToken),
    body: JSON.stringify({
      variantId: input.variantId,
      quantity: input.quantity,
    }),
  });
}

export function removeCartItem(input: {
  cartId: string;
  guestToken: string;
  variantId: string;
}) {
  return api<Cart>(
    `/storefront/cart/${input.cartId}/items/${input.variantId}/remove`,
    {
      method: "POST",
      headers: cartGuestHeaders(input.guestToken),
    },
  );
}

export function getFulfillmentOptions(
  cartId: string,
  guestToken: string,
  administrativeArea?: string,
) {
  const params = new URLSearchParams({ cartId });
  if (administrativeArea) {
    params.set("administrativeArea", administrativeArea);
  }
  return api<FulfillmentOptions>(
    `/storefront/fulfillment/options?${params.toString()}`,
    { headers: cartGuestHeaders(guestToken) },
  );
}

export function createCashOrder(input: {
  cartId: string;
  guestToken: string;
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
  finCode?: string;
  idempotencyKey: string;
}) {
  const { idempotencyKey, guestToken, ...body } = input;
  const payload = Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined),
  );
  return api<CashOrder>("/storefront/checkout/cash", {
    method: "POST",
    headers: {
      "Idempotency-Key": idempotencyKey,
      ...cartGuestHeaders(guestToken),
    },
    body: JSON.stringify(payload),
  });
}

export function getPaymentOptions(cartId: string, guestToken: string) {
  const params = new URLSearchParams({ cartId });
  return api<PaymentOptions>(`/payments/options?${params.toString()}`, {
    headers: cartGuestHeaders(guestToken),
  });
}

export function createOnlineOrder(input: {
  cartId: string;
  guestToken: string;
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
  finCode?: string;
  idempotencyKey: string;
}) {
  const { idempotencyKey, guestToken, ...body } = input;
  const payload = Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined),
  );
  return api<OnlineOrder>("/storefront/checkout/online", {
    method: "POST",
    headers: {
      "Idempotency-Key": idempotencyKey,
      ...cartGuestHeaders(guestToken),
    },
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

export type PaymentAttemptHandoff = {
  orderNumber: string;
  paymentMethod: "CARD" | "INSTALLMENT" | "CASH" | "POS" | "BANK_TRANSFER";
  installmentMonths: number | null;
  amount: string;
  currency: string;
  attemptStatus: string;
  paymentStatus: string;
  orderStatus: string;
};

export function getPaymentAttemptHandoff(attemptToken: string) {
  return api<PaymentAttemptHandoff>(
    `/payments/attempts/${encodeURIComponent(attemptToken)}`,
  );
}

export function continuePayment(input: {
  attemptToken: string;
  action: "proceed" | "cancel";
  orderNumber: string;
}) {
  return api<PaymentContinueResult>(
    `/payments/attempts/${input.attemptToken}/continue`,
    {
      method: "POST",
      body: JSON.stringify({
        action: input.action,
        orderNumber: input.orderNumber,
      }),
    },
  );
}

export function getOrderStatus(orderNumber: string, statusToken: string) {
  const params = new URLSearchParams({ statusToken });
  return api<OrderStatus>(
    `/payments/orders/${encodeURIComponent(orderNumber)}/status?${params.toString()}`,
  );
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
  email?: string;
  productId: string;
  variantId: string;
  quantity: number;
  cartId?: string;
  guestToken?: string;
}) {
  const { guestToken, ...body } = input;
  return api<CreditApplication>("/storefront/credit-applications", {
    method: "POST",
    body: JSON.stringify(body),
    ...(guestToken === undefined
      ? {}
      : { headers: cartGuestHeaders(guestToken) }),
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
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  productId: string;
  variantId: string;
  quantity?: number;
}) {
  return api<ProductAvailabilityRequest>(
    "/storefront/product-availability-requests",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

