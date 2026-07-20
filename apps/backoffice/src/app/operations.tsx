"use client";

import { BrandLogo, useConfirmDialog } from "@itmarket/ui";
import { usePathname, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getBoNavDisplay,
  shouldShowBoDashboardHeader,
  getBoRouteIdFromPathname,
  type BoRouteId,
} from "./components/bo-nav-config";
import {
  BoRouteAlertsProvider,
  BoRoutePanel,
} from "./components/bo-route-panel";
import { AdministrationPanel } from "./components/administration-panel";
import type {
  RoleDefinition,
  StaffUserRow,
} from "./components/administration-panel";
import { CatalogCategoriesPanel } from "./components/catalog-categories-panel";
import { CatalogBrandsPanel } from "./components/catalog-brands-panel";
import { CatalogProductsPanel } from "./components/catalog-products-panel";
import { CatalogSubcategoriesPanel } from "./components/catalog-subcategories-panel";
import { useBoStaff } from "./components/bo-staff-context";
import { resolveApiBaseUrl } from "../lib/resolve-api-base-url";
import { uploadCatalogProductImageFile } from "../lib/upload-catalog-product-image";
import {
  buildCreateCatalogVariantPayload,
  buildUpdateCatalogVariantMetadataPayload,
  buildUpdateCatalogVariantPricePayload,
} from "../lib/product-variant-form";

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
const money = new Intl.NumberFormat("az-AZ", {
  style: "currency",
  currency: "AZN",
});

type Staff = {
  id: string;
  displayName: string;
  role: string;
  permissions: string[];
};

type Brand = {
  id: string;
  name: string;
  slug?: string;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
};
type Category = {
  id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
  sortOrder?: number;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
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
  categoryId?: string;
  category?: {
    id: string;
    name: string;
    status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  };
  brand: { id: string; name: string } | null;
  requiredSpecs?: unknown;
  variants: {
    id: string;
    sku: string;
    barcode: string | null;
    name: string;
    price: string;
    previousPrice: string | null;
    attributes?: unknown;
    status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
    media?: ProductMedia | null;
  }[];
  media: ProductMedia[];
};
type Location = { id: string; code: string; name: string };
type InventoryBalance = {
  id: string;
  onHand: number;
  reserved: number;
  updatedAt: string;
  variant: { sku: string; barcode: string | null; name: string };
  location: { code: string; name: string };
};
type InventoryMovement = {
  id: string;
  type: string;
  quantityDelta: number;
  sourceType: string;
  sourceDocumentId: string;
  reason: string;
  transferGroupId: string | null;
  createdAt: string;
};
type AuditLogEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorType: string;
  actorId: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
};
type Reconciliation = {
  healthy: boolean;
  mismatches: {
    variant_id: string;
    location_id: string;
    balance_on_hand: number;
    ledger_on_hand: string;
  }[];
};
type CashRegister = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  location: { id: string; code: string; name: string; active: boolean };
};
type OrderSummary = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  fulfillmentType: "DELIVERY" | "PICKUP";
  recipientName: string | null;
  itemCount: number;
  grandTotal: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
};
type OrderDetails = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  fulfillmentType: "DELIVERY" | "PICKUP";
  guestPhone: string | null;
  grandTotal: string;
  subtotal: string;
  deliveryFee: string;
  currency: string;
  payment: {
    id: string;
    provider: string;
    method: "CASH" | "CARD" | "INSTALLMENT";
    status: string;
    amount: string;
    currency: string;
    providerPaymentId: string | null;
  } | null;
  address: {
    recipientName: string;
    phone: string;
    administrativeArea: string | null;
    addressLine: string;
    notes: string | null;
  } | null;
  items: {
    id: string;
    sku: string;
    productName: string;
    variantName: string;
    quantity: number;
    lineTotal: string;
    currency: string;
  }[];
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
  createdAt: string;
};
type DeliveryZoneAdmin = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  fee: string;
  freeDeliveryMinimum: string | null;
  estimatedMinDays: number;
  estimatedMaxDays: number;
  coveredAdministrativeAreas: string[];
};
type PickupLocationAdmin = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  addressLine: string;
  contactLabel: string | null;
  workingHours: Record<string, unknown>;
  location: {
    id: string;
    code: string;
    name: string;
    type: string;
    active: boolean;
  };
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
type SalesReport = {
  range: { from: string; to: string; timeZone: string };
  summary: {
    transactionCount: number;
    quantity: number;
    grossSales: string;
    discountTotal: string;
    deliveryFeeTotal: string;
    taxTotal: string;
    refundTotal: string;
    netSales: string;
  };
  byChannel: Array<{
    channel: string;
    transactionCount: number;
    netSales: string;
  }>;
  byPaymentMethod: Array<{
    paymentMethod: string;
    transactionCount: number;
    netSales: string;
  }>;
  byProduct: Array<{
    variantId: string;
    sku: string;
    productName: string;
    variantName: string;
    quantity: number;
    netSales: string;
  }>;
  notes: string[];
};
type LowStockReport = {
  threshold: number;
  items: Array<{
    variantId: string;
    sku: string;
    productName: string;
    variantName: string;
    locationCode: string;
    available: number;
  }>;
};
type ReportExportItem = {
  id: string;
  reportType: "SALES" | "LOW_STOCK" | "INVENTORY_MOVEMENTS";
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  fileName: string;
  rowCount: number | null;
  errorMessage: string | null;
  createdAt: string;
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

function formatMoney(value: string | number) {
  return money.format(Number(value));
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("az-AZ");
}

function formatAuditPayload(value: unknown) {
  if (value === null || value === undefined) {
    return "Yoxdur";
  }
  const rendered =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return rendered.length > 420 ? `${rendered.slice(0, 420)}…` : rendered;
}

function formatFulfillmentPayload(value: unknown) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const entries = Object.entries(value).filter(([, entryValue]) => {
    if (entryValue === null || entryValue === undefined) {
      return false;
    }
    return !(typeof entryValue === "string" && entryValue.trim() === "");
  });
  if (entries.length === 0) {
    return null;
  }
  return entries
    .slice(0, 3)
    .map(([key, entryValue]) =>
      `${key}: ${
        typeof entryValue === "string"
          ? entryValue
          : JSON.stringify(entryValue)
      }`,
    )
    .join(" · ");
}

function bakuBusinessDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baku",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function Operations({ children }: { children?: React.ReactNode }) {
  const { setStaff: setBoStaff, registerLogout } = useBoStaff();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeRoute = getBoRouteIdFromPathname(pathname);
  const activeNav = getBoNavDisplay(pathname, searchParams.get("create"));
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
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [reconciliation, setReconciliation] = useState<Reconciliation | null>(
    null,
  );
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZoneAdmin[]>([]);
  const [pickupLocations, setPickupLocations] = useState<PickupLocationAdmin[]>(
    [],
  );
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [reportRange, setReportRange] = useState(() => {
    const today = bakuBusinessDate();
    return { from: today, to: today };
  });
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [lowStockReport, setLowStockReport] = useState<LowStockReport | null>(
    null,
  );
  const [reportExports, setReportExports] = useState<ReportExportItem[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUserRow[]>([]);
  const [staffRoles, setStaffRoles] = useState<RoleDefinition[]>([]);
  const [posItems, setPosItems] = useState<PosCartItem[]>([]);
  const [recentSale, setRecentSale] = useState<PosSale | null>(null);
  const [recentReturn, setRecentReturn] = useState<PosReturn | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "CASH" | "CARD" | "INSTALLMENT"
  >("CASH");
  const [terminalReference, setTerminalReference] = useState("");
  const [installmentBankName, setInstallmentBankName] = useState("");
  const [installmentMonths, setInstallmentMonths] = useState("6");
  const [returnReason, setReturnReason] = useState("Customer return");
  const [returnTerminalReference, setReturnTerminalReference] = useState("");
  const [returnQuantities, setReturnQuantities] = useState<Record<string, string>>(
    {},
  );
  const [orderReason, setOrderReason] = useState("Staff workflow update");
  const [orderRefundReason, setOrderRefundReason] = useState(
    "Customer refund approved",
  );
  const [orderRefundAmount, setOrderRefundAmount] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [alertRoute, setAlertRoute] = useState<BoRouteId | null>(null);
  const routeSuccessAlertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const scannerBuffer = useRef("");
  const lastScanAt = useRef(0);
  const selectedOrderIdRef = useRef<string | null>(null);
  const logoutActionRef = useRef<() => void>(() => {});
  const { requestConfirm, confirmDialog } = useConfirmDialog();

  const canCatalogRead = staff?.permissions.includes("catalog.read") ?? false;
  const canCatalog = staff?.permissions.includes("catalog.write") ?? false;
  const canPrice = staff?.permissions.includes("pricing.price-change") ?? false;
  const canInventoryRead =
    staff?.permissions.includes("inventory.read") ?? false;
  const canReceipt = staff?.permissions.includes("inventory.receipt") ?? false;
  const canAdjust =
    staff?.permissions.includes("inventory.adjustment") ?? false;
  const canTransfer =
    staff?.permissions.includes("inventory.transfer") ?? false;
  const canAudit = staff?.permissions.includes("audit.read") ?? false;
  const canRegisterManage =
    staff?.permissions.includes("cash-register.manage") ?? false;
  const canOpenShift = staff?.permissions.includes("cash-shift.open") ?? false;
  const canCloseShift =
    staff?.permissions.includes("cash-shift.close") ?? false;
  const canReportsRead = staff?.permissions.includes("reports.read") ?? false;
  const canCashMovement =
    staff?.permissions.includes("cash-shift.cash-movement") ?? false;
  const canApproveShift =
    staff?.permissions.includes("cash-shift.approve-discrepancy") ?? false;
  const canPos = staff?.permissions.includes("pos.sale") ?? false;
  const canRefund = staff?.permissions.includes("sales.refund") ?? false;
  const canOrdersRead = staff?.permissions.includes("orders.read") ?? false;
  const canFulfill = staff?.permissions.includes("fulfillment.write") ?? false;
  const canManageStaff = staff?.permissions.includes("staff.manage") ?? false;

  const defaultCatalogStockLocationId = useMemo(
    () => locations[0]?.id ?? null,
    [locations],
  );

  useEffect(() => {
    selectedOrderIdRef.current = selectedOrder?.id ?? null;
  }, [selectedOrder]);

  const refresh = useCallback(async (currentStaff: Staff | null) => {
    const permissions = currentStaff?.permissions ?? [];
    const allowCatalog = permissions.includes("catalog.read");
    const allowInventory = permissions.includes("inventory.read");
    const allowAudit = permissions.includes("audit.read");
    const allowReports = permissions.includes("reports.read");
    const allowReconciliation = permissions.includes("inventory.adjustment");
    const allowRegisters =
      permissions.includes("cash-register.manage") ||
      permissions.includes("cash-shift.open");
    const allowShift =
      permissions.includes("cash-shift.open") ||
      permissions.includes("pos.sale") ||
      permissions.includes("cash-shift.close");
    const allowOrders = permissions.includes("orders.read");
    const allowFulfillmentConfig =
      allowOrders || permissions.includes("fulfillment.write");
    const allowStaffManage = permissions.includes("staff.manage");
    const [
      brandPage,
      categoryPage,
      productPage,
      locationRows,
      balanceRows,
      movementRows,
      auditRows,
      reconciliationResult,
      registerRows,
      shiftRow,
      orderPage,
      deliveryZoneRows,
      pickupLocationRows,
      salesSummary,
      lowStockSummary,
      exportPage,
      staffUserRows,
      staffRoleRows,
    ] = await Promise.all([
      currentStaff !== null && allowCatalog
        ? api<{ items: Brand[] }>("/catalog/brands?limit=100").then(({ items }) => ({
            items: items.filter((brand) => brand.status !== "ARCHIVED"),
          }))
        : Promise.resolve({ items: [] }),
      currentStaff !== null && allowCatalog
        ? api<{ items: Category[] }>(
            "/catalog/categories?limit=100&sort=sortOrder&direction=asc",
          ).then(({ items }) => ({
            items: items.filter((category) => category.status !== "ARCHIVED"),
          }))
        : Promise.resolve({ items: [] }),
      currentStaff !== null && allowCatalog
        ? api<{ items: Product[] }>("/catalog/products?limit=100").then(
            ({ items }) => ({
              items: items.filter((product) => product.status !== "ARCHIVED"),
            }),
          )
        : Promise.resolve({ items: [] }),
      currentStaff !== null && allowInventory
        ? api<Location[]>("/inventory/locations")
        : Promise.resolve([]),
      currentStaff !== null && allowInventory
        ? api<InventoryBalance[]>("/inventory/balances?limit=12")
        : Promise.resolve([]),
      currentStaff !== null && allowInventory
        ? api<InventoryMovement[]>("/inventory/movements?limit=12")
        : Promise.resolve([]),
      currentStaff !== null && allowAudit
        ? api<AuditLogEntry[]>("/audit?limit=10")
        : Promise.resolve([]),
      currentStaff !== null && allowReconciliation
        ? api<Reconciliation>("/inventory/reconciliation")
        : Promise.resolve(null),
      currentStaff !== null && allowRegisters
        ? api<CashRegister[]>("/cash-register/registers")
        : Promise.resolve([]),
      currentStaff !== null && allowShift
        ? api<ActiveShift | null>("/cash-register/shifts/active")
        : Promise.resolve(null),
      currentStaff !== null && allowOrders
        ? api<{ items: OrderSummary[] }>("/orders?limit=12")
        : Promise.resolve({ items: [] }),
      currentStaff !== null && allowFulfillmentConfig
        ? api<DeliveryZoneAdmin[]>("/fulfillment/delivery-zones")
        : Promise.resolve([]),
      currentStaff !== null && allowFulfillmentConfig
        ? api<PickupLocationAdmin[]>("/fulfillment/pickup-locations")
        : Promise.resolve([]),
      currentStaff !== null && allowReports
        ? api<SalesReport>(
            `/reports/sales?from=${encodeURIComponent(reportRange.from)}&to=${encodeURIComponent(reportRange.to)}&top=5`,
          )
        : Promise.resolve(null),
      currentStaff !== null && allowReports
        ? api<LowStockReport>("/reports/inventory/low-stock?limit=8")
        : Promise.resolve(null),
      currentStaff !== null && allowReports
        ? api<{ items: ReportExportItem[] }>("/reports/exports?limit=8")
        : Promise.resolve({ items: [] }),
      currentStaff !== null && allowStaffManage
        ? api<StaffUserRow[]>("/staff/users")
        : Promise.resolve([]),
      currentStaff !== null && allowStaffManage
        ? api<RoleDefinition[]>("/staff/users/roles")
        : Promise.resolve([]),
    ]);
    setBrands(brandPage.items);
    setCategories(categoryPage.items);
    setProducts(productPage.items);
    setLocations(locationRows);
    setBalances(balanceRows);
    setMovements(movementRows);
    setAuditEntries(auditRows);
    setReconciliation(reconciliationResult);
    setRegisters(registerRows);
    setActiveShift(shiftRow);
    setOrders(orderPage.items);
    setDeliveryZones(deliveryZoneRows);
    setPickupLocations(pickupLocationRows);
    setSalesReport(salesSummary);
    setLowStockReport(lowStockSummary);
    setReportExports(exportPage.items);
    setStaffUsers(staffUserRows);
    setStaffRoles(staffRoleRows);
    if (
      currentStaff !== null &&
      allowOrders &&
      selectedOrderIdRef.current !== null
    ) {
      const latestOrder = await api<OrderDetails>(
        `/orders/${selectedOrderIdRef.current}`,
      ).catch(() => null);
      setSelectedOrder(latestOrder);
    }
    if (!allowOrders) {
      setSelectedOrder(null);
    }
    if (!allowFulfillmentConfig) {
      setDeliveryZones([]);
      setPickupLocations([]);
    }
    if (!allowReports) {
      setSalesReport(null);
      setLowStockReport(null);
      setReportExports([]);
    }
    if (!allowStaffManage) {
      setStaffUsers([]);
      setStaffRoles([]);
    }
  }, [reportRange.from, reportRange.to]);

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
    // Initial session restore only — report range changes refresh via explicit actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setBoStaff(
      staff
        ? { displayName: staff.displayName, role: staff.role }
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
    setMessage("");
    setError("");
    setAlertRoute(null);
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
      showRouteSuccess(success);
      return result;
    } catch (caught) {
      showRouteError(
        caught instanceof Error ? caught.message : "Əməliyyat alınmadı",
      );
      return null;
    }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const principal = await api<Staff>("/staff/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    }).catch((caught) => {
      setError(formatFetchError(caught));
      return null;
    });
    if (principal === null) return;
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

  async function addBarcode(barcode: string) {
    if (barcode.trim().length < 4) return;
    clearRouteAlerts();
    const lookup = await api<LookupResponse>(
      `/pos/lookup?barcode=${encodeURIComponent(barcode.trim())}`,
    );
    if (lookup.variant.available <= 0) {
      throw new Error("Barkod tapıldı, ancaq satış üçün stok mövcud deyil");
    }
    setPosItems((current) => {
      const existing = current.find(
        (item) => item.variantId === lookup.variant.id,
      );
      if (existing !== undefined) {
        return current.map((item) =>
          item.variantId === lookup.variant.id
            ? {
                ...item,
                quantity: Math.min(item.quantity + 1, lookup.variant.available),
                available: lookup.variant.available,
              }
            : item,
        );
      }
      return [
        ...current,
        {
          variantId: lookup.variant.id,
          productName: lookup.variant.productName,
          variantName: lookup.variant.name,
          sku: lookup.variant.sku,
          barcode: lookup.variant.barcode,
          unitPrice: lookup.variant.price,
          quantity: 1,
          available: lookup.variant.available,
          currency: lookup.variant.currency,
        },
      ];
    });
    setBarcodeInput("");
    showRouteSuccess(`Barkod qəbul olundu: ${lookup.variant.sku}`, "pos");
  }

  async function openOrder(id: string) {
    clearRouteAlerts();
    const detail = await api<OrderDetails>(`/orders/${id}`);
    setSelectedOrder(detail);
  }

  async function runOrderTransition(action: string, reason: string) {
    if (selectedOrder === null) return;
    const next = await run(
      () =>
        api<OrderDetails>(`/orders/${selectedOrder.id}/transitions`, {
          method: "POST",
          body: JSON.stringify({ action, reason }),
        }),
      "Sifariş statusu yeniləndi",
      {
        onSuccess: (result) => setSelectedOrder(result),
      },
    );
    if (next !== null) {
      await refresh(staff);
    }
  }

  async function runOrderRefund() {
    if (selectedOrder === null) return;
    const trimmedAmount = orderRefundAmount.trim();
    const refundScope =
      trimmedAmount === "" ? "full" : `partial-${trimmedAmount}`;
    const next = await run(
      () =>
        api<OrderDetails>(`/orders/${selectedOrder.id}/refunds`, {
          method: "POST",
          headers: {
            "Idempotency-Key": `order-refund-ui-${selectedOrder.id}-${refundScope}`,
          },
          body: JSON.stringify({
            reason: orderRefundReason,
            ...(trimmedAmount === "" ? {} : { amount: trimmedAmount }),
          }),
        }),
      "Online refund tamamlandı",
      {
        onSuccess: (result) => setSelectedOrder(result),
      },
    );
    if (next !== null) {
      setOrderRefundAmount("");
      await refresh(staff);
    }
  }

  async function createReportExport(
    reportType: "SALES" | "LOW_STOCK" | "INVENTORY_MOVEMENTS",
  ) {
    await run(
      () =>
        api<ReportExportItem>("/reports/exports", {
          method: "POST",
          body: JSON.stringify({
            reportType,
            ...(reportType === "SALES" ||
            reportType === "INVENTORY_MOVEMENTS"
              ? {
                  from: reportRange.from,
                  to: reportRange.to,
                }
              : {}),
            ...(reportType === "SALES" ? { top: 20 } : {}),
            ...(reportType === "LOW_STOCK" ? { limit: 250 } : {}),
            ...(reportType === "INVENTORY_MOVEMENTS" ? { limit: 1000 } : {}),
          }),
        }),
      "Report export növbəyə əlavə edildi",
    );
  }

  async function downloadReportExport(id: string, fileName: string) {
    await run(
      async () => {
        const response = await fetch(`${getApiBaseUrl()}/reports/exports/${id}/download`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) {
          const body = (await parseResponseJson<ApiError>(response).catch(
            () => ({} as ApiError),
          )) as ApiError;
          throw new Error(body.message ?? `Export yüklənmədi (${response.status})`);
        }
        const blob = await response.blob();
        const href = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = href;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(href);
      },
      "CSV export yükləndi",
      { refresh: false },
    );
  }

  function printReceipt(mode: "a4" | "thermal") {
    document.body.dataset.receiptPrint = mode;
    window.print();
    window.setTimeout(() => {
      delete document.body.dataset.receiptPrint;
    }, 0);
  }

  async function createRecentSaleReturn() {
    if (activeShift === null || recentSale === null) return;
    const items = recentSale.items
      .map((item) => ({
        saleItemId: item.id,
        quantity: Number(returnQuantities[item.id] ?? "0"),
      }))
      .filter((item) => Number.isSafeInteger(item.quantity) && item.quantity > 0);
    if (items.length === 0) {
      throw new Error("Qaytarma üçün ən azı bir sətir seçin");
    }
    const result = await api<PosReturn>("/pos/returns", {
      method: "POST",
      headers: {
        "Idempotency-Key": `pos-return-ui-${Date.now()}`,
      },
      body: JSON.stringify({
        shiftId: activeShift.id,
        saleId: recentSale.id,
        reason: returnReason,
        restockToInventory: true,
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
    return result;
  }

  useEffect(() => {
    if (!canPos || activeShift?.status !== "OPEN") return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "Enter" && scannerBuffer.current.length >= 4) {
        event.preventDefault();
        const buffered = scannerBuffer.current;
        scannerBuffer.current = "";
        lastScanAt.current = 0;
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
  }, [canPos, activeShift?.status]);

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
    return (
      <main id="staff-content" className="auth-shell" tabIndex={-1}>
        <section className="login-panel">
          <header className="login-panel__header">
            <BrandLogo className="login-panel__logo" />
            <div>
              <p className="ui-section-kicker">Əməliyyat mərkəzi</p>
              <p className="login-panel__lead">
                Kataloq, stok, sifariş və POS əməliyyatlarına yalnız
                yetkili əməkdaşlar daxil ola bilər.
              </p>
            </div>
          </header>

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
        </section>
      </main>
    );
  }

  const subtotal = posItems.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.quantity,
    0,
  );

  return (
    <BoRouteAlertsProvider
      value={{ message, error, route: alertRoute }}
    >
    <main id="staff-content" className="bo-main" tabIndex={-1}>
      {children}
      {showDashboardHeader ? (
        <section className="bo-dashboard-header">
          <div className="bo-dashboard-header__copy">
            <h1 className="ui-page-title">{activeNav.title}</h1>
            <p className="ui-account-dashboard__lead bo-dashboard-header__lead">
              {activeNav.description}
            </p>
          </div>
        </section>
      ) : null}

      <BoRoutePanel route="catalog-categories">
        <CatalogCategoriesPanel
          categories={categories}
          canCatalog={canCatalog}
          canCatalogRead={canCatalogRead}
          run={run}
          onCreateCategory={(form) =>
            api("/catalog/categories", {
              method: "POST",
              body: JSON.stringify({
                name: form.get("name"),
                slug: form.get("slug"),
                parentId: form.get("parentId") || undefined,
                status: "ACTIVE",
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
          onCreateBrand={(form) =>
            api("/catalog/brands", {
              method: "POST",
              body: JSON.stringify({
                name: form.get("name"),
                slug: form.get("slug"),
                status: "ACTIVE",
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
          onCreateProduct={(form, requiredSpecs) => {
            const brandId = String(form.get("brandId") ?? "").trim();
            return api<{ id: string }>("/catalog/products", {
              method: "POST",
              body: JSON.stringify({
                name: form.get("name"),
                slug: form.get("slug"),
                categoryId: form.get("categoryId"),
                brandId: brandId === "" ? undefined : brandId,
                status: "ACTIVE",
                requiredSpecs:
                  requiredSpecs.length > 0 ? requiredSpecs : undefined,
              }),
            });
          }}
          onUpdateProduct={(productId, form, requiredSpecs) => {
            const brandId = String(form.get("brandId") ?? "").trim();
            return api<{ id: string }>(`/catalog/products/${productId}`, {
              method: "PATCH",
              body: JSON.stringify({
                name: form.get("name"),
                slug: form.get("slug"),
                categoryId: form.get("categoryId"),
                brandId: brandId === "" ? undefined : brandId,
                status: "ACTIVE",
                requiredSpecs:
                  requiredSpecs.length > 0 ? requiredSpecs : undefined,
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
          onAddProductMedia={async ({ productId, file, altText }) => {
            const uploaded = await uploadCatalogProductImageFile(file);
            return api(`/catalog/products/${productId}/media`, {
              method: "POST",
              body: JSON.stringify({
                objectKey: uploaded.objectKey,
                mimeType: uploaded.mimeType,
                byteSize: uploaded.byteSize,
                altText,
                sortOrder: 0,
              }),
            });
          }}
          onUpdateProductMedia={async ({ mediaId, file, altText }) => {
            const uploaded = await uploadCatalogProductImageFile(file);
            return api(`/catalog/media/${mediaId}`, {
              method: "PATCH",
              body: JSON.stringify({
                objectKey: uploaded.objectKey,
                mimeType: uploaded.mimeType,
                byteSize: uploaded.byteSize,
                altText,
                sortOrder: 0,
              }),
            });
          }}
          onAddVariantMedia={async ({ variantId, file, altText }) => {
            const uploaded = await uploadCatalogProductImageFile(file);
            return api(`/catalog/variants/${variantId}/media`, {
              method: "POST",
              body: JSON.stringify({
                objectKey: uploaded.objectKey,
                mimeType: uploaded.mimeType,
                byteSize: uploaded.byteSize,
                altText,
                sortOrder: 0,
              }),
            });
          }}
          onUpdateVariantMedia={async ({ mediaId, file, altText }) => {
            const uploaded = await uploadCatalogProductImageFile(file);
            return api(`/catalog/variant-media/${mediaId}`, {
              method: "PATCH",
              body: JSON.stringify({
                objectKey: uploaded.objectKey,
                mimeType: uploaded.mimeType,
                byteSize: uploaded.byteSize,
                altText,
                sortOrder: 0,
              }),
            });
          }}
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
        />
      </BoRoutePanel>

      <BoRoutePanel route="catalog-subcategories">
        <CatalogSubcategoriesPanel
          categories={categories}
          canCatalog={canCatalog}
          canCatalogRead={canCatalogRead}
          run={run}
          onCreateCategory={(form) =>
            api("/catalog/categories", {
              method: "POST",
              body: JSON.stringify({
                name: form.get("name"),
                slug: form.get("slug"),
                parentId: form.get("parentId") || undefined,
                status: "ACTIVE",
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
        <section className="operation-grid" aria-label="Stok balans əməliyyatları">
        {canAdjust && (
          <form
            className="operation-card"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void run(
                () =>
                  api("/inventory/locations", {
                    method: "POST",
                    body: JSON.stringify({
                      code: form.get("code"),
                      name: form.get("name"),
                      type: form.get("type"),
                      active: true,
                    }),
                  }),
                "Stok məntəqəsi yaradıldı",
              );
            }}
          >
            <h2>Stok məntəqəsi</h2>
            <label>
              Kod <input name="code" minLength={2} required />
            </label>
            <label>
              Ad <input name="name" minLength={2} required />
            </label>
            <label>
              Növ
              <select name="type" required>
                <option value="WAREHOUSE">Anbar</option>
                <option value="STORE">Mağaza</option>
                <option value="PICKUP">Pickup</option>
              </select>
            </label>
            <button type="submit">Yarat</button>
          </form>
        )}

        {canReceipt && (
          <form
            className="operation-card"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void run(
                () =>
                  api("/inventory/receipts", {
                    method: "POST",
                    body: JSON.stringify({
                      variantId: form.get("variantId"),
                      locationId: form.get("locationId"),
                      quantity: Number(form.get("quantity")),
                      sourceType: form.get("sourceType"),
                      sourceDocumentId: form.get("sourceDocumentId"),
                      reason: form.get("reason"),
                    }),
                  }),
                "Stok qəbulu ledger-ə yazıldı",
              );
            }}
          >
            <h2>Stok qəbulu</h2>
            <label>
              Variant
              <select name="variantId" required>
                <option value="">Seçin</option>
                {products.flatMap((product) =>
                  product.variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.sku} · {product.name}
                    </option>
                  )),
                )}
              </select>
            </label>
            <label>
              Məntəqə
              <select name="locationId" required>
                <option value="">Seçin</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.code} · {location.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Miqdar <input name="quantity" type="number" min={1} required />
            </label>
            <label>
              Mənbə növü <input name="sourceType" required />
            </label>
            <label>
              Sənəd nömrəsi <input name="sourceDocumentId" required />
            </label>
            <label>
              Səbəb <textarea name="reason" minLength={3} required />
            </label>
            <button type="submit">Qəbul et</button>
          </form>
        )}

        {canAdjust && (
          <form
            className="operation-card"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void run(
                () =>
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
                  }),
                "Stok düzəlişi ledger-ə yazıldı",
              );
            }}
          >
            <h2>Stok düzəlişi</h2>
            <label>
              Variant
              <select name="variantId" required>
                <option value="">Seçin</option>
                {products.flatMap((product) =>
                  product.variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.sku} · {product.name}
                    </option>
                  )),
                )}
              </select>
            </label>
            <label>
              Məntəqə
              <select name="locationId" required>
                <option value="">Seçin</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.code} · {location.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Miqdar (+/-)
              <input name="quantity" type="number" required />
            </label>
            <label>
              Mənbə növü <input name="sourceType" required />
            </label>
            <label>
              Sənəd nömrəsi <input name="sourceDocumentId" required />
            </label>
            <label>
              Səbəb <textarea name="reason" minLength={3} required />
            </label>
            <button type="submit">Düzəliş et</button>
          </form>
        )}
        </section>
      </BoRoutePanel>

      <BoRoutePanel route="inventory-transfer">
        <section className="operation-grid" aria-label="Stok transfer əməliyyatları">
        {canTransfer && (
          <form
            className="operation-card"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void run(
                () =>
                  api("/inventory/transfers", {
                    method: "POST",
                    body: JSON.stringify({
                      variantId: form.get("variantId"),
                      fromLocationId: form.get("fromLocationId"),
                      toLocationId: form.get("toLocationId"),
                      quantity: Number(form.get("quantity")),
                      sourceType: form.get("sourceType"),
                      sourceDocumentId: form.get("sourceDocumentId"),
                      reason: form.get("reason"),
                    }),
                  }),
                "Transfer ledger-ə yazıldı",
              );
            }}
          >
            <h2>Stok transferi</h2>
            <label>
              Variant
              <select name="variantId" required>
                <option value="">Seçin</option>
                {products.flatMap((product) =>
                  product.variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.sku} · {product.name}
                    </option>
                  )),
                )}
              </select>
            </label>
            <label>
              Haradan
              <select name="fromLocationId" required>
                <option value="">Seçin</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.code} · {location.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Haraya
              <select name="toLocationId" required>
                <option value="">Seçin</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.code} · {location.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Miqdar <input name="quantity" type="number" min={1} required />
            </label>
            <label>
              Mənbə növü <input name="sourceType" required />
            </label>
            <label>
              Sənəd nömrəsi <input name="sourceDocumentId" required />
            </label>
            <label>
              Səbəb <textarea name="reason" minLength={3} required />
            </label>
            <button type="submit">Transfer et</button>
          </form>
        )}
        </section>
      </BoRoutePanel>

      <BoRoutePanel route="inventory-balance">
      {(canInventoryRead || canAdjust || canAudit) && (
        <section className="phase-two-section" aria-label="Stok balans görünüşü">
          <div className="overview-grid">
            {canInventoryRead && (
              <article className="operation-card">
                <h2>Balanslar</h2>
                {balances.length === 0 ? (
                  <p className="pos-empty">Balans tapılmadı.</p>
                ) : (
                  <div className="data-list">
                    {balances.map((balance) => (
                      <div key={balance.id} className="data-row">
                        <div>
                          <strong>
                            {balance.variant.sku} · {balance.location.code}
                          </strong>
                          <p className="pos-meta">
                            {balance.variant.name} · On-hand {balance.onHand} ·
                            Reserved {balance.reserved}
                          </p>
                        </div>
                        <small>{formatDateTime(balance.updatedAt)}</small>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            )}

            {canAdjust && reconciliation !== null && (
              <article className="operation-card">
                <h2>Ledger reconciliation</h2>
                <div className="summary-grid">
                  <div>
                    <span>Status</span>
                    <strong>{reconciliation.healthy ? "Sağlam" : "Uyğunsuz"}</strong>
                  </div>
                  <div>
                    <span>Mismatch</span>
                    <strong>{reconciliation.mismatches.length}</strong>
                  </div>
                </div>
                {!reconciliation.healthy && (
                  <div className="data-list">
                    {reconciliation.mismatches.map((mismatch) => (
                      <div
                        key={`${mismatch.variant_id}:${mismatch.location_id}`}
                        className="data-row"
                      >
                        <div>
                          <strong>{mismatch.balance_on_hand}</strong>
                          <p className="pos-meta">
                            Balance {mismatch.balance_on_hand} / Ledger{" "}
                            {mismatch.ledger_on_hand}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            )}

            {canAudit && (
              <article className="operation-card">
                <h2>Audit trail</h2>
                {auditEntries.length === 0 ? (
                  <p className="pos-empty">Audit qeydi görünmür.</p>
                ) : (
                  <div className="data-list">
                    {auditEntries.map((entry) => (
                      <div key={entry.id} className="audit-entry">
                        <div className="audit-head">
                          <strong>{entry.action}</strong>
                          <small>{formatDateTime(entry.createdAt)}</small>
                        </div>
                        <p className="pos-meta">
                          {entry.entityType} · {entry.entityId}
                        </p>
                        <pre className="audit-payload">
                          {formatAuditPayload(entry.after ?? entry.before)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            )}
          </div>
        </section>
      )}
      </BoRoutePanel>

      <BoRoutePanel route="inventory-transfer">
      {canInventoryRead && (
        <section className="phase-two-section" aria-label="Stok hərəkətləri">
          <div className="overview-grid">
              <article className="operation-card">
                <h2>Son stok hərəkətləri</h2>
                {movements.length === 0 ? (
                  <p className="pos-empty">Hərəkət qeydi yoxdur.</p>
                ) : (
                  <div className="data-list">
                    {movements.map((movement) => (
                      <div key={movement.id} className="data-row">
                        <div>
                          <strong>
                            {movement.type} ·{" "}
                            {movement.quantityDelta > 0 ? "+" : ""}
                            {movement.quantityDelta}
                          </strong>
                          <p className="pos-meta">
                            {movement.sourceType} / {movement.sourceDocumentId}
                          </p>
                          <p className="pos-meta">{movement.reason}</p>
                        </div>
                        <small>{formatDateTime(movement.createdAt)}</small>
                      </div>
                    ))}
                  </div>
                )}
              </article>
          </div>
        </section>
      )}
      </BoRoutePanel>

      <BoRoutePanel route="orders-list">
      {canOrdersRead && (
        <section className="orders-section" aria-label="Sifariş siyahısı">
          <div className="orders-layout">
            <article className="operation-card">
              <h2>Son sifarişlər</h2>
              {orders.length === 0 ? (
                <p className="pos-empty">Bu rola görünən sifariş yoxdur.</p>
              ) : (
                <div className="orders-list">
                  {orders.map((order) => (
                    <button
                      key={order.id}
                      type="button"
                      className={`order-row${selectedOrder?.id === order.id ? " active" : ""}`}
                      onClick={() =>
                        void run(
                          () => openOrder(order.id),
                          `${order.orderNumber} açıldı`,
                          { refresh: false },
                        )
                      }
                    >
                      <div>
                        <strong>{order.orderNumber}</strong>
                        <p>
                          {order.recipientName ?? "Guest"} ·{" "}
                          {order.fulfillmentType} · {order.itemCount} sətir
                        </p>
                      </div>
                      <div className="order-row-meta">
                        <span>{formatMoney(order.grandTotal)}</span>
                        <small>
                          {order.status} / {order.paymentStatus}
                        </small>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </article>

            <article className="operation-card">
              <h2>Sifariş detalı</h2>
              {selectedOrder === null ? (
                <p className="pos-empty">
                  Detail və keçidlər üçün soldan sifariş seçin.
                </p>
              ) : (
                <>
                  <div className="summary-grid">
                    <div>
                      <span>Status</span>
                      <strong>{selectedOrder.status}</strong>
                    </div>
                    <div>
                      <span>Payment</span>
                      <strong>{selectedOrder.paymentStatus}</strong>
                    </div>
                    <div>
                      <span>Fulfillment</span>
                      <strong>{selectedOrder.fulfillmentStatus}</strong>
                    </div>
                    <div>
                      <span>Toplam</span>
                      <strong>{formatMoney(selectedOrder.grandTotal)}</strong>
                    </div>
                  </div>

                  {selectedOrder.address !== null && (
                    <div className="order-block">
                      <strong>{selectedOrder.address.recipientName}</strong>
                      <p className="pos-meta">
                        {selectedOrder.address.phone} ·{" "}
                        {selectedOrder.address.administrativeArea ??
                          "Baku zone"}
                      </p>
                      <p className="pos-meta">
                        {selectedOrder.address.addressLine}
                      </p>
                    </div>
                  )}

                  <div className="receipt-lines">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="receipt-line">
                        <span>
                          {item.sku} · {item.productName} · {item.quantity} ədəd
                        </span>
                        <strong>{formatMoney(item.lineTotal)}</strong>
                      </div>
                    ))}
                  </div>

                  {selectedOrder.payment !== null && (
                    <div className="order-block">
                      <h3>Online payment</h3>
                      <p className="pos-meta">
                        {selectedOrder.payment.provider} ·{" "}
                        {selectedOrder.payment.method} ·{" "}
                        {selectedOrder.payment.status}
                      </p>
                      <p className="pos-meta">
                        {formatMoney(selectedOrder.payment.amount)} ·{" "}
                        {selectedOrder.payment.providerPaymentId ?? "provider id yoxdur"}
                      </p>
                    </div>
                  )}

                  <div className="order-block">
                    <h3>Reservations</h3>
                    {selectedOrder.reservations.map((reservation) => (
                      <p key={reservation.id} className="pos-meta">
                        {reservation.location.code} · {reservation.quantity}{" "}
                        ədəd · {reservation.status}
                      </p>
                    ))}
                  </div>

                  <div className="order-block">
                    <h3>Status history</h3>
                    <div className="history-list">
                      {selectedOrder.statusHistory.map((entry) => (
                        <div key={entry.id} className="history-row">
                          <strong>{entry.orderStatus}</strong>
                          <p>
                            {entry.paymentStatus} / {entry.fulfillmentStatus}
                          </p>
                          <small>
                            {new Date(entry.createdAt).toLocaleString("az-AZ")}{" "}
                            · {entry.reason}
                          </small>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="order-block">
                    <h3>Fulfillment timeline</h3>
                    {selectedOrder.fulfillmentEvents.length === 0 ? (
                      <p className="pos-empty">
                        Bu sifariş üçün fulfillment event yazılmayıb.
                      </p>
                    ) : (
                      <div className="history-list">
                        {selectedOrder.fulfillmentEvents.map((event) => {
                          const payloadSummary = formatFulfillmentPayload(
                            event.payload,
                          );
                          return (
                            <div key={event.id} className="history-row">
                              <strong>{event.eventType}</strong>
                              <p>
                                {event.orderStatus} / {event.paymentStatus} /{" "}
                                {event.fulfillmentStatus}
                              </p>
                              <small>
                                {new Date(event.createdAt).toLocaleString("az-AZ")}{" "}
                                · {event.reason}
                              </small>
                              {event.actorStaffId !== null && (
                                <p className="pos-meta">
                                  Staff actor: {event.actorStaffId}
                                </p>
                              )}
                              {payloadSummary !== null && (
                                <p className="pos-meta">{payloadSummary}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {canRefund &&
                    selectedOrder.payment !== null &&
                    (selectedOrder.paymentStatus === "PAID" ||
                      selectedOrder.paymentStatus === "PARTIALLY_REFUNDED") && (
                      <div className="order-actions">
                        <h3>Online refund</h3>
                        <label>
                          Refund səbəbi
                          <textarea
                            value={orderRefundReason}
                            onChange={(event) =>
                              setOrderRefundReason(event.target.value)
                            }
                            minLength={3}
                          />
                        </label>
                        <label>
                          Qismən məbləğ (boş buraxılsa tam refund)
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder={selectedOrder.payment.amount}
                            value={orderRefundAmount}
                            onChange={(event) =>
                              setOrderRefundAmount(event.target.value)
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
                                void runOrderRefund();
                              }
                            }}
                          >
                            Refund et
                          </button>
                        </div>
                      </div>
                    )}

                  {canFulfill && (
                    <div className="order-actions">
                      <label>
                        Transition səbəbi
                        <textarea
                          value={orderReason}
                          onChange={(event) =>
                            setOrderReason(event.target.value)
                          }
                          minLength={3}
                        />
                      </label>

                      <div className="action-row">
                        {selectedOrder.status === "UNDER_REVIEW" && (
                          <button
                            type="button"
                            onClick={() =>
                              void runOrderTransition("CONFIRM", orderReason)
                            }
                          >
                            Təsdiqlə
                          </button>
                        )}
                        {selectedOrder.status === "CONFIRMED" && (
                          <button
                            type="button"
                            onClick={() =>
                              void runOrderTransition(
                                "START_PROCESSING",
                                orderReason,
                              )
                            }
                          >
                            Processing başlat
                          </button>
                        )}
                        {selectedOrder.status === "PROCESSING" &&
                          selectedOrder.fulfillmentType === "PICKUP" && (
                            <button
                              type="button"
                              onClick={() =>
                                void runOrderTransition(
                                  "MARK_READY_FOR_PICKUP",
                                  orderReason,
                                )
                              }
                            >
                              Pickup üçün hazır et
                            </button>
                          )}
                        {selectedOrder.status === "PROCESSING" &&
                          selectedOrder.fulfillmentType === "DELIVERY" && (
                            <button
                              type="button"
                              onClick={() =>
                                void runOrderTransition(
                                  "MARK_OUT_FOR_DELIVERY",
                                  orderReason,
                                )
                              }
                            >
                              Kuryerə ver
                            </button>
                          )}
                        {(selectedOrder.status === "READY_FOR_PICKUP" ||
                          selectedOrder.status === "OUT_FOR_DELIVERY") && (
                          <button
                            type="button"
                            onClick={() =>
                              void runOrderTransition("COMPLETE", orderReason)
                            }
                          >
                            Tamamla
                          </button>
                        )}
                        {(selectedOrder.status === "UNDER_REVIEW" ||
                          selectedOrder.status === "CONFIRMED" ||
                          selectedOrder.status === "PROCESSING" ||
                          selectedOrder.status === "READY_FOR_PICKUP" ||
                          selectedOrder.status === "OUT_FOR_DELIVERY") && (
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Bu sifarişi ləğv etmək istədiyinizə əminsiniz?",
                                )
                              ) {
                                void runOrderTransition("CANCEL", orderReason);
                              }
                            }}
                          >
                            Ləğv et
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </article>
          </div>
        </section>
      )}
      </BoRoutePanel>

      <BoRoutePanel route="fulfillment">
      {canFulfill && (
        <section className="orders-section" aria-label="Çatdırılma və pickup">
            <div className="orders-layout fulfillment-config">
              <article className="operation-card">
                <h2>Çatdırılma zonaları</h2>
                <form
                  className="stack-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    const formData = new FormData(form);
                    void run(
                      async () => {
                        await api("/fulfillment/delivery-zones", {
                          method: "POST",
                          body: JSON.stringify({
                            code: String(formData.get("code") ?? "")
                              .trim()
                              .toUpperCase(),
                            name: String(formData.get("name") ?? "").trim(),
                            fee: String(formData.get("fee") ?? "0.00"),
                            freeDeliveryMinimum:
                              String(
                                formData.get("freeDeliveryMinimum") ?? "",
                              ).trim() || undefined,
                            estimatedMinDays: Number(
                              formData.get("estimatedMinDays") ?? "1",
                            ),
                            estimatedMaxDays: Number(
                              formData.get("estimatedMaxDays") ?? "3",
                            ),
                            coveredAdministrativeAreas: String(
                              formData.get("coveredAdministrativeAreas") ?? "",
                            )
                              .split(",")
                              .map((area) => area.trim())
                              .filter(Boolean),
                          }),
                        });
                        form.reset();
                      },
                      "Çatdırılma zonası yaradıldı",
                    );
                  }}
                >
                  <label>
                    Kod
                    <input name="code" required pattern="[A-Za-z0-9_-]{2,32}" />
                  </label>
                  <label>
                    Ad
                    <input name="name" required minLength={2} maxLength={120} />
                  </label>
                  <label>
                    Tarif (AZN)
                    <input name="fee" required defaultValue="5.00" />
                  </label>
                  <label>
                    Pulsuz çatdırılma minimumu
                    <input name="freeDeliveryMinimum" placeholder="100.00" />
                  </label>
                  <label>
                    Min gün
                    <input
                      name="estimatedMinDays"
                      type="number"
                      min={0}
                      max={60}
                      defaultValue={1}
                      required
                    />
                  </label>
                  <label>
                    Max gün
                    <input
                      name="estimatedMaxDays"
                      type="number"
                      min={0}
                      max={60}
                      defaultValue={3}
                      required
                    />
                  </label>
                  <label>
                    Əhatə olunan regionlar (vergüllə)
                    <input
                      name="coveredAdministrativeAreas"
                      required
                      placeholder="Bakı, Sumqayıt"
                    />
                  </label>
                  <button type="submit">Zona əlavə et</button>
                </form>
                <div className="data-list">
                  {deliveryZones.length === 0 ? (
                    <p className="pos-empty">Aktiv zona yoxdur.</p>
                  ) : (
                    deliveryZones.map((zone) => (
                      <div key={zone.id} className="audit-entry">
                        <div className="audit-head">
                          <strong>
                            {zone.code} · {zone.name}
                          </strong>
                          <small>{zone.active ? "Aktiv" : "Deaktiv"}</small>
                        </div>
                        <p className="pos-meta">
                          {formatMoney(zone.fee)} · {zone.estimatedMinDays}-
                          {zone.estimatedMaxDays} gün ·{" "}
                          {zone.coveredAdministrativeAreas.join(", ")}
                        </p>
                        {zone.active && (
                          <button
                            type="button"
                            className="secondary"
                            onClick={() =>
                              void run(
                                () =>
                                  api(`/fulfillment/delivery-zones/${zone.id}`, {
                                    method: "PATCH",
                                    body: JSON.stringify({ active: false }),
                                  }),
                                `${zone.code} deaktiv edildi`,
                              )
                            }
                          >
                            Deaktiv et
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="operation-card">
                <h2>Pickup məntəqələri</h2>
                <form
                  className="stack-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    const formData = new FormData(form);
                    const locationId = String(formData.get("locationId") ?? "");
                    void run(
                      async () => {
                        await api("/fulfillment/pickup-locations", {
                          method: "POST",
                          body: JSON.stringify({
                            code: String(formData.get("code") ?? "")
                              .trim()
                              .toUpperCase(),
                            name: String(formData.get("name") ?? "").trim(),
                            locationId,
                            addressLine: String(
                              formData.get("addressLine") ?? "",
                            ).trim(),
                            workingHours: {
                              default: String(
                                formData.get("workingHours") ?? "09:00-18:00",
                              ).trim(),
                            },
                            contactLabel:
                              String(formData.get("contactLabel") ?? "").trim() ||
                              undefined,
                          }),
                        });
                        form.reset();
                      },
                      "Pickup məntəqəsi yaradıldı",
                    );
                  }}
                >
                  <label>
                    Kod
                    <input name="code" required pattern="[A-Za-z0-9_-]{2,32}" />
                  </label>
                  <label>
                    Ad
                    <input name="name" required minLength={2} maxLength={120} />
                  </label>
                  <label>
                    Stok məntəqəsi
                    <select name="locationId" required defaultValue="">
                      <option value="" disabled>
                        Seçin
                      </option>
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.code} · {location.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Ünvan
                    <input name="addressLine" required minLength={5} />
                  </label>
                  <label>
                    İş saatları
                    <input
                      name="workingHours"
                      defaultValue="09:00-18:00"
                      required
                    />
                  </label>
                  <label>
                    Əlaqə etiketi
                    <input name="contactLabel" maxLength={120} />
                  </label>
                  <button type="submit">Pickup əlavə et</button>
                </form>
                <div className="data-list">
                  {pickupLocations.length === 0 ? (
                    <p className="pos-empty">Pickup məntəqəsi yoxdur.</p>
                  ) : (
                    pickupLocations.map((pickup) => (
                      <div key={pickup.id} className="audit-entry">
                        <div className="audit-head">
                          <strong>
                            {pickup.code} · {pickup.name}
                          </strong>
                          <small>{pickup.active ? "Aktiv" : "Deaktiv"}</small>
                        </div>
                        <p className="pos-meta">
                          {pickup.location.code} · {pickup.addressLine}
                        </p>
                        {pickup.active && (
                          <button
                            type="button"
                            className="secondary"
                            onClick={() =>
                              void run(
                                () =>
                                  api(
                                    `/fulfillment/pickup-locations/${pickup.id}`,
                                    {
                                      method: "PATCH",
                                      body: JSON.stringify({ active: false }),
                                    },
                                  ),
                                `${pickup.code} deaktiv edildi`,
                              )
                            }
                          >
                            Deaktiv et
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </article>
            </div>
        </section>
      )}
      </BoRoutePanel>

      <BoRoutePanel route="reports">
      {canReportsRead && (
        <section className="reports-section" aria-label="Hesabatlar və export-lar">
          <article className="operation-card">
            <form
              className="report-filter-row"
              onSubmit={(event) => {
                event.preventDefault();
                void run(() => refresh(staff), "Hesabatlar yeniləndi", {
                  refresh: false,
                });
              }}
            >
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
              <div className="report-actions">
                <button type="submit">Yenilə</button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => void createReportExport("SALES")}
                >
                  Sales CSV export
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => void createReportExport("LOW_STOCK")}
                >
                  Low stock export
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => void createReportExport("INVENTORY_MOVEMENTS")}
                >
                  Movement export
                </button>
              </div>
            </form>
          </article>

          <div className="reports-layout">
            <article className="operation-card">
              <h2>Satış xülasəsi</h2>
              {salesReport === null ? (
                <p className="pos-empty">Bu tarix aralığı üçün hesabat yüklənmədi.</p>
              ) : (
                <>
                  <div className="summary-grid">
                    <div>
                      <span>Tranzaksiya</span>
                      <strong>{salesReport.summary.transactionCount}</strong>
                    </div>
                    <div>
                      <span>Gross sales</span>
                      <strong>{formatMoney(salesReport.summary.grossSales)}</strong>
                    </div>
                    <div>
                      <span>Refund total</span>
                      <strong>{formatMoney(salesReport.summary.refundTotal)}</strong>
                    </div>
                    <div>
                      <span>Net sales</span>
                      <strong>{formatMoney(salesReport.summary.netSales)}</strong>
                    </div>
                  </div>

                  <div className="report-breakdown">
                    <div>
                      <h3>Kanal üzrə</h3>
                      <div className="data-list">
                        {salesReport.byChannel.map((entry) => (
                          <div key={entry.channel} className="report-metric-row">
                            <div>
                              <strong>{entry.channel}</strong>
                              <p className="pos-meta">
                                {entry.transactionCount} tranzaksiya
                              </p>
                            </div>
                            <span>{formatMoney(entry.netSales)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3>Ödəniş növü üzrə</h3>
                      <div className="data-list">
                        {salesReport.byPaymentMethod.map((entry) => (
                          <div
                            key={entry.paymentMethod}
                            className="report-metric-row"
                          >
                            <div>
                              <strong>{entry.paymentMethod}</strong>
                              <p className="pos-meta">
                                {entry.transactionCount} tranzaksiya
                              </p>
                            </div>
                            <span>{formatMoney(entry.netSales)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3>Top məhsullar</h3>
                      <div className="data-list">
                        {salesReport.byProduct.length === 0 ? (
                          <p className="pos-empty">Məhsul breakdown-u yoxdur.</p>
                        ) : (
                          salesReport.byProduct.map((entry) => (
                            <div key={entry.variantId} className="report-metric-row">
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

                    <div>
                      <h3>Qeydlər</h3>
                      <div className="data-list">
                        {salesReport.notes.map((note) => (
                          <div key={note} className="data-row">
                            <p className="pos-meta">{note}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </article>

            <div className="report-side-column">
              <article className="operation-card">
                <h2>Aşağı stok</h2>
                {lowStockReport === null || lowStockReport.items.length === 0 ? (
                  <p className="pos-empty">
                    Aşağı stok həddi ({lowStockReport?.threshold ?? 0}) üçün nəticə
                    yoxdur.
                  </p>
                ) : (
                  <div className="data-list">
                    {lowStockReport.items.map((item) => (
                      <div key={item.variantId} className="report-metric-row">
                        <div>
                          <strong>{item.sku}</strong>
                          <p className="pos-meta">
                            {item.productName} · {item.variantName}
                          </p>
                          <p className="pos-meta">{item.locationCode}</p>
                        </div>
                        <span>{item.available} ədəd</span>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article className="operation-card">
                <h2>Son export-lar</h2>
                {reportExports.length === 0 ? (
                  <p className="pos-empty">Hələ export yaradılmayıb.</p>
                ) : (
                  <div className="data-list">
                    {reportExports.map((item) => (
                      <div key={item.id} className="export-row">
                        <div>
                          <strong>{item.fileName}</strong>
                          <p className="pos-meta">
                            {item.reportType} · {item.status}
                            {item.rowCount !== null ? ` · ${item.rowCount} sətir` : ""}
                          </p>
                          <p className="pos-meta">{formatDateTime(item.createdAt)}</p>
                          {item.errorMessage ? (
                            <p className="form-error">{item.errorMessage}</p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className="secondary"
                          disabled={item.status !== "COMPLETED"}
                          onClick={() =>
                            void downloadReportExport(item.id, item.fileName)
                          }
                        >
                          Yüklə
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </div>
          </div>
        </section>
      )}
      </BoRoutePanel>

      <BoRoutePanel route="pos">
      {(canOpenShift || canPos || canCloseShift || canRegisterManage) && (
        <section className="pos-section" aria-label="POS və kassa">
          {activeShift !== null && (
            <div className="pos-header">
              <div className="shift-pill">
                {activeShift.register.code} · {activeShift.status}
              </div>
            </div>
          )}

          <div className="operation-grid">
            {canRegisterManage && (
              <form
                className="operation-card"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  void run(
                    () =>
                      api("/cash-register/registers", {
                        method: "POST",
                        body: JSON.stringify({
                          code: form.get("code"),
                          name: form.get("name"),
                          locationId: form.get("locationId"),
                        }),
                      }),
                    "Kassa yaradıldı",
                  );
                }}
              >
                <h2>Kassa yarat</h2>
                <label>
                  Kod <input name="code" minLength={2} required />
                </label>
                <label>
                  Ad <input name="name" minLength={2} required />
                </label>
                <label>
                  STORE məntəqəsi
                  <select name="locationId" required>
                    <option value="">Seçin</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.code} · {location.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit">Yarat</button>
              </form>
            )}

            {canOpenShift && activeShift === null && (
              <form
                className="operation-card"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  void run(
                    () =>
                      api<ActiveShift>("/cash-register/shifts/open", {
                        method: "POST",
                        body: JSON.stringify({
                          registerId: form.get("registerId"),
                          openingFloat: form.get("openingFloat"),
                        }),
                      }),
                    "Kassa növbəsi açıldı",
                    {
                      onSuccess: (result) => {
                        setActiveShift(result);
                        setRecentSale(null);
                        setPosItems([]);
                      },
                    },
                  );
                }}
              >
                <h2>Növbə aç</h2>
                <label>
                  Kassa
                  <select name="registerId" required>
                    <option value="">Seçin</option>
                    {registers.map((register) => (
                      <option key={register.id} value={register.id}>
                        {register.code} · {register.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Opening float
                  <input
                    name="openingFloat"
                    inputMode="decimal"
                    pattern="(0|[1-9][0-9]*)(\.[0-9]{1,2})?"
                    defaultValue="0.00"
                    required
                  />
                </label>
                <button type="submit">Aç</button>
              </form>
            )}

            {activeShift !== null && (
              <article className="operation-card">
                <h2>Aktiv növbə</h2>
                <p className="pos-meta">
                  {activeShift.register.code} · {activeShift.register.name}
                </p>
                <p className="pos-meta">
                  Məntəqə: {activeShift.register.location.code} ·{" "}
                  {activeShift.register.location.name}
                </p>
                <div className="summary-grid">
                  <div>
                    <span>Opening</span>
                    <strong>{formatMoney(activeShift.openingFloat)}</strong>
                  </div>
                  <div>
                    <span>Expected</span>
                    <strong>{formatMoney(activeShift.expectedCash)}</strong>
                  </div>
                  <div>
                    <span>Discrepancy</span>
                    <strong>
                      {formatMoney(activeShift.discrepancy ?? "0")}
                    </strong>
                  </div>
                </div>
                <p className="pos-meta">
                  Satış sayı: {activeShift.sales.length} · Hərəkət:{" "}
                  {activeShift.movements.length}
                </p>
              </article>
            )}

            {activeShift !== null &&
              canCashMovement &&
              activeShift.status === "OPEN" && (
                <form
                  className="operation-card"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    void run(
                      () =>
                        api<ActiveShift>(
                          `/cash-register/shifts/${activeShift.id}/movements`,
                          {
                            method: "POST",
                            body: JSON.stringify({
                              type: form.get("type"),
                              amount: form.get("amount"),
                              reason: form.get("reason"),
                              reference: form.get("reference") || undefined,
                            }),
                          },
                        ),
                      "Cash movement yazıldı",
                      {
                        onSuccess: (result) => setActiveShift(result),
                      },
                    );
                  }}
                >
                  <h2>Cash in / out</h2>
                  <label>
                    Növ
                    <select name="type" required>
                      <option value="CASH_IN">Cash in</option>
                      <option value="CASH_OUT">Cash out</option>
                    </select>
                  </label>
                  <label>
                    Məbləğ
                    <input
                      name="amount"
                      inputMode="decimal"
                      pattern="(0|[1-9][0-9]*)(\.[0-9]{1,2})?"
                      required
                    />
                  </label>
                  <label>
                    Səbəb <textarea name="reason" minLength={3} required />
                  </label>
                  <label>
                    Reference <input name="reference" />
                  </label>
                  <button type="submit">Yaz</button>
                </form>
              )}

            {activeShift !== null &&
              canCloseShift &&
              activeShift.status === "OPEN" && (
                <form
                  className="operation-card"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    void run(
                      () =>
                        api<{
                          approvalRequired: boolean;
                          shift: ActiveShift;
                        }>(`/cash-register/shifts/${activeShift.id}/close`, {
                          method: "POST",
                          body: JSON.stringify({
                            countedCash: form.get("countedCash"),
                          }),
                        }),
                      "Növbə bağlanışa göndərildi",
                      {
                        onSuccess: (result) => {
                          setActiveShift(result.shift);
                          if (!result.approvalRequired) {
                            setPosItems([]);
                          }
                        },
                      },
                    );
                  }}
                >
                  <h2>Növbəni bağla</h2>
                  <label>
                    Counted cash
                    <input
                      name="countedCash"
                      inputMode="decimal"
                      pattern="(0|[1-9][0-9]*)(\.[0-9]{1,2})?"
                      required
                    />
                  </label>
                  <button type="submit">Bağla</button>
                </form>
              )}

            {activeShift !== null &&
              canApproveShift &&
              activeShift.status === "CLOSING" && (
                <article className="operation-card">
                  <h2>Discrepancy approval</h2>
                  <p className="pos-meta">
                    Növbə fərqlə bağlanıb:{" "}
                    {formatMoney(activeShift.discrepancy ?? "0")}
                  </p>
                  <button
                    onClick={() =>
                      void run(
                        () =>
                          api<ActiveShift>(
                            `/cash-register/shifts/${activeShift.id}/approve-close`,
                            { method: "POST" },
                          ),
                        "Discrepancy təsdiqləndi",
                        {
                          onSuccess: (result) => {
                            setActiveShift(result);
                            setPosItems([]);
                          },
                        },
                      )
                    }
                  >
                    Təsdiqlə və bağla
                  </button>
                </article>
              )}
          </div>

          {canPos && activeShift !== null && activeShift.status === "OPEN" && (
            <div className="pos-workbench">
              <article className="operation-card pos-pane">
                <h2>Barkodla satış</h2>
                <p className="pos-meta">
                  Skaneri istifadə edin və ya barkodu daxil edib Enter basın.
                </p>
                <form
                  className="pos-scan-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void run(
                      () => addBarcode(barcodeInput.trim()),
                      "Məhsul səbətə əlavə olundu",
                      { refresh: false },
                    );
                  }}
                >
                  <input
                    value={barcodeInput}
                    onChange={(event) => setBarcodeInput(event.target.value)}
                    placeholder="Barcode / scanner input"
                  />
                  <button type="submit">Əlavə et</button>
                </form>

                {posItems.length === 0 ? (
                  <p className="pos-empty">
                    Aktiv POS səbəti boşdur. Skan etdikcə xəttlər burada
                    artacaq.
                  </p>
                ) : (
                  <div className="pos-lines">
                    {posItems.map((item) => (
                      <div key={item.variantId} className="pos-line">
                        <div>
                          <strong>{item.sku}</strong>
                          <p>
                            {item.productName} · {item.variantName}
                          </p>
                        </div>
                        <div className="pos-line-controls">
                          <input
                            type="number"
                            min={1}
                            max={item.available}
                            value={item.quantity}
                            onChange={(event) =>
                              setPosItems((current) =>
                                current.map((entry) =>
                                  entry.variantId === item.variantId
                                    ? {
                                        ...entry,
                                        quantity: Math.max(
                                          1,
                                          Math.min(
                                            Number(event.target.value) || 1,
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
                            className="secondary"
                            onClick={() =>
                              requestConfirm({
                                title: "Sətri sil",
                                message: `"${item.productName}" (${item.sku}) sətirini POS səbətindən silmək istəyirsiniz?`,
                                onConfirm: () => {
                                  setPosItems((current) =>
                                    current.filter(
                                      (entry) => entry.variantId !== item.variantId,
                                    ),
                                  );
                                },
                              })
                            }
                          >
                            Sil
                          </button>
                        </div>
                        <span>
                          {formatMoney(Number(item.unitPrice) * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article className="operation-card pos-pane">
                <h2>Checkout</h2>
                <div className="summary-grid">
                  <div>
                    <span>Sətir sayı</span>
                    <strong>{posItems.length}</strong>
                  </div>
                  <div>
                    <span>Toplam</span>
                    <strong>{formatMoney(subtotal)}</strong>
                  </div>
                </div>
                <label>
                  Ödəniş növü
                  <select
                    value={paymentMethod}
                    onChange={(event) =>
                      setPaymentMethod(
                        event.target.value as "CASH" | "CARD" | "INSTALLMENT",
                      )
                    }
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">External terminal card</option>
                    <option value="INSTALLMENT">External terminal installment</option>
                  </select>
                </label>
                {(paymentMethod === "CARD" || paymentMethod === "INSTALLMENT") && (
                  <label>
                    Terminal reference
                    <input
                      value={terminalReference}
                      onChange={(event) =>
                        setTerminalReference(event.target.value)
                      }
                      minLength={2}
                      required
                    />
                  </label>
                )}
                {paymentMethod === "INSTALLMENT" && (
                  <>
                    <label>
                      Bank adı
                      <input
                        value={installmentBankName}
                        onChange={(event) =>
                          setInstallmentBankName(event.target.value)
                        }
                        minLength={2}
                        required
                      />
                    </label>
                    <label>
                      Taksit ayı
                      <input
                        type="number"
                        min={2}
                        max={36}
                        value={installmentMonths}
                        onChange={(event) =>
                          setInstallmentMonths(event.target.value)
                        }
                        required
                      />
                    </label>
                  </>
                )}
                <button
                  disabled={posItems.length === 0}
                  onClick={() =>
                    void run(
                      () =>
                        api<PosSale>("/pos/sales", {
                          method: "POST",
                          headers: {
                            "Idempotency-Key": `pos-ui-${Date.now()}`,
                          },
                          body: JSON.stringify({
                            shiftId: activeShift.id,
                            paymentMethod,
                            ...(paymentMethod === "CARD" ||
                            paymentMethod === "INSTALLMENT"
                              ? { externalTerminalReference: terminalReference }
                              : {}),
                            ...(paymentMethod === "INSTALLMENT"
                              ? {
                                  bankName: installmentBankName,
                                  installmentMonths: Number(installmentMonths),
                                }
                              : {}),
                            items: posItems.map((item) => ({
                              variantId: item.variantId,
                              quantity: item.quantity,
                            })),
                          }),
                        }),
                      "POS satışı tamamlandı",
                      {
                        onSuccess: (result) => {
                          setRecentSale(result);
                          setRecentReturn(null);
                          setPosItems([]);
                          setBarcodeInput("");
                          setTerminalReference("");
                          setInstallmentBankName("");
                          setInstallmentMonths("6");
                          setReturnQuantities({});
                          setReturnTerminalReference("");
                        },
                      },
                    )
                  }
                >
                  Satışı tamamla
                </button>
              </article>
            </div>
          )}

          {recentSale !== null && (
            <article className="operation-card receipt-card">
              <div className="receipt-header">
                <div>
                  <p className="ui-section-kicker">Qeyri-fiskal receipt</p>
                  <h2>{recentSale.receiptNumber}</h2>
                </div>
                <div className="receipt-actions">
                  <button className="secondary" onClick={() => printReceipt("a4")}>
                    A4 çap
                  </button>
                  <button className="secondary" onClick={() => printReceipt("thermal")}>
                    Termal çap (80mm)
                  </button>
                </div>
              </div>
              <p className="pos-meta">
                Sale #{recentSale.saleNumber} · {recentSale.paymentMethod} ·{" "}
                {new Date(recentSale.createdAt).toLocaleString("az-AZ")}
              </p>
              {recentSale.paymentMethod === "INSTALLMENT" &&
                recentSale.payment !== null && (
                  <p className="pos-meta">
                    {recentSale.payment.bankName} · {recentSale.payment.installmentMonths}{" "}
                    ay · ref {recentSale.payment.terminalReference}
                  </p>
                )}
              <div className="receipt-lines">
                {recentSale.items.map((item) => (
                  <div key={item.id} className="receipt-line">
                    <span>
                      {item.sku} · {item.quantity} ədəd
                    </span>
                    <strong>{formatMoney(item.lineTotal)}</strong>
                  </div>
                ))}
              </div>
              <div className="receipt-total">
                <span>Toplam</span>
                <strong>{formatMoney(recentSale.grandTotal)}</strong>
              </div>
              {canRefund && activeShift?.status === "OPEN" && (
                <div className="order-block">
                  <h3>Return / refund</h3>
                  <p className="pos-meta">
                    Qaytarma original sale item-lərinə bağlı yaradılır və eyni aktiv
                    shift daxilində audit olunur.
                  </p>
                  <label>
                    Qaytarma səbəbi
                    <textarea
                      value={returnReason}
                      onChange={(event) => setReturnReason(event.target.value)}
                      minLength={3}
                    />
                  </label>
                  {recentSale.paymentMethod !== "CASH" && (
                    <label>
                      Refund terminal reference
                      <input
                        value={returnTerminalReference}
                        onChange={(event) =>
                          setReturnTerminalReference(event.target.value)
                        }
                        minLength={2}
                        required
                      />
                    </label>
                  )}
                  <div className="data-list">
                    {recentSale.items.map((item) => (
                      <div key={item.id} className="pos-line">
                        <div>
                          <strong>{item.sku}</strong>
                          <p>
                            {item.productName} · {item.quantity} ədəd satılıb
                          </p>
                        </div>
                        <div className="pos-line-controls">
                          <input
                            type="number"
                            min={0}
                            max={item.quantity}
                            value={returnQuantities[item.id] ?? ""}
                            onChange={(event) =>
                              setReturnQuantities((current) => ({
                                ...current,
                                [item.id]: event.target.value,
                              }))
                            }
                            placeholder="0"
                          />
                        </div>
                        <span>{formatMoney(item.lineTotal)}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() =>
                      void run(
                        () => createRecentSaleReturn(),
                        "POS qaytarma/refund tamamlandı",
                      )
                    }
                  >
                    Qaytarma yarat
                  </button>
                  {recentReturn !== null && (
                    <p className="payment-note">
                      {recentReturn.returnNumber} ·{" "}
                      {formatMoney(recentReturn.refundAmount)} refund qeyd edildi.
                    </p>
                  )}
                </div>
              )}
              <p className="receipt-note">
                Bu görünüş fiskal çek deyil; rəsmi fiscal provider inteqrasiyası
                ayrıca launch gate olaraq qalır.
              </p>
            </article>
          )}
        </section>
      )}
      </BoRoutePanel>

      <BoRoutePanel route="administration">
        <AdministrationPanel
          staffUsers={staffUsers}
          roles={staffRoles}
          currentStaffId={staff.id}
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
        />
      </BoRoutePanel>
    </main>
    {confirmDialog}
    </BoRouteAlertsProvider>
  );
}
