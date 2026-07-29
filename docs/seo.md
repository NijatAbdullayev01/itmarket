# Storefront SEO siyasəti

## Dil strategiyası (AZ-primary)

- **Indexable dil:** yalnız Azərbaycan dili (AZ).
- Cookie ilə en/ru UI tərcüməsi istifadəçi üçün qalır; eyni URL-də ayrıca dil versiyası və en/ru `hreflang` **yoxdur**.
- Indexable səhifələrdə `hreflang` yalnız `az-AZ` + `x-default` (eyni canonical) — Google-a AZ-primary siqnalı verir.
- Crawler cookie olmadan default AZ metadata / JSON-LD görür.
- **`generateMetadata` və indexable JSON-LD** (`CollectionPage`, `BreadcrumbList` adları, root title/description/`og:locale`, BlogPosting, Blog, FAQPage) həmişə `DEFAULT_LOCALE` (az) ilə qurulur — locale cookie meta-nı dəyişməməlidir.
- `<html lang>` UI locale cookie-yə uyğundur (a11y); indexable mətn isə AZ qalır.
- UI copy (düymə, filtr label, breadcrumb görünüşü) cookie locale ilə qala bilər.

## Əsas siqnallar

- Canonical: home, kateqoriya/brend (o cümlədən `?page=`), məhsul, terms/privacy və digər legal səhifələr.
- Facet/filtr URL-ləri: `noindex,follow` (CollectionPage JSON-LD yalnız unfiltered indexable view-da).
- Boş kateqoriya/brend (unfiltered, məhsul sayı 0): `noindex,follow` (soft-404 qarşısını alır); **sitemap-ə düşmür**.
- **Pagination overflow** (`?page=` > `totalPages`, unfiltered): `noindex,follow` + canonical landing path; səhifə gövdəsi **404** (`notFound()`).
- Private: cart, checkout, account, favorites, compare — `noindex` + `robots.txt` disallow.
- Structured data: Organization/LocalBusiness (+ `sameAs`, `hasMap`, opsional `geo`), WebSite+SearchAction, Product / ProductGroup+Offer (+ `mpn`, `additionalProperty`, shipping + return policy), BreadcrumbList, CollectionPage (slug-deduped ItemList), Blog + BlogPosting, FAQPage.
  - ProductGroup `variesBy`: color → `https://schema.org/color`, storage → `https://schema.org/storageSize`, ram → `https://schema.org/memorySize`.
  - Offer `availability`: stok > 0 → `InStock`; stok 0 + `availableByOrder` → `BackOrder`; əks halda `OutOfStock`.
  - Offer shipping: Bakı standart **10 AZN** baseline (`OfferShippingDetails`); pulsuz ≥500 AZN şərti `name` + `/delivery-payment` URL-də izah olunur — ayrıca `0 AZN` Offer verilmir (rich result overclaim qarşısı).
  - MerchantReturnPolicy: 14 gün; `ReturnInStore` + `ReturnByMail`; `ReturnShippingFeesCustomerResponsibility` (FreeReturn yox — könüllü qaytarmada çatdırılma adətən geri verilmir).
  - BreadcrumbList: static/blog/FAQ pages (Home → Page), blog posts (Home → Blog → Post).
- Product OG: Next Metadata `openGraph.type=product` dəstəkləmir (runtime error) — `website` + `product:price:*` meta; **Product/ProductGroup JSON-LD** rich result üçün əsas siqnaldır. Şəkillərdə `width`/`height` (1200×630).
- Blog post OG: `og:type=article` + `publishedTime` / `modifiedTime` + post `imagePath` (AZ); yazı və siyahıda görünən cover.
- Variant URL: `/products/{slug}?variant={id}` — paylaşıla bilən; canonical məhsul path-i qalır (`?variant=` olmadan).
  - `?variant=` SSR SEO: OG/Twitter şəkil + `product:price:*` + ProductGroup/Product JSON-LD `image` (və display-title fallback) seçilmiş variantı üstün tutur; canonical hələ `?variant=`-sizdir.
- Product / ProductGroup JSON-LD `image`: qalereya (variant media üstün, max 10).
- Kateqoriya/brend H1: yalnız display title; məhsul sayı H1-dən kənar meta sətrində.
- Blog məqalə heading: `h1` → `h2` (bölmə başlıqları).
- Sitemap index: `/sitemap.xml` → custom `<sitemapindex>` (`app/sitemap.xml/route.ts`); chunk-lar `/sitemap/0.xml` + `/sitemap/1…N.xml` (`app/sitemap/[id]/route.ts`); məhsul yoxsa yalnız id=0.
  - Next `generateSitemaps` istifadə olunmur — index ilə conflict yaradırdı; id string coercion də custom route-da həll olunub.
  - Taxonomy `?page=` coverage **bir kataloq walk**-dan (variant sayları) hesablanır — N+1 count sorğusu yoxdur.
  - Root kateqoriya landings uşaq məhsulları da göstərir; sitemap coverage `parentId` ilə **yuxarı roll-up** edir (leaf-only say root-u skip etməsin).
  - **RSS URL sitemap-ə düşmür** (HTML discovery üçün deyil; `alternates.types` + `/blog` kifayətdir).
  - Evergreen legal səhifələrdə saxta `lastModified: now` yoxdur.
- robots: `/robots.txt`.
- Blog RSS: `/blog/rss.xml` (atom self-link, `content:encoded`, enclosure şəkil). Production-da `STOREFRONT_ORIGIN` yoxdursa **503** (Merchant/sitemap kimi fail-closed; hardcoded origin yoxdur).
- Google Merchant: `/feeds/google-merchant.xml`
  - variant sətirləri; `g:link` = `/products/{slug}?variant={id}`;
  - `mpn` / `gtin`;
  - `identifier_exists=false` yalnız GTIN **və** MPN hər ikisi yoxdursa;
  - availability: `in_stock` / `backorder` (`availableByOrder`) / `out_of_stock`;
  - `g:product_type` (kateqoriya ağacı `Parent > Child`), opsional `g:color` / `g:size` (variant attrs);
  - `g:google_product_category` — lokal slug/ad üzrə Google taxonomy ID (IT retail heuristic);
  - `g:shipping` — Bakı standart **10.00 AZN** (`country=AZ`);
  - `g:additional_image_link` — variant/məhsul qalereyasının əlavə kadrları (max 10);
  - real şəkil olmayan sətirlər feed-ə düşmür (placeholder SVG yox);
  - public `objectKey` path üstünlük (signed URL TTL-dən qaçınmaq üçün);
  - media signed TTL **6 saat**; feed `revalidate` / `s-maxage` **30 dəq**;
  - safety cap 100k variant (`50×2000`); truncate olanda `X-Feed-Truncated: 1` + XML comment.

## Slug redirect (301/308)

- Slug dəyişəndə API `catalog_slug_redirects` cədvəlinə köhnə→yeni yazır (product / category / brand) və redirect zəncirini yığcamlaşdırır (A→B, B→C ⇒ A→C).
- **Archive redirect:** Məhsul/kateqoriya/brend arxivləndikdə `targetPath` ilə redirect yaranır:
  - Product → `/categories/{category-slug}` (kateqoriyasına)
  - Category → `/categories/{parent-slug}` (valideyn kateqoriyaya) və ya `/` (root-sa)
  - Brand → `/` (ana səhifə)
- Storefront köhnə slug-da `GET /storefront/catalog/slug-redirects/:entityType/:slug` ilə baxır və `permanentRedirect` (308) verir; `targetPath` set olduqda entity ACTIVE yoxlaması keçilir.
- Rename→archive zənciri yığcamlaşır: əvvəlki A→B redirect-ləri arxiv `targetPath`-ini miras alır (köhnə slug soft-404 olmur).
- **Kataloq konsolidasiya** (eyni 308): `/?brand=` / `/?category=` / brend adı axtarışı → `/brands/…` və ya `/categories/…`; `/categories/{brand-slug}` → `/brands/{slug}`.

## Şəkil / CWV

- Storefront `next/image` (AVIF/WebP) via `StorefrontMediaImage`: PDP gallery, kataloq kartları, hero/banner, companion, cart thumbs, header search.
- Əlavə remote hostlar: `IMAGE_REMOTE_HOSTS` (vergüllə ayrılmış).

## CMS SEO sahələri

Product, Brand və Category üçün `seoTitle` / `seoDescription` (+ `description` intro / məhsul təsviri). Backoffice-də create və edit dəstəklənir (məhsul detail-də SEO bloku daxil).

- **`<title>` / OG:** `seoTitle` (və ya display title).
- **Görünən `<h1>` / Product JSON-LD `name`:** istifadəçi display title (brend + model + variant) — CMS SEO title SERP üçündür. PDP `ProductBuyBox.displayTitle` bunu keçirir.
- Kateqoriya/brend landing: H1 = lokalizə olunmuş display name (nəticə sayı H1-də deyil); title = `seoTitle` || name (eyni PDP məntiqi).
- **Launch/ops tələbi:** indexable kateqoriya, brend və top məhsullarda `seoTitle` + `seoDescription` + intro `description` doldurulmalıdır — boş olanda generic meta fallback thin snippet riski yaradır.
- Blog: AZ postlarda `imagePath` (public `/images/...`) — OG article, BlogPosting, RSS enclosure + səhifədə cover.

## Opsional env

- `STOREFRONT_ORIGIN` — **production-da məcburi**; yoxdursa fail-closed `noindex` + boş sitemap + robots disallow.
- `GOOGLE_SITE_VERIFICATION` — Search Console HTML tag.
- `TWITTER_SITE` — Twitter `site` handle (`@…`).
- `IMAGE_REMOTE_HOSTS` — `next/image` remotePatterns.
- `STORE_GEO_LATITUDE` / `STORE_GEO_LONGITUDE` — LocalBusiness/Organization `geo` (WGS84).

## Backoffice SEO AI (opsional)

- `POST /api/v1/catalog/seo/suggest` — staff `catalog.write`; açar yoxdursa heuristic AZ SEO.
- `GET /api/v1/catalog/seo/coverage` — boş `seoTitle` / `seoDescription` / `description` sayları + OOS `availableByOrder=false` audit.
- `POST /api/v1/catalog/seo/fill-missing` — boş CMS SEO sahələrini heuristic ilə doldurur (mövcud mətnə toxunmur); opsional `enableAvailableByOrderForOos` (yalnız OOS bayrağı — `entityTypes: []` ilə SEO mətninə toxunmur).
- Backoffice: **Kataloq → SEO** paneli (`/catalog/seo`); nümunələr edit deep-link açır; «OOS → sifarişlə» SEO fill etmir.
- Env (Gemini default): `SEO_AI_API_KEY` (Google AI Studio / Gemini key),
  `SEO_AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai`
  (HTTPS allowlist: `generativelanguage.googleapis.com` | `api.openai.com` |
  `api.anthropic.com`),
  `SEO_AI_MODEL=gemini-3.5-flash`, `SEO_AI_TIMEOUT_MS=30000` (ətraflı AZ
  mətn üçün 12s tez-tez timeout olurdu). Client uses the OpenAI-compatible
  `/chat/completions` path that Gemini exposes — OpenAI key tələb olunmur.
- **Təhlükəsizlik baryeri:** AI yalnız kataloq SEO mətni üçün işləyir. Ödəniş,
  sifariş və müştəri PII LLM-ə göndərilmir (`seo-ai-boundary` allowlist +
  pattern gate). Açar ödəniş provider secret-indən ayrı saxlanılmalıdır.
  Ətraflı: [security-threat-model.md](./security-threat-model.md#catalog-seo-llm-egress-süni-zəka).

## Yoxlama (launch)

1. Cookie `en`/`ru` ilə kateqoriya və məhsul URL-də view-source: `<title>` / meta description / `og:locale` AZ qalır.
2. `/sitemap.xml` index; `/sitemap/0.xml`-də kateqoriya/brend `?page=2` (çoxsəhifəli olanda) görünür; **boş** kateqoriya/brend və `/blog/rss.xml` **yoxdur**.
3. Kateqoriya/brend `?page=` overflow → 404 + noindex meta.
4. `/feeds/google-merchant.xml`: `g:link` variant query ilə; `g:product_type`; `g:google_product_category`; `g:shipping` 10 AZN; `identifier_exists` ilə `mpn` birlikdə yoxdur; `product-placeholder.svg` yoxdur; `availableByOrder` → `backorder`; truncate header yoxdursa OK.
5. Məhsul səhifəsində Product və ya ProductGroup JSON-LD + title/canonical/OG (`openGraph.type=website`, `product:price:*`; Product rich result JSON-LD-dən); Offer-lərdə `?variant=` URL; shipping baseline 10 AZN (pulsuz threshold yalnız mətn/URL); return fees customer responsibility; H1 = display title; görünən CMS `description`; brend → `/brands/{slug}` link; JSON-LD/OG multi-image qalereya.
6. Köhnə slug → yeni slug 308 redirect; `/?brand=` → `/brands/…` 308; arxivləndikdə kateqoriya/ana səhifəyə `targetPath` redirect.
7. `/faq` FAQPage JSON-LD; `/blog` Blog JSON-LD; `/blog/{slug}` BlogPosting (+ image) + `og:type=article` + BreadcrumbList; `/blog/rss.xml` oxunur (`content:encoded`, atom self).
8. Boş kateqoriya/brend landing `noindex,follow`.
9. Google Search Console-a sitemap submit; Merchant Center feed validation (fetch interval ≤ 30–45 dəq tövsiyə).
10. Production-da `STOREFRONT_ORIGIN` təyin olunub (fail-closed yoxlanışı).
11. CMS: indexable landings / top SKU-larda SEO sahələri doldurulub (və ya Backoffice **Kataloq → SEO** → «Boş SEO-ları doldur»).
12. OOS + sifarişlə satılan SKU-larda `availableByOrder` audit (coverage paneli).
