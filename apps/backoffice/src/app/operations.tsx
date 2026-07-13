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

type Category = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  variants: { id: string; sku: string; barcode: string | null }[];
};
type Location = { id: string; code: string; name: string };
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

export function Operations() {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [posItems, setPosItems] = useState<PosCartItem[]>([]);
  const [recentSale, setRecentSale] = useState<PosSale | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD">("CASH");
  const [terminalReference, setTerminalReference] = useState("");
  const [orderReason, setOrderReason] = useState("Staff workflow update");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const scannerBuffer = useRef("");
  const lastScanAt = useRef(0);
  const selectedOrderIdRef = useRef<string | null>(null);

  const canCatalog = staff?.permissions.includes("catalog.write") ?? false;
  const canPrice = staff?.permissions.includes("pricing.price-change") ?? false;
  const canReceipt = staff?.permissions.includes("inventory.receipt") ?? false;
  const canAdjust =
    staff?.permissions.includes("inventory.adjustment") ?? false;
  const canRegisterManage =
    staff?.permissions.includes("cash-register.manage") ?? false;
  const canOpenShift = staff?.permissions.includes("cash-shift.open") ?? false;
  const canCloseShift =
    staff?.permissions.includes("cash-shift.close") ?? false;
  const canCashMovement =
    staff?.permissions.includes("cash-shift.cash-movement") ?? false;
  const canApproveShift =
    staff?.permissions.includes("cash-shift.approve-discrepancy") ?? false;
  const canPos = staff?.permissions.includes("pos.sale") ?? false;
  const canOrdersRead = staff?.permissions.includes("orders.read") ?? false;
  const canFulfill = staff?.permissions.includes("fulfillment.write") ?? false;

  useEffect(() => {
    selectedOrderIdRef.current = selectedOrder?.id ?? null;
  }, [selectedOrder]);

  const refresh = useCallback(async (currentStaff: Staff | null) => {
    const permissions = currentStaff?.permissions ?? [];
    const allowRegisters =
      permissions.includes("cash-register.manage") ||
      permissions.includes("cash-shift.open");
    const allowShift =
      permissions.includes("cash-shift.open") ||
      permissions.includes("pos.sale") ||
      permissions.includes("cash-shift.close");
    const allowOrders = permissions.includes("orders.read");
    const [
      categoryPage,
      productPage,
      locationRows,
      registerRows,
      shiftRow,
      orderPage,
    ] = await Promise.all([
      api<{ items: Category[] }>("/catalog/categories?limit=100"),
      api<{ items: Product[] }>("/catalog/products?limit=100"),
      api<Location[]>("/inventory/locations"),
      currentStaff !== null && allowRegisters
        ? api<CashRegister[]>("/cash-register/registers")
        : Promise.resolve([]),
      currentStaff !== null && allowShift
        ? api<ActiveShift | null>("/cash-register/shifts/active")
        : Promise.resolve(null),
      currentStaff !== null && allowOrders
        ? api<{ items: OrderSummary[] }>("/orders?limit=12")
        : Promise.resolve({ items: [] }),
    ]);
    setCategories(categoryPage.items);
    setProducts(productPage.items);
    setLocations(locationRows);
    setRegisters(registerRows);
    setActiveShift(shiftRow);
    setOrders(orderPage.items);
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
  }, []);

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
          <h1>Backoffice girişi</h1>
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
                  api("/catalog/products", {
                    method: "POST",
                    body: JSON.stringify({
                      categoryId: form.get("categoryId"),
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
      </section>

      {(canOrdersRead || canFulfill) && (
        <section className="orders-section" aria-label="Sifariş və fulfillment">
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

      {(canOpenShift || canPos || canCloseShift) && (
        <section className="pos-section" aria-label="POS və kassa">
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
                          setPosItems([]);
                          setBarcodeInput("");
                          setTerminalReference("");
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
