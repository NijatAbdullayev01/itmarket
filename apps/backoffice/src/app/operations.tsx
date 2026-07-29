"use client";

import {
  orderMatchesNavBucket,
  resolveOrderNavBucket,
  type CustomerNavCountsContract,
  type OrderNavCountsContract,
  type Page,
  type StaffAvailabilityRequestNavCountsContract,
  type StaffAvailabilityRequestSummaryContract,
  type StaffCreditApplicationSummaryContract,
  type StaffCustomerSummaryContract,
  type StaffProductReviewSummaryContract,
  type StaffSupportMessageNavCountsContract,
  type StaffSupportMessageSummaryContract,
  type StaffSupportThreadDetailContract,
  type SupportChatMessageContract,
  type SupportChatRealtimeEvent,
  type StaffUnregisteredCustomerSummaryContract,
  type CatalogPriceImportResponseContract,
  type CatalogSeoCoverageResponseContract,
  type CatalogSeoFillMissingResponseContract,
  type CatalogSeoSuggestRequestContract,
  type CatalogSeoSuggestResponseContract,
} from "@itmarket/contracts";
import { BrandLogo, useConfirmDialog } from "@itmarket/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { formatAzDate, formatAzDateTime } from "../lib/format-az-date";
import { formatAznValue } from "../lib/format-azn";
import {
  formatPosReturnSaleProductPreview,
  formatPosReturnSaleSkuPreview,
  posReturnSaleDocumentLabel,
  posReturnSaleMatchesSearch,
} from "../lib/pos-return-sale-search";
import {
  getBoNavDisplay,
  shouldShowBoDashboardHeader,
  getBoRouteId,
  getOrderIdFromPathname,
  type BoRouteId,
} from "./components/bo-nav-config";
import { useBoNavCounts } from "./components/bo-nav-counts-context";
import {
  BoRouteAlertsBanner,
  BoRouteAlertsProvider,
  BoRoutePanel,
  shouldShowBoRouteAlerts,
} from "./components/bo-route-panel";
import { AdministrationPanel } from "./components/administration-panel";
import type {
  RoleDefinition,
  StaffUserRow,
} from "./components/administration-panel";
import { CustomersPanel } from "./components/customers-panel";
import { UnregisteredCustomersPanel } from "./components/unregistered-customers-panel";
import { InquiriesPanel } from "./components/inquiries-panel";
import { CreditApplicationsPanel } from "./components/credit-applications-panel";
import { ProductReviewsPanel } from "./components/product-reviews-panel";
import { SupportMessagesPanel } from "./components/support-messages-panel";
import { CatalogCategoriesPanel } from "./components/catalog-categories-panel";
import { CatalogBrandsPanel } from "./components/catalog-brands-panel";
import { CatalogBannersPanel } from "./components/catalog-banners-panel";
import { CatalogProductsPanel } from "./components/catalog-products-panel";
import { CatalogSeoCoveragePanel } from "./components/catalog-seo-coverage-panel";
import { CatalogSubcategoriesPanel } from "./components/catalog-subcategories-panel";
import {
  InventoryBalancePanel,
  type InventoryBalancePage,
} from "./components/inventory-balance-panel";
import { InventoryReceiptPanel } from "./components/inventory-receipt-panel";
import {
  OrdersListPanel,
  OrderDetailPanel,
  type OrderDetails,
  type OrderSummary,
} from "./components/orders-panel";
import { InventoryAdjustmentPanel } from "./components/inventory-adjustment-panel";
import {
  PosProductPicker,
  type PosProductItem,
} from "./components/pos-product-picker";
import {
  IconCard,
  IconCash,
  IconCheck,
  IconChevronLeft,
  IconClose,
  IconDelivery,
  IconMinus,
  IconOrders,
  IconPlus,
  IconReturn,
  IconSearch,
  IconTransfer,
} from "./components/bo-icons";
import { useBoStaff } from "./components/bo-staff-context";
import { resolveApiBaseUrl } from "../lib/resolve-api-base-url";
import { uploadCatalogProductImageFile } from "../lib/upload-catalog-product-image";
import { getBackofficeProductDisplayTitle } from "../lib/product-display-title";
import { getInventoryLocationLabel } from "../lib/inventory-location-label";
import {
  buildCreateCatalogVariantPayload,
  buildUpdateCatalogVariantMetadataPayload,
  buildUpdateCatalogVariantPricePayload,
} from "../lib/product-variant-form";
import {
  playOrderNotificationSound,
  unlockOrderNotificationSound,
} from "../lib/order-notification-sound";
import { openSupportChatSse } from "../lib/support-chat-sse";
import { useOrderArrivalMonitor } from "../lib/use-order-arrival-monitor";
import { useSupportMessageArrivalMonitor } from "../lib/use-support-message-arrival-monitor";

function getApiBaseUrl(): string {
  return resolveApiBaseUrl(
    process.env.NEXT_PUBLIC_API_URL,
    typeof window !== "undefined" ? window.location : undefined,
  );
}

function formatFetchError(caught: unknown): string {
  if (!(caught instanceof Error)) {
    return "Əməliyyat alınmadı";
  }
  if (caught.message === "Failed to fetch") {
    return "API serverinə qoşulmaq mümkün olmadı. `pnpm dev` ilə API-nin (port 3001) işlədiyini yoxlayın və backoffice-i yenidən yükləyin.";
  }
  return caught.message;
}

/** Keep admin panels loading when one endpoint fails (avoid Promise.all total outage). */
function settleRefreshValue<T>(
  promise: Promise<T>,
  fallback: T,
  failures: string[],
  label: string,
): Promise<T> {
  return promise.catch(() => {
    failures.push(label);
    return fallback;
  });
}

function formatMoney(value: string | number) {
  return formatAznValue(value) ?? "—";
}

type Staff = {
  id: string;
  displayName: string;
  role: string;
  permissions: string[];
  mfaEnabled?: boolean;
};

type StaffLoginResponse =
  | Staff
  | {
      mfaRequired: true;
      mfaToken: string;
    };

type Brand = {
  id: string;
  name: string;
  slug?: string;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  logoObjectKey?: string | null;
  logoMimeType?: string | null;
  logoByteSize?: number | null;
  logoScalePercent?: number | null;
  logoOffsetX?: number | null;
  logoOffsetY?: number | null;
};
type StorefrontBanner = {
  id: string;
  placement?: "HOME_HERO" | "CATALOG_SEARCH";
  altText: string;
  href: string;
  imageObjectKey: string;
  imageMimeType: string;
  imageByteSize: number;
  sortOrder: number;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
};
type Category = {
  id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
  sortOrder?: number;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};
type ProductMedia = {
  id: string;
  objectKey: string;
  altText: string;
  mimeType: string;
  byteSize: number;
  sortOrder: number;
};
type Product = {
  id: string;
  name: string;
  slug: string;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  categoryId: string;
  category?: {
    id: string;
    name: string;
    status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  };
  brand: { id: string; name: string } | null;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  requiredSpecs: Array<{ label: string; value: string }>;
  variants: {
    id: string;
    sku: string;
    barcode: string | null;
    name: string;
    price: string;
    previousPrice: string | null;
    attributes?: unknown;
    status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
    availableByOrder?: boolean;
    media?: ProductMedia[] | ProductMedia | null;
  }[];
  media: ProductMedia[];
};
type Location = {
  id: string;
  code: string;
  name: string;
  type?: "WAREHOUSE" | "STORE" | "PICKUP";
  active?: boolean;
};
type InventoryMovement = {
  id: string;
  type: string;
  quantityDelta: number;
  sourceType: string;
  sourceDocumentId: string;
  reason: string;
  transferGroupId: string | null;
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
};
type CashRegister = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  location: { id: string; code: string; name: string; active: boolean };
};
type ShiftMovement = {
  id: string;
  type: string;
  amount: string;
  reason: string;
  reference: string | null;
  createdAt: string;
};
type ShiftSale = {
  id: string;
  grandTotal: string;
  paymentMethod: string;
  createdAt: string;
};
type ActiveShift = {
  id: string;
  status: "OPEN" | "CLOSING" | "CLOSED";
  businessDate?: string;
  openingFloat: string;
  expectedCash: string;
  countedCash: string | null;
  discrepancy: string | null;
  register: {
    id: string;
    code: string;
    name: string;
    active: boolean;
    location: {
      id: string;
      code: string;
      name: string;
      type: string;
      active: boolean;
    };
  };
  movements: ShiftMovement[];
  sales: ShiftSale[];
};
type PosDailySummary = {
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
    channel: string;
    paymentMethod: string;
    externalTerminalReference: string | null;
    createdAt: string;
    returnableQuantity: number;
    items?: Array<{
      productName: string;
      variantName: string;
      sku: string;
      barcode: string | null;
    }>;
  }>;
};
type SalesReportChannel = "ONLINE" | "POS";

type SalesReportMetrics = {
  transactionCount: number;
  quantity: number;
  grossSales: string;
  discountTotal: string;
  deliveryFeeTotal: string;
  taxTotal: string;
  refundTotal: string;
  netSales: string;
};

type SalesReportChannelRow = SalesReportMetrics & {
  channel: SalesReportChannel | string;
};

type SalesReport = {
  range: { from: string; to: string; timeZone: string };
  summary: SalesReportMetrics;
  byDay: Array<
    SalesReportMetrics & {
      day: string;
      channels: SalesReportChannelRow[];
    }
  >;
  byMonth: Array<
    SalesReportMetrics & {
      month: string;
      channels: SalesReportChannelRow[];
    }
  >;
  byChannel: SalesReportChannelRow[];
  byPaymentMethod: Array<
    SalesReportMetrics & {
      paymentMethod: string;
    }
  >;
  byProduct: Array<
    SalesReportMetrics & {
      variantId: string;
      sku: string;
      productName: string;
      variantName: string;
    }
  >;
  notes: string[];
};
type LookupResponse = {
  shiftId: string;
  register: { id: string; code: string; name: string };
  location: { id: string; code: string; name: string };
  variant: {
    id: string;
    productId: string;
    productName: string;
    name: string;
    sku: string;
    barcode: string | null;
    price: string;
    currency: string;
    available: number;
  };
};
type PosCartItem = {
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  barcode: string | null;
  unitPrice: string;
  quantity: number;
  available: number;
  currency: string;
};
type PosSale = {
  id: string;
  saleNumber: string;
  receiptNumber: string;
  channel: "CASH" | "CARD" | "TRANSFER" | "WOLT" | "BIRMARKET";
  paymentMethod: "CASH" | "CARD" | "INSTALLMENT";
  externalTerminalReference: string | null;
  grandTotal: string;
  currency: string;
  createdAt: string;
  payment: {
    bankName: string | null;
    installmentMonths: number | null;
    terminalReference: string | null;
  } | null;
  items: {
    id: string;
    variantId: string;
    productName: string;
    variantName: string;
    sku: string;
    barcode: string | null;
    quantity: number;
    returnedQuantity: number;
    returnableQuantity: number;
    unitPrice: string;
    lineTotal: string;
    currency: string;
  }[];
};
type PosReturn = {
  id: string;
  returnNumber: string;
  refundAmount: string;
  currency: string;
  paymentMethod: "CASH" | "CARD" | "INSTALLMENT";
  externalTerminalReference: string | null;
  restockedToInventory: boolean;
  items: Array<{
    id: string;
    saleItemId: string;
    quantity: number;
    lineTotal: string;
    sku: string;
  }>;
};
type ApiError = {
  message?: string;
  code?: string;
};

type ApiInit = RequestInit & {
  skipAuthRetry?: boolean;
};

let rotateInFlight: Promise<boolean> | null = null;

async function rotateStaffSession(): Promise<boolean> {
  if (rotateInFlight !== null) {
    return rotateInFlight;
  }
  rotateInFlight = (async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/staff/auth/rotate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      return response.ok;
    } catch {
      return false;
    }
  })().finally(() => {
    rotateInFlight = null;
  });
  return rotateInFlight;
}

async function parseResponseJson<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (text.trim() === "") {
    // NestJS returns an empty 200 body for nullable handlers (e.g. no active shift).
    return null as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("API cavabı oxunmadı");
  }
}

async function api<T>(path: string, init?: ApiInit): Promise<T> {
  const { skipAuthRetry = false, ...requestInit } = init ?? {};
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...requestInit,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...requestInit.headers,
    },
  });

  const authEndpoint =
    path === "/staff/auth/login" ||
    path === "/staff/auth/mfa/verify" ||
    path === "/staff/auth/rotate" ||
    path === "/staff/auth/logout";

  if (response.status === 401 && !skipAuthRetry && !authEndpoint) {
    const rotated = await rotateStaffSession();
    if (rotated) {
      return api<T>(path, { ...init, skipAuthRetry: true });
    }
  }

  if (!response.ok) {
    const body = (await parseResponseJson<ApiError>(response).catch(
      () => ({} as ApiError),
    )) as ApiError;
    throw new Error(body.message ?? `API xətası (${response.status})`);
  }
  return parseResponseJson<T>(response);
}

function suggestCatalogSeo(
  input: CatalogSeoSuggestRequestContract,
): Promise<CatalogSeoSuggestResponseContract> {
  return api("/catalog/seo/suggest", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

function subscribeSupportChatSse(
  path: string,
  handler: (event: SupportChatRealtimeEvent) => void,
): () => void {
  return openSupportChatSse(path, handler, {
    apiBaseUrl: getApiBaseUrl(),
    onPollFallback: () => {
      if (path === "/support-messages/events") {
        void api<Page<StaffSupportMessageSummaryContract>>(
          "/support-messages?limit=100",
        )
          .then((page) => {
            for (const thread of page.items) {
              handler({ type: "thread", threadId: thread.id, thread });
            }
          })
          .catch(() => undefined);
        return;
      }
      const match = /^\/support-messages\/([^/]+)\/events$/.exec(path);
      if (match?.[1] === undefined) {
        return;
      }
      void api<StaffSupportThreadDetailContract>(
        `/support-messages/${match[1]}`,
      )
        .then((thread) => {
          handler({
            type: "status",
            threadId: thread.id,
            status: thread.status,
          });
          for (const message of thread.messages) {
            handler({
              type: "message",
              threadId: thread.id,
              message,
            });
          }
        })
        .catch(() => undefined);
    },
  });
}

function formatAuditPayload(value: unknown) {
  if (value === null || value === undefined) {
    return "Yoxdur";
  }
  const rendered =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return rendered.length > 420 ? `${rendered.slice(0, 420)}…` : rendered;
}

function bakuBusinessDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baku",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function reportChannelLabel(channel: string) {
  if (channel === "ONLINE") return "Online satışlar";
  if (channel === "POS") return "Satış terminalı";
  return channel;
}

function reportPaymentLabel(method: string) {
  if (method === "CASH") return "Nağd";
  if (method === "CARD") return "Kart";
  if (method === "INSTALLMENT") return "Hissə-hissə";
  return method;
}

function formatReportDay(day: string) {
  const [year, month, date] = day.split("-");
  if (!year || !month || !date) return day;
  return `${date}.${month}.${year}`;
}

const REPORT_MONTH_NAMES = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "İyun",
  "İyul",
  "Avqust",
  "Sentyabr",
  "Oktyabr",
  "Noyabr",
  "Dekabr",
] as const;

function formatReportMonth(month: string) {
  const [year, monthPart] = month.split("-");
  const index = Number(monthPart) - 1;
  if (!year || Number.isNaN(index) || index < 0 || index > 11) return month;
  return `${REPORT_MONTH_NAMES[index]} ${year}`;
}

function findReportChannel(
  channels: SalesReportChannelRow[] | undefined,
  channel: SalesReportChannel,
) {
  return channels?.find((entry) => entry.channel === channel) ?? null;
}

export function Operations({ children }: { children?: React.ReactNode }) {
  const { setStaff: setBoStaff, registerLogout } = useBoStaff();
  const {
    setOrderCounts,
    setRegisteredCustomerCount,
    registeredCustomerCount,
    setUnregisteredCustomerCount,
    unregisteredCustomerCount,
    setPendingPreorderCount,
    setPendingStockAlertCount,
    setPendingSupportMessageCount,
    setNewOrderAlert,
    setNewSupportMessageAlert,
    addNewArrivalOrderIds,
    markNewOrderViewed,
  } = useBoNavCounts();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeRoute = getBoRouteId(pathname, searchParams);
  const orderListBucket = resolveOrderNavBucket(searchParams.get("view"));
  const orderIdFromPath = getOrderIdFromPathname(pathname);
  const showDashboardHeader = shouldShowBoDashboardHeader(
    pathname,
    searchParams.get("view"),
    searchParams.get("create"),
    searchParams.get("edit"),
  );
  const [staff, setStaff] = useState<Staff | null>(null);
  const [authStatus, setAuthStatus] = useState<
    "loading" | "authenticated" | "anonymous"
  >("loading");
  const [mfaChallengeToken, setMfaChallengeToken] = useState<string | null>(
    null,
  );
  const [brands, setBrands] = useState<Brand[]>([]);
  const [banners, setBanners] = useState<StorefrontBanner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [loadedOrderId, setLoadedOrderId] = useState<string | null>(null);
  const [orderTransitionPending, setOrderTransitionPending] = useState(false);
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [posDailySummary, setPosDailySummary] = useState<PosDailySummary | null>(
    null,
  );
  const [posReturnDate, setPosReturnDate] = useState(() => bakuBusinessDate());
  const [posReturnSummary, setPosReturnSummary] =
    useState<PosDailySummary | null>(null);
  const [posReturnSummaryLoading, setPosReturnSummaryLoading] = useState(false);
  const [posReturnSearch, setPosReturnSearch] = useState("");
  const posReturnSearchFieldId = useId();
  const [reportRange, setReportRange] = useState(() => {
    const today = bakuBusinessDate();
    return { from: today, to: today };
  });
  const [reportPeriodView, setReportPeriodView] = useState<"daily" | "monthly">(
    "daily",
  );
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [staffUsers, setStaffUsers] = useState<StaffUserRow[]>([]);
  const [staffRoles, setStaffRoles] = useState<RoleDefinition[]>([]);
  const [customers, setCustomers] = useState<StaffCustomerSummaryContract[]>(
    [],
  );
  const [unregisteredCustomers, setUnregisteredCustomers] = useState<
    StaffUnregisteredCustomerSummaryContract[]
  >([]);
  const [inquiries, setInquiries] = useState<
    StaffAvailabilityRequestSummaryContract[]
  >([]);
  const [inquiryCounts, setInquiryCounts] =
    useState<StaffAvailabilityRequestNavCountsContract | null>(null);
  const [creditApplications, setCreditApplications] = useState<
    StaffCreditApplicationSummaryContract[]
  >([]);
  const [supportMessages, setSupportMessages] = useState<
    StaffSupportMessageSummaryContract[]
  >([]);
  const [productReviews, setProductReviews] = useState<
    StaffProductReviewSummaryContract[]
  >([]);
  const [posItems, setPosItems] = useState<PosCartItem[]>([]);
  const [posProductsRefreshKey, setPosProductsRefreshKey] = useState(0);
  const [posPaymentMethod, setPosPaymentMethod] = useState<"CASH" | "CARD">(
    "CASH",
  );
  const [posTerminalReference, setPosTerminalReference] = useState("");
  const [recentSale, setRecentSale] = useState<PosSale | null>(null);
  const [recentReturn, setRecentReturn] = useState<PosReturn | null>(null);
  const [completedSale, setCompletedSale] = useState<PosSale | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnRestockToInventory, setReturnRestockToInventory] = useState(true);
  const [returnTerminalReference, setReturnTerminalReference] = useState("");
  const [returnQuantities, setReturnQuantities] = useState<Record<string, string>>(
    {},
  );
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const returnIdempotencyKeyRef = useRef<string | null>(null);
  const orderReason = "Staff workflow update";
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [alertRoute, setAlertRoute] = useState<BoRouteId | null>(null);
  const [alertRouteKey, setAlertRouteKey] = useState(activeRoute);
  const routeSuccessAlertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const scannerBuffer = useRef("");
  const lastScanAt = useRef(0);
  const selectedOrderIdRef = useRef<string | null>(null);
  const logoutActionRef = useRef<() => void>(() => {});
  const refreshRef = useRef<(currentStaff: Staff | null) => Promise<void>>(
    async () => {},
  );
  const orderBucketHydratedRef = useRef(false);
  const reportRangeHydratedRef = useRef(false);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const orderIdsBaselineEstablishedRef = useRef(false);
  const { requestConfirm, confirmDialog } = useConfirmDialog();

  const canCatalogRead = staff?.permissions.includes("catalog.read") ?? false;
  const canCatalog = staff?.permissions.includes("catalog.write") ?? false;
  const canPrice = staff?.permissions.includes("pricing.price-change") ?? false;
  const canInventoryRead =
    staff?.permissions.includes("inventory.read") ?? false;
  const canReceipt = staff?.permissions.includes("inventory.receipt") ?? false;
  const canAdjust =
    staff?.permissions.includes("inventory.adjustment") ?? false;
  const canReportsRead = staff?.permissions.includes("reports.read") ?? false;
  const canPos = staff?.permissions.includes("pos.sale") ?? false;
  const canRefund = staff?.permissions.includes("sales.refund") ?? false;
  const canOrdersRead = staff?.permissions.includes("orders.read") ?? false;
  const canCustomersRead =
    staff?.permissions.includes("customers.read") ?? false;
  const canInquiriesRead =
    staff?.permissions.includes("inquiries.read") ?? false;
  const canInquiriesWrite =
    staff?.permissions.includes("inquiries.write") ?? false;
  const canCreditApplications =
    staff?.permissions.includes("credit-applications.manage") ?? false;
  const canSupportMessages =
    staff?.permissions.includes("support-messages.manage") ?? false;
  const canFulfill = staff?.permissions.includes("fulfillment.write") ?? false;
  const canManageStaff = staff?.permissions.includes("staff.manage") ?? false;
  const [posFlow, setPosFlow] = useState<
    null | "sale" | "return" | "transfer" | "wolt" | "birmarket"
  >(null);

  const activeNav = useMemo(
    () => getBoNavDisplay(pathname, searchParams.get("create"), searchParams),
    [pathname, searchParams],
  );

  const defaultCatalogStockLocationId = useMemo(
    () => locations[0]?.id ?? null,
    [locations],
  );

  if (activeRoute !== alertRouteKey) {
    setAlertRouteKey(activeRoute);
    setMessage("");
    setError("");
    setAlertRoute(null);
  }

  const orderDetailLoading =
    canOrdersRead &&
    orderIdFromPath !== null &&
    loadedOrderId !== orderIdFromPath;

  const displayedOrder =
    orderIdFromPath !== null && loadedOrderId === orderIdFromPath
      ? selectedOrder
      : null;

  if (
    orderIdFromPath !== null &&
    loadedOrderId !== null &&
    loadedOrderId !== orderIdFromPath &&
    selectedOrder !== null
  ) {
    setSelectedOrder(null);
  }

  if (orderIdFromPath === null && (selectedOrder !== null || loadedOrderId !== null)) {
    setSelectedOrder(null);
    setLoadedOrderId(null);
  }

  useEffect(() => {
    selectedOrderIdRef.current = orderIdFromPath;
  }, [orderIdFromPath]);

  const refresh = useCallback(async (currentStaff: Staff | null) => {
    const permissions = currentStaff?.permissions ?? [];
    const allowCatalog = permissions.includes("catalog.read");
    const allowCatalogWrite = permissions.includes("catalog.write");
    const allowInventory = permissions.includes("inventory.read");
    const allowReports = permissions.includes("reports.read");
    const allowRegisters =
      permissions.includes("cash-register.manage") ||
      permissions.includes("cash-shift.open");
    const allowShift = permissions.includes("cash-shift.open");
    const allowPosSummary = permissions.includes("pos.sale");
    const allowOrders = permissions.includes("orders.read");
    const allowCustomers = permissions.includes("customers.read");
    const allowInquiries = permissions.includes("inquiries.read");
    const allowCreditApplications = permissions.includes(
      "credit-applications.manage",
    );
    const allowSupportMessages = permissions.includes(
      "support-messages.manage",
    );
    const allowStaffManage = permissions.includes("staff.manage");
    const refreshFailures: string[] = [];
    const [
      brandPage,
      bannerPage,
      categoryPage,
      productPage,
      locationRows,
      movementRows,
      registerRows,
      shiftRow,
      posSummaryRow,
      orderPage,
      orderCountsRow,
      customerPage,
      customerCountsRow,
      unregisteredCustomerPage,
      inquiryPage,
      inquiryCountsRow,
      creditApplicationPage,
      supportMessagePage,
      supportMessageCountsRow,
      productReviewPage,
      salesSummary,
      staffUserRows,
      staffRoleRows,
    ] = await Promise.all([
      currentStaff !== null && allowCatalog
        ? settleRefreshValue(
            api<{ items: Brand[] }>("/catalog/brands?limit=100").then(
              ({ items }) => ({
                items: items.filter((brand) => brand.status !== "ARCHIVED"),
              }),
            ),
            { items: [] },
            refreshFailures,
            "Brendlər",
          )
        : Promise.resolve({ items: [] }),
      currentStaff !== null && allowCatalog
        ? settleRefreshValue(
            api<{ items: StorefrontBanner[] }>(
              "/catalog/banners?limit=100&sort=sortOrder&direction=asc",
            ).then(({ items }) => ({
              items: items
                .filter((banner) => banner.status !== "ARCHIVED")
                .map((banner) => ({
                  ...banner,
                  placement: banner.placement ?? "HOME_HERO",
                })),
            })),
            { items: [] },
            refreshFailures,
            "Bannerlər",
          )
        : Promise.resolve({ items: [] }),
      currentStaff !== null && allowCatalog
        ? settleRefreshValue(
            api<{ items: Category[] }>(
              "/catalog/categories?limit=100&sort=sortOrder&direction=asc",
            ).then(({ items }) => ({
              items: items.filter(
                (category) => category.status !== "ARCHIVED",
              ),
            })),
            { items: [] },
            refreshFailures,
            "Kateqoriyalar",
          )
        : Promise.resolve({ items: [] }),
      currentStaff !== null && allowCatalog
        ? settleRefreshValue(
            api<{ items: Product[] }>("/catalog/products?limit=100").then(
              ({ items }) => ({
                items: items.filter(
                  (product) => product.status !== "ARCHIVED",
                ),
              }),
            ),
            { items: [] },
            refreshFailures,
            "Məhsullar",
          )
        : Promise.resolve({ items: [] }),
      currentStaff !== null && allowInventory
        ? settleRefreshValue(
            api<Location[]>("/inventory/locations"),
            [],
            refreshFailures,
            "Anbarlar",
          )
        : Promise.resolve([]),
      currentStaff !== null && allowInventory
        ? settleRefreshValue(
            api<InventoryMovement[]>("/inventory/movements?limit=12"),
            [],
            refreshFailures,
            "Stok hərəkətləri",
          )
        : Promise.resolve([]),
      currentStaff !== null && allowRegisters
        ? settleRefreshValue(
            api<CashRegister[]>("/cash-register/registers"),
            [],
            refreshFailures,
            "Kassalar",
          )
        : Promise.resolve([]),
      currentStaff !== null && allowShift
        ? settleRefreshValue(
            api<ActiveShift | null>("/cash-register/shifts/active"),
            null,
            refreshFailures,
            "Növbə",
          )
        : Promise.resolve(null),
      currentStaff !== null && allowPosSummary
        ? settleRefreshValue(
            api<PosDailySummary>("/pos/daily-summary"),
            null,
            refreshFailures,
            "POS xülasə",
          )
        : Promise.resolve(null),
      currentStaff !== null && allowOrders
        ? settleRefreshValue(
            api<{ items: OrderSummary[] }>(
              orderListBucket === "all"
                ? "/orders?limit=12"
                : `/orders?limit=12&bucket=${orderListBucket}`,
            ),
            { items: [] },
            refreshFailures,
            "Sifarişlər",
          )
        : Promise.resolve({ items: [] }),
      currentStaff !== null && allowOrders
        ? settleRefreshValue(
            api<OrderNavCountsContract>("/orders/counts"),
            null,
            refreshFailures,
            "Sifariş sayları",
          )
        : Promise.resolve(null),
      currentStaff !== null && allowCustomers
        ? settleRefreshValue(
            api<{ items: StaffCustomerSummaryContract[] }>(
              "/customers?limit=100",
            ),
            { items: [] },
            refreshFailures,
            "Müştərilər",
          )
        : Promise.resolve({ items: [] }),
      currentStaff !== null && allowCustomers
        ? settleRefreshValue(
            api<CustomerNavCountsContract>("/customers/counts"),
            null,
            refreshFailures,
            "Müştəri sayları",
          )
        : Promise.resolve(null),
      currentStaff !== null && allowCustomers
        ? settleRefreshValue(
            api<{ items: StaffUnregisteredCustomerSummaryContract[] }>(
              "/customers/unregistered?limit=100",
            ),
            { items: [] },
            refreshFailures,
            "Qeydiyyatsız müştərilər",
          )
        : Promise.resolve({ items: [] }),
      currentStaff !== null && allowInquiries
        ? settleRefreshValue(
            api<{ items: StaffAvailabilityRequestSummaryContract[] }>(
              "/product-availability-requests?limit=100",
            ),
            { items: [] },
            refreshFailures,
            "Sorğular",
          )
        : Promise.resolve({ items: [] }),
      currentStaff !== null && allowInquiries
        ? settleRefreshValue(
            api<StaffAvailabilityRequestNavCountsContract>(
              "/product-availability-requests/counts",
            ),
            null,
            refreshFailures,
            "Sorğu sayları",
          )
        : Promise.resolve(null),
      currentStaff !== null && allowCreditApplications
        ? settleRefreshValue(
            api<Page<StaffCreditApplicationSummaryContract>>(
              "/credit-applications?limit=100",
            ),
            { items: [], nextCursor: null },
            refreshFailures,
            "Kredit müraciətləri",
          )
        : Promise.resolve({ items: [], nextCursor: null }),
      currentStaff !== null && allowSupportMessages
        ? settleRefreshValue(
            api<Page<StaffSupportMessageSummaryContract>>(
              "/support-messages?limit=100",
            ),
            { items: [], nextCursor: null },
            refreshFailures,
            "Dəstək mesajları",
          )
        : Promise.resolve({ items: [], nextCursor: null }),
      currentStaff !== null && allowSupportMessages
        ? settleRefreshValue(
            api<StaffSupportMessageNavCountsContract>(
              "/support-messages/counts",
            ),
            null,
            refreshFailures,
            "Dəstək sayları",
          )
        : Promise.resolve(null),
      currentStaff !== null && allowCatalogWrite
        ? settleRefreshValue(
            api<Page<StaffProductReviewSummaryContract>>(
              "/product-reviews?limit=100",
            ),
            { items: [], nextCursor: null },
            refreshFailures,
            "Rəylər",
          )
        : Promise.resolve({ items: [], nextCursor: null }),
      currentStaff !== null && allowReports
        ? settleRefreshValue(
            api<SalesReport>(
              `/reports/sales?from=${encodeURIComponent(reportRange.from)}&to=${encodeURIComponent(reportRange.to)}&top=5`,
            ),
            null,
            refreshFailures,
            "Satış hesabatı",
          )
        : Promise.resolve(null),
      currentStaff !== null && allowStaffManage
        ? settleRefreshValue(
            api<StaffUserRow[]>("/staff/users"),
            [],
            refreshFailures,
            "İşçilər",
          )
        : Promise.resolve([]),
      currentStaff !== null && allowStaffManage
        ? settleRefreshValue(
            api<RoleDefinition[]>("/staff/users/roles"),
            [],
            refreshFailures,
            "Rollar",
          )
        : Promise.resolve([]),
    ]);
    setBrands(brandPage.items);
    setBanners(bannerPage.items);
    setCategories(categoryPage.items);
    setProducts(productPage.items);
    setLocations(locationRows);
    setMovements(movementRows);
    if (allowInventory) {
      setInventoryRefreshKey((value) => value + 1);
    }
    setRegisters(registerRows);
    setActiveShift(shiftRow);
    setPosDailySummary(posSummaryRow);
    setOrders(orderPage.items);
    if (allowOrders) {
      for (const id of orderPage.items.map((order) => order.id)) {
        knownOrderIdsRef.current.add(id);
      }
      orderIdsBaselineEstablishedRef.current = true;
      addNewArrivalOrderIds(
        orderPage.items
          .filter((order) => orderMatchesNavBucket(order.status, "new"))
          .map((order) => order.id),
      );
    } else {
      knownOrderIdsRef.current = new Set();
      orderIdsBaselineEstablishedRef.current = false;
    }
    setOrderCounts(orderCountsRow);
    setCustomers(customerPage.items);
    setUnregisteredCustomers(unregisteredCustomerPage.items);
    setRegisteredCustomerCount(customerCountsRow?.registered ?? null);
    setUnregisteredCustomerCount(customerCountsRow?.unregistered ?? null);
    setInquiries(inquiryPage.items);
    setInquiryCounts(inquiryCountsRow);
    setPendingPreorderCount(inquiryCountsRow?.pendingPreorders ?? null);
    setPendingStockAlertCount(inquiryCountsRow?.pendingStockAlerts ?? null);
    setCreditApplications(creditApplicationPage.items);
    setSupportMessages(supportMessagePage.items);
    setPendingSupportMessageCount(supportMessageCountsRow?.pending ?? null);
    setProductReviews(productReviewPage.items);
    setSalesReport(salesSummary);
    setStaffUsers(staffUserRows);
    setStaffRoles(staffRoleRows);
    if (
      currentStaff !== null &&
      allowOrders &&
      selectedOrderIdRef.current !== null &&
      activeRoute === "order-detail"
    ) {
      const latestOrder = await api<OrderDetails>(
        `/orders/${selectedOrderIdRef.current}`,
      ).catch(() => null);
      setSelectedOrder(latestOrder);
    }
    if (!allowOrders) {
      setSelectedOrder(null);
      setOrderCounts(null);
      setNewOrderAlert(false);
    }
    if (!allowCustomers) {
      setCustomers([]);
      setUnregisteredCustomers([]);
      setRegisteredCustomerCount(null);
      setUnregisteredCustomerCount(null);
    }
    if (!allowInquiries) {
      setInquiries([]);
      setInquiryCounts(null);
      setPendingPreorderCount(null);
      setPendingStockAlertCount(null);
    }
    if (!allowSupportMessages) {
      setSupportMessages([]);
      setPendingSupportMessageCount(null);
      setNewSupportMessageAlert(false);
    }
    if (!allowReports) {
      setSalesReport(null);
    }
    if (!allowStaffManage) {
      setStaffUsers([]);
      setStaffRoles([]);
    }
    if (refreshFailures.length > 0) {
      setError(
        `Bəzi məlumatlar yüklənmədi: ${refreshFailures.join(", ")}. Səhifəni yeniləyin və ya bir az sonra yenidən cəhd edin.`,
      );
    } else {
      setError((current) =>
        current.startsWith("Bəzi məlumatlar yüklənmədi:") ? "" : current,
      );
    }
  }, [
    reportRange.from,
    reportRange.to,
    activeRoute,
    orderListBucket,
    setOrderCounts,
    setRegisteredCustomerCount,
    setUnregisteredCustomerCount,
    setPendingPreorderCount,
    setPendingStockAlertCount,
    setPendingSupportMessageCount,
    setNewOrderAlert,
    setNewSupportMessageAlert,
    addNewArrivalOrderIds,
  ]);

  refreshRef.current = refresh;

  const fetchOrderCounts = useCallback(
    () => api<OrderNavCountsContract>("/orders/counts"),
    [],
  );

  const handleOrderNavCounts = useCallback(
    (counts: OrderNavCountsContract) => {
      setOrderCounts(counts);
    },
    [setOrderCounts],
  );

  const handleNewOrderArrival = useCallback(
    async (delta: number) => {
      setNewOrderAlert(true);
      playOrderNotificationSound();

      if (
        staff !== null &&
        canOrdersRead &&
        orderIdsBaselineEstablishedRef.current
      ) {
        try {
          const { items } = await api<{ items: OrderSummary[] }>(
            "/orders?limit=12&bucket=new",
          );
          const freshOrderIds = items
            .map((order) => order.id)
            .filter((id) => !knownOrderIdsRef.current.has(id))
            .slice(0, delta);
          if (freshOrderIds.length > 0) {
            addNewArrivalOrderIds(freshOrderIds);
          }
          for (const id of items.map((order) => order.id)) {
            knownOrderIdsRef.current.add(id);
          }
        } catch {
          // Arrival highlighting should not block the regular refresh.
        }
      }

      if (canInventoryRead) {
        setInventoryRefreshKey((value) => value + 1);
      }

      void refresh(staff).catch(() => {});
    },
    [
      addNewArrivalOrderIds,
      canInventoryRead,
      canOrdersRead,
      refresh,
      setNewOrderAlert,
      staff,
    ],
  );

  useOrderArrivalMonitor({
    enabled:
      authStatus === "authenticated" && canOrdersRead && staff !== null,
    fetchCounts: fetchOrderCounts,
    onCounts: handleOrderNavCounts,
    onArrival: handleNewOrderArrival,
  });

  const fetchSupportMessageCounts = useCallback(
    () =>
      api<StaffSupportMessageNavCountsContract>("/support-messages/counts"),
    [],
  );

  const handleSupportMessageCounts = useCallback(
    (counts: StaffSupportMessageNavCountsContract) => {
      setPendingSupportMessageCount(counts.pending);
    },
    [setPendingSupportMessageCount],
  );

  const handleNewSupportMessageArrival = useCallback(() => {
    setNewSupportMessageAlert(true);
    playOrderNotificationSound();
    void refresh(staff).catch(() => {});
  }, [refresh, setNewSupportMessageAlert, staff]);

  useSupportMessageArrivalMonitor({
    enabled:
      authStatus === "authenticated" &&
      canSupportMessages &&
      staff !== null,
    apiBaseUrl: getApiBaseUrl(),
    fetchCounts: fetchSupportMessageCounts,
    onCounts: handleSupportMessageCounts,
    onArrival: handleNewSupportMessageArrival,
  });

  useEffect(() => {
    if (
      authStatus !== "authenticated" ||
      (!canOrdersRead && !canSupportMessages)
    ) {
      return;
    }

    function unlockSound() {
      unlockOrderNotificationSound();
    }

    document.addEventListener("pointerdown", unlockSound, { once: true });
    document.addEventListener("keydown", unlockSound, { once: true });

    return () => {
      document.removeEventListener("pointerdown", unlockSound);
      document.removeEventListener("keydown", unlockSound);
    };
  }, [authStatus, canOrdersRead, canSupportMessages]);

  useEffect(() => {
    if (authStatus !== "authenticated" || !canOrdersRead || staff === null) {
      orderBucketHydratedRef.current = false;
      return;
    }

    if (!orderBucketHydratedRef.current) {
      orderBucketHydratedRef.current = true;
      return;
    }

    void refreshRef.current(staff).catch(() => {});
  }, [orderListBucket, authStatus, canOrdersRead, staff]);

  useEffect(() => {
    if (authStatus !== "authenticated" || !canReportsRead || staff === null) {
      reportRangeHydratedRef.current = false;
      return;
    }

    if (!reportRangeHydratedRef.current) {
      reportRangeHydratedRef.current = true;
      return;
    }

    void refreshRef.current(staff).catch(() => {});
  }, [reportRange.from, reportRange.to, authStatus, canReportsRead, staff]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapSession() {
      try {
        const principal = await api<Staff>("/staff/auth/me");
        if (cancelled) return;
        setStaff(principal);
        setAuthStatus("authenticated");
        try {
          await refresh(principal);
        } catch (caught) {
          if (!cancelled) {
            showRouteError(
              caught instanceof Error
                ? caught.message
                : "Panel məlumatları yüklənmədi",
            );
          }
        }
      } catch {
        if (!cancelled) {
          setStaff(null);
          setAuthStatus("anonymous");
        }
      }
    }

    void bootstrapSession();
    return () => {
      cancelled = true;
    };
    // Initial session restore only — report range changes refresh via dedicated effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setBoStaff(
      staff
        ? {
            displayName: staff.displayName,
            role: staff.role,
            permissions: staff.permissions,
          }
        : null,
    );
  }, [staff, setBoStaff]);

  useEffect(() => {
    registerLogout(() => logoutActionRef.current());
    return () => registerLogout(null);
  }, [registerLogout]);

  function clearRouteSuccessAlertTimeout() {
    if (routeSuccessAlertTimeoutRef.current !== null) {
      clearTimeout(routeSuccessAlertTimeoutRef.current);
      routeSuccessAlertTimeoutRef.current = null;
    }
  }

  useEffect(() => {
    clearRouteSuccessAlertTimeout();
  }, [activeRoute]);

  useEffect(() => () => clearRouteSuccessAlertTimeout(), []);

  function clearRouteAlerts() {
    clearRouteSuccessAlertTimeout();
    setMessage("");
    setError("");
    setAlertRoute(null);
  }

  function showRouteSuccess(text: string, route: BoRouteId = activeRoute) {
    clearRouteSuccessAlertTimeout();
    setError("");
    setMessage(text);
    setAlertRoute(route);
    routeSuccessAlertTimeoutRef.current = setTimeout(() => {
      routeSuccessAlertTimeoutRef.current = null;
      setMessage("");
    }, 60_000);
  }

  function showRouteError(text: string, route: BoRouteId = activeRoute) {
    clearRouteSuccessAlertTimeout();
    setMessage("");
    setError(text);
    setAlertRoute(route);
  }

  useEffect(() => {
    if (!canOrdersRead || orderIdFromPath === null) {
      return;
    }

    let cancelled = false;

    void api<OrderDetails>(`/orders/${orderIdFromPath}`)
      .then((detail) => {
        if (!cancelled) {
          setSelectedOrder(detail);
          setLoadedOrderId(orderIdFromPath);
          markNewOrderViewed(orderIdFromPath);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setSelectedOrder(null);
          setLoadedOrderId(orderIdFromPath);
          showRouteError(
            caught instanceof Error ? caught.message : "Sifariş yüklənmədi",
            "order-detail",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [orderIdFromPath, canOrdersRead, markNewOrderViewed]);

  async function run<T>(
    action: () => Promise<T>,
    success: string,
    options?: {
      refresh?: boolean;
      onSuccess?: (result: T) => void;
    },
  ) {
    clearRouteAlerts();
    try {
      const result = await action();
      options?.onSuccess?.(result);
      if (options?.refresh !== false) {
        await refresh(staff);
      }
      if (success) {
        showRouteSuccess(success);
      }
      return result;
    } catch (caught) {
      showRouteError(
        caught instanceof Error ? caught.message : "Əməliyyat alınmadı",
      );
      return null;
    }
  }

  const beginPosSale = useCallback((method: "CASH" | "CARD") => {
    clearRouteAlerts();
    setRecentSale(null);
    setRecentReturn(null);
    setCompletedSale(null);
    setPosItems([]);
    setPosPaymentMethod(method);
    setPosTerminalReference("");
    setPosFlow("sale");
  }, []);

  const beginPosTransferSale = useCallback(() => {
    clearRouteAlerts();
    setRecentSale(null);
    setRecentReturn(null);
    setCompletedSale(null);
    setPosItems([]);
    setPosPaymentMethod("CARD");
    setPosTerminalReference("");
    setPosFlow("transfer");
  }, []);

  const beginPosWoltSale = useCallback(() => {
    clearRouteAlerts();
    setRecentSale(null);
    setRecentReturn(null);
    setCompletedSale(null);
    setPosItems([]);
    setPosPaymentMethod("CARD");
    setPosTerminalReference("");
    setPosFlow("wolt");
  }, []);

  const beginPosBirmarketSale = useCallback(() => {
    clearRouteAlerts();
    setRecentSale(null);
    setRecentReturn(null);
    setCompletedSale(null);
    setPosItems([]);
    setPosPaymentMethod("CARD");
    setPosTerminalReference("");
    setPosFlow("birmarket");
  }, []);

  const loadPosReturnSummary = useCallback(async (date: string) => {
    if (!canPos) return;
    setPosReturnSummaryLoading(true);
    try {
      const summary = await api<PosDailySummary>(
        `/pos/daily-summary?date=${encodeURIComponent(date)}`,
      );
      setPosReturnSummary(summary);
    } catch {
      setPosReturnSummary(null);
    } finally {
      setPosReturnSummaryLoading(false);
    }
  }, [canPos]);

  const beginPosReturn = useCallback(() => {
    clearRouteAlerts();
    setRecentSale(null);
    setRecentReturn(null);
    setCompletedSale(null);
    setPosItems([]);
    setReturnQuantities({});
    setReturnTerminalReference("");
    setReturnSubmitting(false);
    returnIdempotencyKeyRef.current = null;
    const today = bakuBusinessDate();
    setPosReturnDate(today);
    setPosReturnSearch("");
    setPosFlow("return");
    void loadPosReturnSummary(today);
  }, [loadPosReturnSummary]);

  const refreshPosDailySummary = useCallback(async () => {
    if (!canPos) return;
    try {
      const summary = await api<PosDailySummary>("/pos/daily-summary");
      setPosDailySummary(summary);
    } catch {
      /* ignore refresh errors; sale path still works */
    }
  }, [canPos]);

  const resetPosFlowState = useCallback(() => {
    setPosFlow(null);
    setPosItems([]);
    setPosPaymentMethod("CASH");
    setPosTerminalReference("");
    setReturnQuantities({});
    setReturnTerminalReference("");
    setReturnSubmitting(false);
    returnIdempotencyKeyRef.current = null;
    setRecentSale(null);
    setRecentReturn(null);
    setCompletedSale(null);
    setPosReturnDate(bakuBusinessDate());
    setPosReturnSummary(null);
    setPosReturnSummaryLoading(false);
    setPosReturnSearch("");
    clearRouteAlerts();
  }, []);

  const exitPosFlow = useCallback(() => {
    const hasCartItems = posItems.length > 0;
    const hasReturnDraft = posFlow === "return" && recentSale !== null;

    if (hasCartItems || hasReturnDraft) {
      requestConfirm({
        title: "Satış ekranından çıx",
        message: hasCartItems
          ? "Səbətdə məhsullar var. Satış növü seçiminə qayıtmaq istəyirsiniz?"
          : "Qaytarma ekranından çıxmaq istəyirsiniz?",
        onConfirm: resetPosFlowState,
      });
      return;
    }

    resetPosFlowState();
  }, [
    posFlow,
    posItems.length,
    recentSale,
    requestConfirm,
    resetPosFlowState,
  ]);

  async function loadSaleForReturn(saleId: string) {
    const sale = await api<PosSale>(`/pos/sales/${saleId}`);
    setRecentSale(sale);
    setRecentReturn(null);
    setReturnQuantities({});
    setReturnTerminalReference("");
    setReturnSubmitting(false);
    returnIdempotencyKeyRef.current = null;
    return sale;
  }

  async function completeStaffLogin(principal: Staff) {
    setMfaChallengeToken(null);
    setError("");
    setStaff(principal);
    setAuthStatus("authenticated");
    showRouteSuccess("Giriş uğurludur");
    try {
      await refresh(principal);
    } catch (caught) {
      showRouteError(
        caught instanceof Error
          ? caught.message
          : "Panel məlumatları yüklənmədi",
      );
    }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await api<StaffLoginResponse>("/staff/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    }).catch((caught) => {
      setError(formatFetchError(caught));
      return null;
    });
    if (result === null) return;
    if ("mfaRequired" in result && result.mfaRequired === true) {
      setError("");
      setMfaChallengeToken(result.mfaToken);
      return;
    }
    await completeStaffLogin(result as Staff);
  }

  async function verifyMfaLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mfaChallengeToken === null) return;
    const form = new FormData(event.currentTarget);
    const challenge = String(form.get("code") ?? "").trim();
    const body =
      /^\d{6}$/.test(challenge)
        ? { mfaToken: mfaChallengeToken, code: challenge }
        : { mfaToken: mfaChallengeToken, recoveryCode: challenge };
    const principal = await api<Staff>("/staff/auth/mfa/verify", {
      method: "POST",
      body: JSON.stringify(body),
    }).catch((caught) => {
      setError(formatFetchError(caught));
      return null;
    });
    if (principal === null) return;
    await completeStaffLogin(principal);
  }

  const mergePosCartItem = useCallback(
    (
      current: PosCartItem[],
      variant: {
        id: string;
        productName: string;
        name: string;
        sku: string;
        barcode: string | null;
        price: string;
        available: number;
        currency: string;
      },
    ) => {
      const existing = current.find((item) => item.variantId === variant.id);
      if (existing !== undefined) {
        return current.map((item) =>
          item.variantId === variant.id
            ? {
                ...item,
                quantity: Math.min(item.quantity + 1, variant.available),
                available: variant.available,
              }
            : item,
        );
      }
      return [
        ...current,
        {
          variantId: variant.id,
          productName: variant.productName,
          variantName: variant.name,
          sku: variant.sku,
          barcode: variant.barcode,
          unitPrice: variant.price,
          quantity: 1,
          available: variant.available,
          currency: variant.currency,
        },
      ];
    },
    [],
  );

  async function addBarcode(barcode: string) {
    if (barcode.trim().length < 4) return;
    clearRouteAlerts();
    const lookup = await api<LookupResponse>(
      `/pos/lookup?barcode=${encodeURIComponent(barcode.trim())}`,
    );
    if (lookup.variant.available <= 0) {
      throw new Error("Barkod tapıldı, ancaq satış üçün stok mövcud deyil");
    }
    setCompletedSale(null);
    setPosItems((current) =>
      mergePosCartItem(current, {
        id: lookup.variant.id,
        productName: lookup.variant.productName,
        name: lookup.variant.name,
        sku: lookup.variant.sku,
        barcode: lookup.variant.barcode,
        price: lookup.variant.price,
        available: lookup.variant.available,
        currency: lookup.variant.currency,
      }),
    );
  }

  const addPosProduct = useCallback(
    (product: PosProductItem) => {
      if (product.available <= 0) {
        showRouteError("Bu məhsul üçün satış stoku yoxdur", "pos");
        return;
      }
      clearRouteAlerts();
      setCompletedSale(null);
      setPosItems((current) =>
        mergePosCartItem(current, {
          id: product.id,
          productName: product.productName,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          price: product.price,
          available: product.available,
          currency: product.currency,
        }),
      );
    },
    [mergePosCartItem],
  );

  const fetchPosProducts = useCallback(
    (query: { search: string; limit: number; offset: number }) => {
      const params = new URLSearchParams();
      if (query.search.length > 0) {
        params.set("search", query.search);
      }
      params.set("limit", String(query.limit));
      params.set("offset", String(query.offset));
      return api<{
        shiftId: string;
        location: { id: string; code: string; name: string };
        items: PosProductItem[];
        total: number;
      }>(`/pos/products?${params.toString()}`);
    },
    [],
  );

  async function runOrderTransition(action: string, reason: string) {
    if (displayedOrder === null || orderTransitionPending) return;
    const orderId = displayedOrder.id;
    const refundOnCancel =
      action === "CANCEL" &&
      displayedOrder.payment !== null &&
      displayedOrder.paymentStatus === "PAID";
    setOrderTransitionPending(true);
    try {
      const next = await run(
        () =>
          api<OrderDetails>(`/orders/${orderId}/transitions`, {
            method: "POST",
            body: JSON.stringify({ action, reason }),
          }),
        action === "CONFIRM"
          ? "Sifariş qablaşdırmaya ötürüldü"
          : action === "COMPLETE"
            ? "Sifariş təslim edildi"
            : action === "CANCEL" && refundOnCancel
              ? "Sifariş ləğv edildi və ödəniş müştəriyə qaytarıldı"
              : action === "CANCEL"
                ? "Sifariş ləğv edildi"
                : "Sifariş statusu yeniləndi",
        {
          onSuccess: (result) => setSelectedOrder(result),
          refresh: action !== "CONFIRM",
        },
      );
      if (next === null) {
        return;
      }

      if (action === "CONFIRM" && next.status === "PROCESSING") {
        await refresh(staff);
        router.push("/orders?view=packaging");
        return;
      }

      if (
        (action === "MARK_READY_FOR_DELIVERY" &&
          next.status === "READY_FOR_DELIVERY") ||
        (action === "MARK_READY_FOR_PICKUP" &&
          next.status === "READY_FOR_PICKUP")
      ) {
        await refresh(staff);
        router.push("/orders?view=ready");
        return;
      }

      if (
        action === "MARK_OUT_FOR_DELIVERY" &&
        next.status === "OUT_FOR_DELIVERY"
      ) {
        await refresh(staff);
        router.push("/orders?view=ready");
        return;
      }

      await refresh(staff);
    } finally {
      setOrderTransitionPending(false);
    }
  }

  async function createRecentSaleReturn() {
    if (recentSale === null) return;
    if (returnSubmitting) return;

    const items = recentSale.items
      .map((item) => {
        const returnable = item.returnableQuantity ?? item.quantity;
        const quantity = Math.min(
          Number(returnQuantities[item.id] ?? "0"),
          returnable,
        );
        return {
          saleItemId: item.id,
          quantity,
        };
      })
      .filter((item) => Number.isSafeInteger(item.quantity) && item.quantity > 0);
    if (items.length === 0) {
      throw new Error("Qaytarma üçün ən azı bir sətir seçin");
    }
    if (
      recentSale.items.every(
        (item) => (item.returnableQuantity ?? item.quantity) <= 0,
      )
    ) {
      throw new Error("Bu satış artıq tam qaytarılıb");
    }

    if (returnIdempotencyKeyRef.current === null) {
      returnIdempotencyKeyRef.current = `pos-return-ui-${recentSale.id}-${crypto.randomUUID()}`;
    }
    const idempotencyKey = returnIdempotencyKeyRef.current;

    setReturnSubmitting(true);
    try {
      const result = await api<PosReturn>("/pos/returns", {
        method: "POST",
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          saleId: recentSale.id,
          reason: returnReason,
          restockToInventory: returnRestockToInventory,
          ...(recentSale.paymentMethod === "CARD" ||
          recentSale.paymentMethod === "INSTALLMENT"
            ? { externalTerminalReference: returnTerminalReference }
            : {}),
          items,
        }),
      });
      setRecentReturn(result);
      setReturnQuantities({});
      setReturnTerminalReference("");
      setReturnReason("");
      setReturnRestockToInventory(true);
      returnIdempotencyKeyRef.current = null;
      await Promise.all([
        refreshPosDailySummary(),
        loadPosReturnSummary(posReturnDate),
      ]);
      return result;
    } finally {
      setReturnSubmitting(false);
    }
  }

  function clearReturnSuccess() {
    setRecentReturn(null);
    setRecentSale(null);
    setReturnQuantities({});
    setReturnTerminalReference("");
    setReturnReason("");
    setReturnRestockToInventory(true);
    setReturnSubmitting(false);
    returnIdempotencyKeyRef.current = null;
  }

  /** Mobile: leave return draft and reopen the sale list (catalog). */
  function clearReturnDraftForSaleChange() {
    clearRouteAlerts();
    setRecentSale(null);
    setRecentReturn(null);
    setReturnQuantities({});
    setReturnTerminalReference("");
    setReturnReason("");
    setReturnRestockToInventory(true);
    setReturnSubmitting(false);
    returnIdempotencyKeyRef.current = null;
  }

  function clearSaleSuccess() {
    setCompletedSale(null);
    setPosItems([]);
    setPosTerminalReference("");
    clearRouteAlerts();
  }

  useEffect(() => {
    if (!canPos || posFlow === null) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "Enter" && scannerBuffer.current.length >= 4) {
        event.preventDefault();
        const buffered = scannerBuffer.current;
        scannerBuffer.current = "";
        lastScanAt.current = 0;
        if (posFlow === "return") {
          setPosReturnSearch(buffered);
          return;
        }
        void addBarcode(buffered).catch((caught) =>
          showRouteError(
            caught instanceof Error ? caught.message : "Skan alınmadı",
            "pos",
          ),
        );
        return;
      }
      if (event.key.length !== 1) return;
      const now = Date.now();
      if (now - lastScanAt.current > 45) {
        scannerBuffer.current = "";
      }
      scannerBuffer.current += event.key;
      lastScanAt.current = now;
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canPos, posFlow]);

  logoutActionRef.current = () => {
    void run(
      () => api("/staff/auth/logout", { method: "POST" }),
      "Sessiya bağlandı",
      {
        refresh: false,
        onSuccess: () => {
          setStaff(null);
          setAuthStatus("anonymous");
          setActiveShift(null);
          setPosItems([]);
          setPosFlow(null);
          setRecentSale(null);
          setRecentReturn(null);
        },
      },
    );
  };

  if (authStatus === "loading") {
    return (
      <main id="staff-content" className="auth-shell" tabIndex={-1}>
        <section className="login-panel" aria-busy="true" aria-live="polite">
          <header className="login-panel__header">
            <BrandLogo className="login-panel__logo" />
            <div>
              <p className="ui-section-kicker">Əməliyyat mərkəzi</p>
              <p className="login-panel__lead">Sessiya yoxlanır…</p>
            </div>
          </header>
        </section>
      </main>
    );
  }

  if (authStatus === "anonymous" || staff === null) {
    const mfaStep = mfaChallengeToken !== null;
    return (
      <main id="staff-content" className="auth-shell" tabIndex={-1}>
        <section className="login-panel">
          <header className="login-panel__header">
            <BrandLogo className="login-panel__logo" />
            <div>
              <p className="ui-section-kicker">Əməliyyat mərkəzi</p>
              <p className="login-panel__lead">
                {mfaStep
                  ? "Authenticator-dakı 6 rəqəmli kodu və ya recovery kodunu daxil edin."
                  : "Kataloq, stok, sifariş və POS əməliyyatlarına yalnız yetkili əməkdaşlar daxil ola bilər."}
              </p>
            </div>
          </header>

          {mfaStep ? (
            <form className="login-panel__form" onSubmit={verifyMfaLogin}>
              <div className="login-field">
                <label htmlFor="staff-mfa-code">MFA / recovery kodu</label>
                <input
                  id="staff-mfa-code"
                  name="code"
                  type="text"
                  autoComplete="one-time-code"
                  minLength={6}
                  maxLength={64}
                  placeholder="000000 və ya recovery kodu"
                  required
                  autoFocus
                />
              </div>
              <button className="login-panel__submit" type="submit">
                Təsdiqlə
              </button>
              <button
                className="login-panel__secondary bo-btn-reset"
                type="button"
                onClick={() => {
                  setMfaChallengeToken(null);
                  setError("");
                }}
              >
                Geri qayıt
              </button>
              {error && (
                <p className="form-error login-panel__error" role="alert">
                  {error}
                </p>
              )}
            </form>
          ) : (
            <form className="login-panel__form" onSubmit={login}>
              <div className="login-field">
                <label htmlFor="staff-email">İş e-poçtu</label>
                <input
                  id="staff-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="ad.soyad@itmarket.az"
                  required
                />
              </div>
              <div className="login-field">
                <label htmlFor="staff-password">Şifrə</label>
                <input
                  id="staff-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Minimum 12 simvol"
                  minLength={12}
                  required
                />
              </div>
              <button className="login-panel__submit" type="submit">
                Daxil ol
              </button>
              {error && (
                <p className="form-error login-panel__error" role="alert">
                  {error}
                </p>
              )}
            </form>
          )}
        </section>
      </main>
    );
  }

  const isPosRoute = activeRoute === "pos";
  const isPosLauncher = isPosRoute && posFlow === null;
  const showPosSaleLauncher = Boolean(canPos && isPosLauncher);
  const returnDayPosSales = posReturnSummary?.sales ?? [];
  const returnableDayPosSales = returnDayPosSales.filter(
    (sale) => (sale.returnableQuantity ?? 1) > 0,
  );
  const posReturnSearchTrimmed = posReturnSearch.trim();
  const filteredReturnableDayPosSales = returnableDayPosSales.filter((sale) =>
    posReturnSaleMatchesSearch(sale, posReturnSearchTrimmed),
  );
  const posReturnDateIsToday = posReturnDate === bakuBusinessDate();
  const posReturnDateLabel = formatAzDate(posReturnDate, posReturnDate);
  const posSubtotal = posItems.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.quantity,
    0,
  );
  const posSaleChannel =
    posFlow === "transfer"
      ? "TRANSFER"
      : posFlow === "wolt"
        ? "WOLT"
        : posFlow === "birmarket"
          ? "BIRMARKET"
          : posPaymentMethod === "CASH"
            ? "CASH"
            : "CARD";
  const posNeedsTerminalReference =
    posFlow === "sale" ||
    posFlow === "transfer" ||
    posFlow === "wolt" ||
    posFlow === "birmarket";
  const posReferenceLabel =
    posFlow === "transfer" ? "Hesab faktura" : "Kassa qəbzi";
  const posReferencePlaceholder =
    posFlow === "transfer" ? "Faktura nömrəsi" : "Qəbz nömrəsi";
  const posFlowTitle =
    posFlow === "transfer"
      ? "Köçürmə ilə satış"
      : posFlow === "wolt"
        ? "Wolt ilə satış"
        : posFlow === "birmarket"
          ? "Birmarket ilə satış"
          : posFlow === "return"
            ? "Qaytarma"
            : posPaymentMethod === "CARD"
              ? "Kartla ödəniş"
              : "Nağd satış";
  const posCartItemCount = posItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const completedSaleItemCount = completedSale
    ? completedSale.items.reduce((sum, item) => sum + item.quantity, 0)
    : 0;
  const posChannelLabel = (channel: string) => {
    switch (channel) {
      case "CASH":
        return "Nağd";
      case "CARD":
        return "Kart";
      case "TRANSFER":
        return "Köçürmə";
      case "WOLT":
        return "Wolt";
      case "BIRMARKET":
        return "Birmarket";
      default:
        return channel;
    }
  };
  const returnSelectedQty = recentSale
    ? recentSale.items.reduce((sum, item) => {
        const returnable = item.returnableQuantity ?? item.quantity;
        const qty = Math.min(Number(returnQuantities[item.id] ?? 0), returnable);
        return Number.isFinite(qty) && qty > 0 ? sum + qty : sum;
      }, 0)
    : 0;
  const returnRefundPreview = recentSale
    ? recentSale.items.reduce((sum, item) => {
        const returnable = item.returnableQuantity ?? item.quantity;
        const qty = Math.min(Number(returnQuantities[item.id] ?? 0), returnable);
        if (!Number.isFinite(qty) || qty <= 0) return sum;
        const unit = Number(item.unitPrice);
        return sum + unit * qty;
      }, 0)
    : 0;
  const returnHasReturnableLines =
    recentSale !== null &&
    recentSale.items.some(
      (item) => (item.returnableQuantity ?? item.quantity) > 0,
    );
  const routeAlerts = {
    message,
    error,
    route: alertRoute,
  };
  const showRouteAlerts = shouldShowBoRouteAlerts(activeRoute, routeAlerts);

  return (
    <BoRouteAlertsProvider value={routeAlerts}>
    <main
      id="staff-content"
      className={[
        "bo-main",
        isPosRoute ? "bo-main--pos" : "",
        isPosLauncher ? "bo-main--pos-launcher" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      tabIndex={-1}
    >
      {children}
      {showDashboardHeader && !(isPosRoute && posFlow !== null) ? (
        <section className="bo-dashboard-header">
          <div className="bo-dashboard-header__copy">
            <h1 className="ui-page-title">{activeNav.title}</h1>
            <p className="ui-account-dashboard__lead bo-dashboard-header__lead">
              {activeNav.description}
            </p>
          </div>
        </section>
      ) : null}

      {showRouteAlerts ? <BoRouteAlertsBanner /> : null}

      <BoRoutePanel route="catalog-categories">
        <CatalogCategoriesPanel
          categories={categories}
          canCatalog={canCatalog}
          canCatalogRead={canCatalogRead}
          run={run}
          suggestSeo={suggestCatalogSeo}
          onCreateCategory={(form) => {
            const seoTitle = String(form.get("seoTitle") ?? "").trim();
            const seoDescription = String(form.get("seoDescription") ?? "").trim();
            const description = String(form.get("description") ?? "").trim();
            return api("/catalog/categories", {
              method: "POST",
              body: JSON.stringify({
                name: form.get("name"),
                slug: form.get("slug"),
                parentId: form.get("parentId") || undefined,
                status: "ACTIVE",
                ...(seoTitle ? { seoTitle } : {}),
                ...(seoDescription ? { seoDescription } : {}),
                ...(description ? { description } : {}),
              }),
            });
          }}
          onUpdateCategory={(category, form) =>
            api(`/catalog/categories/${category.id}`, {
              method: "PATCH",
              body: JSON.stringify({
                name: String(form.get("name") ?? "").trim() || category.name,
                slug: String(form.get("slug") ?? "").trim() || category.slug,
                status: category.status ?? "ACTIVE",
                parentId: category.parentId || undefined,
                seoTitle: String(form.get("seoTitle") ?? "").trim(),
                seoDescription: String(form.get("seoDescription") ?? "").trim(),
                description: String(form.get("description") ?? "").trim(),
              }),
            })
          }
          onDeleteCategory={(categoryId) =>
            api(`/catalog/categories/${categoryId}`, {
              method: "DELETE",
            })
          }
          onUpdateCategoryStatus={(category) =>
            api(`/catalog/categories/${category.id}`, {
              method: "PATCH",
              body: JSON.stringify({
                name: category.name,
                slug: category.slug,
                status: category.status === "ACTIVE" ? "DRAFT" : "ACTIVE",
                ...(category.seoTitle ? { seoTitle: category.seoTitle } : {}),
                ...(category.seoDescription
                  ? { seoDescription: category.seoDescription }
                  : {}),
                ...(category.description
                  ? { description: category.description }
                  : {}),
              }),
            })
          }
          onReorderCategories={(orderedIds) =>
            api("/catalog/categories/reorder", {
              method: "POST",
              body: JSON.stringify({ orderedIds }),
            })
          }
        />
      </BoRoutePanel>

      <BoRoutePanel route="catalog-brands">
        <CatalogBrandsPanel
          brands={brands}
          canCatalog={canCatalog}
          canCatalogRead={canCatalogRead}
          run={run}
          suggestSeo={suggestCatalogSeo}
          onCreateBrand={(form, logo) => {
            const seoTitle = String(form.get("seoTitle") ?? "").trim();
            const seoDescription = String(form.get("seoDescription") ?? "").trim();
            const description = String(form.get("description") ?? "").trim();
            return api("/catalog/brands", {
              method: "POST",
              body: JSON.stringify({
                name: form.get("name"),
                slug: form.get("slug"),
                status: "ACTIVE",
                ...(seoTitle ? { seoTitle } : {}),
                ...(seoDescription ? { seoDescription } : {}),
                ...(description ? { description } : {}),
                ...(logo ?? {}),
              }),
            });
          }}
          onUpdateBrand={(brand, form) =>
            api(`/catalog/brands/${brand.id}`, {
              method: "PATCH",
              body: JSON.stringify({
                name: String(form.get("name") ?? "").trim() || brand.name,
                slug: String(form.get("slug") ?? "").trim() || brand.slug,
                status: brand.status ?? "ACTIVE",
                seoTitle: String(form.get("seoTitle") ?? "").trim(),
                seoDescription: String(form.get("seoDescription") ?? "").trim(),
                description: String(form.get("description") ?? "").trim(),
              }),
            })
          }
          onDeleteBrand={(brandId) =>
            api(`/catalog/brands/${brandId}`, {
              method: "DELETE",
            })
          }
          onUpdateBrandStatus={(brand) =>
            api(`/catalog/brands/${brand.id}`, {
              method: "PATCH",
              body: JSON.stringify({
                name: brand.name,
                slug: brand.slug,
                status: brand.status === "ACTIVE" ? "DRAFT" : "ACTIVE",
              }),
            })
          }
          onUpdateBrandLogo={(brand, logo) =>
            api(`/catalog/brands/${brand.id}`, {
              method: "PATCH",
              body: JSON.stringify({
                name: brand.name,
                slug: brand.slug,
                status: brand.status ?? "ACTIVE",
                ...logo,
              }),
            })
          }
        />
      </BoRoutePanel>

      <BoRoutePanel route="catalog-banners">
        <CatalogBannersPanel
          banners={banners}
          canCatalog={canCatalog}
          canCatalogRead={canCatalogRead}
          run={run}
          onCreateBanner={(form, image) =>
            api("/catalog/banners", {
              method: "POST",
              body: JSON.stringify({
                placement: form.get("placement") || "HOME_HERO",
                altText: form.get("altText"),
                href: form.get("href"),
                status: "ACTIVE",
                ...image,
              }),
            })
          }
          onUpdateBanner={(banner, patch) =>
            api(`/catalog/banners/${banner.id}`, {
              method: "PATCH",
              body: JSON.stringify({
                placement: patch.placement ?? banner.placement ?? "HOME_HERO",
                altText: patch.altText,
                href: patch.href,
                status: patch.status,
                imageObjectKey:
                  patch.image?.imageObjectKey ?? banner.imageObjectKey,
                imageMimeType:
                  patch.image?.imageMimeType ?? banner.imageMimeType,
                imageByteSize:
                  patch.image?.imageByteSize ?? banner.imageByteSize,
                sortOrder: banner.sortOrder,
              }),
            })
          }
          onDeleteBanner={(bannerId) =>
            api(`/catalog/banners/${bannerId}`, {
              method: "DELETE",
            })
          }
          onReorderBanners={(orderedIds) =>
            api("/catalog/banners/reorder", {
              method: "POST",
              body: JSON.stringify({ orderedIds }),
            })
          }
        />
      </BoRoutePanel>

      <BoRoutePanel route="catalog-products">
        <CatalogProductsPanel
          products={products}
          brands={brands}
          categories={categories}
          canCatalog={canCatalog}
          canCatalogRead={canCatalogRead}
          run={run}
          suggestSeo={suggestCatalogSeo}
          onCreateProduct={(form, requiredSpecs) => {
            const brandId = String(form.get("brandId") ?? "").trim();
            const seoTitle = String(form.get("seoTitle") ?? "").trim();
            const seoDescription = String(form.get("seoDescription") ?? "").trim();
            const description = String(form.get("description") ?? "").trim();
            return api<{ id: string }>("/catalog/products", {
              method: "POST",
              body: JSON.stringify({
                name: form.get("name"),
                slug: form.get("slug"),
                categoryId: form.get("categoryId"),
                brandId: brandId === "" ? undefined : brandId,
                status: "ACTIVE",
                ...(seoTitle ? { seoTitle } : {}),
                ...(seoDescription ? { seoDescription } : {}),
                ...(description ? { description } : {}),
                requiredSpecs:
                  requiredSpecs.length > 0 ? requiredSpecs : undefined,
              }),
            });
          }}
          onUpdateProduct={(productId, form, requiredSpecs) => {
            const brandId = String(form.get("brandId") ?? "").trim();
            const seoTitle = String(form.get("seoTitle") ?? "").trim();
            const seoDescription = String(form.get("seoDescription") ?? "").trim();
            const description = String(form.get("description") ?? "").trim();
            return api<{ id: string }>(`/catalog/products/${productId}`, {
              method: "PATCH",
              body: JSON.stringify({
                name: form.get("name"),
                slug: form.get("slug"),
                categoryId: form.get("categoryId"),
                brandId: brandId === "" ? undefined : brandId,
                status: "ACTIVE",
                seoTitle,
                seoDescription,
                description,
                requiredSpecs,
              }),
            });
          }}
          onDeleteProduct={(productId) =>
            api(`/catalog/products/${productId}`, {
              method: "DELETE",
            })
          }
          onDeleteVariant={(variantId) =>
            api(`/catalog/variants/${variantId}`, {
              method: "DELETE",
            })
          }
          canCreateVariant={canCatalog && canPrice}
          canReceiveStock={canReceipt}
          defaultStockLocationId={defaultCatalogStockLocationId}
          onReceiveInitialStock={({ variantId, quantity }) => {
            if (defaultCatalogStockLocationId === null) {
              return Promise.reject(
                new Error("Stok yazmaq üçün aktiv anbar məntəqəsi tapılmadı"),
              );
            }
            return api("/inventory/receipts", {
              method: "POST",
              body: JSON.stringify({
                variantId,
                locationId: defaultCatalogStockLocationId,
                quantity,
                sourceType: "CATALOG_INTAKE",
                sourceDocumentId: `create-${variantId}`,
                reason: "Məhsul yaradılarkən ilkin stok",
              }),
            });
          }}
          fetchVariantOnHand={
            canInventoryRead
              ? async (variantId) => {
                  const params = new URLSearchParams({
                    limit: "100",
                    offset: "0",
                    includeZero: "true",
                    variantId,
                  });
                  const page = await api<InventoryBalancePage>(
                    `/inventory/balances?${params.toString()}`,
                  );
                  return page.items.reduce(
                    (total, row) => total + row.onHand,
                    0,
                  );
                }
              : undefined
          }
          onAddProductMedia={async ({ productId, file, altText, sortOrder }) => {
            const uploaded = await uploadCatalogProductImageFile(file);
            return api(`/catalog/products/${productId}/media`, {
              method: "POST",
              body: JSON.stringify({
                objectKey: uploaded.objectKey,
                mimeType: uploaded.mimeType,
                byteSize: uploaded.byteSize,
                altText,
                sortOrder: sortOrder ?? 0,
              }),
            });
          }}
          onUpdateProductMedia={async ({
            mediaId,
            file,
            altText,
            sortOrder,
            objectKey,
            mimeType,
            byteSize,
          }) => {
            if (file !== undefined) {
              const uploaded = await uploadCatalogProductImageFile(file);
              return api(`/catalog/media/${mediaId}`, {
                method: "PATCH",
                body: JSON.stringify({
                  objectKey: uploaded.objectKey,
                  mimeType: uploaded.mimeType,
                  byteSize: uploaded.byteSize,
                  altText,
                  sortOrder: sortOrder ?? 0,
                }),
              });
            }
            return api(`/catalog/media/${mediaId}`, {
              method: "PATCH",
              body: JSON.stringify({
                objectKey,
                mimeType,
                byteSize,
                altText,
                sortOrder: sortOrder ?? 0,
              }),
            });
          }}
          onRemoveProductMedia={(mediaId) =>
            api(`/catalog/media/${mediaId}`, { method: "DELETE" })
          }
          onAddVariantMedia={async ({ variantId, file, altText, sortOrder }) => {
            const uploaded = await uploadCatalogProductImageFile(file);
            return api(`/catalog/variants/${variantId}/media`, {
              method: "POST",
              body: JSON.stringify({
                objectKey: uploaded.objectKey,
                mimeType: uploaded.mimeType,
                byteSize: uploaded.byteSize,
                altText,
                sortOrder: sortOrder ?? 0,
              }),
            });
          }}
          onUpdateVariantMedia={async ({
            mediaId,
            file,
            altText,
            sortOrder,
            objectKey,
            mimeType,
            byteSize,
          }) => {
            if (file !== undefined) {
              const uploaded = await uploadCatalogProductImageFile(file);
              return api(`/catalog/variant-media/${mediaId}`, {
                method: "PATCH",
                body: JSON.stringify({
                  objectKey: uploaded.objectKey,
                  mimeType: uploaded.mimeType,
                  byteSize: uploaded.byteSize,
                  altText,
                  sortOrder: sortOrder ?? 0,
                }),
              });
            }
            return api(`/catalog/variant-media/${mediaId}`, {
              method: "PATCH",
              body: JSON.stringify({
                objectKey,
                mimeType,
                byteSize,
                altText,
                sortOrder: sortOrder ?? 0,
              }),
            });
          }}
          onRemoveVariantMedia={(mediaId) =>
            api(`/catalog/variant-media/${mediaId}`, { method: "DELETE" })
          }
          onCreateVariant={(productId, form) =>
            api(`/catalog/products/${productId}/variants`, {
              method: "POST",
              body: JSON.stringify(buildCreateCatalogVariantPayload(form)),
            })
          }
          onUpdateVariant={(variantId, form, status) =>
            api(`/catalog/variants/${variantId}`, {
              method: "PATCH",
              body: JSON.stringify(
                buildUpdateCatalogVariantMetadataPayload(form, status),
              ),
            })
          }
          onUpdateVariantPrice={(variantId, form) =>
            api(`/catalog/variants/${variantId}/price`, {
              method: "PATCH",
              body: JSON.stringify(buildUpdateCatalogVariantPricePayload(form)),
            })
          }
          canImportPrices={canPrice}
          onImportPrices={(input) =>
            api<CatalogPriceImportResponseContract>("/catalog/prices/import", {
              method: "POST",
              body: JSON.stringify({
                items: input.items,
                dryRun: input.dryRun === true,
              }),
            })
          }
        />
      </BoRoutePanel>

      <BoRoutePanel route="catalog-seo">
        <CatalogSeoCoveragePanel
          loadCoverage={() =>
            api<CatalogSeoCoverageResponseContract>("/catalog/seo/coverage")
          }
          fillMissing={(payload) =>
            api<CatalogSeoFillMissingResponseContract>(
              "/catalog/seo/fill-missing",
              {
                method: "POST",
                body: JSON.stringify(payload),
              },
            )
          }
          run={run}
        />
      </BoRoutePanel>

      <BoRoutePanel route="catalog-subcategories">
        <CatalogSubcategoriesPanel
          categories={categories}
          canCatalog={canCatalog}
          canCatalogRead={canCatalogRead}
          run={run}
          suggestSeo={suggestCatalogSeo}
          onCreateCategory={(form) => {
            const seoTitle = String(form.get("seoTitle") ?? "").trim();
            const seoDescription = String(form.get("seoDescription") ?? "").trim();
            const description = String(form.get("description") ?? "").trim();
            return api("/catalog/categories", {
              method: "POST",
              body: JSON.stringify({
                name: form.get("name"),
                slug: form.get("slug"),
                parentId: form.get("parentId") || undefined,
                status: "ACTIVE",
                ...(seoTitle ? { seoTitle } : {}),
                ...(seoDescription ? { seoDescription } : {}),
                ...(description ? { description } : {}),
              }),
            });
          }}
          onUpdateCategory={(category, form) =>
            api(`/catalog/categories/${category.id}`, {
              method: "PATCH",
              body: JSON.stringify({
                name: String(form.get("name") ?? "").trim() || category.name,
                slug: String(form.get("slug") ?? "").trim() || category.slug,
                status: category.status ?? "ACTIVE",
                parentId: String(form.get("parentId") ?? "").trim() || category.parentId || undefined,
                seoTitle: String(form.get("seoTitle") ?? "").trim(),
                seoDescription: String(form.get("seoDescription") ?? "").trim(),
                description: String(form.get("description") ?? "").trim(),
              }),
            })
          }
          onDeleteCategory={(categoryId) =>
            api(`/catalog/categories/${categoryId}`, {
              method: "DELETE",
            })
          }
        />
      </BoRoutePanel>

      <BoRoutePanel route="inventory-balance">
        <InventoryBalancePanel
          locations={locations}
          canInventoryRead={canInventoryRead}
          refreshKey={inventoryRefreshKey}
          fetchBalances={(query) => {
            const params = new URLSearchParams({
              limit: String(query.limit),
              offset: String(query.offset),
              includeZero: String(query.includeZero),
            });
            if (query.search !== "") {
              params.set("search", query.search);
            }
            if (query.locationId !== "") {
              params.set("locationId", query.locationId);
            }
            return api<InventoryBalancePage>(
              `/inventory/balances?${params.toString()}`,
            );
          }}
          fetchSyncState={() =>
            api<{
              rowCount: number;
              onHand: number;
              reserved: number;
              available: number;
              latestUpdatedAt: string | null;
            }>("/inventory/balances/sync-state")
          }
        />
      </BoRoutePanel>

      <BoRoutePanel route="inventory-adjustment">
        <InventoryAdjustmentPanel
          products={products}
          locations={locations}
          canAdjust={canAdjust}
          canInventoryRead={canInventoryRead}
          refreshKey={inventoryRefreshKey}
          run={run}
          fetchMovements={(limit) =>
            api<InventoryMovement[]>(`/inventory/movements?limit=${limit}`)
          }
          fetchBalances={(query) => {
            const params = new URLSearchParams({
              limit: String(query.limit),
              offset: String(query.offset),
              includeZero: String(query.includeZero),
            });
            if (query.search !== "") {
              params.set("search", query.search);
            }
            if (query.locationId !== "") {
              params.set("locationId", query.locationId);
            }
            return api<InventoryBalancePage>(
              `/inventory/balances?${params.toString()}`,
            );
          }}
          fetchBalanceSnapshot={async (variantId, locationId) => {
            const params = new URLSearchParams({
              limit: "1",
              offset: "0",
              includeZero: "true",
              variantId,
              locationId,
            });
            const page = await api<InventoryBalancePage>(
              `/inventory/balances?${params.toString()}`,
            );
            const row = page.items[0];
            if (row === undefined) {
              return { onHand: 0, reserved: 0 };
            }
            return { onHand: row.onHand, reserved: row.reserved };
          }}
          onAdjustment={(form) =>
            api("/inventory/adjustments", {
              method: "POST",
              body: JSON.stringify({
                variantId: form.get("variantId"),
                locationId: form.get("locationId"),
                quantity: Number(form.get("quantity")),
                sourceType: form.get("sourceType"),
                sourceDocumentId: form.get("sourceDocumentId"),
                reason: form.get("reason"),
              }),
            })
          }
        />
      </BoRoutePanel>

      <BoRoutePanel route="inventory-receipt">
        <InventoryReceiptPanel
          products={products}
          brands={brands}
          locations={locations}
          canReceipt={canReceipt}
          canInventoryRead={canInventoryRead}
          refreshKey={inventoryRefreshKey}
          run={run}
          fetchMovements={(limit) =>
            api<InventoryMovement[]>(`/inventory/movements?limit=${limit}`)
          }
          onReceipt={(payload) =>
            api("/inventory/receipts", {
              method: "POST",
              body: JSON.stringify(payload),
            })
          }
        />
      </BoRoutePanel>

      <BoRoutePanel route="inventory-transfer">
        <div className="operation-card operation-card--no-hover">
          <h2>Stok transferi</h2>
          <p className="pos-empty">
            Anbarlar arası stok transferi ilkin versiyada istifadə olunmur
            (D-007). Stok üçün məhsul qəbulu və ya qalıq düzəlişindən istifadə
            edin.
          </p>
        </div>
      </BoRoutePanel>

      <BoRoutePanel route="orders-all">
      {canOrdersRead && (
        <OrdersListPanel orders={orders} formatMoney={formatMoney} />
      )}
      </BoRoutePanel>

      <BoRoutePanel route="order-detail">
      {canOrdersRead && (
        <OrderDetailPanel
          order={displayedOrder}
          loading={orderDetailLoading}
          orderTransitionPending={orderTransitionPending}
          canFulfill={canFulfill}
          canRefund={canRefund}
          orderReason={orderReason}
          formatMoney={formatMoney}
          onOrderTransition={(action, reason) => {
            void runOrderTransition(action, reason);
          }}
        />
      )}
      </BoRoutePanel>

      <BoRoutePanel route="reports">
      {canReportsRead && (
        <section className="reports-section" aria-label="Satış hesabatları">
          <article className="operation-card">
            <div className="report-filter-row">
              <label>
                Başlanğıc gün
                <input
                  type="date"
                  value={reportRange.from}
                  onChange={(event) =>
                    setReportRange((current) => ({
                      ...current,
                      from: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                Son gün
                <input
                  type="date"
                  value={reportRange.to}
                  onChange={(event) =>
                    setReportRange((current) => ({
                      ...current,
                      to: event.target.value,
                    }))
                  }
                  required
                />
              </label>
            </div>
          </article>

          <div className="report-main-column">
              <article className="operation-card">
                <h2>Satış xülasəsi</h2>
                {salesReport === null ? (
                  <p className="pos-empty">
                    Bu tarix aralığı üçün hesabat yüklənmədi.
                  </p>
                ) : (
                  <>
                    <p className="pos-meta report-range-meta">
                      {formatReportDay(salesReport.range.from)} —{" "}
                      {formatReportDay(salesReport.range.to)} · Asia/Baku
                    </p>
                    <div className="summary-grid">
                      <div>
                        <span>Tranzaksiya</span>
                        <strong>{salesReport.summary.transactionCount}</strong>
                      </div>
                      <div>
                        <span>Ümumi satış</span>
                        <strong>
                          {formatMoney(salesReport.summary.grossSales)}
                        </strong>
                      </div>
                      <div>
                        <span>Qaytarma</span>
                        <strong>
                          {formatMoney(salesReport.summary.refundTotal)}
                        </strong>
                      </div>
                      <div>
                        <span>Xalis satış</span>
                        <strong>
                          {formatMoney(salesReport.summary.netSales)}
                        </strong>
                      </div>
                    </div>

                    <div className="report-channel-grid">
                      {(["ONLINE", "POS"] as const).map((channel) => {
                        const entry = findReportChannel(
                          salesReport.byChannel,
                          channel,
                        );
                        return (
                          <div
                            key={channel}
                            className={`report-channel-card report-channel-card--${channel.toLowerCase()}`}
                          >
                            <span className="report-channel-card__label">
                              {reportChannelLabel(channel)}
                            </span>
                            <strong className="report-channel-card__value">
                              {formatMoney(entry?.netSales ?? "0")}
                            </strong>
                            <p className="pos-meta">
                              {entry?.transactionCount ?? 0} tranzaksiya · ümumi{" "}
                              {formatMoney(entry?.grossSales ?? "0")}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </article>

              <article className="operation-card">
                <div className="report-period-head">
                  <h2>
                    {reportPeriodView === "daily"
                      ? "Gündəlik satış hesabatı"
                      : "Aylıq satış hesabatı"}
                  </h2>
                  <div
                    className="report-period-tabs"
                    role="tablist"
                    aria-label="Hesabat dövrü"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={reportPeriodView === "daily"}
                      className={
                        reportPeriodView === "daily" ? "is-active" : undefined
                      }
                      onClick={() => setReportPeriodView("daily")}
                    >
                      Gündəlik
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={reportPeriodView === "monthly"}
                      className={
                        reportPeriodView === "monthly" ? "is-active" : undefined
                      }
                      onClick={() => setReportPeriodView("monthly")}
                    >
                      Aylıq
                    </button>
                  </div>
                </div>

                {salesReport === null ? (
                  <p className="pos-empty">Hesabat məlumatı yoxdur.</p>
                ) : reportPeriodView === "daily" ? (
                  (salesReport.byDay ?? []).length === 0 ? (
                    <p className="pos-empty">
                      Seçilmiş aralıqda gündəlik satış yoxdur.
                    </p>
                  ) : (
                    <div className="report-table-wrap">
                      <div className="report-table-scroll">
                        <table className="report-sales-table">
                          <thead>
                            <tr>
                              <th scope="col">Gün</th>
                              <th scope="col">Online</th>
                              <th scope="col">Terminal</th>
                              <th scope="col">Xalis cəmi</th>
                              <th scope="col">Tranzaksiya</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(salesReport.byDay ?? []).map((entry) => {
                              const online = findReportChannel(
                                entry.channels,
                                "ONLINE",
                              );
                              const pos = findReportChannel(
                                entry.channels,
                                "POS",
                              );
                              return (
                                <tr key={entry.day}>
                                  <th scope="row">{formatReportDay(entry.day)}</th>
                                  <td>
                                    <strong>
                                      {formatMoney(online?.netSales ?? "0")}
                                    </strong>
                                    <span className="report-sales-table__meta">
                                      {online?.transactionCount ?? 0} tr.
                                    </span>
                                  </td>
                                  <td>
                                    <strong>
                                      {formatMoney(pos?.netSales ?? "0")}
                                    </strong>
                                    <span className="report-sales-table__meta">
                                      {pos?.transactionCount ?? 0} tr.
                                    </span>
                                  </td>
                                  <td>
                                    <strong>
                                      {formatMoney(entry.netSales)}
                                    </strong>
                                    <span className="report-sales-table__meta">
                                      ümumi {formatMoney(entry.grossSales)}
                                    </span>
                                  </td>
                                  <td>{entry.transactionCount}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                ) : (salesReport.byMonth ?? []).length === 0 ? (
                  <p className="pos-empty">
                    Seçilmiş aralıqda aylıq satış yoxdur.
                  </p>
                ) : (
                  <div className="report-table-wrap">
                    <div className="report-table-scroll">
                      <table className="report-sales-table">
                        <thead>
                          <tr>
                            <th scope="col">Ay</th>
                            <th scope="col">Online</th>
                            <th scope="col">Terminal</th>
                            <th scope="col">Xalis cəmi</th>
                            <th scope="col">Tranzaksiya</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(salesReport.byMonth ?? []).map((entry) => {
                            const online = findReportChannel(
                              entry.channels,
                              "ONLINE",
                            );
                            const pos = findReportChannel(entry.channels, "POS");
                            return (
                              <tr key={entry.month}>
                                <th scope="row">
                                  {formatReportMonth(entry.month)}
                                </th>
                                <td>
                                  <strong>
                                    {formatMoney(online?.netSales ?? "0")}
                                  </strong>
                                  <span className="report-sales-table__meta">
                                    {online?.transactionCount ?? 0} tr.
                                  </span>
                                </td>
                                <td>
                                  <strong>
                                    {formatMoney(pos?.netSales ?? "0")}
                                  </strong>
                                  <span className="report-sales-table__meta">
                                    {pos?.transactionCount ?? 0} tr.
                                  </span>
                                </td>
                                <td>
                                  <strong>{formatMoney(entry.netSales)}</strong>
                                  <span className="report-sales-table__meta">
                                    ümumi {formatMoney(entry.grossSales)}
                                  </span>
                                </td>
                                <td>{entry.transactionCount}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </article>

              <article className="operation-card">
                <h2>Ödəniş və top məhsullar</h2>
                {salesReport === null ? (
                  <p className="pos-empty">Bölgü məlumatı yoxdur.</p>
                ) : (
                  <div className="report-breakdown">
                    <div>
                      <h3>Ödəniş növü üzrə</h3>
                      <div className="data-list">
                        {salesReport.byPaymentMethod.length === 0 ? (
                          <p className="pos-empty">Ödəniş üzrə məlumat yoxdur.</p>
                        ) : (
                          salesReport.byPaymentMethod.map((entry) => (
                            <div
                              key={entry.paymentMethod}
                              className="report-metric-row"
                            >
                              <div>
                                <strong>
                                  {reportPaymentLabel(entry.paymentMethod)}
                                </strong>
                                <p className="pos-meta">
                                  {entry.transactionCount} tranzaksiya
                                </p>
                              </div>
                              <span>{formatMoney(entry.netSales)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <h3>Top məhsullar</h3>
                      <div className="data-list">
                        {salesReport.byProduct.length === 0 ? (
                          <p className="pos-empty">Məhsul üzrə məlumat yoxdur.</p>
                        ) : (
                          salesReport.byProduct.map((entry) => (
                            <div
                              key={entry.variantId}
                              className="report-metric-row"
                            >
                              <div>
                                <strong>{entry.sku}</strong>
                                <p className="pos-meta">
                                  {entry.productName} · {entry.variantName} ·{" "}
                                  {entry.quantity} ədəd
                                </p>
                              </div>
                              <span>{formatMoney(entry.netSales)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </article>
          </div>
        </section>
      )}
      </BoRoutePanel>

      <BoRoutePanel route="pos">
      {canPos && (
        <div
          className={[
            "pos-route-shell",
            isPosLauncher ? "pos-route-shell--launcher" : "",
            posFlow !== null ? "pos-route-shell--flow" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
        <section
          className={[
            "pos-section",
            isPosLauncher ? "pos-section--launcher" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label="POS və kassa"
        >
          <div className="operation-grid">
            {showPosSaleLauncher && (
              <div className="pos-sale-actions">
                <div className="pos-sale-grid">
                  <article className="operation-card operation-card--no-hover pos-sale-card">
                    <button
                      type="button"
                      className="pos-sale-btn pos-sale-btn--cash"
                      aria-label={`Nağd satış, bu gün ${formatMoney(posDailySummary?.cashSales ?? "0")}`}
                      onClick={() => {
                        beginPosSale("CASH");
                      }}
                    >
                      <IconCash
                        className="pos-sale-btn__icon"
                        aria-hidden="true"
                      />
                      <span className="pos-sale-btn__label">Nağd satış</span>
                      <span className="pos-sale-btn__total">
                        {formatMoney(posDailySummary?.cashSales ?? "0")}
                      </span>
                    </button>
                  </article>
                  {canRefund && (
                    <article className="operation-card operation-card--no-hover pos-sale-card">
                      <button
                        type="button"
                        className="pos-sale-btn pos-sale-btn--return"
                        aria-label={`Qaytarma, bu gün ${formatMoney(posDailySummary?.refundTotal ?? "0")}`}
                        onClick={() => {
                          beginPosReturn();
                        }}
                      >
                        <IconReturn
                          className="pos-sale-btn__icon"
                          aria-hidden="true"
                        />
                        <span className="pos-sale-btn__label">Qaytarma</span>
                        <span className="pos-sale-btn__total">
                          {formatMoney(posDailySummary?.refundTotal ?? "0")}
                        </span>
                      </button>
                    </article>
                  )}
                  <article className="operation-card operation-card--no-hover pos-sale-card">
                    <button
                      type="button"
                      className="pos-sale-btn pos-sale-btn--card"
                      aria-label={`Kartla ödəniş, bu gün ${formatMoney(
                        Number(posDailySummary?.cardSales ?? 0) +
                          Number(posDailySummary?.installmentSales ?? 0),
                      )}`}
                      onClick={() => {
                        beginPosSale("CARD");
                      }}
                    >
                      <IconCard
                        className="pos-sale-btn__icon"
                        aria-hidden="true"
                      />
                      <span className="pos-sale-btn__label">Kartla ödəniş</span>
                      <span className="pos-sale-btn__total">
                        {formatMoney(
                          Number(posDailySummary?.cardSales ?? 0) +
                            Number(posDailySummary?.installmentSales ?? 0),
                        )}
                      </span>
                    </button>
                  </article>
                </div>
                <div className="pos-sale-grid">
                  <article className="operation-card operation-card--no-hover pos-sale-card">
                    <button
                      type="button"
                      className="pos-sale-btn pos-sale-btn--transfer"
                      aria-label={`Köçürmə ilə satış, bu gün ${formatMoney(posDailySummary?.transferSales ?? "0")}`}
                      onClick={() => {
                        beginPosTransferSale();
                      }}
                    >
                      <IconTransfer
                        className="pos-sale-btn__icon"
                        aria-hidden="true"
                      />
                      <span className="pos-sale-btn__label">
                        Köçürmə ilə satış
                      </span>
                      <span className="pos-sale-btn__total">
                        {formatMoney(posDailySummary?.transferSales ?? "0")}
                      </span>
                    </button>
                  </article>
                  <article className="operation-card operation-card--no-hover pos-sale-card">
                    <button
                      type="button"
                      className="pos-sale-btn pos-sale-btn--wolt"
                      aria-label={`Wolt ilə satış, bu gün ${formatMoney(posDailySummary?.woltSales ?? "0")}`}
                      onClick={() => {
                        beginPosWoltSale();
                      }}
                    >
                      <IconDelivery
                        className="pos-sale-btn__icon"
                        aria-hidden="true"
                      />
                      <span className="pos-sale-btn__label">Wolt ilə satış</span>
                      <span className="pos-sale-btn__total">
                        {formatMoney(posDailySummary?.woltSales ?? "0")}
                      </span>
                    </button>
                  </article>
                  <article className="operation-card operation-card--no-hover pos-sale-card">
                    <button
                      type="button"
                      className="pos-sale-btn pos-sale-btn--birmarket"
                      aria-label={`Birmarket ilə satış, bu gün ${formatMoney(posDailySummary?.birmarketSales ?? "0")}`}
                      onClick={() => {
                        beginPosBirmarketSale();
                      }}
                    >
                      <IconOrders
                        className="pos-sale-btn__icon"
                        aria-hidden="true"
                      />
                      <span className="pos-sale-btn__label">
                        Birmarket ilə satış
                      </span>
                      <span className="pos-sale-btn__total">
                        {formatMoney(posDailySummary?.birmarketSales ?? "0")}
                      </span>
                    </button>
                  </article>
                </div>
              </div>
            )}
          </div>

          {canPos &&
            (posFlow === "sale" ||
              posFlow === "transfer" ||
              posFlow === "wolt" ||
              posFlow === "birmarket") && (
            <div className="pos-workbench">
              <article className="operation-card operation-card--no-hover pos-pane pos-pane--catalog">
                <header className="pos-flow-header">
                  <button
                    type="button"
                    className="bo-btn-reset pos-header__back"
                    aria-label="Geri"
                    onClick={() => exitPosFlow()}
                  >
                    <IconChevronLeft
                      className="bo-icon--sm pos-header__back-icon"
                      aria-hidden="true"
                    />
                    <span className="pos-header__back-label">Geri</span>
                  </button>
                  <div className="pos-flow-header__copy">
                    <h2>{posFlowTitle}</h2>
                  </div>
                </header>
                <PosProductPicker
                  active
                  refreshKey={posProductsRefreshKey}
                  fetchProducts={fetchPosProducts}
                  onSelect={addPosProduct}
                  formatMoney={formatMoney}
                />
              </article>

              <article
                className={[
                  "operation-card operation-card--no-hover pos-pane pos-pane--cart",
                  completedSale !== null ? "pos-pane--cart-success" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {completedSale === null ? (
                  <header className="pos-cart-header">
                    <h3 className="pos-cart-header__title">
                      <span className="pos-cart-header__label">Səbət</span>
                      <span className="pos-cart-header__label-long">
                        Səbətdəki məhsul sayı:{" "}
                      </span>
                      <span className="pos-cart-header__count">
                        {posCartItemCount}
                      </span>
                    </h3>
                  </header>
                ) : null}

                <div className="pos-cart-body">
                  {completedSale !== null ? (
                    <div
                      className="pos-sale-success"
                      role="status"
                      aria-live="polite"
                    >
                      <div className="pos-sale-success__hero">
                        <div
                          className="pos-sale-success__mark"
                          aria-hidden="true"
                        >
                          <span className="pos-sale-success__ring" />
                          <IconCheck className="pos-sale-success__check" />
                        </div>
                        <strong className="pos-sale-success__title">
                          Satış uğurlu oldu
                        </strong>
                        <p className="pos-sale-success__amount">
                          {formatMoney(completedSale.grandTotal)}
                        </p>
                        <p className="pos-sale-success__lead">
                          {completedSaleItemCount} məhsul ·{" "}
                          {posChannelLabel(completedSale.channel)} · kassada
                          qeydə alındı
                        </p>
                      </div>

                      {completedSale.externalTerminalReference ? (
                        <ul className="pos-sale-success__meta">
                          <li>
                            <span>
                              {completedSale.channel === "TRANSFER"
                                ? "Hesab faktura"
                                : "Kassa qəbzi"}
                            </span>
                            <code>
                              {completedSale.externalTerminalReference}
                            </code>
                          </li>
                        </ul>
                      ) : null}
                    </div>
                  ) : posItems.length === 0 ? (
                    <div className="pos-empty pos-empty--soft pos-cart-empty">
                      <strong>Səbət boşdur</strong>
                      <p>Yuxarıdan məhsul seçin və ya barkod skan edin.</p>
                    </div>
                  ) : (
                    <div className="pos-lines">
                      {posItems.map((item) => (
                        <div key={item.variantId} className="pos-line">
                          <div className="pos-line__info">
                            <strong className="pos-line__title">
                              {item.productName}
                            </strong>
                            <p className="pos-line__meta">
                              <span className="pos-line__sku">{item.sku}</span>
                              {item.variantName !== item.productName
                                ? ` · ${item.variantName}`
                                : ""}
                            </p>
                            <p className="pos-line__unit">
                              {formatMoney(item.unitPrice)} / ədəd
                            </p>
                          </div>
                          <div className="pos-line__actions">
                            <div
                              className="pos-qty"
                              role="group"
                              aria-label={`${item.productName} miqdarı`}
                            >
                              <button
                                type="button"
                                className="bo-btn-reset pos-qty__btn"
                                aria-label="Azalt"
                                disabled={item.quantity <= 1}
                                onClick={() =>
                                  setPosItems((current) =>
                                    current.map((entry) =>
                                      entry.variantId === item.variantId
                                        ? {
                                            ...entry,
                                            quantity: Math.max(
                                              1,
                                              entry.quantity - 1,
                                            ),
                                          }
                                        : entry,
                                    ),
                                  )
                                }
                              >
                                <IconMinus
                                  className="bo-icon--sm"
                                  aria-hidden="true"
                                />
                              </button>
                              <input
                                className="pos-qty__input"
                                type="number"
                                min={1}
                                max={item.available}
                                value={item.quantity}
                                aria-label="Miqdar"
                                onChange={(event) =>
                                  setPosItems((current) =>
                                    current.map((entry) =>
                                      entry.variantId === item.variantId
                                        ? {
                                            ...entry,
                                            quantity: Math.max(
                                              1,
                                              Math.min(
                                                Number(event.target.value) ||
                                                  1,
                                                entry.available,
                                              ),
                                            ),
                                          }
                                        : entry,
                                    ),
                                  )
                                }
                              />
                              <button
                                type="button"
                                className="bo-btn-reset pos-qty__btn"
                                aria-label="Artır"
                                disabled={item.quantity >= item.available}
                                onClick={() =>
                                  setPosItems((current) =>
                                    current.map((entry) =>
                                      entry.variantId === item.variantId
                                        ? {
                                            ...entry,
                                            quantity: Math.min(
                                              entry.available,
                                              entry.quantity + 1,
                                            ),
                                          }
                                        : entry,
                                    ),
                                  )
                                }
                              >
                                <IconPlus
                                  className="bo-icon--sm"
                                  aria-hidden="true"
                                />
                              </button>
                            </div>
                            <strong className="pos-line__total">
                              {formatMoney(
                                Number(item.unitPrice) * item.quantity,
                              )}
                            </strong>
                            <button
                              type="button"
                              className="bo-btn-reset pos-line__remove"
                              aria-label="Sətiri sil"
                              onClick={() =>
                                requestConfirm({
                                  title: "Sətri sil",
                                  message: `"${item.productName}" (${item.sku}) sətirini POS səbətindən silmək istəyirsiniz?`,
                                  onConfirm: () => {
                                    setPosItems((current) =>
                                      current.filter(
                                        (entry) =>
                                          entry.variantId !== item.variantId,
                                      ),
                                    );
                                  },
                                })
                              }
                            >
                              <IconClose
                                className="bo-icon--sm"
                                aria-hidden="true"
                              />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <footer className="pos-cart-footer">
                  {completedSale !== null ? (
                    <button
                      type="button"
                      className="pos-cart-checkout pos-cart-checkout--success"
                      onClick={() => clearSaleSuccess()}
                    >
                      Növbəti satış
                    </button>
                  ) : (
                    <>
                      <div className="pos-cart-total">
                        <span>Toplam</span>
                        <strong>{formatMoney(posSubtotal)}</strong>
                      </div>

                      {posNeedsTerminalReference ? (
                        <label className="pos-cart-ref">
                          {posReferenceLabel}
                          <input
                            value={posTerminalReference}
                            onChange={(event) =>
                              setPosTerminalReference(event.target.value)
                            }
                            minLength={2}
                            placeholder={posReferencePlaceholder}
                            required
                          />
                        </label>
                      ) : null}

                      <button
                        type="button"
                        className="pos-cart-checkout"
                        disabled={
                          posItems.length === 0 ||
                          (posNeedsTerminalReference &&
                            posTerminalReference.trim().length < 2)
                        }
                        onClick={() =>
                          void run(
                            () =>
                              api<PosSale>("/pos/sales", {
                                method: "POST",
                                headers: {
                                  "Idempotency-Key": `pos-ui-${Date.now()}`,
                                },
                                body: JSON.stringify({
                                  paymentMethod: posPaymentMethod,
                                  channel: posSaleChannel,
                                  ...(posNeedsTerminalReference
                                    ? {
                                        externalTerminalReference:
                                          posTerminalReference.trim(),
                                      }
                                    : {}),
                                  items: posItems.map((item) => ({
                                    variantId: item.variantId,
                                    quantity: item.quantity,
                                  })),
                                }),
                              }),
                            "",
                            {
                              onSuccess: (sale) => {
                                setCompletedSale(sale);
                                setRecentSale(null);
                                setRecentReturn(null);
                                setPosItems([]);
                                setPosTerminalReference("");
                                setReturnQuantities({});
                                setReturnTerminalReference("");
                                setPosProductsRefreshKey((key) => key + 1);
                                void refreshPosDailySummary();
                              },
                            },
                          )
                        }
                      >
                        Satışı tamamla
                      </button>
                    </>
                  )}
                </footer>
              </article>
            </div>
          )}

          {canRefund && posFlow === "return" && (
            <div className="pos-workbench">
              <article className="operation-card operation-card--no-hover pos-pane pos-pane--catalog">
                <header className="pos-flow-header">
                  <button
                    type="button"
                    className="bo-btn-reset pos-header__back"
                    aria-label="Geri"
                    onClick={() => exitPosFlow()}
                  >
                    <IconChevronLeft
                      className="bo-icon--sm pos-header__back-icon"
                      aria-hidden="true"
                    />
                    <span className="pos-header__back-label">Geri</span>
                  </button>
                  <div className="pos-flow-header__copy">
                    <h2>{posFlowTitle}</h2>
                  </div>
                </header>

                <div className="pos-return-picker">
                  <div className="pos-return-picker__head">
                    <div className="pos-search-block pos-return-picker__search">
                      <div className="pos-search-block__label-row">
                        <label
                          className="pos-search-block__label"
                          htmlFor={posReturnSearchFieldId}
                        >
                          Satış axtarışı
                        </label>
                        {posReturnSearchTrimmed !== "" ? (
                          <span
                            className="pos-search-block__hint"
                            aria-hidden="true"
                          >
                            Esc — təmizlə
                          </span>
                        ) : null}
                      </div>
                      <div
                        className={[
                          "pos-search",
                          posReturnSearchTrimmed !== ""
                            ? "pos-search--filled"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span
                          className="pos-search__icon-wrap"
                          aria-hidden="true"
                        >
                          <IconSearch className="pos-search__icon" />
                        </span>
                        <input
                          id={posReturnSearchFieldId}
                          className="pos-search__input"
                          value={posReturnSearch}
                          onChange={(event) =>
                            setPosReturnSearch(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (
                              event.key === "Escape" &&
                              posReturnSearch.length > 0
                            ) {
                              event.preventDefault();
                              setPosReturnSearch("");
                            }
                          }}
                          placeholder="Məs. iPhone, SKU, barkod, kassa qəbzi və ya hesab faktura"
                          autoComplete="off"
                          spellCheck={false}
                          inputMode="search"
                          enterKeyHint="search"
                        />
                        <div className="pos-search__trail">
                          {posReturnSearchTrimmed !== "" ? (
                            <button
                              type="button"
                              className="bo-btn-reset pos-search__clear"
                              aria-label="Axtarışı təmizlə"
                              onClick={() => setPosReturnSearch("")}
                            >
                              <IconClose
                                className="bo-icon--sm"
                                aria-hidden="true"
                              />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pos-return-picker__body">
                    <div className="pos-product-toolbar pos-return-picker__toolbar">
                      <h3 className="pos-cart-header__title">
                        <span className="pos-product-toolbar__full">
                          Qaytarıla bilən satış:{" "}
                        </span>
                        <span className="pos-product-toolbar__short">
                          Qaytarıla bilən:{" "}
                        </span>
                        <span className="pos-cart-header__count">
                          {posReturnSearchTrimmed !== ""
                            ? filteredReturnableDayPosSales.length
                            : returnableDayPosSales.length}
                        </span>
                        {posReturnSearchTrimmed !== "" &&
                        filteredReturnableDayPosSales.length !==
                          returnableDayPosSales.length ? (
                          <span className="pos-cart-header__count-muted">
                            {" "}
                            / {returnableDayPosSales.length}
                          </span>
                        ) : null}
                      </h3>
                      <label className="pos-return-picker__date">
                        <span className="pos-return-picker__date-label">
                          Tarix
                        </span>
                        <input
                          type="date"
                          value={posReturnDate}
                          max={bakuBusinessDate()}
                          aria-label="Tarix"
                          onChange={(event) => {
                            const nextDate = event.target.value;
                            if (!nextDate) return;
                            clearRouteAlerts();
                            setPosReturnDate(nextDate);
                            setPosReturnSearch("");
                            setRecentSale(null);
                            setRecentReturn(null);
                            setReturnQuantities({});
                            setReturnTerminalReference("");
                            setReturnReason("");
                            setReturnSubmitting(false);
                            returnIdempotencyKeyRef.current = null;
                            void loadPosReturnSummary(nextDate);
                          }}
                        />
                      </label>
                    </div>
                    <p className="pos-meta pos-return-picker__hint">
                      {posReturnSearchTrimmed !== ""
                        ? "Axtarış məhsul adı, model, SKU, barkod, kassa qəbzi və hesab faktura üzrə filtr edir."
                        : posReturnDateIsToday
                          ? "Qaytarılacaq satışı seçin — detallar sağ paneldə açılır."
                          : `${posReturnDateLabel} tarixindəki satışlar — detallar sağ paneldə açılır.`}
                    </p>
                    {posReturnSummaryLoading ? (
                      <div className="pos-empty pos-empty--soft">
                        <strong>Satışlar yüklənir…</strong>
                        <p>Seçilmiş tarix üzrə qaytarıla bilən satışlar gətirilir.</p>
                      </div>
                    ) : returnableDayPosSales.length === 0 ? (
                      <div className="pos-empty pos-empty--soft">
                        <strong>
                          {returnDayPosSales.length === 0
                            ? posReturnDateIsToday
                              ? "Bu gün satış yoxdur"
                              : "Bu tarixdə satış yoxdur"
                            : "Qaytarıla bilən satış yoxdur"}
                        </strong>
                        <p>
                          {returnDayPosSales.length === 0
                            ? posReturnDateIsToday
                              ? "Qaytarma üçün əvvəlcə nağd, kart və ya digər kanalda satış tamamlanmalıdır."
                              : "Başqa bir tarix seçin və ya həmin gün satış olub-olmadığını yoxlayın."
                            : posReturnDateIsToday
                              ? "Bugünkü satışlar artıq tam qaytarılıb."
                              : "Bu tarixdəki satışlar artıq tam qaytarılıb."}
                        </p>
                      </div>
                    ) : filteredReturnableDayPosSales.length === 0 ? (
                      <div className="pos-empty pos-empty--soft">
                        <strong>Nəticə tapılmadı</strong>
                        <p>
                          Başqa məhsul adı, model, SKU, barkod, kassa qəbzi və
                          ya hesab faktura yoxlayın — və ya axtarışı təmizləyin.
                        </p>
                      </div>
                    ) : (
                      <div className="pos-return-sale-grid" role="list">
                        {filteredReturnableDayPosSales.map((sale) => {
                          const selected = recentSale?.id === sale.id;
                          const productPreview =
                            formatPosReturnSaleProductPreview(sale.items);
                          const skuPreview = formatPosReturnSaleSkuPreview(
                            sale.items,
                          );
                          const documentRef =
                            sale.externalTerminalReference?.trim() ?? "";
                          const documentLabel =
                            posReturnSaleDocumentLabel(sale.channel);
                          const channelKey = String(sale.channel ?? "")
                            .trim()
                            .toLowerCase();
                          const channelLabel = posChannelLabel(sale.channel);
                          const soldAt = formatAzDateTime(
                            sale.createdAt,
                            sale.createdAt,
                          );
                          const qtyLabel =
                            sale.returnableQuantity > 0
                              ? `${sale.returnableQuantity} ədəd`
                              : "";
                          const ariaParts = [
                            productPreview !== ""
                              ? productPreview
                              : "Satış",
                            formatMoney(sale.grandTotal),
                            channelLabel,
                            documentRef !== ""
                              ? `${documentLabel} ${documentRef}`
                              : "",
                            soldAt,
                            qtyLabel,
                          ].filter(Boolean);
                          return (
                            <button
                              key={sale.id}
                              type="button"
                              role="listitem"
                              className={[
                                "bo-btn-reset",
                                "pos-return-sale-card",
                                selected
                                  ? "pos-return-sale-card--selected"
                                  : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              aria-pressed={selected}
                              aria-label={ariaParts.join(", ")}
                              onClick={() => {
                                clearRouteAlerts();
                                void loadSaleForReturn(sale.id).catch(
                                  (caught) =>
                                    showRouteError(
                                      caught instanceof Error
                                        ? caught.message
                                        : "Əməliyyat alınmadı",
                                      "pos",
                                    ),
                                );
                              }}
                            >
                              <span
                                className="pos-return-sale-card__select"
                                aria-hidden="true"
                              >
                                {selected ? (
                                  <svg
                                    className="pos-return-sale-card__select-icon"
                                    viewBox="0 0 20 20"
                                    fill="none"
                                  >
                                    <path
                                      d="M5 10.5 8.2 13.5 15 6.5"
                                      stroke="currentColor"
                                      strokeWidth="2.2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                ) : null}
                              </span>

                              <span className="pos-return-sale-card__main">
                                {productPreview !== "" ? (
                                  <span
                                    className="pos-return-sale-card__title"
                                    title={productPreview}
                                  >
                                    {productPreview}
                                  </span>
                                ) : (
                                  <span className="pos-return-sale-card__title pos-return-sale-card__title--muted">
                                    Məhsul adı yoxdur
                                  </span>
                                )}

                                {documentRef !== "" ? (
                                  <span
                                    className="pos-return-sale-card__doc"
                                    title={`${documentLabel}: ${documentRef}`}
                                  >
                                    <span className="pos-return-sale-card__doc-label">
                                      {documentLabel}
                                    </span>
                                    <code className="pos-return-sale-card__doc-value">
                                      {documentRef}
                                    </code>
                                  </span>
                                ) : null}

                                <span className="pos-return-sale-card__meta">
                                  <span className="pos-return-sale-card__time">
                                    {soldAt}
                                  </span>
                                  {qtyLabel !== "" ? (
                                    <span className="pos-return-sale-card__qty">
                                      {qtyLabel}
                                    </span>
                                  ) : null}
                                  {skuPreview !== "" ? (
                                    <span
                                      className="pos-return-sale-card__sku"
                                      title={skuPreview}
                                    >
                                      {skuPreview}
                                    </span>
                                  ) : null}
                                </span>
                              </span>

                              <span className="pos-return-sale-card__aside">
                                <strong className="pos-return-sale-card__total">
                                  {formatMoney(sale.grandTotal)}
                                </strong>
                                <span
                                  className={[
                                    "pos-return-sale-card__channel",
                                    channelKey !== ""
                                      ? `pos-return-sale-card__channel--${channelKey}`
                                      : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                >
                                  {channelLabel}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </article>

              <article
                className={[
                  "operation-card operation-card--no-hover pos-pane pos-pane--cart",
                  recentReturn !== null ? "pos-pane--cart-success" : "",
                  recentSale !== null && recentReturn === null
                    ? "pos-pane--cart-return-active"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <header className="pos-cart-header">
                  {recentSale !== null && recentReturn === null ? (
                    <button
                      type="button"
                      className="bo-btn-reset pos-return-change-sale"
                      aria-label="Satış siyahısına qayıt"
                      onClick={() => clearReturnDraftForSaleChange()}
                    >
                      <IconChevronLeft
                        className="bo-icon--sm pos-return-change-sale__icon"
                        aria-hidden="true"
                      />
                      <span className="pos-return-change-sale__label">
                        Satışlar
                      </span>
                    </button>
                  ) : null}
                  <h3 className="pos-cart-header__title">
                    {recentReturn !== null ? (
                      "Qaytarma tamamlandı"
                    ) : recentSale === null ? (
                      "Qaytarma səbəti"
                    ) : (
                      <>
                        <span className="pos-cart-header__label">Qaytarma</span>
                        <span className="pos-cart-header__label-long">
                          Qaytarılacaq məhsul sayı:{" "}
                        </span>
                        <span className="pos-cart-header__count">
                          {returnSelectedQty}
                        </span>
                      </>
                    )}
                  </h3>
                </header>

                <div className="pos-cart-body">
                  {recentReturn !== null ? (
                    <div
                      className="pos-return-success"
                      role="status"
                      aria-live="polite"
                    >
                      <div className="pos-return-success__hero">
                        <div
                          className="pos-return-success__mark"
                          aria-hidden="true"
                        >
                          <span className="pos-return-success__ring" />
                          <IconCheck className="pos-return-success__check" />
                        </div>
                        <strong className="pos-return-success__title">
                          Qaytarılma uğurlu oldu
                        </strong>
                        <p className="pos-return-success__amount">
                          {formatMoney(recentReturn.refundAmount)}
                        </p>
                        <p className="pos-return-success__lead">
                          {recentReturn.restockedToInventory
                            ? "Kassada qeydə alındı · stoka geri əlavə olundu"
                            : "Kassada qeydə alındı"}
                        </p>
                      </div>

                      <ul className="pos-return-success__meta">
                        <li>
                          <span>Qaytarma</span>
                          <code>{recentReturn.returnNumber}</code>
                        </li>
                      </ul>
                    </div>
                  ) : recentSale === null ? (
                    <div className="pos-empty pos-empty--soft pos-cart-empty">
                      <strong>Satış seçilməyib</strong>
                      <p>
                        Siyahıdan satışı seçin — qaytarma sətirləri buraya
                        düşəcək.
                      </p>
                    </div>
                  ) : (
                    <>
                      {(() => {
                        const channelKey = String(recentSale.channel ?? "")
                          .trim()
                          .toLowerCase();
                        const channelLabel = posChannelLabel(recentSale.channel);
                        const paymentLabel = reportPaymentLabel(
                          recentSale.paymentMethod,
                        );
                        const soldAt = formatAzDateTime(
                          recentSale.createdAt,
                          recentSale.createdAt,
                        );
                        const externalRef =
                          recentSale.externalTerminalReference?.trim() ?? "";
                        const receiptRef =
                          recentSale.receiptNumber?.trim() ?? "";
                        const documentRef = externalRef || receiptRef;
                        const documentLabel =
                          externalRef !== ""
                            ? posReturnSaleDocumentLabel(recentSale.channel)
                            : "Kassa qəbzi";
                        const returnableItems = recentSale.items.filter(
                          (item) =>
                            (item.returnableQuantity ?? item.quantity) > 0,
                        );
                        const fullyReturnedItems = recentSale.items.filter(
                          (item) =>
                            (item.returnableQuantity ?? item.quantity) <= 0,
                        );
                        return (
                          <>
                            <section
                              className="pos-return-context"
                              aria-label="Seçilmiş satış"
                            >
                              <div className="pos-return-context__hero">
                                <div className="pos-return-context__top">
                                  <span
                                    className={[
                                      "pos-return-sale-card__channel",
                                      channelKey !== ""
                                        ? `pos-return-sale-card__channel--${channelKey}`
                                        : "",
                                    ]
                                      .filter(Boolean)
                                      .join(" ")}
                                  >
                                    {channelLabel}
                                  </span>
                                  {paymentLabel !== channelLabel ? (
                                    <span className="pos-return-context__pay">
                                      Ödəniş: {paymentLabel}
                                    </span>
                                  ) : null}
                                </div>

                                <div className="pos-return-context__amount">
                                  <span className="pos-return-context__amount-label">
                                    Satış məbləği
                                  </span>
                                  <strong className="pos-return-context__amount-value">
                                    {formatMoney(recentSale.grandTotal)}
                                  </strong>
                                </div>
                              </div>

                              <details className="pos-return-context__details">
                                <summary className="pos-return-context__summary">
                                  <span className="pos-return-context__summary-label">
                                    Satış detalları
                                  </span>
                                  <span
                                    className="pos-return-context__summary-preview"
                                    title={recentSale.saleNumber}
                                  >
                                    {recentSale.saleNumber}
                                  </span>
                                </summary>
                                <dl className="pos-return-context__meta">
                                  <div>
                                    <dt>Satış №</dt>
                                    <dd>
                                      <code>{recentSale.saleNumber}</code>
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>Tarix</dt>
                                    <dd>{soldAt}</dd>
                                  </div>
                                  {documentRef !== "" ? (
                                    <div>
                                      <dt>{documentLabel}</dt>
                                      <dd>
                                        <code>{documentRef}</code>
                                      </dd>
                                    </div>
                                  ) : null}
                                </dl>
                              </details>
                            </section>

                            <section
                              className="pos-return-form"
                              aria-label="Qaytarma məlumatları"
                            >
                              <label className="pos-cart-ref pos-return-form__field">
                                <span className="pos-return-form__label-row">
                                  <span>Qaytarma səbəbi</span>
                                  <span className="pos-return-form__hint">
                                    min. 3 simvol
                                  </span>
                                </span>
                                <textarea
                                  value={returnReason}
                                  onChange={(event) =>
                                    setReturnReason(event.target.value)
                                  }
                                  minLength={3}
                                  rows={2}
                                  placeholder="Zədəli məhsul, imtina…"
                                />
                              </label>

                              {recentSale.paymentMethod !== "CASH" ? (
                                <label className="pos-cart-ref pos-return-form__field">
                                  <span className="pos-return-form__label-row">
                                    <span>Terminal / xarici referans</span>
                                    <span className="pos-return-form__hint">
                                      məcburi
                                    </span>
                                  </span>
                                  <input
                                    value={returnTerminalReference}
                                    onChange={(event) =>
                                      setReturnTerminalReference(
                                        event.target.value,
                                      )
                                    }
                                    minLength={2}
                                    placeholder="Məs. terminal qəbz №"
                                    required
                                  />
                                </label>
                              ) : null}

                              <label className="pos-cart-ref pos-return-form__field pos-return-form__field--checkbox">
                                <span className="pos-return-form__label-row">
                                  <span>Stoka qaytar</span>
                                  <span className="pos-return-form__hint">
                                    zədələnmiş üçün söndürün
                                  </span>
                                </span>
                                <input
                                  type="checkbox"
                                  checked={returnRestockToInventory}
                                  onChange={(event) =>
                                    setReturnRestockToInventory(
                                      event.target.checked,
                                    )
                                  }
                                  disabled={returnSubmitting}
                                />
                              </label>
                            </section>

                            <section
                              className="pos-return-lines"
                              aria-label="Qaytarılacaq məhsullar"
                            >
                              <div className="pos-return-lines__head">
                                <h4 className="pos-return-lines__title">
                                  Məhsullar
                                </h4>
                                {returnHasReturnableLines ? (
                                  <span className="pos-return-lines__count">
                                    {returnableItems.length} qaytarıla bilər
                                  </span>
                                ) : null}
                              </div>

                              {!returnHasReturnableLines ? (
                                <div className="pos-empty pos-empty--soft">
                                  <strong>Bu satış artıq tam qaytarılıb</strong>
                                  <p>
                                    Başqa satış seçin və ya növbəti qaytarmaya
                                    keçin.
                                  </p>
                                </div>
                              ) : (
                                <div className="pos-lines pos-lines--return">
                                  {returnableItems.map((item) => {
                                    const returnable =
                                      item.returnableQuantity ?? item.quantity;
                                    const qty = Number(
                                      returnQuantities[item.id] ?? 0,
                                    );
                                    const safeQty =
                                      Number.isFinite(qty) && qty > 0
                                        ? Math.min(qty, returnable)
                                        : 0;
                                    const lineRefund =
                                      Number(item.unitPrice) * safeQty;
                                    const alreadyReturned =
                                      item.returnedQuantity ?? 0;
                                    const selected =
                                      safeQty > 0
                                        ? "pos-line--return-selected"
                                        : "";
                                    return (
                                      <div
                                        key={item.id}
                                        className={[
                                          "pos-line",
                                          "pos-line--return",
                                          selected,
                                        ]
                                          .filter(Boolean)
                                          .join(" ")}
                                      >
                                        <div className="pos-line__info">
                                          <strong className="pos-line__title">
                                            {item.productName}
                                          </strong>
                                          <p className="pos-line__meta">
                                            <span className="pos-line__sku">
                                              {item.sku}
                                            </span>
                                            {item.variantName !==
                                            item.productName
                                              ? ` · ${item.variantName}`
                                              : ""}
                                          </p>
                                          <div
                                            className="pos-line__stats"
                                            aria-label="Miqdar məlumatı"
                                          >
                                            <span className="pos-line__stat">
                                              <span className="pos-line__stat-label">
                                                Qiymət
                                              </span>
                                              <span className="pos-line__stat-value">
                                                {formatMoney(item.unitPrice)}
                                              </span>
                                            </span>
                                            <span className="pos-line__stat">
                                              <span className="pos-line__stat-label">
                                                Satılıb
                                              </span>
                                              <span className="pos-line__stat-value">
                                                {item.quantity}
                                              </span>
                                            </span>
                                            {alreadyReturned > 0 ? (
                                              <span className="pos-line__stat pos-line__stat--muted">
                                                <span className="pos-line__stat-label">
                                                  Qaytarılıb
                                                </span>
                                                <span className="pos-line__stat-value">
                                                  {alreadyReturned}
                                                </span>
                                              </span>
                                            ) : null}
                                            <span className="pos-line__stat pos-line__stat--remain">
                                              <span className="pos-line__stat-label">
                                                Qalan
                                              </span>
                                              <span className="pos-line__stat-value">
                                                {returnable}
                                              </span>
                                            </span>
                                          </div>
                                        </div>
                                        <div className="pos-line__actions">
                                          <div
                                            className="pos-qty"
                                            role="group"
                                            aria-label={`${item.productName} qaytarma miqdarı`}
                                          >
                                            <button
                                              type="button"
                                              className="bo-btn-reset pos-qty__btn"
                                              aria-label="Azalt"
                                              disabled={
                                                safeQty <= 0 || returnSubmitting
                                              }
                                              onClick={() =>
                                                setReturnQuantities(
                                                  (current) => ({
                                                    ...current,
                                                    [item.id]: String(
                                                      Math.max(0, safeQty - 1),
                                                    ),
                                                  }),
                                                )
                                              }
                                            >
                                              <IconMinus
                                                className="bo-icon--sm"
                                                aria-hidden="true"
                                              />
                                            </button>
                                            <input
                                              className="pos-qty__input"
                                              type="number"
                                              min={0}
                                              max={returnable}
                                              value={
                                                returnQuantities[item.id] ?? "0"
                                              }
                                              aria-label="Qaytarma miqdarı"
                                              disabled={returnSubmitting}
                                              onChange={(event) =>
                                                setReturnQuantities(
                                                  (current) => ({
                                                    ...current,
                                                    [item.id]: String(
                                                      Math.max(
                                                        0,
                                                        Math.min(
                                                          Number(
                                                            event.target.value,
                                                          ) || 0,
                                                          returnable,
                                                        ),
                                                      ),
                                                    ),
                                                  }),
                                                )
                                              }
                                            />
                                            <button
                                              type="button"
                                              className="bo-btn-reset pos-qty__btn"
                                              aria-label="Artır"
                                              disabled={
                                                safeQty >= returnable ||
                                                returnSubmitting
                                              }
                                              onClick={() =>
                                                setReturnQuantities(
                                                  (current) => ({
                                                    ...current,
                                                    [item.id]: String(
                                                      Math.min(
                                                        returnable,
                                                        safeQty + 1,
                                                      ),
                                                    ),
                                                  }),
                                                )
                                              }
                                            >
                                              <IconPlus
                                                className="bo-icon--sm"
                                                aria-hidden="true"
                                              />
                                            </button>
                                          </div>
                                          <strong
                                            className={[
                                              "pos-line__total",
                                              safeQty > 0
                                                ? "pos-line__total--active"
                                                : "pos-line__total--idle",
                                            ].join(" ")}
                                          >
                                            {formatMoney(lineRefund)}
                                          </strong>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {fullyReturnedItems.length > 0 ? (
                                <details className="pos-return-done">
                                  <summary className="pos-return-done__summary">
                                    Tam qaytarılmış ({fullyReturnedItems.length}
                                    )
                                  </summary>
                                  <ul className="pos-return-done__list">
                                    {fullyReturnedItems.map((item) => (
                                      <li key={item.id}>
                                        <span className="pos-return-done__name">
                                          {item.productName}
                                        </span>
                                        <span className="pos-return-done__meta">
                                          <span className="pos-line__sku">
                                            {item.sku}
                                          </span>
                                          · satılıb {item.quantity}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </details>
                              ) : null}
                            </section>
                          </>
                        );
                      })()}
                    </>
                  )}
                </div>

                <footer className="pos-cart-footer">
                  {recentReturn !== null ? (
                    <button
                      type="button"
                      className="pos-cart-checkout pos-cart-checkout--success"
                      onClick={() => clearReturnSuccess()}
                    >
                      Növbəti qaytarma
                    </button>
                  ) : (
                    <>
                      <div className="pos-cart-total">
                        <span>Qaytarılacaq</span>
                        <strong>{formatMoney(returnRefundPreview)}</strong>
                      </div>
                      <button
                        type="button"
                        className="pos-cart-checkout"
                        disabled={
                          recentSale === null ||
                          returnSubmitting ||
                          !returnHasReturnableLines ||
                          returnSelectedQty === 0 ||
                          returnReason.trim().length < 3 ||
                          (recentSale.paymentMethod !== "CASH" &&
                            returnTerminalReference.trim().length < 2)
                        }
                        onClick={() =>
                          void run(
                            () => createRecentSaleReturn(),
                            "POS qaytarma/refund tamamlandı",
                          )
                        }
                      >
                        {returnSubmitting ? "Qaytarılır…" : "Qaytarma yarat"}
                      </button>
                    </>
                  )}
                </footer>
              </article>
            </div>
          )}

        </section>
        </div>
      )}
      </BoRoutePanel>

      <BoRoutePanel route="customers">
        <CustomersPanel
          customers={customers}
          registeredCount={registeredCustomerCount}
          canCustomersRead={canCustomersRead}
        />
      </BoRoutePanel>

      <BoRoutePanel route="customers-unregistered">
        <UnregisteredCustomersPanel
          customers={unregisteredCustomers}
          unregisteredCount={unregisteredCustomerCount}
          canCustomersRead={canCustomersRead}
        />
      </BoRoutePanel>

      <BoRoutePanel route="inquiries">
        <InquiriesPanel
          inquiries={inquiries}
          counts={inquiryCounts}
          lockedType="PREORDER"
          canInquiriesRead={canInquiriesRead}
          canInquiriesWrite={canInquiriesWrite}
          onUpdateStatus={(id, status) =>
            run(
              () =>
                api<StaffAvailabilityRequestSummaryContract>(
                  `/product-availability-requests/${id}`,
                  {
                    method: "PATCH",
                    body: JSON.stringify({ status }),
                  },
                ),
              status === "FULFILLED"
                ? "Sorğu bağlandı"
                : "Sorğu ləğv edildi",
            ).then(() => undefined)
          }
        />
      </BoRoutePanel>

      <BoRoutePanel route="stock-alerts">
        <InquiriesPanel
          inquiries={inquiries}
          counts={inquiryCounts}
          lockedType="STOCK_ALERT"
          canInquiriesRead={canInquiriesRead}
          canInquiriesWrite={canInquiriesWrite}
          onUpdateStatus={(id, status) =>
            run(
              () =>
                api<StaffAvailabilityRequestSummaryContract>(
                  `/product-availability-requests/${id}`,
                  {
                    method: "PATCH",
                    body: JSON.stringify({ status }),
                  },
                ),
              status === "FULFILLED"
                ? "Sorğu bağlandı"
                : "Sorğu ləğv edildi",
            ).then(() => undefined)
          }
        />
      </BoRoutePanel>

      <BoRoutePanel route="credit-applications">
        <CreditApplicationsPanel
          applications={creditApplications}
          canManage={canCreditApplications}
          onUpdateStatus={(id, status) =>
            run(
              () =>
                api<StaffCreditApplicationSummaryContract>(
                  `/credit-applications/${id}`,
                  {
                    method: "PATCH",
                    body: JSON.stringify({ status }),
                  },
                ),
              "Kredit müraciəti yeniləndi",
              { refresh: true },
            ).then(() => undefined)
          }
        />
      </BoRoutePanel>

      <BoRoutePanel route="support-messages">
        <SupportMessagesPanel
          messages={supportMessages}
          canManage={canSupportMessages}
          onUpdateStatus={(id, status) =>
            run(
              () =>
                api<StaffSupportMessageSummaryContract>(
                  `/support-messages/${id}`,
                  {
                    method: "PATCH",
                    body: JSON.stringify({ status }),
                  },
                ),
              "Mesaj statusu yeniləndi",
            ).then(() => undefined)
          }
          onLoadThread={(id) =>
            api<StaffSupportThreadDetailContract>(`/support-messages/${id}`)
          }
          onReply={(id, body) =>
            api<SupportChatMessageContract>(`/support-messages/${id}/messages`, {
              method: "POST",
              body: JSON.stringify({ body }),
            })
          }
          onSubscribeInbox={(handler) =>
            subscribeSupportChatSse("/support-messages/events", handler)
          }
          onSubscribeThread={(id, handler) =>
            subscribeSupportChatSse(`/support-messages/${id}/events`, handler)
          }
        />
      </BoRoutePanel>

      <BoRoutePanel route="catalog-reviews">
        <ProductReviewsPanel
          reviews={productReviews}
          canModerate={canCatalog}
          onSetPublished={(id, published) =>
            run(
              () =>
                api<StaffProductReviewSummaryContract>(
                  `/product-reviews/${id}`,
                  {
                    method: "PATCH",
                    body: JSON.stringify({ published }),
                  },
                ),
              published ? "Rəy dərc olundu" : "Rəy gizlədildi",
              { refresh: true },
            ).then(() => undefined)
          }
        />
      </BoRoutePanel>

      <BoRoutePanel route="administration">
        <AdministrationPanel
          staffUsers={staffUsers}
          roles={staffRoles}
          currentStaffId={staff.id}
          currentStaffMfaEnabled={staff.mfaEnabled === true}
          canManageStaff={canManageStaff}
          run={run}
          onCreateStaff={(payload) =>
            api("/staff/users", {
              method: "POST",
              body: JSON.stringify(payload),
            })
          }
          onUpdateStaff={(id, payload) =>
            api(`/staff/users/${id}`, {
              method: "PATCH",
              body: JSON.stringify(payload),
            })
          }
          onMfaSetup={() =>
            api<{ secret: string; otpauthUrl: string }>(
              "/staff/auth/mfa/setup",
              { method: "POST" },
            )
          }
          onMfaEnable={(code) =>
            api<{ enabled: true; recoveryCodes: string[] }>(
              "/staff/auth/mfa/enable",
              {
                method: "POST",
                body: JSON.stringify({ code }),
              },
            )
          }
          onMfaDisable={(payload) =>
            api<{ enabled: false }>("/staff/auth/mfa/disable", {
              method: "POST",
              body: JSON.stringify(payload),
            })
          }
          onMfaStatusRefresh={async () => {
            const principal = await api<Staff>("/staff/auth/me");
            setStaff(principal);
          }}
        />
      </BoRoutePanel>
    </main>
    {confirmDialog}
    </BoRouteAlertsProvider>
  );
}
