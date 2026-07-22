import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

type MockStaff = {
  id: string;
  displayName: string;
  role: string;
  permissions: string[];
};

type MockBrand = {
  id: string;
  name: string;
  slug?: string;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
};
type MockCategory = {
  id: string;
  name: string;
  slug?: string;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
};
type MockProduct = {
  id: string;
  name: string;
  slug: string;
  categoryId?: string;
  brand: { id: string; name: string } | null;
  requiredSpecs?: { label: string; value: string }[];
  variants: { id: string; sku: string; barcode: string | null; name: string }[];
  media: {
    id: string;
    objectKey: string;
    altText: string;
    mimeType: string;
    byteSize: number;
    sortOrder: number;
  }[];
};
type MockLocation = {
  id: string;
  code: string;
  name: string;
  type?: string;
};
type MockBalance = {
  id: string;
  onHand: number;
  reserved: number;
  updatedAt: string;
  variant: { sku: string; barcode: string | null; name: string };
  location: { code: string; name: string };
  quantityEnteredBy?: {
    id: string;
    displayName: string;
    email: string;
  } | null;
  quantityEnteredAt?: string | null;
};
type MockMovement = {
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
type MockAuditEntry = {
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
type MockReportExport = {
  id: string;
  reportType: "SALES" | "LOW_STOCK" | "INVENTORY_MOVEMENTS";
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  fileName: string;
  rowCount: number | null;
  errorMessage: string | null;
  createdAt: string;
};
type MockDeliveryZone = {
  id: string;
  code: string;
  name: string;
  fee: string;
  freeDeliveryMinimum: string | null;
  estimatedMinDays: number;
  estimatedMaxDays: number;
  coveredAdministrativeAreas: string[];
  active: boolean;
};
type MockPickupLocation = {
  id: string;
  code: string;
  name: string;
  addressLine: string;
  contactLabel: string | null;
  active: boolean;
  location: { id: string; code: string; name: string };
};

type MockApiOptions = {
  loginAs: MockStaff;
  seed?: {
    brands?: MockBrand[];
    categories?: MockCategory[];
    products?: MockProduct[];
    locations?: MockLocation[];
    balances?: MockBalance[];
    movements?: MockMovement[];
    auditEntries?: MockAuditEntry[];
    deliveryZones?: MockDeliveryZone[];
    pickupLocations?: MockPickupLocation[];
  };
};

const adminStaff: MockStaff = {
  id: "staff-admin",
  displayName: "Aysel Admin",
  role: "ADMIN",
  permissions: [
    "catalog.read",
    "catalog.write",
    "pricing.price-change",
    "inventory.read",
    "inventory.receipt",
    "inventory.adjustment",
    "inventory.transfer",
    "audit.read",
  ],
};

const viewerStaff: MockStaff = {
  id: "staff-viewer",
  displayName: "Rauf Viewer",
  role: "REPORT_VIEWER",
  permissions: ["catalog.read", "inventory.read", "audit.read"],
};

const reportViewerStaff: MockStaff = {
  id: "staff-report",
  displayName: "Nigar Reports",
  role: "REPORT_VIEWER",
  permissions: ["reports.read"],
};

const fulfillmentStaff: MockStaff = {
  id: "staff-fulfillment",
  displayName: "Leyla Fulfillment",
  role: "MANAGER",
  permissions: ["orders.read", "fulfillment.write"],
};

async function installBackofficeApiMock(
  page: Page,
  options: MockApiOptions,
) {
  let nextId = 1;
  let sessionStaff: MockStaff | null = null;
  const brands = [...(options.seed?.brands ?? [])];
  const categories = [...(options.seed?.categories ?? [])];
  const products = [...(options.seed?.products ?? [])];
  const locations = [...(options.seed?.locations ?? [])];
  const balances = [...(options.seed?.balances ?? [])];
  const movements = [...(options.seed?.movements ?? [])];
  const auditEntries = [...(options.seed?.auditEntries ?? [])];
  const deliveryZones = [...(options.seed?.deliveryZones ?? [])];
  const pickupLocations = [...(options.seed?.pickupLocations ?? [])];
  const reportExports: MockReportExport[] = [
    {
      id: "report-export-seed",
      reportType: "SALES",
      status: "COMPLETED",
      fileName: "report-sales-2026-07-14.csv",
      rowCount: 7,
      errorMessage: null,
      createdAt: now(),
    },
  ];

  function id(prefix: string) {
    nextId += 1;
    return `${prefix}-${nextId}`;
  }

  function now() {
    return "2026-07-14T15:00:00.000Z";
  }

  function json(route: Route, body: unknown, status = 200) {
    return route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  }

  function hasPermission(permission: string) {
    return sessionStaff?.permissions.includes(permission) ?? false;
  }

  function deny(route: Route, permission: string) {
    return json(
      route,
      {
        code: "HTTP_403",
        message: `${permission} icazəsi tələb olunur`,
      },
      403,
    );
  }

  function pushAudit(
    action: string,
    entityType: string,
    entityId: string,
    after: unknown,
  ) {
    auditEntries.unshift({
      id: id("audit"),
      action,
      entityType,
      entityId,
      actorType: "STAFF",
      actorId: sessionStaff?.id ?? null,
      before: null,
      after,
      createdAt: now(),
    });
  }

  function findVariant(variantId: string) {
    for (const product of products) {
      const variant = product.variants.find((entry) => entry.id === variantId);
      if (variant !== undefined) {
        return { product, variant };
      }
    }
    return null;
  }

  function movementVariantFromCatalog(variantInfo: {
    product: MockProduct;
    variant: MockProduct["variants"][number];
  }) {
    return {
      sku: variantInfo.variant.sku,
      barcode: variantInfo.variant.barcode,
      name: variantInfo.variant.name,
      product: {
        name: variantInfo.product.name,
        brand: variantInfo.product.brand,
      },
    };
  }

  function findProductByVariantSku(sku: string) {
    for (const product of products) {
      const variant = product.variants.find((entry) => entry.sku === sku);
      if (variant !== undefined) {
        return { product, variant };
      }
    }
    return null;
  }

  function balanceMatchesSearch(entry: MockBalance, rawSearch: string) {
    const search = rawSearch.trim().toLocaleLowerCase("az");
    if (search === "") {
      return true;
    }
    const catalog = findProductByVariantSku(entry.variant.sku);
    const haystack = [
      entry.variant.sku,
      entry.variant.name,
      entry.variant.barcode ?? "",
      catalog?.product.name ?? "",
      catalog?.product.brand?.name ?? "",
    ]
      .join(" ")
      .toLocaleLowerCase("az");
    const tokens = search.split(/\s+/u).filter((part) => part.length > 0);
    return tokens.every((token) => haystack.includes(token));
  }

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^.*\/api\/v1/, "");

    if (request.method() === "GET" && path === "/staff/auth/me") {
      if (sessionStaff === null) {
        return json(
          route,
          { code: "HTTP_401", message: "Unauthorized" },
          401,
        );
      }
      return json(route, sessionStaff);
    }

    if (request.method() === "POST" && path === "/staff/auth/login") {
      sessionStaff = options.loginAs;
      return json(route, sessionStaff);
    }

    if (request.method() === "POST" && path === "/staff/auth/logout") {
      sessionStaff = null;
      return json(route, {});
    }

    if (sessionStaff === null) {
      return json(route, { code: "HTTP_401", message: "Unauthorized" }, 401);
    }

    if (request.method() === "GET" && path === "/catalog/brands") {
      if (!hasPermission("catalog.read")) return deny(route, "catalog.read");
      return json(route, { items: brands });
    }

    if (request.method() === "POST" && path === "/catalog/brands") {
      if (!hasPermission("catalog.write")) return deny(route, "catalog.write");
      const payload = request.postDataJSON() as { name: string; slug?: string };
      const brand: MockBrand = {
        id: id("brand"),
        name: payload.name,
        slug: payload.slug ?? payload.name.toLowerCase().replace(/\s+/g, "-"),
        status: "ACTIVE",
      };
      brands.unshift(brand);
      pushAudit("catalog.brand.created", "Brand", brand.id, brand);
      return json(route, brand, 201);
    }

    const brandPatchMatch = path.match(/^\/catalog\/brands\/([^/]+)$/);
    if (request.method() === "PATCH" && brandPatchMatch !== null) {
      if (!hasPermission("catalog.write")) return deny(route, "catalog.write");
      const brandId = brandPatchMatch[1];
      const brand = brands.find((entry) => entry.id === brandId);
      if (brand === undefined) {
        return json(route, { code: "HTTP_404", message: "Not found" }, 404);
      }
      const payload = request.postDataJSON() as {
        name?: string;
        slug?: string;
        status?: MockBrand["status"];
      };
      Object.assign(brand, payload);
      pushAudit("catalog.brand.updated", "Brand", brand.id, brand);
      return json(route, brand);
    }

    if (request.method() === "DELETE" && brandPatchMatch !== null) {
      if (!hasPermission("catalog.write")) return deny(route, "catalog.write");
      const brandId = brandPatchMatch[1];
      const brandIndex = brands.findIndex((entry) => entry.id === brandId);
      if (brandIndex === -1) {
        return json(route, { code: "HTTP_404", message: "Not found" }, 404);
      }
      const [removed] = brands.splice(brandIndex, 1);
      pushAudit("catalog.brand.archived", "Brand", removed.id, removed);
      return json(route, removed);
    }

    if (request.method() === "GET" && path === "/catalog/categories") {
      if (!hasPermission("catalog.read")) return deny(route, "catalog.read");
      return json(route, { items: categories });
    }

    if (request.method() === "POST" && path === "/catalog/categories") {
      if (!hasPermission("catalog.write")) return deny(route, "catalog.write");
      const payload = request.postDataJSON() as { name: string };
      const category = { id: id("category"), name: payload.name };
      categories.unshift(category);
      pushAudit("catalog.category.created", "Category", category.id, category);
      return json(route, category, 201);
    }

    if (request.method() === "POST" && path === "/catalog/categories/reorder") {
      if (!hasPermission("catalog.write")) return deny(route, "catalog.write");
      const payload = request.postDataJSON() as { orderedIds: string[] };
      const ordered = payload.orderedIds
        .map((categoryId) => categories.find((entry) => entry.id === categoryId))
        .filter((entry): entry is MockCategory => entry !== undefined);
      categories.splice(0, categories.length, ...ordered);
      pushAudit("catalog.category.reordered", "Category", "root", {
        orderedIds: payload.orderedIds,
      });
      return json(route, { orderedIds: payload.orderedIds });
    }

    const categoryPatchMatch = path.match(/^\/catalog\/categories\/([^/]+)$/);
    if (request.method() === "PATCH" && categoryPatchMatch !== null) {
      if (!hasPermission("catalog.write")) return deny(route, "catalog.write");
      const categoryId = categoryPatchMatch[1];
      const category = categories.find((entry) => entry.id === categoryId);
      if (category === undefined) {
        return json(route, { code: "HTTP_404", message: "Not found" }, 404);
      }
      const payload = request.postDataJSON() as {
        name?: string;
        slug?: string;
        status?: MockCategory["status"];
      };
      Object.assign(category, payload);
      pushAudit("catalog.category.updated", "Category", category.id, category);
      return json(route, category);
    }

    if (request.method() === "GET" && path === "/catalog/products") {
      if (!hasPermission("catalog.read")) return deny(route, "catalog.read");
      return json(route, { items: products });
    }

    if (request.method() === "POST" && path === "/catalog/products") {
      if (!hasPermission("catalog.write")) return deny(route, "catalog.write");
      const payload = request.postDataJSON() as {
        name: string;
        slug?: string;
        brandId?: string;
        categoryId?: string;
        requiredSpecs?: { label: string; value: string }[];
      };
      const brand =
        payload.brandId !== undefined && payload.brandId !== ""
          ? brands.find((entry) => entry.id === payload.brandId) ?? null
          : null;
      const product: MockProduct = {
        id: id("product"),
        name: payload.name,
        slug: payload.slug ?? payload.name.toLowerCase().replace(/\s+/g, "-"),
        categoryId: payload.categoryId,
        brand: brand === null ? null : { id: brand.id, name: brand.name },
        requiredSpecs: payload.requiredSpecs ?? [],
        variants: [],
        media: [],
      };
      products.unshift(product);
      pushAudit("catalog.product.created", "Product", product.id, product);
      return json(route, product, 201);
    }

    const productPatchMatch = path.match(/^\/catalog\/products\/([^/]+)$/);
    if (request.method() === "PATCH" && productPatchMatch !== null) {
      if (!hasPermission("catalog.write")) return deny(route, "catalog.write");
      const productId = productPatchMatch[1];
      const product = products.find((entry) => entry.id === productId);
      if (product === undefined) {
        return json(route, { code: "HTTP_404", message: "Not found" }, 404);
      }
      const payload = request.postDataJSON() as {
        name?: string;
        slug?: string;
        brandId?: string;
        categoryId?: string;
        requiredSpecs?: { label: string; value: string }[];
      };
      if (payload.name !== undefined) {
        product.name = payload.name;
      }
      if (payload.slug !== undefined) {
        product.slug = payload.slug;
      }
      if (payload.categoryId !== undefined) {
        product.categoryId = payload.categoryId;
      }
      if (payload.requiredSpecs !== undefined) {
        product.requiredSpecs = payload.requiredSpecs;
      }
      if (payload.brandId !== undefined) {
        const brand =
          payload.brandId === ""
            ? null
            : brands.find((entry) => entry.id === payload.brandId) ?? null;
        product.brand =
          brand === null ? null : { id: brand.id, name: brand.name };
      }
      pushAudit("catalog.product.updated", "Product", product.id, product);
      return json(route, product);
    }

    const productVariantMatch = path.match(/^\/catalog\/products\/([^/]+)\/variants$/);
    if (request.method() === "POST" && productVariantMatch !== null) {
      if (!hasPermission("catalog.write")) return deny(route, "catalog.write");
      if (!hasPermission("pricing.price-change")) {
        return deny(route, "pricing.price-change");
      }
      const product = products.find((entry) => entry.id === productVariantMatch[1]);
      if (product === undefined) {
        return json(route, { code: "HTTP_404", message: "Product tapılmadı" }, 404);
      }
      const payload = request.postDataJSON() as {
        name: string;
        sku: string;
        barcode?: string;
      };
      const variant = {
        id: id("variant"),
        sku: payload.sku,
        barcode: payload.barcode ?? null,
        name: payload.name,
      };
      product.variants.push(variant);
      pushAudit("catalog.variant.created", "ProductVariant", variant.id, variant);
      return json(route, variant, 201);
    }

    if (request.method() === "GET" && path === "/inventory/locations") {
      if (!hasPermission("inventory.read")) return deny(route, "inventory.read");
      return json(route, locations);
    }

    if (request.method() === "POST" && path === "/inventory/locations") {
      if (!hasPermission("inventory.adjustment")) {
        return deny(route, "inventory.adjustment");
      }
      const payload = request.postDataJSON() as { code: string; name: string };
      const location = { id: id("location"), code: payload.code, name: payload.name };
      locations.unshift(location);
      pushAudit("inventory.location.created", "Location", location.id, location);
      return json(route, location, 201);
    }

    if (request.method() === "GET" && path === "/inventory/balances") {
      if (!hasPermission("inventory.read")) return deny(route, "inventory.read");
      const search = (url.searchParams.get("search") ?? "").trim();
      const locationId = url.searchParams.get("locationId") ?? "";
      const variantId = url.searchParams.get("variantId") ?? "";
      const includeZero = url.searchParams.get("includeZero") !== "false";
      const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));
      const limit = Math.max(1, Number(url.searchParams.get("limit") ?? 25));

      let filtered = balances.filter((entry) => {
        if (locationId !== "") {
          const location = locations.find((item) => item.id === locationId);
          if (location === undefined || entry.location.code !== location.code) {
            return false;
          }
        }
        if (variantId !== "") {
          const variantInfo = findVariant(variantId);
          if (
            variantInfo === null ||
            entry.variant.sku !== variantInfo.variant.sku
          ) {
            return false;
          }
        }
        if (!includeZero && entry.onHand === 0 && entry.reserved === 0) {
          return false;
        }
        if (!balanceMatchesSearch(entry, search)) {
          return false;
        }
        return true;
      });

      const summary = filtered.reduce(
        (acc, entry) => ({
          onHand: acc.onHand + entry.onHand,
          reserved: acc.reserved + entry.reserved,
        }),
        { onHand: 0, reserved: 0 },
      );
      const items = filtered.slice(offset, offset + limit);
      return json(route, {
        items,
        total: filtered.length,
        summary: {
          ...summary,
          available: summary.onHand - summary.reserved,
        },
      });
    }

    if (request.method() === "GET" && path === "/inventory/movements") {
      if (!hasPermission("inventory.read")) return deny(route, "inventory.read");
      return json(route, movements);
    }

    if (request.method() === "GET" && path === "/inventory/reconciliation") {
      if (!hasPermission("inventory.adjustment")) {
        return deny(route, "inventory.adjustment");
      }
      return json(route, { healthy: true, mismatches: [] });
    }

    if (request.method() === "POST" && path === "/inventory/receipts") {
      if (!hasPermission("inventory.receipt")) {
        return deny(route, "inventory.receipt");
      }
      const payload = request.postDataJSON() as {
        variantId: string;
        locationId: string;
        quantity: number;
        sourceType: string;
        sourceDocumentId: string;
        reason: string;
      };
      const variantInfo = findVariant(payload.variantId);
      const location = locations.find((entry) => entry.id === payload.locationId);
      if (variantInfo === null || location === undefined) {
        return json(route, { code: "HTTP_404", message: "Entity tapılmadı" }, 404);
      }

      const balance =
        balances.find(
          (entry) =>
            entry.variant.sku === variantInfo.variant.sku &&
            entry.location.code === location.code,
        ) ??
        (() => {
          const created: MockBalance = {
            id: id("balance"),
            onHand: 0,
            reserved: 0,
            updatedAt: now(),
            variant: {
              sku: variantInfo.variant.sku,
              barcode: variantInfo.variant.barcode,
              name: variantInfo.variant.name,
            },
            location: {
              code: location.code,
              name: location.name,
              type: location.type,
            },
          };
          balances.unshift(created);
          return created;
        })();

      balance.onHand += payload.quantity;
      balance.updatedAt = now();
      const entryTimestamp = now();
      if (sessionStaff !== null) {
        balance.quantityEnteredBy = {
          id: sessionStaff.id,
          displayName: sessionStaff.displayName,
          email: `${sessionStaff.id}@mock.itmarket`,
        };
        balance.quantityEnteredAt = entryTimestamp;
      }
      const movement: MockMovement = {
        id: id("movement"),
        type: "RECEIPT",
        quantityDelta: payload.quantity,
        sourceType: payload.sourceType,
        sourceDocumentId: payload.sourceDocumentId,
        reason: payload.reason,
        transferGroupId: null,
        actorStaff:
          sessionStaff !== null
            ? {
                id: sessionStaff.id,
                displayName: sessionStaff.displayName,
                email: `${sessionStaff.id}@mock.itmarket`,
              }
            : null,
        createdAt: entryTimestamp,
        variant: movementVariantFromCatalog(variantInfo),
      };
      movements.unshift(movement);
      pushAudit("inventory.receipt.created", "InventoryMovement", movement.id, movement);
      return json(route, movement, 201);
    }

    if (request.method() === "POST" && path === "/inventory/adjustments") {
      if (!hasPermission("inventory.adjustment")) {
        return deny(route, "inventory.adjustment");
      }
      const payload = request.postDataJSON() as {
        variantId: string;
        locationId: string;
        quantity: number;
        sourceType: string;
        sourceDocumentId: string;
        reason: string;
      };
      if (payload.quantity === 0) {
        return json(
          route,
          { code: "HTTP_400", message: "Adjustment cannot be zero" },
          400,
        );
      }
      const variantInfo = findVariant(payload.variantId);
      const location = locations.find((entry) => entry.id === payload.locationId);
      if (variantInfo === null || location === undefined) {
        return json(route, { code: "HTTP_404", message: "Entity tapılmadı" }, 404);
      }

      const balance =
        balances.find(
          (entry) =>
            entry.variant.sku === variantInfo.variant.sku &&
            entry.location.code === location.code,
        ) ??
        (() => {
          const created: MockBalance = {
            id: id("balance"),
            onHand: 0,
            reserved: 0,
            updatedAt: now(),
            variant: {
              sku: variantInfo.variant.sku,
              barcode: variantInfo.variant.barcode,
              name: variantInfo.variant.name,
            },
            location: {
              code: location.code,
              name: location.name,
              type: location.type,
            },
          };
          balances.unshift(created);
          return created;
        })();

      const nextOnHand = balance.onHand + payload.quantity;
      if (nextOnHand - balance.reserved < 0) {
        return json(
          route,
          { code: "HTTP_409", message: "Negative available stock is forbidden" },
          409,
        );
      }

      balance.onHand = nextOnHand;
      balance.updatedAt = now();
      const entryTimestamp = now();
      if (sessionStaff !== null && payload.quantity > 0) {
        balance.quantityEnteredBy = {
          id: sessionStaff.id,
          displayName: sessionStaff.displayName,
          email: `${sessionStaff.id}@mock.itmarket`,
        };
        balance.quantityEnteredAt = entryTimestamp;
      }
      const movement: MockMovement = {
        id: id("movement"),
        type: "ADJUSTMENT",
        quantityDelta: payload.quantity,
        sourceType: payload.sourceType,
        sourceDocumentId: payload.sourceDocumentId,
        reason: payload.reason,
        transferGroupId: null,
        actorStaff:
          sessionStaff !== null
            ? {
                id: sessionStaff.id,
                displayName: sessionStaff.displayName,
                email: `${sessionStaff.id}@mock.itmarket`,
              }
            : null,
        createdAt:
          sessionStaff !== null && payload.quantity > 0
            ? entryTimestamp
            : now(),
        variant: movementVariantFromCatalog(variantInfo),
      };
      movements.unshift(movement);
      pushAudit(
        "inventory.adjustment.created",
        "InventoryMovement",
        movement.id,
        movement,
      );
      return json(route, movement, 201);
    }

    if (request.method() === "GET" && path === "/audit") {
      if (!hasPermission("audit.read")) return deny(route, "audit.read");
      return json(route, auditEntries);
    }

    if (request.method() === "GET" && path === "/reports/sales") {
      if (!hasPermission("reports.read")) return deny(route, "reports.read");
      const from = url.searchParams.get("from") ?? "2026-07-14";
      const to = url.searchParams.get("to") ?? from;
      return json(route, {
        range: { from, to, timeZone: "Asia/Baku" },
        summary: {
          transactionCount: 4,
          quantity: 6,
          grossSales: "5120.00",
          discountTotal: "120.00",
          deliveryFeeTotal: "10.00",
          taxTotal: "0.00",
          refundTotal: "320.00",
          netSales: "4810.00",
        },
        byChannel: [
          { channel: "ONLINE", transactionCount: 3, netSales: "4335.00" },
          { channel: "POS", transactionCount: 1, netSales: "475.00" },
        ],
        byPaymentMethod: [
          { paymentMethod: "CARD", transactionCount: 2, netSales: "3010.00" },
          { paymentMethod: "CASH", transactionCount: 2, netSales: "1800.00" },
        ],
        byProduct: [
          {
            variantId: "variant-report-1",
            sku: "NBK-TPX1",
            productName: "ThinkPad X1 Carbon",
            variantName: "14 inch / 32GB",
            quantity: 3,
            netSales: "3499.00",
          },
        ],
        notes: [
          "Refund totals reflect succeeded refund records in the selected Baku business date range.",
          "Storefront COD orders are included when they are confirmed and have no online payment row.",
        ],
      });
    }

    if (request.method() === "GET" && path === "/reports/inventory/low-stock") {
      if (!hasPermission("reports.read")) return deny(route, "reports.read");
      return json(route, {
        threshold: 5,
        items: [
          {
            variantId: "variant-report-low",
            sku: "NBK-LOW",
            productName: "Yoga Slim",
            variantName: "16GB / 512GB",
            locationCode: "WH-LOW",
            available: 2,
          },
        ],
      });
    }

    if (request.method() === "GET" && path === "/reports/exports") {
      if (!hasPermission("reports.read")) return deny(route, "reports.read");
      return json(route, { items: reportExports });
    }

    if (request.method() === "POST" && path === "/reports/exports") {
      if (!hasPermission("reports.read")) return deny(route, "reports.read");
      const payload = request.postDataJSON() as {
        reportType: "SALES" | "LOW_STOCK" | "INVENTORY_MOVEMENTS";
        from?: string;
        to?: string;
      };
      const suffix =
        payload.from && payload.to ? `${payload.from}-to-${payload.to}` : "all";
      const created: MockReportExport = {
        id: id("report-export"),
        reportType: payload.reportType,
        status: "COMPLETED",
        fileName: `report-${payload.reportType.toLowerCase()}-${suffix}.csv`,
        rowCount: payload.reportType === "LOW_STOCK" ? 1 : 7,
        errorMessage: null,
        createdAt: now(),
      };
      reportExports.unshift(created);
      return json(route, created, 201);
    }

    const reportDownloadMatch = path.match(/^\/reports\/exports\/([^/]+)\/download$/);
    if (request.method() === "GET" && reportDownloadMatch !== null) {
      if (!hasPermission("reports.read")) return deny(route, "reports.read");
      const item = reportExports.find((entry) => entry.id === reportDownloadMatch[1]);
      if (item === undefined) {
        return json(route, { code: "HTTP_404", message: "Export tapılmadı" }, 404);
      }
      return route.fulfill({
        status: 200,
        contentType: "text/csv",
        headers: {
          "content-disposition": `attachment; filename="${item.fileName}"`,
        },
        body: "section,primaryKey,label,netSales\nsummary,,TOTAL,4810.00\n",
      });
    }

    if (request.method() === "GET" && path === "/cash-register/registers") {
      return json(route, []);
    }

    if (request.method() === "GET" && path === "/cash-register/shifts/active") {
      return json(route, null);
    }

    if (request.method() === "GET" && path === "/fulfillment/delivery-zones") {
      if (
        !hasPermission("orders.read") &&
        !hasPermission("fulfillment.write")
      ) {
        return deny(route, "orders.read");
      }
      return json(route, deliveryZones);
    }

    if (request.method() === "POST" && path === "/fulfillment/delivery-zones") {
      if (!hasPermission("fulfillment.write")) {
        return deny(route, "fulfillment.write");
      }
      const payload = request.postDataJSON() as {
        code: string;
        name: string;
        fee: string;
        freeDeliveryMinimum?: string;
        estimatedMinDays: number;
        estimatedMaxDays: number;
        coveredAdministrativeAreas: string[];
      };
      const zone: MockDeliveryZone = {
        id: id("delivery-zone"),
        code: payload.code,
        name: payload.name,
        fee: payload.fee,
        freeDeliveryMinimum: payload.freeDeliveryMinimum ?? null,
        estimatedMinDays: payload.estimatedMinDays,
        estimatedMaxDays: payload.estimatedMaxDays,
        coveredAdministrativeAreas: payload.coveredAdministrativeAreas,
        active: true,
      };
      deliveryZones.unshift(zone);
      pushAudit("fulfillment.delivery-zone.created", "delivery_zone", zone.id, zone);
      return json(route, zone, 201);
    }

    const deliveryZoneMatch = path.match(/^\/fulfillment\/delivery-zones\/([^/]+)$/);
    if (request.method() === "PATCH" && deliveryZoneMatch !== null) {
      if (!hasPermission("fulfillment.write")) {
        return deny(route, "fulfillment.write");
      }
      const zone = deliveryZones.find((entry) => entry.id === deliveryZoneMatch[1]);
      if (zone === undefined) {
        return json(route, { code: "HTTP_404", message: "Zone tapılmadı" }, 404);
      }
      const payload = request.postDataJSON() as Partial<MockDeliveryZone>;
      Object.assign(zone, payload);
      pushAudit(
        "fulfillment.delivery-zone.updated",
        "delivery_zone",
        zone.id,
        zone,
      );
      return json(route, zone);
    }

    if (request.method() === "GET" && path === "/fulfillment/pickup-locations") {
      if (
        !hasPermission("orders.read") &&
        !hasPermission("fulfillment.write")
      ) {
        return deny(route, "orders.read");
      }
      return json(route, pickupLocations);
    }

    if (request.method() === "POST" && path === "/fulfillment/pickup-locations") {
      if (!hasPermission("fulfillment.write")) {
        return deny(route, "fulfillment.write");
      }
      const payload = request.postDataJSON() as {
        code: string;
        name: string;
        locationId: string;
        addressLine: string;
        contactLabel?: string;
      };
      const location =
        locations.find((entry) => entry.id === payload.locationId) ??
        ({ id: payload.locationId, code: "STORE-1", name: "Mağaza" } as MockLocation);
      const pickup: MockPickupLocation = {
        id: id("pickup"),
        code: payload.code,
        name: payload.name,
        addressLine: payload.addressLine,
        contactLabel: payload.contactLabel ?? null,
        active: true,
        location,
      };
      pickupLocations.unshift(pickup);
      pushAudit(
        "fulfillment.pickup-location.created",
        "pickup_location",
        pickup.id,
        pickup,
      );
      return json(route, pickup, 201);
    }

    if (request.method() === "GET" && path === "/orders/counts") {
      return json(route, { new: 0, packaging: 0, ready: 0, all: 0 });
    }

    if (request.method() === "GET" && path === "/orders") {
      return json(route, { items: [] });
    }

    return json(route, { code: "HTTP_404", message: `Mock tapılmadı: ${path}` }, 404);
  });
}

async function login(page: Page) {
  await page.getByLabel("İş e-poçtu").fill("admin@itmarket.test");
  await page.getByLabel("Şifrə").fill("super-secure-password");
  await page.getByRole("button", { name: "Daxil ol" }).click();
}

test("staff login has accessible form semantics", async ({ page }) => {
  await page.route("**/api/v1/staff/auth/me", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ code: "HTTP_401", message: "Unauthorized" }),
    }),
  );
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "Backoffice girişi" }),
  ).toBeVisible();
  await expect(page.getByLabel("İş e-poçtu")).toBeVisible();
  await expect(page.getByLabel("Şifrə")).toHaveAttribute(
    "autocomplete",
    "current-password",
  );

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("skip link moves focus to staff content", async ({ page }) => {
  await page.route("**/api/v1/staff/auth/me", (route) =>
    route.fulfill({ status: 401, body: "{}" }),
  );
  await page.goto("/");
  await page.keyboard.press("Tab");

  const skipLink = page.getByRole("link", { name: "Əsas məzmuna keç" });
  await expect(skipLink).toBeFocused();
  await skipLink.press("Enter");
  await expect(page.locator("#staff-content")).toBeFocused();
});

test("admin can create catalog item, assign barcode, receive stock, and inspect trail", async ({
  page,
}) => {
  await installBackofficeApiMock(page, {
    loginAs: adminStaff,
    seed: {
      brands: [{ id: "brand-lenovo", name: "Lenovo" }],
      locations: [
        {
          id: "location-wh-1",
          code: "WH-1",
          name: "Mərkəzi anbar",
          type: "WAREHOUSE",
        },
      ],
    },
  });
  await page.goto("/");
  await login(page);

  await page.goto("/catalog/categories?create=category");
  const categoryForm = page.locator("#catalog-category-form");
  await categoryForm.getByLabel("Ad").fill("Noutbuklar");
  await categoryForm.getByLabel("Slug").fill("noutbuklar");
  await categoryForm.getByRole("button", { name: "Yarat" }).click();
  await expect(page.getByRole("status")).toContainText("Əsas kateqoriya yaradıldı");

  await page.goto("/catalog/products?create=product");
  const productForm = page.locator("#catalog-product-form");
  await productForm.getByLabel("Model").fill("ThinkPad X1 Carbon");
  await productForm.getByLabel("Brend").selectOption({ label: "Lenovo" });
  await productForm.getByLabel("Slug").fill("thinkpad-x1-carbon");
  await productForm
    .getByLabel("Əsas kateqoriya")
    .selectOption({ label: "Noutbuklar" });
  await productForm.getByRole("button", { name: "Xüsusiyyət əlavə et" }).click();
  await productForm
    .getByLabel("Xüsusiyyət 1 — başlıq")
    .fill("Daimi yaddaş");
  await productForm.getByLabel("Xüsusiyyət 1 — dəyər").fill("512 GB SSD");
  await productForm.getByRole("button", { name: "Xüsusiyyət əlavə et" }).click();
  await productForm
    .getByLabel("Xüsusiyyət 2 — başlıq")
    .fill("Müvəqqəti yaddaş");
  await productForm.getByLabel("Xüsusiyyət 2 — dəyər").fill("32 GB");
  await expect(productForm.getByLabel("SKU")).toHaveValue("LEN-TPX1C-512G-32G");
  await productForm.getByLabel("Barkod").fill("99887766");
  await productForm.getByLabel("Cari qiymət (AZN)").fill("4299.99");
  await productForm.getByRole("button", { name: "Məhsul və SKU yarat" }).click();
  await expect(page.getByRole("status")).toContainText("Məhsul və SKU yaradıldı");

  const autoSku = "LEN-TPX1C-512G-32G";

  await page.goto("/catalog/products?create=product");
  const duplicateProductForm = page.locator("#catalog-product-form");
  await duplicateProductForm.getByRole("combobox", { name: "Model" }).fill("ThinkPad");
  await duplicateProductForm
    .getByRole("listbox", { name: "Mövcud modellər" })
    .getByRole("option", { name: /ThinkPad X1 Carbon/ })
    .click();
  await expect(duplicateProductForm.getByLabel("Model")).toHaveValue(
    "ThinkPad X1 Carbon",
  );
  await expect(duplicateProductForm.getByLabel("Slug")).toHaveValue(
    "thinkpad-x1-carbon",
  );
  await duplicateProductForm.getByRole("link", { name: "Məhsula bax" }).click();
  await expect(page.getByLabel("Məhsul detalları")).toBeVisible();
  await expect(
    page.getByRole("strong", { name: "ThinkPad X1 Carbon" }),
  ).toBeVisible();

  await page.goto("/inventory/receipt");
  const receiptForm = page.locator("form.inventory-receipt-form");
  await receiptForm.getByLabel("Barkod").fill("99887766");
  await expect(receiptForm.getByLabel("Brend")).toHaveValue("Lenovo");
  await expect(receiptForm.getByLabel("Model")).toHaveValue("ThinkPad X1 Carbon");
  await expect(receiptForm.getByLabel("Variant")).toBeVisible();
  await receiptForm
    .getByLabel("Məntəqə")
    .selectOption({ label: "Anbar" });
  await receiptForm.getByLabel("Miqdar").fill("5");
  await receiptForm
    .getByLabel("Mənbə")
    .fill("Global Tech GmbH, idxal — Almaniya");
  await receiptForm.getByLabel("Sənəd nömrəsi").fill("GRN-2026-001");
  await receiptForm.getByLabel("Qeyd").fill("İlkin stok qəbulu");
  await receiptForm.getByRole("button", { name: "Qəbul et" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Məhsul qəbulu ledger-ə yazıldı",
  );

  await page.goto("/inventory/adjustment");
  const adjustmentForm = page.locator("form.inventory-adjustment-form");
  await page
    .locator(".inventory-adjustment-stock-table")
    .getByRole("button", { name: "Seç" })
    .first()
    .click();
  await expect(adjustmentForm.getByText("Seçilmiş variant")).toBeVisible();
  await expect(adjustmentForm.getByText("Cari qalıq (ledger)")).toBeVisible();
  await expect(adjustmentForm.getByText("Qalıq miqdarı")).toBeVisible();
  await adjustmentForm.getByLabel("Düzəliş fərqi (+ / −)").check();
  await adjustmentForm.getByLabel("Miqdar (+ / −)").fill("-1");
  await adjustmentForm.getByLabel("Mənbə növü").selectOption("STOCK_COUNT");
  await adjustmentForm.getByLabel("Sənəd nömrəsi").fill("ADJ-2026-001");
  await adjustmentForm.getByLabel("Səbəb").fill("Inventarizasiya fərqi");
  await adjustmentForm.getByRole("button", { name: "Düzəliş et" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Qalıq düzəlişi ledger-ə yazıldı",
  );

  await page.goto("/inventory/balance");
  await expect(page.getByText(`${autoSku} / 99887766`)).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "4", exact: true }).first(),
  ).toBeVisible();
});

test("report viewer can inspect sales metrics and download exports", async ({
  page,
}) => {
  await installBackofficeApiMock(page, { loginAs: reportViewerStaff });
  await page.goto("/");
  await login(page);

  await expect(
    page.getByRole("heading", { level: 2, name: "Hesabatlar və export-lar" }),
  ).toBeVisible();
  const reportSummary = page.locator(".reports-section .summary-grid").first();
  await expect(reportSummary).toContainText("Tranzaksiya");
  await expect(reportSummary).toContainText("AZN 4,810.00");
  await expect(page.getByText("NBK-TPX1")).toBeVisible();
  await expect(page.getByText("NBK-LOW")).toBeVisible();

  await page.getByRole("button", { name: "Sales CSV export" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Report export növbəyə əlavə edildi",
  );
  await expect(
    page.getByText("report-sales-2026-07-14-to-2026-07-14.csv"),
  ).toBeVisible();

  const seededExport = page
    .locator(".export-row")
    .filter({ has: page.getByText("report-sales-2026-07-14.csv") });
  const downloadPromise = page.waitForEvent("download");
  await seededExport.getByRole("button", { name: "Yüklə" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("report-sales-2026-07-14.csv");

  await expect(
    page.getByRole("heading", { level: 2, name: "Kateqoriya yarat" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { level: 2, name: "Scanner-first kassa növbəsi" }),
  ).toHaveCount(0);
});

test("read-only staff can inspect phase 2 state but cannot see write actions", async ({
  page,
}) => {
  await installBackofficeApiMock(page, {
    loginAs: viewerStaff,
    seed: {
      products: [
        {
          id: "product-seed",
          name: "MacBook Air",
          slug: "macbook-air",
          brand: null,
          variants: [
            {
              id: "variant-seed",
              sku: "NBK-MBA",
              barcode: "44556677",
              name: "13 inch",
            },
          ],
          media: [],
        },
      ],
      locations: [{ id: "location-seed", code: "WH-2", name: "Şimal anbarı" }],
      balances: [
        {
          id: "balance-seed",
          onHand: 3,
          reserved: 0,
          updatedAt: "2026-07-14T15:00:00.000Z",
          variant: { sku: "NBK-MBA", barcode: "44556677", name: "13 inch" },
          location: { code: "WH-2", name: "Şimal anbarı" },
        },
      ],
      movements: [
        {
          id: "movement-seed",
          type: "RECEIPT",
          quantityDelta: 3,
          sourceType: "PURCHASE_ORDER",
          sourceDocumentId: "GRN-READ-ONLY",
          reason: "Yalnız görünüş üçün seed",
          transferGroupId: null,
          actorStaff: {
            id: "staff-admin",
            displayName: "Admin",
            email: "admin@mock.itmarket",
          },
          createdAt: "2026-07-14T15:00:00.000Z",
          variant: {
            sku: "NBK-MBA",
            barcode: "44556677",
            name: "13 inch",
            product: {
              name: "MacBook Air",
              brand: null,
            },
          },
        },
      ],
      auditEntries: [
        {
          id: "audit-seed",
          action: "inventory.receipt.created",
          entityType: "InventoryMovement",
          entityId: "movement-seed",
          actorType: "STAFF",
          actorId: "staff-admin",
          before: null,
          after: { sourceDocumentId: "GRN-READ-ONLY" },
          createdAt: "2026-07-14T15:00:00.000Z",
        },
      ],
    },
  });
  await page.goto("/");
  await login(page);

  const movementsCard = page
    .locator("article.operation-card")
    .filter({
      has: page.getByRole("heading", { level: 2, name: "Son stok hərəkətləri" }),
    });

  await expect(
    page.getByRole("heading", { level: 2, name: "Kataloq, stok və audit görünüşü" }),
  ).toBeVisible();
  await expect(page.getByText("NBK-MBA / 44556677")).toBeVisible();
  await expect(page.getByText("On-hand 3")).toBeVisible();
  await expect(movementsCard.getByText("GRN-READ-ONLY")).toBeVisible();

  await expect(
    page.getByRole("heading", { level: 2, name: "Kateqoriya yarat" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { level: 2, name: "Variant / SKU yarat" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { level: 2, name: "Stok qəbulu" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { level: 2, name: "Stok düzəlişi" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { level: 2, name: "Ledger reconciliation" }),
  ).toHaveCount(0);
});

test("fulfillment manager can create a delivery zone from the orders panel", async ({
  page,
}) => {
  await installBackofficeApiMock(page, {
    loginAs: fulfillmentStaff,
    seed: {
      locations: [{ id: "location-store", code: "STORE-1", name: "Gənclik mağazası" }],
      deliveryZones: [
        {
          id: "zone-seed",
          code: "BAKU-CENTER",
          name: "Bakı mərkəz",
          fee: "5.00",
          freeDeliveryMinimum: "100.00",
          estimatedMinDays: 1,
          estimatedMaxDays: 2,
          coveredAdministrativeAreas: ["Bakı"],
          active: true,
        },
      ],
    },
  });
  await page.goto("/");
  await login(page);

  await expect(
    page.getByRole("heading", { level: 2, name: "Çatdırılma zonaları" }),
  ).toBeVisible();
  await expect(page.getByText("BAKU-CENTER · Bakı mərkəz")).toBeVisible();

  const zoneForm = page
    .locator("article.operation-card")
    .filter({
      has: page.getByRole("heading", { level: 2, name: "Çatdırılma zonaları" }),
    })
    .locator("form")
    .first();

  await zoneForm.getByLabel("Kod").fill("sumqayit");
  await zoneForm.getByLabel("Ad").fill("Sumqayıt zonası");
  await zoneForm.getByLabel("Tarif (AZN)").fill("7.50");
  await zoneForm.getByLabel("Min gün").fill("1");
  await zoneForm.getByLabel("Max gün").fill("3");
  await zoneForm
    .getByLabel("Əhatə olunan regionlar (vergüllə)")
    .fill("Sumqayıt, Bakı");
  await zoneForm.getByRole("button", { name: "Zona əlavə et" }).click();

  await expect(page.getByText("Çatdırılma zonası yaradıldı")).toBeVisible();
  await expect(page.getByText("SUMQAYIT · Sumqayıt zonası")).toBeVisible();
});
