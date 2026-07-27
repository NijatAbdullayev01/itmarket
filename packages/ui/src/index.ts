export { Alert } from "./primitives/alert";
export { Badge } from "./primitives/badge";
export { Button } from "./primitives/button";
export { Card } from "./primitives/card";
export { ConfirmDialog } from "./primitives/confirm-dialog";
export { OrderCancelReasonDialog } from "./primitives/order-cancel-reason-dialog";
export {
  useConfirmDialog,
  type ConfirmDialogRequest,
} from "./primitives/use-confirm-dialog";
export {
  EmptyState,
  EmptyStateButton,
  EmptyStateLink,
} from "./primitives/empty-state";
export { PasswordInput } from "./primitives/password-input";
export { Price } from "./primitives/price";
export { QuantityStepper } from "./primitives/quantity-stepper";

export { BrandBar } from "./storefront/brand-bar";
export type { BrandBarCopy } from "./storefront/brand-bar";
export { defaultBrandBarCopy } from "./storefront/brand-bar";
export { BrandLogo } from "./storefront/brand-logo";
export { BrandMark, brandLogoFitStyle } from "./storefront/brand-mark";
export type { BrandLogoFit } from "./storefront/brand-mark";
export { CartCompleteBar } from "./storefront/cart-complete-bar";
export type { CartCompleteBarItem, CartCompleteBarCopy } from "./storefront/cart-complete-bar";
export { defaultCartCompleteBarCopy } from "./storefront/cart-complete-bar";
export { CartLineItem } from "./storefront/cart-line-item";
export type { CartLineItemCopy } from "./storefront/cart-line-item";
export { defaultCartLineItemCopy } from "./storefront/cart-line-item";
export { CatalogFilters } from "./storefront/catalog-filters";
export type { CatalogFiltersCopy } from "./storefront/catalog-filters";
export { defaultCatalogFiltersCopy } from "./storefront/catalog-filters";
export { CatalogHero } from "./storefront/catalog-hero";
export { CatalogResultsBanner } from "./storefront/catalog-results-banner";
export type { CatalogResultsBannerSlide } from "./storefront/catalog-results-banner";
export {
  CatalogSearchHeader,
  buildCatalogHref,
  catalogQueryMatchesBrand,
  matchCatalogBrandByQuery,
  matchCatalogBrandBySlug,
  resolveCatalogNavHref,
} from "./storefront/catalog-search-header";
export type {
  CatalogHrefFilters,
  CatalogSortOption,
  CatalogSearchHeaderCopy,
} from "./storefront/catalog-search-header";
export { defaultCatalogSearchHeaderCopy } from "./storefront/catalog-search-header";
export { CatalogPagination } from "./storefront/catalog-pagination";
export type { CatalogPaginationProps, CatalogPaginationCopy } from "./storefront/catalog-pagination";
export { defaultCatalogPaginationCopy } from "./storefront/catalog-pagination";
export { CategoryIcon } from "./storefront/category-icon";
export {
  compareCategoriesForDisplay,
  getCategoryTree,
  getRootCategories,
  sortCategoriesByName,
  sortCategoriesForDisplay,
  type CategoryItem,
  type CategoryTreeNode,
} from "./storefront/category-items";
export {
  CategorySidebar,
  type CategorySidebarCopy,
} from "./storefront/category-sidebar";
export {
  ChatBubble,
  type ChatBubbleProps,
  type SupportChatSession,
  type SupportChatThreadSnapshot,
} from "./storefront/chat-bubble";
export {
  CheckoutWizard,
  defaultCheckoutWizardCopy,
  type CheckoutCustomerPrefill,
  type CheckoutWizardCopy,
} from "./storefront/checkout-wizard";
export { CheckoutProgressBar } from "./storefront/checkout-progress-bar";
export {
  AccountAuthForm,
  defaultAccountAuthFormCopy,
  type AccountAuthFormCopy,
  type CustomerProfile,
} from "./storefront/account-auth-form";
export {
  AccountDashboard,
  defaultAccountDashboardCopy,
  type AccountAddress,
  type AccountCustomerProfile,
  type AccountDashboardCopy,
  type AccountOrder,
  type AccountOrderItem,
  type AccountOrderItemReview,
} from "./storefront/account-dashboard";
export {
  AccountForgotPasswordForm,
  defaultAccountForgotPasswordFormCopy,
  type AccountForgotPasswordFormCopy,
} from "./storefront/account-forgot-password-form";
export {
  AccountResetPasswordForm,
  defaultAccountResetPasswordFormCopy,
  type AccountResetPasswordFormCopy,
} from "./storefront/account-reset-password-form";
export { HeaderAccountLink } from "./storefront/header-account-link";
export {
  HeaderCatalogButton,
  type HeaderCatalogBrand,
  type HeaderCatalogCategory,
} from "./storefront/header-catalog-button";
export {
  IconAlertCircle,
  IconBestPrice,
  IconCart,
  IconCatalog,
  IconChat,
  IconClick,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconCompare,
  IconHome,
  IconDelivery,
  IconDiscount,
  IconDocument,
  IconDoorPayment,
  IconInstallmentPayment,
  IconReturn,
  IconEye,
  IconEyeOff,
  IconHeart,
  IconInfo,
  IconMenu,
  IconMapPin,
  IconProduct,
  IconSearch,
  IconSort,
  IconSliders,
  IconStore,
  IconTrash,
  IconUser,
  IconWarranty,
} from "./storefront/icons";
export { OrderSummary } from "./storefront/order-summary";
export type { OrderSummaryCopy } from "./storefront/order-summary";
export { defaultOrderSummaryCopy } from "./storefront/order-summary";
export { ProductCard } from "./storefront/product-card";
export type { ProductCardCopy } from "./storefront/product-card";
export { defaultProductCardCopy } from "./storefront/product-card";
export { ProductCardActions } from "./storefront/product-card-actions";
export type { ProductCardOverlayActionsCopy } from "./storefront/product-card-actions";
export { ProductGallery } from "./storefront/product-gallery";
export type { ProductGalleryCopy } from "./storefront/product-gallery";
export { defaultProductGalleryCopy } from "./storefront/product-gallery";
export {
  ProductInfo,
  defaultProductInfoCopy,
  type ProductInfoCopy,
} from "./storefront/product-info";
export {
  ProductColorPicker,
  defaultProductColorPickerCopy,
  type ProductColorPickerCopy,
} from "./storefront/product-color-picker";
export {
  ProductStoragePicker,
  defaultProductStoragePickerCopy,
  type ProductStoragePickerCopy,
} from "./storefront/product-storage-picker";
export {
  ProductRamPicker,
  defaultProductRamPickerCopy,
  type ProductRamPickerCopy,
} from "./storefront/product-ram-picker";
export {
  ProductInstallmentCard,
  defaultProductInstallmentCardCopy,
  type ProductInstallmentCardCopy,
} from "./storefront/product-installment-card";
export {
  ProductCompanionList,
  type ProductCompanionItem,
} from "./storefront/product-companion-list";
export {
  ProductCreditApplicationModal,
  type CreditApplicationResult,
} from "./storefront/product-credit-application-modal";
export {
  ProductAvailabilityRequestModal,
  defaultProductAvailabilityRequestModalCopy,
  type ProductAvailabilityRequestModalCopy,
  type ProductAvailabilityRequestMode,
  type ProductAvailabilityRequestResult,
} from "./storefront/product-availability-request-modal";
export { ProductPurchaseBenefits } from "./storefront/product-purchase-benefits";
export type {
  ProductPurchaseBenefitItem,
  ProductPurchaseBenefitsCopy,
} from "./storefront/product-purchase-benefits";
export { defaultProductPurchaseBenefitsCopy } from "./storefront/product-purchase-benefits";
export { ProductPreorderBadge } from "./storefront/product-preorder-badge";
export {
  ProductSpecsPanel,
  defaultProductSpecsPanelCopy,
  type ProductSpecsPanelCopy,
} from "./storefront/product-specs-panel";
export {
  ProductRatingSummary,
  defaultProductRatingSummaryCopy,
  type ProductRatingSummaryCopy,
  type ProductRatingSummaryProps,
} from "./storefront/product-rating-summary";
export {
  ProductReviewsPanel,
  defaultProductReviewsPanelCopy,
  filterProductReviewsForVariant,
  summarizeProductReviews,
  type ProductReviewItem,
  type ProductReviewSummaryValue,
  type ProductReviewsPanelCopy,
} from "./storefront/product-reviews-panel";
export { SiteFooter } from "./storefront/site-footer";
export { SiteHeader } from "./storefront/site-header";
export { SiteLayout } from "./storefront/site-layout";
export { StorefrontShell } from "./storefront/storefront-shell";
export {
  defaultStorefrontChromeCopy,
  formatChromeMessage,
  type StorefrontChromeCopy,
} from "./storefront/chrome-copy";
export { TrustFeatures } from "./storefront/trust-features";
export type { TrustFeatureItem, TrustFeaturesCopy } from "./storefront/trust-features";
export { defaultTrustFeaturesCopy } from "./storefront/trust-features";

export {
  accountStatusBadgeClass,
  customerOrderStatusLabel,
  type OrderStatusLabelMaps,
  fulfillmentStatusLabels,
  fulfillmentTypeLabels,
  labelFor,
  orderStatusLabels,
  paymentStatusLabels,
} from "./order-status";

export {
  getProductImageAlt,
  getProductImageUrl,
  PRODUCT_PLACEHOLDER,
  type ProductMedia,
} from "./utils/product-image";
export {
  resolveProductGalleryMedia,
  toProductMedia,
  type VariantImageSource,
} from "./utils/product-variant-gallery";

export {
  formatAzn,
  formatAznValue,
  parseAznAmount,
} from "./utils/format-azn";
export {
  AZ_DATE_TIMEZONE,
  formatAzDate,
  formatAzDateTime,
} from "./utils/format-az-date";

export { resolveAdministrativeAreaLabel } from "./data/azerbaijan-administrative-areas";
export {
  formatProductAttributeLabel,
  formatProductAttributeValue,
} from "./utils/format-product-attribute";
export {
  buildProductSpecEntries,
  type ProductRequiredSpecEntry,
  type ProductSpecEntry,
} from "./utils/product-spec-entries";
export {
  buildProductCatalogDisplayTitle,
  type BuildProductCatalogDisplayTitleInput,
} from "./utils/product-catalog-title";
export { pickVariantOptionValue } from "./utils/pick-variant-option-value";
export { mergeProductPickerOptions } from "./utils/product-picker-options";
export {
  extractProductColorOptions,
  type ProductColorOption,
  type VariantColorInput,
} from "./utils/product-color-options";
export {
  extractProductStorageOptions,
  type ProductStorageOption,
  type VariantStorageInput,
} from "./utils/product-storage-options";
export {
  extractProductRamOptions,
  type ProductRamOption,
  type VariantRamInput,
} from "./utils/product-ram-options";
export {
  findColorAttribute,
  getColorValue,
  getRamValue,
  getStorageValue,
  getVariantPermanentStorageLabel,
  normalizeRamOptionValue,
  normalizeStorageOptionValue,
  normalizeVariantAttributes,
  resolveColorHex,
  resolveProductVariantId,
  variantAttributesForSelection,
} from "./utils/product-variant-attributes";
