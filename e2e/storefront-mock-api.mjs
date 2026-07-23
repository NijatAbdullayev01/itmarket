import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.STOREFRONT_MOCK_API_PORT ?? "3101");
const STOREFRONT_ORIGIN =
  process.env.STOREFRONT_ORIGIN ?? "http://127.0.0.1:3100";

const categories = [
  {
    id: "category-laptops",
    name: "Noutbuklar",
    slug: "noutbuklar",
    parentId: null,
  },
  {
    id: "category-phones",
    name: "Smartfonlar və aksesuarlar",
    slug: "smartfonlar",
    parentId: null,
  },
  {
    id: "category-gamer",
    name: "Gamer zona",
    slug: "gamer-zona",
    parentId: null,
  },
  {
    id: "category-apple",
    name: "Apple",
    slug: "apple",
    parentId: null,
  },
  {
    id: "category-monitors",
    name: "Monitorlar",
    slug: "monitorlar",
    parentId: null,
  },
  {
    id: "category-appliances",
    name: "Məişət texnikası",
    slug: "meiset-texnikasi",
    parentId: null,
  },
  {
    id: "category-network",
    name: "Şəbəkə avadanlıqları",
    slug: "sebeke-avadanliqlari",
    parentId: null,
  },
  {
    id: "category-security",
    name: "Təhlükəsizlik avadanlıqları",
    slug: "tehlukesizlik-avadanliqlari",
    parentId: null,
  },
];

const category = categories[0];

const brand = {
  id: "brand-lenovo",
  name: "Lenovo",
  slug: "lenovo",
};

const product = {
  id: "product-thinkpad",
  name: "ThinkPad X1 Carbon",
  slug: "thinkpad-x1-carbon",
  description: "Yüngül korpuslu biznes noutbuku.",
  category,
  brand,
  image: null,
  media: [],
  price: "3499.00",
  previousPrice: "3699.00",
  currency: "AZN",
  available: 5,
  reviewSummary: {
    averageRating: 4.5,
    count: 3,
  },
  reviews: [
    {
      id: "review-1",
      rating: 5,
      comment: "Çox yüngül və sürətli noutbukdur. Gündəlik iş üçün ideal seçimdir.",
      createdAt: "2026-06-12T10:00:00.000Z",
      authorName: "Rəşad M.",
    },
    {
      id: "review-2",
      rating: 4,
      comment: "Klaviatura rahatdır, batareya ömrü gözlədiyimdən yaxşıdır.",
      createdAt: "2026-05-28T14:30:00.000Z",
      authorName: "Leyla H.",
    },
    {
      id: "review-3",
      rating: 5,
      comment: null,
      createdAt: "2026-05-10T09:15:00.000Z",
      authorName: "Kamran A.",
    },
  ],
  defaultVariantId: "variant-thinkpad-14",
  variants: [
    {
      id: "variant-thinkpad-14",
      sku: "NBK-TPX1-14",
      barcode: "1234567890123",
      name: '14" / 32GB',
      attributes: { ekran: "14", ram: "32GB" },
      price: "3499.00",
      previousPrice: "3699.00",
      currency: "AZN",
      available: 5,
    },
  ],
};

const similarProduct = {
  id: "product-thinkpad-t14",
  name: "ThinkPad T14 Gen 4",
  slug: "thinkpad-t14-gen-4",
  description: "Gündəlik biznes işləri üçün etibarlı noutbuk.",
  category,
  brand,
  image: null,
  price: "2899.00",
  previousPrice: null,
  currency: "AZN",
  available: 7,
  defaultVariantId: "variant-thinkpad-t14",
  reviewSummary: {
    averageRating: null,
    count: 0,
  },
};

const companionProduct = {
  id: "product-monitor",
  name: "LG UltraWide 34WP85C",
  slug: "lg-ultrawide-34",
  description: "34\" QHD IPS panel, USB-C və HDR10.",
  category: categories[4],
  brand: { id: "brand-lg", name: "LG", slug: "lg" },
  image: null,
  price: "1299.00",
  previousPrice: "1499.00",
  currency: "AZN",
  available: 3,
  defaultVariantId: "variant-monitor",
  reviewSummary: {
    averageRating: 4,
    count: 12,
  },
};

const catalogProducts = [product, similarProduct, companionProduct];

const deliveryZones = [
  {
    id: "zone-baku",
    code: "BAKU",
    name: "Bakı",
    fee: "5.00",
    freeDeliveryMinimum: "4000.00",
    estimatedMinDays: 1,
    estimatedMaxDays: 2,
    coveredAdministrativeAreas: ["baku"],
  },
];

const pickupLocations = [
  {
    id: "2869690c-0000-4000-8000-000000000001",
    code: "GANJLIK",
    name: "28 may küçəsi 69C",
    addressLine: "28 may küçəsi 69C, Bakı",
    workingHours: "Hər gün 10:00-20:00",
    stockLocation: {
      id: "location-main",
      code: "ST-28MAY",
      name: "28 may küçəsi 69C",
    },
  },
];

const paymentOptions = {
  provider: "mock",
  sandbox: true,
  methods: [
    { method: "CARD", label: "Kartla ödə", installmentMonths: [] },
    {
      method: "INSTALLMENT",
      label: "Hissə-hissə al",
      installmentMonths: [3, 6, 9, 12, 18, 24],
    },
  ],
};

const carts = new Map();
const orders = new Map();
const paymentAttempts = new Map();
const customers = new Map();
const customerSessions = new Map();
const customerOrders = new Map();
let nextOrderNumber = 1;

const SESSION_COOKIE = "itmarket_customer_session";
const ORDER_CANCEL_REASON_MIN_LENGTH = 3;
const ORDER_CANCEL_REASON_MAX_LENGTH = 240;
const CUSTOMER_CANCELLABLE_ORDER_STATUSES = new Set([
  "PENDING_PAYMENT",
  "UNDER_REVIEW",
  "CONFIRMED",
]);

function sendJson(response, status, body, setCookieHeaders = []) {
  const headers = { "content-type": "application/json" };
  if (setCookieHeaders.length > 0) {
    headers["Set-Cookie"] = setCookieHeaders;
  }
  response.writeHead(status, headers);
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
    });
    request.on("end", () => {
      if (raw.trim() === "") {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function createCartSnapshot(cart) {
  const items = cart.items.map((entry) => {
    const variant = product.variants.find((item) => item.id === entry.variantId);
    const unitPrice = Number(variant.price);
    const previousUnitPrice =
      variant.previousPrice === null || variant.previousPrice === undefined
        ? null
        : Number(variant.previousPrice);
    const hasSale =
      previousUnitPrice !== null && previousUnitPrice > unitPrice;
    return {
      id: `${cart.id}-${entry.variantId}`,
      variantId: entry.variantId,
      productName: product.name,
      productSlug: product.slug,
      variantName: variant.name,
      sku: variant.sku,
      quantity: entry.quantity,
      unitPrice: variant.price,
      lineTotal: (unitPrice * entry.quantity).toFixed(2),
      linePreviousTotal: hasSale
        ? (previousUnitPrice * entry.quantity).toFixed(2)
        : null,
      currency: "AZN",
      available: variant.available,
    };
  });
  const subtotal = items
    .reduce((sum, entry) => sum + Number(entry.lineTotal), 0)
    .toFixed(2);
  return {
    id: cart.id,
    guestToken: cart.guestToken,
    status: cart.status,
    subtotal,
    currency: "AZN",
    items,
  };
}

function createCartFromGuestToken(guestToken) {
  for (const cart of carts.values()) {
    if (cart.guestToken === guestToken && cart.status === "ACTIVE") {
      return cart;
    }
  }
  const cart = {
    id: randomUUID(),
    guestToken: guestToken ?? randomUUID(),
    status: "ACTIVE",
    items: [],
  };
  carts.set(cart.id, cart);
  return cart;
}

function createOrderStatusSummary(order) {
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    fulfillmentType: order.fulfillmentType,
    paymentMethod: order.paymentMethod,
    provider: order.provider,
    sandbox: true,
  };
}

function parseCookieHeader(request, cookieName) {
  const raw = request.headers.cookie;
  if (typeof raw !== "string" || raw.trim() === "") {
    return undefined;
  }
  for (const part of raw.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === cookieName) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return undefined;
}

function resolveCustomerSession(request) {
  const token = parseCookieHeader(request, SESSION_COOKIE);
  if (token === undefined) {
    return undefined;
  }
  return customerSessions.get(token);
}

function buildSessionCookie(token) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict`;
}

function findCustomerByEmail(email) {
  if (typeof email !== "string") {
    return undefined;
  }
  return customers.get(email.trim().toLowerCase());
}

function createCustomerAccountRecord(input) {
  const email = input.email.trim().toLowerCase();
  const customer = {
    id: randomUUID(),
    email,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone ?? null,
    password: input.password,
  };
  customers.set(email, customer);
  customerOrders.set(customer.id, new Map());
  return customer;
}

function issueCustomerSession(customerId) {
  const token = randomUUID();
  customerSessions.set(token, customerId);
  return token;
}

function toCustomerOrderSummary(order) {
  const now = new Date().toISOString();
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    fulfillmentType: order.fulfillmentType,
    recipientName: order.recipientName,
    itemCount: order.itemCount ?? 1,
    grandTotal: order.grandTotal,
    currency: "AZN",
    createdAt: order.createdAt ?? now,
    updatedAt: order.updatedAt ?? now,
    cancelledByCustomer: order.cancelledByCustomer ?? false,
  };
}

function storeCustomerOrder(customerId, order) {
  const bucket = customerOrders.get(customerId);
  if (!bucket) {
    return;
  }
  bucket.set(order.id, toCustomerOrderSummary(order));
}

function resolveCheckoutCustomer(payload) {
  const sessionCustomerId = payload.sessionCustomerId;
  if (sessionCustomerId !== undefined) {
    return sessionCustomerId;
  }
  const customer = findCustomerByEmail(payload.email);
  return customer?.id;
}

function recordCheckoutOrder(payload, checkout) {
  const customerId = resolveCheckoutCustomer(payload);
  if (customerId === undefined) {
    return;
  }
  const now = new Date().toISOString();
  storeCustomerOrder(customerId, {
    id: checkout.id,
    orderNumber: checkout.orderNumber,
    status: checkout.status,
    paymentStatus: checkout.paymentStatus ?? "PENDING",
    fulfillmentStatus: checkout.fulfillmentStatus ?? "PENDING",
    fulfillmentType: payload.fulfillmentType,
    recipientName: payload.recipientName,
    itemCount: 1,
    grandTotal: checkout.grandTotal,
    createdAt: now,
    updatedAt: now,
  });
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://127.0.0.1:${PORT}`);
    const path = url.pathname;

    if (request.method === "GET" && path === "/api/v1/storefront/catalog/categories") {
      sendJson(response, 200, categories);
      return;
    }

    if (request.method === "GET" && path === "/api/v1/storefront/catalog/brands") {
      sendJson(response, 200, [brand]);
      return;
    }

    if (request.method === "GET" && path === "/api/v1/storefront/catalog/products") {
      const search = url.searchParams.get("search")?.toLowerCase();
      const categoryFilter = url.searchParams.get("category");
      const brandFilter = url.searchParams.get("brand");
      const sort = url.searchParams.get("sort");
      let items = catalogProducts.filter((entry) => {
        if (search) {
          const matchesSearch =
            entry.name.toLowerCase().includes(search) ||
            (entry.variants ?? []).some((variant) =>
              variant.sku.toLowerCase().includes(search),
            );
          if (!matchesSearch) return false;
        }
        if (categoryFilter && entry.category.slug !== categoryFilter) return false;
        if (brandFilter && entry.brand?.slug !== brandFilter) return false;
        return true;
      });
      if (sort === "name") {
        items = items.sort((left, right) => left.name.localeCompare(right.name));
      }
      sendJson(response, 200, { items, nextCursor: null });
      return;
    }

    const similarMatch = path.match(
      /^\/api\/v1\/storefront\/catalog\/products\/([^/]+)\/similar$/,
    );
    if (request.method === "GET" && similarMatch) {
      const source = catalogProducts.find((entry) => entry.slug === similarMatch[1]);
      if (!source) {
        sendJson(response, 404, { message: "Product tapılmadı" });
        return;
      }
      const items = catalogProducts.filter(
        (entry) =>
          entry.id !== source.id && entry.category.slug === source.category.slug,
      );
      sendJson(response, 200, { items });
      return;
    }

    const companionsMatch = path.match(
      /^\/api\/v1\/storefront\/catalog\/products\/([^/]+)\/companions$/,
    );
    if (request.method === "GET" && companionsMatch) {
      const source = catalogProducts.find((entry) => entry.slug === companionsMatch[1]);
      if (!source) {
        sendJson(response, 404, { message: "Product tapılmadı" });
        return;
      }
      const items = catalogProducts.filter(
        (entry) =>
          entry.id !== source.id && entry.category.slug !== source.category.slug,
      );
      sendJson(response, 200, { items });
      return;
    }

    if (
      request.method === "GET" &&
      path === `/api/v1/storefront/catalog/products/${product.slug}`
    ) {
      sendJson(response, 200, product);
      return;
    }

    if (request.method === "POST" && path === "/api/v1/storefront/cart") {
      const payload = await readJson(request);
      const cart = createCartFromGuestToken(payload.guestToken);
      sendJson(response, 201, {
        id: cart.id,
        guestToken: cart.guestToken,
        status: cart.status,
      });
      return;
    }

    const addItemMatch = path.match(/^\/api\/v1\/storefront\/cart\/([^/]+)\/items$/);
    if (request.method === "POST" && addItemMatch) {
      const cart = carts.get(addItemMatch[1]);
      if (!cart) {
        sendJson(response, 404, { message: "Cart tapılmadı" });
        return;
      }
      const payload = await readJson(request);
      const line = cart.items.find((entry) => entry.variantId === payload.variantId);
      if (line) {
        line.quantity = payload.quantity;
      } else {
        cart.items.push({ variantId: payload.variantId, quantity: payload.quantity });
      }
      sendJson(response, 201, createCartSnapshot(cart));
      return;
    }

    const removeItemMatch = path.match(
      /^\/api\/v1\/storefront\/cart\/([^/]+)\/items\/([^/]+)\/remove$/,
    );
    if (request.method === "POST" && removeItemMatch) {
      const cart = carts.get(removeItemMatch[1]);
      if (!cart) {
        sendJson(response, 404, { message: "Cart tapılmadı" });
        return;
      }
      cart.items = cart.items.filter((entry) => entry.variantId !== removeItemMatch[2]);
      sendJson(response, 200, createCartSnapshot(cart));
      return;
    }

    const cartMatch = path.match(/^\/api\/v1\/storefront\/cart\/([^/]+)$/);
    if (request.method === "GET" && cartMatch) {
      const cart = carts.get(cartMatch[1]);
      if (!cart) {
        sendJson(response, 404, { message: "Cart tapılmadı" });
        return;
      }
      sendJson(response, 200, createCartSnapshot(cart));
      return;
    }

    if (request.method === "GET" && path === "/api/v1/storefront/fulfillment/options") {
      const area = url.searchParams.get("administrativeArea")?.toLowerCase();
      const zones = area
        ? deliveryZones.filter((entry) =>
            entry.coveredAdministrativeAreas.includes(area),
          )
        : deliveryZones;
      sendJson(response, 200, {
        deliveryZones: zones.map(({ coveredAdministrativeAreas, ...entry }) => entry),
        pickupLocations,
      });
      return;
    }

    if (request.method === "GET" && path === "/api/v1/payments/options") {
      sendJson(response, 200, paymentOptions);
      return;
    }

    if (request.method === "POST" && path === "/api/v1/storefront/checkout/cash") {
      const payload = await readJson(request);
      const cart = carts.get(payload.cartId);
      if (!cart || cart.items.length === 0) {
        sendJson(response, 400, { message: "Səbət tapılmadı və ya boşdur" });
        return;
      }
      if (payload.fulfillmentType === "DELIVERY" && !payload.deliveryZoneId) {
        sendJson(response, 400, { message: "Delivery zone is required" });
        return;
      }
      if (
        payload.fulfillmentType === "DELIVERY" &&
        typeof payload.administrativeArea !== "string"
      ) {
        sendJson(response, 400, {
          message: "Administrative area is required for delivery",
        });
        return;
      }
      if (payload.fulfillmentType === "DELIVERY") {
        const selectedZone = deliveryZones.find(
          (entry) => entry.id === payload.deliveryZoneId,
        );
        const area = payload.administrativeArea.trim().toLowerCase();
        if (
          !selectedZone ||
          !selectedZone.coveredAdministrativeAreas.includes(area)
        ) {
          sendJson(response, 400, {
            message: "Selected delivery zone does not cover this administrative area",
          });
          return;
        }
      }
      if (payload.fulfillmentType === "PICKUP" && !payload.pickupLocationId) {
        sendJson(response, 400, { message: "Pickup location is required" });
        return;
      }
      cart.status = "CHECKED_OUT";
      const isInstallment = payload.paymentMethod === "INSTALLMENT";
      const orderId = randomUUID();
      const orderNumber = `ITM-E2E-${String(nextOrderNumber++).padStart(4, "0")}`;
      const status = isInstallment ? "UNDER_REVIEW" : "CONFIRMED";
      const grandTotal =
        payload.fulfillmentType === "DELIVERY" ? "3504.00" : product.price;
      const checkout = {
        id: orderId,
        orderNumber,
        status,
        paymentStatus: "PENDING",
        fulfillmentStatus: "RESERVED",
        grandTotal,
        currency: "AZN",
      };
      recordCheckoutOrder(
        {
          ...payload,
          sessionCustomerId: resolveCustomerSession(request),
        },
        checkout,
      );
      sendJson(response, 201, checkout);
      return;
    }

    if (request.method === "POST" && path === "/api/v1/storefront/credit-applications") {
      const payload = await readJson(request);
      const finCode =
        typeof payload.finCode === "string"
          ? payload.finCode.trim().toUpperCase()
          : "";
      const phone = typeof payload.phone === "string" ? payload.phone.trim() : "";
      if (!/^[A-Z0-9]{7}$/.test(finCode)) {
        sendJson(response, 400, { message: "FIN kod 7 simvoldan ibarət olmalıdır" });
        return;
      }
      if (phone.length < 7) {
        sendJson(response, 400, { message: "Telefon nömrəsi düzgün deyil" });
        return;
      }
      if (payload.variantId !== product.variants[0]?.id) {
        sendJson(response, 400, { message: "Məhsul variantı tapılmadı" });
        return;
      }
      const quantity = Number(payload.quantity ?? 1);
      const amount = (Number(product.price) * quantity).toFixed(2);
      sendJson(response, 201, {
        id: randomUUID(),
        status: "PENDING",
        amount,
        currency: "AZN",
      });
      return;
    }

    if (
      request.method === "POST" &&
      path === "/api/v1/storefront/product-availability-requests"
    ) {
      const payload = await readJson(request);
      const type = payload.type;
      const phone = typeof payload.phone === "string" ? payload.phone.trim() : "";
      if (type !== "STOCK_ALERT" && type !== "PREORDER") {
        sendJson(response, 400, { message: "Sorğu növü düzgün deyil" });
        return;
      }
      if (phone.length < 7) {
        sendJson(response, 400, { message: "Telefon nömrəsi düzgün deyil" });
        return;
      }
      if (payload.variantId !== product.variants[0]?.id) {
        sendJson(response, 400, { message: "Məhsul variantı tapılmadı" });
        return;
      }
      if (type === "STOCK_ALERT" && product.available > 0) {
        sendJson(response, 400, { message: "Məhsul artıq stokdadır" });
        return;
      }
      sendJson(response, 201, {
        id: randomUUID(),
        status: "PENDING",
        type,
        duplicate: false,
      });
      return;
    }

    if (request.method === "POST" && path === "/api/v1/storefront/checkout/online") {
      const payload = await readJson(request);
      const cart = carts.get(payload.cartId);
      if (!cart || cart.items.length === 0) {
        sendJson(response, 400, { message: "Səbət tapılmadı və ya boşdur" });
        return;
      }
      if (payload.paymentMethod !== "CARD" && payload.paymentMethod !== "INSTALLMENT") {
        sendJson(response, 400, { message: "Online payment method is invalid" });
        return;
      }
      if (payload.paymentMethod === "INSTALLMENT" && !payload.installmentMonths) {
        sendJson(response, 400, {
          message: "Installment month selection is required",
        });
        return;
      }
      if (payload.fulfillmentType === "DELIVERY" && !payload.deliveryZoneId) {
        sendJson(response, 400, { message: "Delivery zone is required" });
        return;
      }
      if (
        payload.fulfillmentType === "DELIVERY" &&
        typeof payload.administrativeArea !== "string"
      ) {
        sendJson(response, 400, {
          message: "Administrative area is required for delivery",
        });
        return;
      }
      if (payload.fulfillmentType === "DELIVERY") {
        const selectedZone = deliveryZones.find(
          (entry) => entry.id === payload.deliveryZoneId,
        );
        const area = payload.administrativeArea.trim().toLowerCase();
        if (
          !selectedZone ||
          !selectedZone.coveredAdministrativeAreas.includes(area)
        ) {
          sendJson(response, 400, {
            message: "Selected delivery zone does not cover this administrative area",
          });
          return;
        }
      }
      if (payload.fulfillmentType === "PICKUP" && !payload.pickupLocationId) {
        sendJson(response, 400, { message: "Pickup location is required" });
        return;
      }

      cart.status = "CHECKED_OUT";
      const orderNumber = `ITM-E2E-${String(nextOrderNumber++).padStart(4, "0")}`;
      const attemptToken = randomUUID();
      const order = {
        id: randomUUID(),
        orderNumber,
        orderStatus: "PENDING_PAYMENT",
        paymentStatus: "PENDING",
        fulfillmentStatus: "PENDING",
        fulfillmentType: payload.fulfillmentType,
        paymentMethod: payload.paymentMethod,
        provider: "mock",
      };
      orders.set(orderNumber, order);
      paymentAttempts.set(attemptToken, orderNumber);

      const checkoutUrl = new URL("/checkout/pay", STOREFRONT_ORIGIN);
      checkoutUrl.searchParams.set("attemptToken", attemptToken);
      checkoutUrl.searchParams.set("orderNumber", orderNumber);
      checkoutUrl.searchParams.set("paymentMethod", payload.paymentMethod);
      if (payload.installmentMonths) {
        checkoutUrl.searchParams.set(
          "installmentMonths",
          String(payload.installmentMonths),
        );
      }
      if (payload.installmentProvider) {
        checkoutUrl.searchParams.set(
          "installmentProvider",
          String(payload.installmentProvider),
        );
      }
      checkoutUrl.searchParams.set(
        "amount",
        payload.fulfillmentType === "DELIVERY" ? "3504.00" : product.price,
      );

      sendJson(response, 201, {
        id: order.id,
        orderNumber,
        grandTotal:
          payload.fulfillmentType === "DELIVERY" ? "3504.00" : product.price,
        currency: "AZN",
        checkoutUrl: checkoutUrl.toString(),
        paymentMethod: payload.paymentMethod,
        provider: "mock",
        sandbox: true,
      });
      return;
    }

    const continueMatch = path.match(
      /^\/api\/v1\/payments\/attempts\/([^/]+)\/continue$/,
    );
    if (request.method === "POST" && continueMatch) {
      const orderNumber = paymentAttempts.get(continueMatch[1]);
      const order = orderNumber ? orders.get(orderNumber) : undefined;
      if (!order) {
        sendJson(response, 400, { message: "Payment attempt not found" });
        return;
      }
      const payload = await readJson(request);
      if (payload.action === "proceed") {
        order.orderStatus = "CONFIRMED";
        order.paymentStatus = "PAID";
        order.fulfillmentStatus = "RESERVED";
      } else if (payload.action === "cancel") {
        order.orderStatus = "CANCELLED";
        order.paymentStatus = "CANCELLED";
        order.fulfillmentStatus = "CANCELLED";
      } else {
        sendJson(response, 400, { message: "Payment continue action is invalid" });
        return;
      }
      const statusUrl = new URL("/checkout/status", STOREFRONT_ORIGIN);
      statusUrl.searchParams.set("orderNumber", order.orderNumber);
      sendJson(response, 201, {
        nextUrl: statusUrl.toString(),
        kind: "status",
      });
      return;
    }

    const completeMockMatch = path.match(
      /^\/api\/v1\/payments\/mock\/attempts\/([^/]+)\/complete$/,
    );
    if (request.method === "POST" && completeMockMatch) {
      const orderNumber = paymentAttempts.get(completeMockMatch[1]);
      const order = orderNumber ? orders.get(orderNumber) : undefined;
      if (!order) {
        sendJson(response, 404, { message: "Mock payment attempt tapılmadı" });
        return;
      }
      const payload = await readJson(request);
      if (payload.scenario === "success") {
        order.orderStatus = "CONFIRMED";
        order.paymentStatus = "PAID";
        order.fulfillmentStatus = "RESERVED";
      } else if (payload.scenario === "failure") {
        order.orderStatus = "CANCELLED";
        order.paymentStatus = "FAILED";
        order.fulfillmentStatus = "CANCELLED";
      } else if (payload.scenario === "cancel") {
        order.orderStatus = "CANCELLED";
        order.paymentStatus = "CANCELLED";
        order.fulfillmentStatus = "CANCELLED";
      }
      sendJson(response, 201, createOrderStatusSummary(order));
      return;
    }

    const orderStatusMatch = path.match(/^\/api\/v1\/payments\/orders\/([^/]+)\/status$/);
    if (request.method === "GET" && orderStatusMatch) {
      const order = orders.get(orderStatusMatch[1]);
      if (!order) {
        sendJson(response, 404, { message: "Sifariş statusu tapılmadı" });
        return;
      }
      sendJson(response, 200, createOrderStatusSummary(order));
      return;
    }

    if (request.method === "POST" && path === "/api/v1/customer/auth/register") {
      const payload = await readJson(request);
      const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
      const password =
        typeof payload.password === "string" ? payload.password : "";
      const passwordConfirm =
        typeof payload.passwordConfirm === "string"
          ? payload.passwordConfirm
          : "";
      const firstName =
        typeof payload.firstName === "string" ? payload.firstName.trim() : "";
      const lastName =
        typeof payload.lastName === "string" ? payload.lastName.trim() : "";

      if (
        email === "" ||
        password === "" ||
        password !== passwordConfirm ||
        firstName.length < 2 ||
        lastName.length < 2 ||
        password.length < 8
      ) {
        sendJson(response, 400, { message: "Validation failed" });
        return;
      }
      if (customers.has(email)) {
        sendJson(response, 400, { message: "Customer account cannot be created" });
        return;
      }

      createCustomerAccountRecord({ email, password, firstName, lastName });
      sendJson(response, 201, { id: randomUUID(), email });
      return;
    }

    if (request.method === "POST" && path === "/api/v1/customer/auth/login") {
      const payload = await readJson(request);
      const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
      const password =
        typeof payload.password === "string" ? payload.password : "";
      const customer = customers.get(email);
      if (customer === undefined || customer.password !== password) {
        sendJson(response, 401, { message: "Invalid credentials" });
        return;
      }

      const token = issueCustomerSession(customer.id);
      sendJson(
        response,
        201,
        {
          id: customer.id,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
        },
        [buildSessionCookie(token)],
      );
      return;
    }

    if (request.method === "POST" && path === "/api/v1/customer/auth/logout") {
      const token = parseCookieHeader(request, SESSION_COOKIE);
      if (token !== undefined) {
        customerSessions.delete(token);
      }
      sendJson(response, 201, { loggedOut: true });
      return;
    }

    if (request.method === "GET" && path === "/api/v1/customer/me") {
      const customerId = resolveCustomerSession(request);
      if (customerId === undefined) {
        sendJson(response, 401, { message: "Unauthorized" });
        return;
      }
      const customer = [...customers.values()].find((entry) => entry.id === customerId);
      if (customer === undefined) {
        sendJson(response, 401, { message: "Unauthorized" });
        return;
      }
      sendJson(response, 200, {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
      });
      return;
    }

    if (request.method === "GET" && path === "/api/v1/customer/orders") {
      const customerId = resolveCustomerSession(request);
      if (customerId === undefined) {
        sendJson(response, 401, { message: "Unauthorized" });
        return;
      }
      const bucket = customerOrders.get(customerId);
      sendJson(response, 200, bucket ? [...bucket.values()] : []);
      return;
    }

    const cancelOrderMatch = path.match(
      /^\/api\/v1\/customer\/orders\/([^/]+)\/cancel$/,
    );
    if (request.method === "POST" && cancelOrderMatch) {
      const customerId = resolveCustomerSession(request);
      if (customerId === undefined) {
        sendJson(response, 401, { message: "Unauthorized" });
        return;
      }

      const payload = await readJson(request);
      const reason =
        typeof payload.reason === "string" ? payload.reason.trim() : "";
      if (
        reason.length < ORDER_CANCEL_REASON_MIN_LENGTH ||
        reason.length > ORDER_CANCEL_REASON_MAX_LENGTH
      ) {
        sendJson(response, 400, { message: "Validation failed" });
        return;
      }

      const bucket = customerOrders.get(customerId);
      const order = bucket?.get(cancelOrderMatch[1]);
      if (order === undefined) {
        sendJson(response, 404, { message: "Sifariş tapılmadı" });
        return;
      }
      if (!CUSTOMER_CANCELLABLE_ORDER_STATUSES.has(order.status)) {
        sendJson(response, 409, { message: "Bu sifariş artıq ləğv edilə bilməz" });
        return;
      }

      const updated = {
        ...order,
        status: "CANCELLED",
        paymentStatus: "CANCELLED",
        fulfillmentStatus: "CANCELLED",
        cancelledByCustomer: true,
        updatedAt: new Date().toISOString(),
      };
      bucket.set(order.id, updated);
      sendJson(response, 200, updated);
      return;
    }

    if (request.method === "POST" && path === "/api/v1/customer/carts/attach") {
      const customerId = resolveCustomerSession(request);
      if (customerId === undefined) {
        sendJson(response, 401, { message: "Unauthorized" });
        return;
      }
      sendJson(response, 201, { attached: true });
      return;
    }

    if (request.method === "GET" && path === "/api/v1/customer/addresses") {
      const customerId = resolveCustomerSession(request);
      if (customerId === undefined) {
        sendJson(response, 401, { message: "Unauthorized" });
        return;
      }
      sendJson(response, 200, []);
      return;
    }

    sendJson(response, 404, { message: `Mock endpoint tapılmadı: ${path}` });
  } catch (error) {
    sendJson(response, 500, {
      message: error instanceof Error ? error.message : "Unknown mock server error",
    });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`storefront mock api listening on ${PORT}`);
});
