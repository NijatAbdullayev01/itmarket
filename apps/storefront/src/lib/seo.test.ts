import { afterEach, describe, expect, it, vi } from "vitest";

import type { ProductDetail } from "./api";
import {
  buildBlogJsonLd,
  buildBlogPostingJsonLd,
  buildBrandMetadata,
  buildBreadcrumbListJsonLd,
  buildCategoryAncestorTrail,
  buildCategoryMetadata,
  buildCollectionPageJsonLd,
  buildFaqPageJsonLd,
  buildHomeMetadata,
  buildLegalPageMetadata,
  buildLocalBusinessJsonLd,
  buildOrganizationJsonLd,
  buildPaginationLinkHrefs,
  buildProductJsonLd,
  buildProductSocialMetadata,
  buildWebSiteJsonLd,
  DEFAULT_OG_IMAGE_PATH,
  googleAnalyticsId,
  hasBrandPageSeoFilters,
  hasCatalogSeoFilters,
  hasCategoryPageSeoFilters,
  isCatalogPageOutOfRange,
  mapBarcodeToGtin,
  ORGANIZATION_LOGO_PATH,
  parseProductVariantQuery,
  resolveMerchantAvailability,
  resolveOfferAvailability,
  resolvePreferredProductVariant,
  resolveProductJsonLdImageUrls,
  resolveProductSeoDescription,
  resolveProductSeoTitle,
  resolveProductSocialImage,
  SCHEMA_BAKU_STANDARD_SHIPPING_RATE_AZN,
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
    expect(metadata.alternates).toEqual({
      canonical: "/",
      languages: { "az-AZ": "/", "x-default": "/" },
    });
    expect(metadata.title).toEqual({
      absolute: "IT Market — Elektronika məhsulları",
    });
    expect(metadata.robots).toBeUndefined();
  });

  it("filtrli URL-ləri noindex,follow edir", () => {
    const metadata = buildHomeMetadata({ brand: "apple", sort: "price" });
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates).toEqual({
      canonical: "/",
      languages: { "az-AZ": "/", "x-default": "/" },
    });
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
      languages: {
        "az-AZ": "/categories/telefonlar",
        "x-default": "/categories/telefonlar",
      },
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
      languages: {
        "az-AZ": "/categories/telefonlar?page=2",
        "x-default": "/categories/telefonlar?page=2",
      },
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

  it("boş unfiltered kateqoriya səhifəsini noindex,follow edir", () => {
    const metadata = buildCategoryMetadata({
      slug: "telefonlar",
      name: "Telefonlar",
      filtered: false,
      empty: true,
    });
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it("boş filtrli kateqoriya səhifəsini noindex,follow edir", () => {
    const metadata = buildCategoryMetadata({
      slug: "telefonlar",
      name: "Telefonlar",
      filtered: true,
      empty: true,
    });
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it("məhsullu unfiltered kateqoriya indexable qalır", () => {
    const metadata = buildCategoryMetadata({
      slug: "telefonlar",
      name: "Telefonlar",
      filtered: false,
      empty: false,
    });
    expect(metadata.robots).toBeUndefined();
  });

  it("səhifə diapazondan kənarda noindex edir və canonical-ı landing-ə qaytarır", () => {
    const metadata = buildCategoryMetadata({
      slug: "telefonlar",
      name: "Telefonlar",
      page: 99,
      pageOutOfRange: true,
    });
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates).toEqual({
      canonical: "/categories/telefonlar",
      languages: {
        "az-AZ": "/categories/telefonlar",
        "x-default": "/categories/telefonlar",
      },
    });
  });
});

describe("isCatalogPageOutOfRange", () => {
  it("page 1 heç vaxt out-of-range deyil", () => {
    expect(isCatalogPageOutOfRange(1, 1)).toBe(false);
    expect(isCatalogPageOutOfRange(1, null)).toBe(false);
  });

  it("totalPages məlum olanda daşmanı aşkarlayır", () => {
    expect(isCatalogPageOutOfRange(2, 1)).toBe(true);
    expect(isCatalogPageOutOfRange(2, 2)).toBe(false);
    expect(isCatalogPageOutOfRange(3, null)).toBe(false);
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
    expect(metadata.alternates).toEqual({
      canonical: "/brands/apple",
      languages: {
        "az-AZ": "/brands/apple",
        "x-default": "/brands/apple",
      },
    });
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
      languages: {
        "az-AZ": "/brands/apple?page=2",
        "x-default": "/brands/apple?page=2",
      },
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

  it("boş unfiltered brend səhifəsini noindex,follow edir", () => {
    const metadata = buildBrandMetadata({
      slug: "apple",
      name: "Apple",
      filtered: false,
      empty: true,
    });
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it("boş filtrli brend səhifəsini noindex,follow edir", () => {
    const metadata = buildBrandMetadata({
      slug: "apple",
      name: "Apple",
      filtered: true,
      empty: true,
    });
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it("məhsullu unfiltered brend indexable qalır", () => {
    const metadata = buildBrandMetadata({
      slug: "apple",
      name: "Apple",
      filtered: false,
      empty: false,
    });
    expect(metadata.robots).toBeUndefined();
  });

  it("səhifə diapazondan kənarda noindex edir", () => {
    const metadata = buildBrandMetadata({
      slug: "apple",
      name: "Apple",
      page: 50,
      pageOutOfRange: true,
    });
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBe("/brands/apple");
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

    expect(metadata.alternates).toEqual({
      canonical: "/products/iphone-15",
      languages: {
        "az-AZ": "/products/iphone-15",
        "x-default": "/products/iphone-15",
      },
    });
    expect(metadata.openGraph?.images).toEqual([
      {
        url: "http://localhost:3010/images/catalog/iphone.png",
        alt: "iPhone 15",
        width: 1200,
        height: 630,
      },
    ]);
    expect(metadata.openGraph).toMatchObject({
      type: "website",
      locale: "az_AZ",
      siteName: "IT Market",
    });
    expect(metadata.other).toMatchObject({
      "product:price:amount": "1999.00",
      "product:price:currency": "AZN",
      "product:condition": "new",
    });
    expect(metadata.other).not.toHaveProperty("og:type");
    expect(metadata.title).toEqual({ absolute: "iPhone 15 | IT Market" });
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
    expect(metadata.alternates).toEqual({
      canonical: "/terms",
      languages: {
        "az-AZ": "/terms",
        "x-default": "/terms",
      },
    });
    expect(metadata.openGraph).toMatchObject({
      type: "website",
      title: "İstifadə şərtləri",
      description: "Hüquqi mətn",
      locale: "az_AZ",
    });
  });

  it("bloq yazısı üçün article OG və şəkil verir", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STOREFRONT_ORIGIN", "");

    const metadata = buildLegalPageMetadata({
      title: "Smartfon bələdçisi",
      description: "Praktik məsləhət",
      path: "/blog/smartfon-secimi-2026",
      openGraphType: "article",
      imagePath: "/images/blog/smartfon-secimi-2026.jpg",
      publishedTime: "2026-07-20",
      modifiedTime: "2026-07-20",
      section: "Smartfonlar",
      tags: ["smartfon"],
    });
    expect(metadata.openGraph).toMatchObject({
      type: "article",
      publishedTime: "2026-07-20T12:00:00+04:00",
      modifiedTime: "2026-07-20T12:00:00+04:00",
      authors: ["IT Market"],
      section: "Smartfonlar",
      tags: ["smartfon"],
      images: [
        {
          url: "http://localhost:3010/images/blog/smartfon-secimi-2026.jpg",
          alt: "Smartfon bələdçisi",
          width: 1200,
          height: 630,
        },
      ],
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
      url: "http://localhost:3010/products/iphone-15?variant=var-1",
      sku: "IP15-128",
      mpn: "IP15-128",
      itemCondition: "https://schema.org/NewCondition",
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: "IT Market" },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        merchantReturnDays: 14,
        returnFees:
          "https://schema.org/ReturnShippingFeesCustomerResponsibility",
        returnMethod: [
          "https://schema.org/ReturnInStore",
          "https://schema.org/ReturnByMail",
        ],
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: SCHEMA_BAKU_STANDARD_SHIPPING_RATE_AZN,
          currency: "AZN",
        },
      },
    });
  });

  it("availableByOrder stok 0 olanda BackOrder verir", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STOREFRONT_ORIGIN", "");

    const jsonLd = buildProductJsonLd(
      makeProduct({
        available: 0,
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
            available: 0,
            availableByOrder: true,
            image: null,
          },
        ],
      }),
      "iPhone 15",
    );

    const offers = jsonLd.offers as Array<Record<string, unknown>>;
    expect(offers[0]?.availability).toBe("https://schema.org/BackOrder");
  });

  it("requiredSpecs-i additionalProperty kimi əlavə edir", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STOREFRONT_ORIGIN", "");

    const jsonLd = buildProductJsonLd(
      makeProduct({
        requiredSpecs: [{ label: "Ekran", value: "6.1\"" }],
      }),
      "iPhone 15",
    );

    expect(jsonLd.additionalProperty).toEqual([
      { "@type": "PropertyValue", name: "Ekran", value: '6.1"' },
    ]);
  });

  it("çoxvariantlı məhsulda ProductGroup qurur", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STOREFRONT_ORIGIN", "");

    const jsonLd = buildProductJsonLd(
      makeProduct({
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
          {
            id: "var-2",
            sku: "IP15-256",
            barcode: null,
            name: "256GB",
            attributes: {},
            price: "2299.00",
            previousPrice: null,
            currency: "AZN",
            available: 1,
            image: null,
          },
        ],
      }),
      "iPhone 15",
    );

    expect(jsonLd).toMatchObject({
      "@type": "ProductGroup",
      productGroupID: "prod-1",
    });
    const variants = jsonLd.hasVariant as Array<Record<string, unknown>>;
    expect(variants).toHaveLength(2);
    expect(variants[1]).toMatchObject({
      "@type": "Product",
      sku: "IP15-256",
      url: "http://localhost:3010/products/iphone-15?variant=var-2",
    });
  });

  it("ProductGroup variesBy əlavə edir (color/storage/ram)", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STOREFRONT_ORIGIN", "");

    const jsonLd = buildProductJsonLd(
      makeProduct({
        variants: [
          {
            id: "var-1",
            sku: "IP15-128-BLK",
            barcode: null,
            name: "128GB Qara",
            attributes: { "Daimi yaddaş": "128GB", Rəng: "Qara" },
            price: "1999.00",
            previousPrice: null,
            currency: "AZN",
            available: 3,
            image: null,
          },
          {
            id: "var-2",
            sku: "IP15-256-WHT",
            barcode: null,
            name: "256GB Ağ",
            attributes: { "Daimi yaddaş": "256GB", Rəng: "Ağ" },
            price: "2299.00",
            previousPrice: null,
            currency: "AZN",
            available: 1,
            image: null,
          },
        ],
      }),
      "iPhone 15",
    );

    expect(jsonLd["@type"]).toBe("ProductGroup");
    expect(jsonLd.variesBy).toEqual([
      "https://schema.org/color",
      "https://schema.org/storageSize",
    ]);
  });

  it("ProductGroup variesBy olmur əgər map olunmayan atribut varsa", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STOREFRONT_ORIGIN", "");

    const jsonLd = buildProductJsonLd(
      makeProduct({
        variants: [
          {
            id: "var-1",
            sku: "IP15-128",
            barcode: null,
            name: "Model A",
            attributes: { Model: "A" },
            price: "1999.00",
            previousPrice: null,
            currency: "AZN",
            available: 3,
            image: null,
          },
          {
            id: "var-2",
            sku: "IP15-256",
            barcode: null,
            name: "Model B",
            attributes: { Model: "B" },
            price: "2299.00",
            previousPrice: null,
            currency: "AZN",
            available: 1,
            image: null,
          },
        ],
      }),
      "iPhone 15",
    );

    expect(jsonLd["@type"]).toBe("ProductGroup");
    expect(jsonLd.variesBy).toBeUndefined();
  });

  it("?variant= üçün ProductGroup image üstünlüyü verir", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STOREFRONT_ORIGIN", "");

    const product = makeProduct({
      variants: [
        {
          id: "var-1",
          sku: "IP15-128",
          barcode: null,
          name: "128GB",
          attributes: {},
          price: "1999.00",
          previousPrice: null,
          currency: "AZN",
          available: 3,
          image: {
            id: "img-var-1",
            objectKey: "/images/catalog/iphone-128.png",
            altText: "128GB",
            mimeType: "image/png",
            byteSize: 1000,
            sortOrder: 0,
          },
        },
        {
          id: "var-2",
          sku: "IP15-256",
          barcode: null,
          name: "256GB",
          attributes: {},
          price: "2299.00",
          previousPrice: null,
          currency: "AZN",
          available: 1,
          image: {
            id: "img-var-2",
            objectKey: "/images/catalog/iphone-256.png",
            altText: "256GB",
            mimeType: "image/png",
            byteSize: 1000,
            sortOrder: 0,
          },
        },
      ],
    });

    const jsonLd = buildProductJsonLd(product, "iPhone 15", "var-2");
    expect(jsonLd.image).toEqual([
      "http://localhost:3010/images/catalog/iphone-256.png",
    ]);
  });
});

describe("parseProductVariantQuery / resolvePreferredProductVariant", () => {
  it("variant query-ni normalize edir", () => {
    expect(parseProductVariantQuery("var-2")).toBe("var-2");
    expect(parseProductVariantQuery(["var-2", "var-1"])).toBe("var-2");
    expect(parseProductVariantQuery("  ")).toBeUndefined();
    expect(parseProductVariantQuery(undefined)).toBeUndefined();
  });

  it("paylaşılan variantı və ya default-u seçir", () => {
    const product = makeProduct({
      defaultVariantId: "var-1",
      variants: [
        {
          id: "var-1",
          sku: "IP15-128",
          barcode: null,
          name: "128GB",
          attributes: {},
          price: "1999.00",
          previousPrice: null,
          currency: "AZN",
          available: 3,
          image: null,
        },
        {
          id: "var-2",
          sku: "IP15-256",
          barcode: null,
          name: "256GB",
          attributes: {},
          price: "2299.00",
          previousPrice: null,
          currency: "AZN",
          available: 1,
          image: null,
        },
      ],
    });

    expect(resolvePreferredProductVariant(product, "var-2")?.id).toBe("var-2");
    expect(resolvePreferredProductVariant(product, "missing")?.id).toBe("var-1");
    expect(resolvePreferredProductVariant(product)?.id).toBe("var-1");
  });

  it("sosial şəkil üçün preferred variant media istifadə edir", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STOREFRONT_ORIGIN", "");

    const product = makeProduct({
      variants: [
        {
          id: "var-1",
          sku: "IP15-128",
          barcode: null,
          name: "128GB",
          attributes: {},
          price: "1999.00",
          previousPrice: null,
          currency: "AZN",
          available: 3,
          image: null,
        },
        {
          id: "var-2",
          sku: "IP15-256",
          barcode: null,
          name: "256GB",
          attributes: {},
          price: "2299.00",
          previousPrice: null,
          currency: "AZN",
          available: 1,
          image: {
            id: "img-var-2",
            objectKey: "/images/catalog/iphone-256.png",
            altText: "256GB",
            mimeType: "image/png",
            byteSize: 1000,
            sortOrder: 0,
          },
        },
      ],
    });

    expect(resolveProductSocialImage(product, "var-2")?.objectKey).toBe(
      "/images/catalog/iphone-256.png",
    );
    expect(resolveProductJsonLdImageUrls(product, "var-2")).toEqual([
      "http://localhost:3010/images/catalog/iphone-256.png",
    ]);
  });
});

describe("availability helpers", () => {
  it("resolveOfferAvailability BackOrder və OutOfStock ayırır", () => {
    expect(resolveOfferAvailability(2)).toBe("https://schema.org/InStock");
    expect(resolveOfferAvailability(0, true)).toBe(
      "https://schema.org/BackOrder",
    );
    expect(resolveOfferAvailability(0, false)).toBe(
      "https://schema.org/OutOfStock",
    );
  });

  it("resolveMerchantAvailability backorder siqnalı verir", () => {
    expect(resolveMerchantAvailability(1)).toBe("in_stock");
    expect(resolveMerchantAvailability(0, true)).toBe("backorder");
    expect(resolveMerchantAvailability(0)).toBe("out_of_stock");
  });
});

describe("content schemas", () => {
  it("BlogPosting və FAQPage JSON-LD qurur", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STOREFRONT_ORIGIN", "");

    expect(
      buildBlogPostingJsonLd({
        slug: "test-post",
        title: "Test",
        description: "Təsvir",
        publishedAt: "2026-01-15",
        updatedAt: "2026-02-01",
        tags: ["telefon"],
        articleSection: "Smartfonlar",
        wordCount: 800,
        readingMinutes: 11,
      }),
    ).toMatchObject({
      "@type": "BlogPosting",
      headline: "Test",
      inLanguage: "az",
      datePublished: "2026-01-15T12:00:00+04:00",
      dateModified: "2026-02-01T12:00:00+04:00",
      image: {
        "@type": "ImageObject",
        url: `http://localhost:3010${DEFAULT_OG_IMAGE_PATH}`,
        width: 1200,
        height: 630,
      },
      articleSection: "Smartfonlar",
      isPartOf: { "@type": "Blog" },
      publisher: {
        logo: {
          url: `http://localhost:3010${ORGANIZATION_LOGO_PATH}`,
        },
      },
    });

    expect(
      buildBlogJsonLd({
        name: "Bloq",
        description: "Məqalələr",
        posts: [
          {
            slug: "test-post",
            title: "Test",
            publishedAt: "2026-01-15",
          },
        ],
      }),
    ).toMatchObject({
      "@type": "Blog",
      name: "Bloq",
      blogPost: [
        {
          "@type": "BlogPosting",
          headline: "Test",
          url: "http://localhost:3010/blog/test-post",
        },
      ],
    });

    expect(
      buildFaqPageJsonLd([
        { question: "Sual?", answer: "Cavab." },
      ]),
    ).toMatchObject({
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Sual?",
          acceptedAnswer: { "@type": "Answer", text: "Cavab." },
        },
      ],
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
      numberOfItems: 1,
      itemListElement: [
        {
          position: 1,
          name: "iPhone 15",
          url: "http://localhost:3010/products/iphone-15",
          offers: {
            "@type": "Offer",
            price: "1999.00",
            priceCurrency: "AZN",
            availability: "https://schema.org/InStock",
          },
        },
      ],
    });
  });

  it("eyni slug-lu variant sətirlərini ItemList-də dedupe edir", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STOREFRONT_ORIGIN", "");

    const row = {
      id: "p1",
      name: "iPhone 15",
      slug: "iphone-15",
      description: null,
      category: { name: "Telefonlar", slug: "telefonlar" },
      brand: null,
      image: null,
      price: "1999.00",
      previousPrice: null,
      currency: "AZN" as const,
      available: 1,
      defaultVariantId: "v1",
      reviewSummary: { averageRating: null, count: 0 },
    };

    const jsonLd = buildCollectionPageJsonLd({
      name: "Telefonlar",
      path: "/categories/telefonlar",
      products: [
        row,
        { ...row, defaultVariantId: "v2", name: "iPhone 15 256GB" },
      ],
    });

    const list = jsonLd.mainEntity as {
      itemListElement: Array<{ url: string; name: string }>;
    };
    expect(list.itemListElement).toHaveLength(1);
    expect(list.itemListElement[0]?.url).toBe(
      "http://localhost:3010/products/iphone-15",
    );
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
      logo: `http://localhost:3010${ORGANIZATION_LOGO_PATH}`,
      contactPoint: [
        {
          "@type": "ContactPoint",
          telephone: "+994512509585",
          contactType: "customer service",
          areaServed: "AZ",
        },
      ],
      sameAs: expect.arrayContaining([
        "https://www.instagram.com/itmarket.ltd/",
      ]),
      hasMap: expect.stringContaining("maps.google.com"),
    });
    expect(buildWebSiteJsonLd()).toMatchObject({
      "@type": "WebSite",
      name: "IT Market",
      alternateName: expect.arrayContaining(["ITMarket"]),
      potentialAction: {
        "@type": "SearchAction",
      },
    });
  });

  it("STORE_GEO_* ilə Organization geo əlavə edir", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STOREFRONT_ORIGIN", "");
    vi.stubEnv("STORE_GEO_LATITUDE", "40.3777");
    vi.stubEnv("STORE_GEO_LONGITUDE", "49.8520");

    expect(buildOrganizationJsonLd()).toMatchObject({
      geo: {
        "@type": "GeoCoordinates",
        latitude: 40.3777,
        longitude: 49.8520,
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
    expect(withHours.currenciesAccepted).toBe("AZN");
    expect(withHours.paymentAccepted).toContain("Cash");
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

describe("googleAnalyticsId", () => {
  it("NEXT_PUBLIC_GA_ID təyin edildikdə onu qaytarır", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_ID", "G-TEST12345");
    expect(googleAnalyticsId()).toBe("G-TEST12345");
  });

  it("boş string verildikdə undefined qaytarır (disable imkanı)", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_ID", "");
    expect(googleAnalyticsId()).toBeUndefined();
  });

  it("mühit dəyişəni olmadıqda default G-BV492M60DN qaytarır", () => {
    delete process.env.NEXT_PUBLIC_GA_ID;
    delete process.env.GOOGLE_ANALYTICS_ID;
    expect(googleAnalyticsId()).toBe("G-BV492M60DN");
  });
});
