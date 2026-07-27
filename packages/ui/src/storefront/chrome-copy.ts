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
  footerCompany: string;
  footerAbout: string;
  footerBlog: string;
  footerCatalog: string;
  footerCart: string;
  footerFavorites: string;
  footerCompare: string;
  footerAccount: string;
  footerSupport: string;
  footerDeliveryPayment: string;
  footerReturns: string;
  footerInstallment: string;
  footerTerms: string;
  footerPrivacy: string;
  footerWarranty: string;
  footerFaq: string;
  footerCorporate: string;
  footerContact: string;
  footerHotline: string;
  footerHotlineHref: string;
  footerHotlineSecondary: string;
  footerHotlineSecondaryHref: string;
  footerMap: string;
  footerMapHint: string;
  footerAddressMapAria: string;
  footerSocialHeading: string;
  footerSocialFacebook: string;
  footerSocialInstagram: string;
  footerSocialYoutube: string;
  footerSocialWhatsapp: string;
  footerSocialTelegram: string;
  footerSocialTiktok: string;
  footerSafeShopping: string;
  footerPaymentVisa: string;
  footerPaymentMastercard: string;
  footerLegalNav: string;
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
  footerCompany: "Şirkət",
  footerAbout: "Haqqımızda",
  footerBlog: "Bloq",
  footerCatalog: "Kataloq",
  footerCart: "Səbət",
  footerFavorites: "Sevimlilər",
  footerCompare: "Müqayisə",
  footerAccount: "Hesabım",
  footerSupport: "Müştəriyə dəstək",
  footerDeliveryPayment: "Çatdırılma və ödəmə",
  footerReturns: "Geri qaytarma",
  footerInstallment: "Hissə-hissə ödəniş",
  footerTerms: "Saytdan istifadə şərtləri",
  footerPrivacy: "Məxfilik siyasəti",
  footerWarranty: "Zəmanət",
  footerFaq: "Tez-tez verilən suallar",
  footerCorporate: "Korporativ satışlar",
  footerContact: "Əlaqə",
  footerHotline: "Mobil: +994 51 250 95 85",
  footerHotlineHref: "tel:+994512509585",
  footerHotlineSecondary: "Mobil: +994 51 250 95 86",
  footerHotlineSecondaryHref: "tel:+994512509586",
  footerMap: "Xəritədə aç",
  footerMapHint: "Ünvan: 28 may küçəsi 69C",
  footerAddressMapAria: "Ünvanı xəritədə aç",
  footerSocialHeading: "Biz sosial şəbəkələrdə",
  footerSocialFacebook: "Facebook",
  footerSocialInstagram: "Instagram",
  footerSocialYoutube: "YouTube",
  footerSocialWhatsapp: "WhatsApp",
  footerSocialTelegram: "Telegram",
  footerSocialTiktok: "TikTok",
  footerSafeShopping: "Təhlükəsiz alış-veriş",
  footerPaymentVisa: "Visa",
  footerPaymentMastercard: "Mastercard",
  footerLegalNav: "Hüquqi məlumatlar",
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
