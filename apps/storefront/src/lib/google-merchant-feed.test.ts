import { describe, expect, it } from "vitest";

import type { ProductSummary } from "./api";
import {
  buildMerchantFeedXml,
  buildMerchantItemXml,
  cdata,
  escapeXml,
} from "./google-merchant-feed";

const catalogImage: NonNullable<ProductSummary["image"]> = {
  id: "img-1",
  objectKey: "/media/products/iphone-15.jpg",
  altText: "iPhone 15",
  mimeType: "image/jpeg",
  byteSize: 12000,
  sortOrder: 0,
};

function summary(overrides: Partial<ProductSummary> = {}): ProductSummary {
  return {
    id: "product-1",
    name: "Apple iPhone 15 128GB Qara",
    slug: "iphone-15",
    description: "Telefon təsviri",
    seoDescription: "SEO təsvir",
    category: { name: "Telefonlar", slug: "telefonlar" },
    brand: { name: "Apple", slug: "apple" },
    image: catalogImage,
    price: "1999.00",
    previousPrice: null,
    currency: "AZN",
    available: 3,
    defaultVariantId: "variant-1",
    sku: "APL-IP15-128-QRA",
    barcode: "1234567890123",
    reviewSummary: { averageRating: null, count: 0 },
    ...overrides,
  };
}

describe("escapeXml / cdata", () => {
  it("escapes XML special characters", () => {
    expect(escapeXml("a&b<c>\"d\"'e")).toBe(
      "a&amp;b&lt;c&gt;&quot;d&quot;&apos;e",
    );
  });

  it("splits CDATA when value contains ]]> ", () => {
    expect(cdata("before]]>after")).toBe(
      "<![CDATA[before]]]]><![CDATA[>after]]>",
    );
  });
});

describe("buildMerchantItemXml", () => {
  const origin = new URL("https://it-market.org/");

  it("emits variant id, item_group_id, mpn and gtin", () => {
    const xml = buildMerchantItemXml(origin, summary());
    expect(xml).toContain("<g:id>variant-1</g:id>");
    expect(xml).toContain("<g:item_group_id>product-1</g:item_group_id>");
    expect(xml).toContain("<g:mpn>APL-IP15-128-QRA</g:mpn>");
    expect(xml).toContain("<g:gtin>1234567890123</g:gtin>");
    expect(xml).not.toContain("identifier_exists");
    expect(xml).toContain("Apple iPhone 15 128GB Qara");
    expect(xml).toContain("SEO təsvir");
    expect(xml).toContain(
      "<g:image_link>https://it-market.org/media/products/iphone-15.jpg</g:image_link>",
    );
  });

  it("keeps mpn without identifier_exists when barcode is missing", () => {
    const xml = buildMerchantItemXml(
      origin,
      summary({ barcode: null, sku: "SKU-1" }),
    );
    expect(xml).not.toContain("identifier_exists");
    expect(xml).not.toContain("<g:gtin>");
    expect(xml).toContain("<g:mpn>SKU-1</g:mpn>");
  });

  it("sets identifier_exists false only when gtin and mpn are both missing", () => {
    const xml = buildMerchantItemXml(
      origin,
      summary({ barcode: null, sku: null }),
    );
    expect(xml).toContain("<g:identifier_exists>false</g:identifier_exists>");
    expect(xml).not.toContain("<g:gtin>");
    expect(xml).not.toContain("<g:mpn>");
  });

  it("emits sale_price when previousPrice is higher", () => {
    const xml = buildMerchantItemXml(
      origin,
      summary({ price: "1499.00", previousPrice: "1999.00" }),
    );
    expect(xml).toContain("<g:price>1999.00 AZN</g:price>");
    expect(xml).toContain("<g:sale_price>1499.00 AZN</g:sale_price>");
  });

  it("skips items without variant id, price, or real image", () => {
    expect(
      buildMerchantItemXml(origin, summary({ defaultVariantId: null })),
    ).toBe("");
    expect(buildMerchantItemXml(origin, summary({ price: null }))).toBe("");
    expect(buildMerchantItemXml(origin, summary({ image: null }))).toBe("");
    expect(
      buildMerchantItemXml(
        origin,
        summary({
          image: {
            ...catalogImage,
            objectKey: "relative-key-without-url",
          },
        }),
      ),
    ).toBe("");
  });
});

describe("buildMerchantFeedXml", () => {
  it("groups multiple variants under the same product", () => {
    const origin = new URL("https://it-market.org/");
    const xml = buildMerchantFeedXml(origin, [
      summary({ defaultVariantId: "v1", sku: "SKU-A", barcode: null }),
      summary({
        defaultVariantId: "v2",
        sku: "SKU-B",
        barcode: null,
        name: "Apple iPhone 15 128GB Ağ",
      }),
    ]);
    expect(xml).toContain("<g:id>v1</g:id>");
    expect(xml).toContain("<g:id>v2</g:id>");
    expect(xml.match(/<g:item_group_id>product-1<\/g:item_group_id>/g)).toHaveLength(
      2,
    );
  });

  it("omits items without images from the channel", () => {
    const origin = new URL("https://it-market.org/");
    const xml = buildMerchantFeedXml(origin, [
      summary({ defaultVariantId: "v1" }),
      summary({ defaultVariantId: "v2", image: null }),
    ]);
    expect(xml).toContain("<g:id>v1</g:id>");
    expect(xml).not.toContain("<g:id>v2</g:id>");
  });
});
