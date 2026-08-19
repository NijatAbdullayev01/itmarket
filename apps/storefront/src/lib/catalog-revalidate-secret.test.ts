import { describe, expect, it } from "vitest";

import { catalogRevalidateSecret } from "./catalog-revalidate-secret";

describe("catalogRevalidateSecret", () => {
  it("does not echo APP_SECRET in the cache-bust header value", () => {
    const appSecret = "local_application_secret_change_me_123456";
    expect(catalogRevalidateSecret(appSecret, "")).not.toBe(appSecret);
  });
});
