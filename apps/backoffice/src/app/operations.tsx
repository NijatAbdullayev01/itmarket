"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
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

type Brand = { id: string; name: string };
type Category = { id: string; name: string };
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
  brand: { id: string; name: string } | null;
  variants: { id: string; sku: string; barcode: string | null }[];
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
  createdAt: string;
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
  paymentMethod: "CASH" | "CARD";
  externalTerminalReference: string | null;
  grandTotal: string;
  currency: string;
  createdAt: string;
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
  paymentMethod: "CASH" | "CARD";
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

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(body.message ?? `API xətası (${response.status})`);
  }
  return response.json() as Promise<T>;
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

function bakuBusinessDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baku",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function Operations() {
  const [staff, setStaff] = useState<Staff | null>(null);
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
  const [posItems, setPosItems] = useState<PosCartItem[]>([]);
  const [recentSale, setRecentSale] = useState<PosSale | null>(null);
  const [recentReturn, setRecentReturn] = useState<PosReturn | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD">("CASH");
  const [terminalReference, setTerminalReference] = useState("");
  const [returnReason, setReturnReason] = useState("Customer return");
  const [returnTerminalReference, setReturnTerminalReference] = useState("");
  const [returnQuantities, setReturnQuantities] = useState<Record<string, string>>(
    {},
  );
  const [orderReason, setOrderReason] = useState("Staff workflow update");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const scannerBuffer = useRef("");
  const lastScanAt = useRef(0);
  const selectedOrderIdRef = useRef<string | null>(null);

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
      salesSummary,
      lowStockSummary,
      exportPage,
    ] = await Promise.all([
      currentStaff !== null && allowCatalog
        ? api<{ items: Brand[] }>("/catalog/brands?limit=100")
        : Promise.resolve({ items: [] }),
      currentStaff !== null && allowCatalog
        ? api<{ items: Category[] }>("/catalog/categories?limit=100")
        : Promise.resolve({ items: [] }),
      currentStaff !== null && allowCatalog
        ? api<{ items: Product[] }>("/catalog/products?limit=100")
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
    setSalesReport(salesSummary);
    setLowStockReport(lowStockSummary);
    setReportExports(exportPage.items);
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
    if (!allowReports) {
      setSalesReport(null);
      setLowStockReport(null);
      setReportExports([]);
    }
  }, [reportRange.from, reportRange.to]);

  useEffect(() => {
    api<Staff>("/staff/auth/me")
      .then(async (principal) => {
        setStaff(principal);
        await refresh(principal);
      })
      .catch(() => setStaff(null));
  }, [refresh]);

  async function run<T>(
    action: () => Promise<T>,
    success: string,
    options?: {
      refresh?: boolean;
      onSuccess?: (result: T) => void;
    },
  ) {
    setError("");
    setMessage("");
    try {
      const result = await action();
      options?.onSuccess?.(result);
      if (options?.refresh !== false) {
        await refresh(staff);
      }
      setMessage(success);
      return result;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Əməliyyat alınmadı");
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
      setError(caught instanceof Error ? caught.message : "Giriş alınmadı");
      return null;
    });
    if (principal === null) return;
    setError("");
    setStaff(principal);
    await refresh(principal);
    setMessage("Giriş uğurludur");
  }

  async function addBarcode(barcode: string) {
    if (barcode.trim().length < 4) return;
    setError("");
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
    setMessage(`Barkod qəbul olundu: ${lookup.variant.sku}`);
  }

  async function openOrder(id: string) {
    setError("");
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
        const response = await fetch(`${API}/reports/exports/${id}/download`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as ApiError;
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
        ...(recentSale.paymentMethod === "CARD"
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
          setError(caught instanceof Error ? caught.message : "Skan alınmadı"),
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

  if (staff === null) {
    return (
      <main id="staff-content" className="auth-shell" tabIndex={-1}>
        <form className="operation-card login-card" onSubmit={login}>
          <p className="overline">Təhlükəsiz staff sərhədi</p>
          <h1>Operator girişi</h1>
          <label>
            İş e-poçtu
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            Şifrə
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={12}
              required
            />
          </label>
          <button type="submit">Daxil ol</button>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </form>
      </main>
    );
  }

  const subtotal = posItems.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.quantity,
    0,
  );

  return (
    <main id="staff-content" tabIndex={-1}>
      <section className="office-intro">
        <p className="breadcrumb">Daxili sistem / Kataloq, stok və POS</p>
        <div className="intro-grid">
          <div>
            <p className="overline">{staff.role}</p>
            <h1>{staff.displayName}</h1>
          </div>
          <button
            className="secondary"
            onClick={() =>
              run(
                () => api("/staff/auth/logout", { method: "POST" }),
                "Sessiya bağlandı",
                {
                  refresh: false,
                  onSuccess: () => {
                    setStaff(null);
                    setActiveShift(null);
                    setPosItems([]);
                    setRecentSale(null);
                    setRecentReturn(null);
                  },
                },
              )
            }
          >
            Çıxış
          </button>
        </div>
        {message && (
          <p className="form-success" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </section>

      <section className="operation-grid" aria-label="İdarəetmə əməliyyatları">
        {canCatalog && (
          <form
            className="operation-card"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void run(
                () =>
                  api("/catalog/categories", {
                    method: "POST",
                    body: JSON.stringify({
                      name: form.get("name"),
                      slug: form.get("slug"),
                      status: "ACTIVE",
                    }),
                  }),
                "Kateqoriya yaradıldı",
              );
            }}
          >
            <h2>Kateqoriya yarat</h2>
            <label>
              Ad <input name="name" required maxLength={120} />
            </label>
            <label>
              Slug
              <input name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
            </label>
            <button type="submit">Yarat</button>
          </form>
        )}

        {canCatalog && (
          <form
            className="operation-card"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void run(
                () =>
                  api("/catalog/brands", {
                    method: "POST",
                    body: JSON.stringify({
                      name: form.get("name"),
                      slug: form.get("slug"),
                      status: "ACTIVE",
                    }),
                  }),
                "Brend yaradıldı",
              );
            }}
          >
            <h2>Brend yarat</h2>
            <label>
              Ad <input name="name" required maxLength={120} />
            </label>
            <label>
              Slug
              <input name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
            </label>
            <button type="submit">Yarat</button>
          </form>
        )}

        {canCatalog && (
          <form
            className="operation-card"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void run(
                () =>
                  api("/catalog/products", {
                    method: "POST",
                    body: JSON.stringify({
                      categoryId: form.get("categoryId"),
                      brandId: form.get("brandId") || undefined,
                      name: form.get("name"),
                      slug: form.get("slug"),
                      status: "ACTIVE",
                    }),
                  }),
                "Məhsul yaradıldı",
              );
            }}
          >
            <h2>Məhsul yarat</h2>
            <label>
              Kateqoriya
              <select name="categoryId" required>
                <option value="">Seçin</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Brend
              <select name="brandId" defaultValue="">
                <option value="">Seçilməsin</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ad <input name="name" required />
            </label>
            <label>
              Slug
              <input name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
            </label>
            <button type="submit">Yarat</button>
          </form>
        )}

        {canCatalog && canPrice && (
          <form
            className="operation-card"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const productId = String(form.get("productId"));
              void run(
                () =>
                  api(`/catalog/products/${productId}/variants`, {
                    method: "POST",
                    body: JSON.stringify({
                      sku: form.get("sku"),
                      barcode: form.get("barcode") || undefined,
                      name: form.get("name"),
                      attributes: {},
                      price: form.get("price"),
                      status: "ACTIVE",
                    }),
                  }),
                "SKU və barkod yaradıldı",
              );
            }}
          >
            <h2>Variant / SKU yarat</h2>
            <label>
              Məhsul
              <select name="productId" required>
                <option value="">Seçin</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Variant adı <input name="name" required />
            </label>
            <label>
              SKU
              <input name="sku" pattern="[A-Z0-9][A-Z0-9._-]{1,63}" required />
            </label>
            <label>
              Barkod <input name="barcode" pattern="[0-9A-Za-z-]{4,64}" />
            </label>
            <label>
              Qiymət (AZN)
              <input
                name="price"
                inputMode="decimal"
                pattern="(0|[1-9][0-9]*)(\.[0-9]{1,2})?"
                required
              />
            </label>
            <button type="submit">Yarat</button>
          </form>
        )}

        {canCatalog && (
          <form
            className="operation-card"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const productId = String(form.get("productId"));
              void run(
                () =>
                  api(`/catalog/products/${productId}/media`, {
                    method: "POST",
                    body: JSON.stringify({
                      objectKey: form.get("objectKey"),
                      mimeType: form.get("mimeType"),
                      byteSize: Number(form.get("byteSize")),
                      altText: form.get("altText"),
                      sortOrder: Number(form.get("sortOrder") || 0),
                    }),
                  }),
                "Media metadata qeydiyyata alındı",
              );
            }}
          >
            <h2>Media qeydiyyatı</h2>
            <p className="card-note">
              Bu əməliyyat private storage açarını məhsula bağlayır və audit
              yazır.
            </p>
            <label>
              Məhsul
              <select name="productId" required>
                <option value="">Seçin</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Object key
              <input
                name="objectKey"
                pattern="[A-Za-z0-9/_-]+\.[A-Za-z0-9]+"
                required
              />
            </label>
            <label>
              MIME type
              <input name="mimeType" placeholder="image/jpeg" required />
            </label>
            <label>
              Byte size
              <input name="byteSize" type="number" min={1} required />
            </label>
            <label>
              Alt text
              <input name="altText" maxLength={300} required />
            </label>
            <label>
              Sıra
              <input name="sortOrder" type="number" min={0} defaultValue={0} />
            </label>
            <button type="submit">Qeyd et</button>
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

      {(canCatalogRead || canInventoryRead || canAudit) && (
        <section className="phase-two-section" id="catalog-operations" aria-label="Kataloq və stok">
          <div className="pos-header">
            <div>
              <p className="overline">Phase 2 / Acceptance visibility</p>
              <h2>Kataloq, stok və audit görünüşü</h2>
            </div>
          </div>

          <div className="overview-grid">
            {canCatalogRead && (
              <article className="operation-card">
                <h2>Kataloq snapshot</h2>
                {products.length === 0 ? (
                  <p className="pos-empty">Hələ məhsul yoxdur.</p>
                ) : (
                  <div className="data-list">
                    {products.map((product) => (
                      <div key={product.id} className="data-row">
                        <div>
                          <strong>{product.name}</strong>
                          <p className="pos-meta">
                            {product.brand?.name ?? "Brendsiz"} ·{" "}
                            {product.variants.length} SKU · {product.media.length}{" "}
                            media
                          </p>
                          <div className="chip-row">
                            {product.variants.map((variant) => (
                              <span key={variant.id} className="data-chip">
                                {variant.sku}
                                {variant.barcode !== null
                                  ? ` / ${variant.barcode}`
                                  : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            )}

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

            {canInventoryRead && (
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

      {(canOrdersRead || canFulfill) && (
        <section className="orders-section" id="orders-section" aria-label="Sifariş və fulfillment">
          <div className="pos-header">
            <div>
              <p className="overline">Phase 4 / Fulfillment</p>
              <h2>Online sifariş əməliyyatları</h2>
            </div>
          </div>

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
                        {(selectedOrder.status === "CONFIRMED" ||
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

      {canReportsRead && (
        <section className="reports-section" id="reports-section" aria-label="Hesabatlar və export-lar">
          <div className="pos-header">
            <div>
              <p className="overline">Phase 6 / Reports</p>
              <h2>Hesabatlar və export-lar</h2>
            </div>
          </div>

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

      {(canOpenShift || canPos || canCloseShift) && (
        <section className="pos-section" id="pos-section" aria-label="POS və kassa">
          <div className="pos-header">
            <div>
              <p className="overline">Phase 5 / POS</p>
              <h2>Scanner-first kassa növbəsi</h2>
            </div>
            {activeShift !== null && (
              <div className="shift-pill">
                {activeShift.register.code} · {activeShift.status}
              </div>
            )}
          </div>

          <div className="operation-grid">
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
                              setPosItems((current) =>
                                current.filter(
                                  (entry) => entry.variantId !== item.variantId,
                                ),
                              )
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
                      setPaymentMethod(event.target.value as "CASH" | "CARD")
                    }
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">External terminal card</option>
                  </select>
                </label>
                {paymentMethod === "CARD" && (
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
                            ...(paymentMethod === "CARD"
                              ? { externalTerminalReference: terminalReference }
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
                  <p className="overline">Qeyri-fiskal receipt</p>
                  <h2>{recentSale.receiptNumber}</h2>
                </div>
                <button className="secondary" onClick={() => window.print()}>
                  Çap et
                </button>
              </div>
              <p className="pos-meta">
                Sale #{recentSale.saleNumber} · {recentSale.paymentMethod} ·{" "}
                {new Date(recentSale.createdAt).toLocaleString("az-AZ")}
              </p>
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
                  {recentSale.paymentMethod === "CARD" && (
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
    </main>
  );
}
