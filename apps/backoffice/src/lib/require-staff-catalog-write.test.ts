import { afterEach, describe, expect, it, vi } from "vitest";

import { requireStaffCatalogWrite } from "./require-staff-catalog-write";

describe("requireStaffCatalogWrite", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rejects requests without a session cookie", async () => {
    const response = await requireStaffCatalogWrite(
      new Request("http://localhost:3002/api/catalog-product-image", {
        method: "POST",
      }),
    );

    expect(response?.status).toBe(401);
  });

  it("rejects unauthenticated staff sessions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Unauthorized" }), {
          status: 401,
        }),
      ),
    );

    const response = await requireStaffCatalogWrite(
      new Request("http://localhost:3002/api/catalog-product-image", {
        method: "POST",
        headers: { cookie: "itmarket_staff_access=stale" },
      }),
    );

    expect(response?.status).toBe(401);
  });

  it("rejects staff without catalog.write", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            permissions: ["catalog.read", "orders.read"],
          }),
          { status: 200 },
        ),
      ),
    );

    const response = await requireStaffCatalogWrite(
      new Request("http://localhost:3002/api/catalog-product-image", {
        method: "POST",
        headers: { cookie: "itmarket_staff_access=ok" },
      }),
    );

    expect(response?.status).toBe(403);
  });

  it("allows staff with catalog.write", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            permissions: ["catalog.read", "catalog.write"],
          }),
          { status: 200 },
        ),
      ),
    );

    const response = await requireStaffCatalogWrite(
      new Request("http://localhost:3002/api/catalog-product-image", {
        method: "POST",
        headers: { cookie: "itmarket_staff_access=ok" },
      }),
    );

    expect(response).toBeNull();
  });
});
