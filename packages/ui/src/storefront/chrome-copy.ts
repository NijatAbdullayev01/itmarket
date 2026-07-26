/**
 * Storefront chrome (header/footer) copy.
 * Defaults are Azerbaijani; the storefront app overrides via i18n.
 */
export type StorefrontChromeCopy = {
  homeAria: string;
  skipToContent: string;
  catalog: string;
  catalogOpen: string;
  catalogClose: string;
  catalogCategories: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchSubmit: string;
  searchLoading: string;
  searchResults: string;
  searchEmptyTitle?: string;
  searchEmptyHint?: string;
  searchSuggestions?: string;
  searchCategories?: string;
  searchOutOfStock?: string;
  searchViewAllResults?: string;
  /** Display names keyed by category slug for search/catalog chrome. */
  categoryNames?: Record<string, string>;
  utilitiesNav: string;
  cart: string;
  cartWithCount: string;
  footerBrandBlurb: string;
  footerShop: string;
  footerCatalog: string;
  footerCart: string;
  footerTerms: string;
  footerPrivacy: string;
  footerDelivery: string;
  footerDeliveryBaku: string;
  footerDeliveryRegions: string;
  footerDeliveryPickup: string;
  footerContact: string;
  footerAddress: string;
  footerCopyright: string;
};

export const defaultStorefrontChromeCopy: StorefrontChromeCopy = {
  homeAria: "IT Market ana səhifə",
  skipToContent: "Əsas məzmuna keç",
  catalog: "Kataloq",
  catalogOpen: "Kataloqu aç",
  catalogClose: "Kataloqu bağla",
  catalogCategories: "Kataloq kateqoriyaları",
  searchLabel: "Məhsul axtar",
  searchPlaceholder: "Məhsul, SKU və ya brend axtar...",
  searchSubmit: "Axtar",
  searchLoading: "Axtarılır…",
  searchResults: "Axtarış nəticələri",
  searchEmptyTitle: "\u201C{query}\u201D üçün nəticə tapılmadı",
  searchEmptyHint: "Başqa açar söz və ya brend adı yoxlayın",
  searchSuggestions: "Təkliflər",
  searchCategories: "Kateqoriyalar",
  searchOutOfStock: "Stokda yoxdur",
  searchViewAllResults: "Bütün nəticələrə bax",
  utilitiesNav: "Hesab və səbət",
  cart: "Səbət",
  cartWithCount: "Səbət, {count} məhsul",
  footerBrandBlurb:
    "Texnologiya məhsullarını aydın qiymət, etibarlı çatdırılma və peşəkar xidmətlə təqdim edən Azərbaycan mağazası.",
  footerShop: "Mağaza",
  footerCatalog: "Kataloq",
  footerCart: "Səbət",
  footerTerms: "İstifadə şərtləri",
  footerPrivacy: "Məxfilik siyasəti",
  footerDelivery: "Çatdırılma",
  footerDeliveryBaku: "Bakı şəhəri — 1–2 iş günü",
  footerDeliveryRegions: "Regionlar — 2–5 iş günü",
  footerDeliveryPickup: "Mağazadan götürmə mövcuddur",
  footerContact: "Əlaqə",
  footerAddress: "28 may küçəsi 69C, Bakı, Azərbaycan",
  footerCopyright: "© {year} IT Market. Bütün hüquqlar qorunur.",
};

export function formatChromeMessage(
  template: string,
  vars: Record<string, string | number>,
): string {
  return Object.entries(vars).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}
