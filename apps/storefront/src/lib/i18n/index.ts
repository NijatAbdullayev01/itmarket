export {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_LABELS,
  LOCALES,
  localeToHtmlLang,
  localeToOgLocale,
  parseLocale,
  pickLocaleFromAcceptLanguage,
  UI_FALLBACK_LOCALE,
  writeLocaleCookie,
  type Locale,
} from "./locales";
export {
  formatMessage,
  getMessages,
  messagesByLocale,
  type StorefrontMessages,
} from "./messages";
export {
  localizeCategoryName,
  withLocalizedCategoryNames,
} from "./localize-category";
export {
  localizeCatalogColor,
  localizeProductAttributeLabel,
  localizeProductAttributeValue,
  localizeProductSpecEntries,
} from "./localize-product-attribute";
export {
  localizeCatalogIntro,
  localizeProductDescription,
} from "./localize-product-description";
export { toChromeCopy } from "./chrome-copy";
export {
  toAccountAuthFormCopy,
  toAccountDashboardCopy,
  toAccountForgotPasswordFormCopy,
  toAccountResetPasswordFormCopy,
  toCheckoutWizardCopy,
} from "./ui-copy";
export {
  toBrandBarCopy,
  toDealProductRailCopy,
  toCartCompleteBarCopy,
  toCartLineItemCopy,
  toCatalogFiltersCopy,
  toCatalogIntroCopy,
  toCatalogPaginationCopy,
  toCatalogResultsBannerCopy,
  toCatalogSearchHeaderCopy,
  toCheckoutProgressBarCopy,
  toOrderStatusLabelMaps,
  toOrderSummaryCopy,
  toProductCardCopy,
  toProductColorPickerCopy,
  toProductCompanionListCopy,
  toProductGalleryCopy,
  toProductAvailabilityRequestModalCopy,
  toProductInfoCopy,
  toProductInstallmentCardCopy,
  toProductPurchaseBenefitsCopy,
  toProductRamPickerCopy,
  toProductReviewsPanelCopy,
  toProductSpecsPanelCopy,
  toProductStoragePickerCopy,
  toTrustFeatureItems,
  toTrustFeaturesCopy,
} from "./ui-copy";
