import { afterEach, describe, expect, it, vi } from "vitest";

import { uploadCatalogBrandLogoFile } from "./upload-catalog-brand-logo";

describe("uploadCatalogBrandLogoFile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("retries once after refreshing an expired staff session", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Giriş tələb olunur" }), {
          status: 401,
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 201 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            objectKey: "/images/brands/test.png",
            mimeType: "image/png",
            byteSize: 42,
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const file = new File([new Uint8Array([1, 2, 3])], "logo.png", {
      type: "image/png",
    });

    const result = await uploadCatalogBrandLogoFile(file);

    expect(result).toEqual({
      objectKey: "/images/brands/test.png",
      mimeType: "image/png",
      byteSize: 42,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/catalog-brand-logo");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/v1/staff/auth/rotate");
    expect(fetchMock.mock.calls[2]?.[0]).toBe("/api/catalog-brand-logo");
  });
});
