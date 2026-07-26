# Storefront SEO siyasəti

## Dil strategiyası (AZ-primary)

- **Indexable dil:** yalnız Azərbaycan dili (AZ).
- Cookie ilə en/ru UI tərcüməsi istifadəçi üçün qalır; eyni URL-də ayrıca dil versiyası və `hreflang` **yoxdur**.
- Crawler cookie olmadan default AZ metadata / JSON-LD görür.
- **`generateMetadata` və indexable JSON-LD** (`CollectionPage`, `BreadcrumbList` adları, root title/description/`og:locale`) həmişə `DEFAULT_LOCALE` (az) ilə qurulur — locale cookie meta-nı dəyişməməlidir.
- UI copy (düymə, filtr label, breadcrumb görünüşü) cookie locale ilə qala bilər.

## Əsas siqnallar

- Canonical: home, kateqoriya/brend (o cümlədən `?page=`), məhsul, terms/privacy.
- Facet/filtr URL-ləri: `noindex,follow` (CollectionPage JSON-LD yalnız unfiltered indexable view-da).
- Private: cart, checkout, account, favorites, compare — `noindex` + `robots.txt` disallow.
- Structured data: Organization/LocalBusiness, WebSite+SearchAction, Product+Offer, BreadcrumbList, CollectionPage (home + kateqoriya/brend).
- Product OG: `og:type=product` (+ `product:price:*` meta).
- Sitemap: `/sitemap.xml` — home, terms/privacy, kateqoriya/brend (page 1 + `?page=2…N`, pageSize 24), ACTIVE məhsullar.
- robots: `/robots.txt`.
- Google Merchant: `/feeds/google-merchant.xml`
  - variant sətirləri, `mpn` / `gtin`;
  - `identifier_exists=false` yalnız GTIN **və** MPN hər ikisi yoxdursa;
  - real şəkil olmayan sətirlər feed-ə düşmür (placeholder SVG yox).

## CMS SEO sahələri

Product, Brand və Category üçün `seoTitle` / `seoDescription` (+ `description` intro / məhsul təsviri). Backoffice-də create və edit dəstəklənir (məhsul detail-də SEO bloku daxil).

## Yoxlama (launch)

1. Cookie `en`/`ru` ilə kateqoriya və məhsul URL-də view-source: `<title>` / meta description / `og:locale` AZ qalır.
2. `/sitemap.xml`-də kateqoriya/brend `?page=2` (çoxsəhifəli olanda) görünür.
3. `/feeds/google-merchant.xml`: `identifier_exists` ilə `mpn` birlikdə yoxdur; `product-placeholder.svg` yoxdur.
4. Məhsul səhifəsində Product JSON-LD + `og:type=product`.
5. Google Search Console-a sitemap submit; Merchant Center feed validation.
