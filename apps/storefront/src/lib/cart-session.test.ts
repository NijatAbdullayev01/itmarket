import { describe, expect, it } from "vitest";

import { checkoutIdempotencyCookieName } from "./cart-session";

describe("checkoutIdempotencyCookieName", () => {
  it("scopes checkout idempotency cookies per cart", () => {
    expect(checkoutIdempotencyCookieName("cart-a")).toBe(
      "itmarket_checkout_idempotency_cart-a",
    );
    expect(checkoutIdempotencyCookieName("cart-b")).toBe(
      "itmarket_checkout_idempotency_cart-b",
    );
  });
});
