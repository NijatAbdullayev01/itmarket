import { permanentRedirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCatalogSlugRedirect = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  permanentRedirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {
    isNotFound = true;
  },
  ApiUnavailableError: class ApiUnavailableError extends Error {},
  getCatalogSlugRedirect,
}));

import { redirectIfCatalogSlugMoved } from "./catalog-slug-redirect";

describe("redirectIfCatalogSlugMoved", () => {
  beforeEach(() => {
    getCatalogSlugRedirect.mockReset();
    vi.mocked(permanentRedirect).mockClear();
  });

  it("redirects rename to the new entity path", async () => {
    getCatalogSlugRedirect.mockResolvedValue({
      entityType: "PRODUCT",
      oldSlug: "old-phone",
      newSlug: "new-phone",
      path: "/products/new-phone",
    });

    await expect(
      redirectIfCatalogSlugMoved("product", "old-phone"),
    ).rejects.toThrow("REDIRECT:/products/new-phone");
  });

  it("redirects archive targetPath even when newSlug is archived-*", async () => {
    getCatalogSlugRedirect.mockResolvedValue({
      entityType: "PRODUCT",
      oldSlug: "old-phone",
      newSlug: "archived-uuid",
      path: "/categories/phones",
    });

    await expect(
      redirectIfCatalogSlugMoved("product", "old-phone"),
    ).rejects.toThrow("REDIRECT:/categories/phones");
  });

  it("returns false when redirect path matches the requested slug path", async () => {
    getCatalogSlugRedirect.mockResolvedValue({
      entityType: "PRODUCT",
      oldSlug: "phone",
      newSlug: "phone",
      path: "/products/phone",
    });

    await expect(
      redirectIfCatalogSlugMoved("product", "phone"),
    ).resolves.toBe(false);
    expect(permanentRedirect).not.toHaveBeenCalled();
  });
});
