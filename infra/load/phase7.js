import http from "k6/http";
import { check, fail } from "k6";

const baseUrl = (__ENV.BASE_URL || "http://127.0.0.1:3001/api/v1").replace(
  /\/$/,
  "",
);
const scenarios = {
  catalog: {
    executor: "constant-vus",
    exec: "catalogRead",
    vus: Number(__ENV.CATALOG_VUS || 10),
    duration: __ENV.DURATION || "30s",
  },
};

if (__ENV.VARIANT_ID && __ENV.DELIVERY_ZONE_ID) {
  scenarios.checkout = {
    executor: "constant-vus",
    exec: "cashCheckout",
    vus: Number(__ENV.CHECKOUT_VUS || 3),
    duration: __ENV.DURATION || "30s",
  };
}

if (__ENV.STAFF_EMAIL && __ENV.STAFF_PASSWORD && __ENV.POS_BARCODE) {
  scenarios.pos = {
    executor: "constant-vus",
    exec: "posBarcodeLookup",
    vus: Number(__ENV.POS_VUS || 5),
    duration: __ENV.DURATION || "30s",
  };
}

export const options = {
  scenarios,
  thresholds: {
    "http_req_failed{operation:catalog}": ["rate<0.01"],
    "http_req_duration{operation:catalog}": ["p(95)<400"],
    "http_req_failed{operation:checkout}": ["rate<0.01"],
    "http_req_duration{operation:checkout}": ["p(95)<1000"],
    "http_req_failed{operation:pos_lookup}": ["rate<0.01"],
    "http_req_duration{operation:pos_lookup}": ["p(95)<250"],
  },
};

const jsonHeaders = { "Content-Type": "application/json" };
let posAuthenticated = false;

export function catalogRead() {
  const response = http.get(`${baseUrl}/storefront/products?limit=24`, {
    tags: { operation: "catalog" },
  });
  check(response, {
    "catalog returns 200": (result) => result.status === 200,
    "catalog response is bounded": (result) => {
      const body = result.json();
      return Array.isArray(body.items) && body.items.length <= 24;
    },
  });
}

export function cashCheckout() {
  const cart = http.post(`${baseUrl}/storefront/cart`, "{}", {
    headers: jsonHeaders,
    tags: { operation: "checkout_setup" },
  });
  if (!check(cart, { "cart created": (result) => result.status === 201 }))
    return;

  const cartId = cart.json("id");
  const item = http.post(
    `${baseUrl}/storefront/cart/${cartId}/items`,
    JSON.stringify({ variantId: __ENV.VARIANT_ID, quantity: 1 }),
    { headers: jsonHeaders, tags: { operation: "checkout_setup" } },
  );
  if (!check(item, { "cart item added": (result) => result.status === 201 }))
    return;

  const response = http.post(
    `${baseUrl}/storefront/checkout/cash`,
    JSON.stringify({
      cartId,
      fulfillmentType: "DELIVERY",
      deliveryZoneId: __ENV.DELIVERY_ZONE_ID,
      recipientName: "Load Test",
      phone: "+994500000000",
      administrativeArea: "baku",
      addressLine: "Synthetic load test address",
    }),
    {
      headers: {
        ...jsonHeaders,
        "Idempotency-Key": `k6-${__VU}-${__ITER}-${cartId}`,
      },
      tags: { operation: "checkout" },
    },
  );
  check(response, {
    "checkout returns 201": (result) => result.status === 201,
  });
}

export function posBarcodeLookup() {
  if (!posAuthenticated) {
    const login = http.post(
      `${baseUrl}/staff/auth/login`,
      JSON.stringify({
        email: __ENV.STAFF_EMAIL,
        password: __ENV.STAFF_PASSWORD,
      }),
      {
        headers: jsonHeaders,
        tags: { operation: "pos_auth" },
      },
    );
    if (
      !check(login, {
        "staff login succeeds": (result) => result.status === 201,
      })
    ) {
      fail("POS load test requires valid non-production staff credentials");
    }
    posAuthenticated = true;
  }

  const response = http.get(
    `${baseUrl}/pos/lookup?barcode=${encodeURIComponent(__ENV.POS_BARCODE)}`,
    { tags: { operation: "pos_lookup" } },
  );
  check(response, {
    "barcode lookup returns 200": (result) => result.status === 200,
  });
}

export function handleSummary(data) {
  return {
    [__ENV.SUMMARY_EXPORT || ".artifacts/load/phase7-summary.json"]:
      JSON.stringify(data, null, 2),
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  const duration = data.metrics.http_req_duration?.values;
  const failed = data.metrics.http_req_failed?.values;
  return [
    "ITMarket Phase 7 load summary",
    `requests=${data.metrics.http_reqs?.values.count ?? 0}`,
    `p95_ms=${duration?.["p(95)"] ?? "n/a"}`,
    `failure_rate=${failed?.rate ?? "n/a"}`,
    "",
  ].join("\n");
}
