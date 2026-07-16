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
    id: "pickup-ganjlik",
    code: "GANJLIK",
    name: "Gənclik pickup",
    addressLine: "Fətəli Xan Xoyski 111",
    workingHours: "Hər gün 10:00-20:00",
    stockLocation: {
      id: "location-main",
      code: "WH-1",
      name: "Mərkəzi anbar",
    },
  },
];

const paymentOptions = {
  provider: "mock",
  sandbox: true,
  methods: [
    { method: "CARD", label: "Bank kartı", installmentMonths: [] },
    {
      method: "INSTALLMENT",
      label: "Taksit",
      installmentMonths: [3, 6],
      minimumAmount: "300.00",
    },
  ],
};

const carts = new Map();
const orders = new Map();
const paymentAttempts = new Map();
let nextOrderNumber = 1;

function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
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
    paymentMethod: order.paymentMethod,
    provider: order.provider,
    sandbox: true,
  };
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
      sendJson(response, 201, {
        id: randomUUID(),
        orderNumber: `ITM-E2E-${String(nextOrderNumber++).padStart(4, "0")}`,
        grandTotal:
          payload.fulfillmentType === "DELIVERY" ? "3504.00" : product.price,
        currency: "AZN",
      });
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
        paymentMethod: payload.paymentMethod,
        provider: "mock",
      };
      orders.set(orderNumber, order);
      paymentAttempts.set(attemptToken, orderNumber);

      const checkoutUrl = new URL("/checkout/mock-provider", STOREFRONT_ORIGIN);
      checkoutUrl.searchParams.set("attemptToken", attemptToken);
      checkoutUrl.searchParams.set("orderNumber", orderNumber);
      checkoutUrl.searchParams.set("paymentMethod", payload.paymentMethod);
      if (payload.installmentMonths) {
        checkoutUrl.searchParams.set(
          "installmentMonths",
          String(payload.installmentMonths),
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
