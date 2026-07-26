import { afterEach, describe, expect, it, vi } from "vitest";

import type { ProductDetail } from "./api";
import {
  buildBrandMetadata,
  buildBreadcrumbListJsonLd,
  buildCategoryAncestorTrail,
  buildCategoryMetadata,
  buildCollectionPageJsonLd,
  buildHomeMetadata,
  buildLegalPageMetadata,
  buildLocalBusinessJsonLd,
  buildOrganizationJsonLd,
  buildPaginationLinkHrefs,
  buildProductJsonLd,
  buildProductSocialMetadata,
  buildWebSiteJsonLd,
  DEFAULT_OG_IMAGE_PATH,
  hasBrandPageSeoFilters,
  hasCatalogSeoFilters,
  hasCategoryPageSeoFilters,
  mapBarcodeToGtin,
  resolveProductSeoDescription,
  resolveProductSeoTitle,
  toJsonLd,
  truncateMetaDescription,
} from "./seo";

afterEach(() => {
  vi.unstubAllEnvs();
});

function makeProduct(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: "prod-1",
    name: "iPhone 15",
    slug: "iphone-15",
    description: "Yeni nəsil smartfon",
    category: { name: "Telefonlar", slug: "telefonlar", parentId: null },
    brand: { name: "Apple", slug: "apple" },
    image: {
      id: "img-1",
      objectKey: "/images/catalog/iphone.png",
      altText: "iPhone 15",
      mimeType: "image/png",
      byteSize: 1000,
      sortOrder: 0,
    },
    media: [],
    price: "1999.00",
    previousPrice: null,
    currency: "AZN",
    available: 3,
    defaultVariantId: "var-1",
    reviewSummary: { averageRating: 4.5, count: 2 },
    reviews: [
      {
        id: "rev-1",
        variantId: "var-1",
        rating: 5,
        comment: "Əla məhsul",
        createdAt: "2026-01-01T00:00:00.000Z",
        authorName: "Aysel",
      },
      {
        id: "rev-2",
        variantId: "var-1",
        rating: 4,
        comment: null,
        createdAt: "2026-01-02T00:00:00.000Z",
        authorName: "Nicat",
      },
      {
        id: "rev-other-variant",
        variantId: "var-other",
        rating: 1,
        comment: "Başqa variant",
        createdAt: "2026-01-03T00:00:00.000Z",
        authorName: "Elvin",
      },
    ],
    variants: [
      {
        id: "var-1",
        sku: "IP15-128",
        barcode: "1234567890123",
        name: "128GB",
        attributes: {},
        price: "1999.00",
        previousPrice: null,
        currency: "AZN",
        available: 3,
        image: null,
      },
    ],
    ...overrides,
  };
}

describe("hasCatalogSeoFilters", () => {
  it("təmiz ana səhifə üçün false qaytarır", () => {
    expect(hasCatalogSeoFilters({})).toBe(false);
  });

  it("sort və facet parametrlərini filtr hesab edir", () => {
    expect(hasCatalogSeoFilters({ sort: "price" })).toBe(true);
    expect(hasCatalogSeoFilters({ brand: "apple" })).toBe(true);
    expect(hasCatalogSeoFilters({ inStock: "1" })).toBe(true);
  });

  it("page parametrini filtr hesab etmir", () => {
    expect(hasCatalogSeoFilters({ page: "2" })).toBe(false);
  });
});

describe("hasCategoryPageSeoFilters / hasBrandPageSeoFilters", () => {
  it("yalnız kateqoriya path üçün false qaytarır", () => {
    expect(hasCategoryPageSeoFilters({})).toBe(false);
    expect(hasCategoryPageSeoFilters({ page: "2" })).toBe(false);
  });

  it("əlavə facet-ləri filtr hesab edir", () => {
    expect(hasCategoryPageSeoFilters({ brand: "apple" })).toBe(true);
    expect(hasBrandPageSeoFilters({ sort: "price" })).toBe(true);
  });
});

describe("truncateMetaDescription", () => {
  it("qısa mətni olduğu kimi saxlayır", () => {
    expect(truncateMetaDescription("Qısa təsvir")).toBe("Qısa təsvir");
  });

  it("uzun mətni 160 simvola qədər kəsir", () => {
    const long = "a".repeat(200);
    const result = truncateMetaDescription(long);
    expect(result.length).toBe(160);
    expect(result.endsWith("…")).toBe(true);
  });
});

describe("mapBarcodeToGtin", () => {
  it("13 rəqəmli barkodu gtin13 kimi map edir", () => {
    expect(mapBarcodeToGtin("1234567890123")).toEqual({
      gtin13: "1234567890123",
      gtin: "1234567890123",
    });
  });

  it("8 rəqəmli barkodu gtin8 kimi map edir", () => {
    expect(mapBarcodeToGtin("12345678")).toEqual({
      gtin8: "12345678",
      gtin: "12345678",
    });
  });

  it("12 rəqəmli barkodu gtin13 kimi pad edir", () => {
    expect(mapBarcodeToGtin("123456789012")).toEqual({
      gtin13: "0123456789012",
      gtin: "123456789012",
    });
  });

  it("14 rəqəmli barkodu gtin kimi saxlayır", () => {
    expect(mapBarcodeToGtin("12345678901234")).toEqual({
      gtin: "12345678901234",
    });
  });

  it("keçərsiz barkodu boş qaytarır", () => {
    expect(mapBarcodeToGtin("abc")).toEqual({});
    expect(mapBarcodeToGtin(null)).toEqual({});
  });
});

describe("resolveProductSeoTitle / Description", () => {
  it("seoTitle və seoDescription üstünlük verir", () => {
    const product = makeProduct({
      seoTitle: "iPhone 15 Alma",
      seoDescription: "Rəsmi SEO təsviri",
    });
    expect(resolveProductSeoTitle(product, "Apple iPhone 15")).toBe(
      "iPhone 15 Alma",
    );
    expect(resolveProductSeoDescription(product, "Apple iPhone 15")).toBe(
      "Rəsmi SEO təsviri",
    );
  });

  it("seoDescription yoxdursa description-u truncate edir", () => {
    const product = makeProduct({
      description: "b".repeat(200),
      seoDescription: null,
    });
    expect(resolveProductSeoDescription(product, "Title").length).toBe(160);
  });

  it("description da yoxdursa title fallback verir", () => {
    const product = makeProduct({
      description: null,
      seoDescription: null,
    });
    expect(resolveProductSeoDescription(product, "Apple iPhone 15")).toBe(
      "Apple iPhone 15 IT Market vitrinində.",
    );
  });
});

describe("buildHomeMetadata", () => {
  it("filtrsiz ana səhifəyə canonical verir", () => {
    const metadata = buildHomeMetadata({});
    expect(metadata.alternates).toEqual({ canonical: "/" });
    expect(metadata.robots).toBeUndefined();
  });

  it("filtrli URL-ləri noindex,follow edir", () => {
    const metadata = buildHomeMetadata({ brand: "apple", sort: "price" });
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates).toEqual({ canonical: "/" });
  });
});

describe("buildCategoryMetadata", () => {
  it("indexable kateqoriya canonical və title qurur", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STOREFRONT_ORIGIN", "");

    const metadata = buildCategoryMetadata({
      slug: "telefonlar",
      name: "Telefonlar",
      seoTitle: "Telefonlar kataloqu",
      seoDescription: "Smartfon və telefonlar",
    });

    expect(metadata.alternates).toEqual({
      canonical: "/categories/telefonlar",
    });
    expect(metadata.title).toBe("Telefonlar kataloqu");
    expect(metadata.robots).toBeUndefined();
    expect(metadata.description).toBe("Smartfon və telefonlar");
  });

  it("səhifə 2 üçün canonical və title suffix verir", () => {
    const metadata = buildCategoryMetadata({
      slug: "telefonlar",
      name: "Telefonlar",
      page: 2,
    });
    expect(metadata.alternates).toEqual({
      canonical: "/categories/telefonlar?page=2",
    });
    expect(metadata.title).toEqual({
      absolute: "Telefonlar · Səhifə 2 | IT Market",
    });
    expect(metadata.other).toBeUndefined();
  });

  it("filtrli kateqoriya səhifəsini noindex,follow edir", () => {
    const metadata = buildCategoryMetadata({
      slug: "telefonlar",
      name: "Telefonlar",
      filtered: true,
    });
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});

describe("buildBrandMetadata", () => {
  it("indexable brend landing canonical qurur", () => {
    const metadata = buildBrandMetadata({
      slug: "apple",
      name: "Apple",
      seoTitle: "Apple məhsulları",
      seoDescription: "Apple kataloqu",
    });
    expect(metadata.alternates).toEqual({ canonical: "/brands/apple" });
    expect(metadata.title).toBe("Apple məhsulları");
    expect(metadata.description).toBe("Apple kataloqu");
  });

  it("səhifə 2 üçün canonical və title suffix verir", () => {
    const metadata = buildBrandMetadata({
      slug: "apple",
      name: "Apple",
      page: 2,
    });
    expect(metadata.alternates).toEqual({
      canonical: "/brands/apple?page=2",
    });
    expect(metadata.title).toEqual({
      absolute: "Apple · Səhifə 2 | IT Market",
    });
  });

  it("filtrli brend səhifəsini noindex,follow edir", () => {
    const metadata = buildBrandMetadata({
      slug: "apple",
      name: "Apple",
      filtered: true,
    });
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});

describe("buildPaginationLinkHrefs", () => {
  it("səhifə 2 üçün prev və next absolute href qaytarır", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STOREFRONT_ORIGIN", "https://it-market.org");

    const links = buildPaginationLinkHrefs({
      page: 2,
      totalPages: 5,
      buildPageHref: (page) =>
        page > 1 ? `/categories/telefonlar?page=${page}` : "/categories/telefonlar",
    });

    expect(links.prev).toBe("https://it-market.org/categories/telefonlar");
    expect(links.next).toBe("https://it-market.org/categories/telefonlar?page=3");
  });

  it("tək səhifədə boş qaytarır", () => {
    expect(
      buildPaginationLinkHrefs({
        page: 1,
        totalPages: 1,
        buildPageHref: () => "/brands/apple",
      }),
    ).toEqual({});
  });
});

describe("buildProductSocialMetadata", () => {
  it("product OG və Twitter metadata qurur", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STOREFRONT_ORIGIN", "");

    const metadata = buildProductSocialMetadata({
      slug: "iphone-15",
      title: "iPhone 15",
      description: "Yeni nəsil smartfon",
      image: makeProduct().image,
      price: "1999.00",
    });

    expect(metadata.alternates).toEqual({ canonical: "/products/iphone-15" });
    expect(metadata.openGraph?.images).toEqual([
      {
        url: "http://localhost:3010/images/catalog/iphone.png",
        alt: "iPhone 15",
      },
    ]);
    expect(metadata.other).toMatchObject({
      "og:type": "product",
      "product:price:amount": "1999.00",
      "product:price:currency": "AZN",
    });
    expect(DEFAULT_OG_IMAGE_PATH).toBe("/images/og-default.png");
  });
});

describe("buildLegalPageMetadata", () => {
  it("canonical və default OG verir", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STOREFRONT_ORIGIN", "");

    const metadata = buildLegalPageMetadata({
      title: "İstifadə şərtləri",
      description: "Hüquqi mətn",
      path: "/terms",
    });
    expect(metadata.alternates).toEqual({ canonical: "/terms" });
    expect(metadata.openGraph).toMatchObject({
      title: "İstifadə şərtləri",
      description: "Hüquqi mətn",
      locale: "az_AZ",
    });
  });
});

describe("buildProductJsonLd", () => {
  it("Product schema-ya gtin, itemCondition, brand və rating əlavə edir", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STOREFRONT_ORIGIN", "");

    const jsonLd = buildProductJsonLd(makeProduct(), "iPhone 15");

    expect(jsonLd).toMatchObject({
      "@type": "Product",
      name: "iPhone 15",
      category: "Telefonlar",
      brand: { "@type": "Brand", name: "Apple" },
      gtin13: "1234567890123",
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: 4.5,
        reviewCount: 2,
        bestRating: 5,
        worstRating: 1,
      },
    });
    const reviews = jsonLd.review as Array<{ reviewRating: Record<string, unknown> }>;
    expect(reviews[0]?.reviewRating).toMatchObject({
      bestRating: 5,
      worstRating: 1,
    });
    const offers = jsonLd.offers as Array<Record<string, unknown>>;
    expect(offers[0]).toMatchObject({
      name: "128GB",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "IT Market" },
    });
  });
});

describe("buildCollectionPageJsonLd", () => {
  it("ItemList ilə CollectionPage qurur", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STOREFRONT_ORIGIN", "");

    const jsonLd = buildCollectionPageJsonLd({
      name: "Telefonlar",
      description: "Kateqoriya intro",
      path: "/categories/telefonlar",
      products: [
        {
          id: "p1",
          name: "iPhone 15",
          slug: "iphone-15",
          description: null,
          category: { name: "Telefonlar", slug: "telefonlar" },
          brand: null,
          image: null,
          price: "1999.00",
          previousPrice: null,
          currency: "AZN",
          available: 1,
          defaultVariantId: "v1",
          reviewSummary: { averageRating: null, count: 0 },
        },
      ],
    });

    expect(jsonLd).toMatchObject({
      "@type": "CollectionPage",
      name: "Telefonlar",
      url: "http://localhost:3010/categories/telefonlar",
    });
    expect(jsonLd.mainEntity).toMatchObject({
      "@type": "ItemList",
      itemListElement: [
        {
          position: 1,
          name: "iPhone 15",
          url: "http://localhost:3010/products/iphone-15",
        },
      ],
    });
  });
});

describe("site schemas", () => {
  it("Organization və WebSite SearchAction qurur", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STOREFRONT_ORIGIN", "");

    expect(buildOrganizationJsonLd()).toMatchObject({
      "@type": "Organization",
      name: "IT Market",
      email: "info@it-market.org",
    });
    expect(buildWebSiteJsonLd()).toMatchObject({
      "@type": "WebSite",
      potentialAction: {
        "@type": "SearchAction",
      },
    });
  });

  it("LocalBusiness openingHours yalnız dolu workingHours ilə əlavə edir", () => {
    const withoutHours = buildLocalBusinessJsonLd(null);
    expect(withoutHours.openingHoursSpecification).toBeUndefined();
    expect(withoutHours["@type"]).toContain("LocalBusiness");

    const withHours = buildLocalBusinessJsonLd({
      name: "28 may",
      addressLine: "28 may küçəsi 69C, Bakı",
      contactLabel: null,
      workingHours: {
        monday: { open: "10:00", close: "20:00" },
      },
    });
    expect(withHours.openingHoursSpecification).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "https://schema.org/Monday",
        opens: "10:00",
        closes: "20:00",
      },
    ]);
  });

  it("BreadcrumbList JSON-LD trail item-lərini istifadə edir", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STOREFRONT_ORIGIN", "");

    const jsonLd = buildBreadcrumbListJsonLd([
      { name: "Elektronika", path: "/categories/elektronika" },
      { name: "Telefonlar", path: "/categories/telefonlar" },
      { name: "iPhone 15", path: "/products/iphone-15" },
    ]);

    expect(jsonLd.itemListElement).toHaveLength(4);
    expect(jsonLd.itemListElement[2]).toMatchObject({
      position: 3,
      name: "Telefonlar",
      item: "http://localhost:3010/categories/telefonlar",
    });
  });

  it("kateqoriya ancestor trail-i parent zəncirini qurur", () => {
    const trail = buildCategoryAncestorTrail(
      {
        id: "child",
        name: "Telefonlar",
        slug: "telefonlar",
        parentId: "parent",
      },
      [
        {
          id: "parent",
          name: "Elektronika",
          slug: "elektronika",
          parentId: null,
          sortOrder: 0,
        },
        {
          id: "child",
          name: "Telefonlar",
          slug: "telefonlar",
          parentId: "parent",
          sortOrder: 1,
        },
      ],
    );
    expect(trail).toEqual([
      { name: "Elektronika", path: "/categories/elektronika" },
      { name: "Telefonlar", path: "/categories/telefonlar" },
    ]);
  });

  it("CollectionPage ItemList qurur", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STOREFRONT_ORIGIN", "");
    const jsonLd = buildCollectionPageJsonLd({
      name: "Telefonlar",
      path: "/categories/telefonlar",
      products: [
        {
          id: "1",
          name: "iPhone 15",
          slug: "iphone-15",
          description: null,
          category: { name: "Telefonlar", slug: "telefonlar" },
          brand: null,
          image: null,
          price: "1999.00",
          previousPrice: null,
          currency: "AZN",
          available: 1,
          defaultVariantId: "v1",
          reviewSummary: { averageRating: null, count: 0 },
        },
      ],
    });
    expect(jsonLd).toMatchObject({
      "@type": "CollectionPage",
      mainEntity: {
        "@type": "ItemList",
        itemListElement: [
          {
            position: 1,
            url: "http://localhost:3010/products/iphone-15",
          },
        ],
      },
    });
  });
});

describe("toJsonLd", () => {
  it("script injection üçün < simvolunu escape edir", () => {
    expect(toJsonLd({ name: "</script>" })).toContain("\\u003c/script>");
  });
});
