import { describe, expect, it } from "vitest";

import {
  BACKOFFICE_MISSING_BRAND_LABEL,
  getBackofficeProductDisplayTitle,
} from "./product-display-title";

describe("getBackofficeProductDisplayTitle", () => {
  it("shows brand before model like catalog create form", () => {
    expect(
      getBackofficeProductDisplayTitle({
        name: "iPhone 17 Pro",
        brand: { id: "1", name: "Apple" },
      }),
    ).toBe("Apple iPhone 17 Pro");
  });

  it("shows missing brand label before model", () => {
    expect(
      getBackofficeProductDisplayTitle({
        name: "Unknown device",
        brand: null,
      }),
    ).toBe(`${BACKOFFICE_MISSING_BRAND_LABEL} Unknown device`);
  });

  it("appends variant color after brand and model in catalog list", () => {
    expect(
      getBackofficeProductDisplayTitle(
        {
          name: "iPhone 17 Pro",
          brand: { id: "1", name: "Apple" },
        },
        {
          name: "256 GB / 8 GB",
          attributes: { Rəng: "Titan Mavi" },
        },
      ),
    ).toBe("Apple iPhone 17 Pro Titan Mavi");
  });

  it("keeps phone category titles with variant color", () => {
    expect(
      getBackofficeProductDisplayTitle(
        {
          name: "iPhone 17 Pro",
          brand: { id: "1", name: "Apple" },
          category: { slug: "iphone", name: "iPhone", parentSlug: "apple" },
        },
        {
          name: "256 GB / 8 GB",
          attributes: { Rəng: "Titan Mavi" },
        },
      ),
    ).toBe("Apple iPhone 17 Pro Titan Mavi");
  });

  it("does not append accessory color onto Dell catalog titles", () => {
    expect(
      getBackofficeProductDisplayTitle(
        {
          name: "Dell Optical Mouse MS116",
          brand: { id: "2", name: "Dell" },
          category: {
            slug: "sican",
            name: "Siçan",
            parent: { slug: "computer" },
          },
        },
        {
          name: "Standart",
          attributes: { Rəng: "Qara" },
        },
      ),
    ).toBe("Dell Optical Mouse MS116");
  });
});
