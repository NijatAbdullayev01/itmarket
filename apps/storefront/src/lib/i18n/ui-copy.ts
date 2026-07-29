import {
  IconDelivery,
  IconInstallmentPayment,
  IconWarranty,
  type AccountAuthFormCopy,
  type AccountDashboardCopy,
  type AccountForgotPasswordFormCopy,
  type AccountResetPasswordFormCopy,
  type BrandBarCopy,
  type CartCompleteBarCopy,
  type CartLineItemCopy,
  type CatalogFiltersCopy,
  type CatalogPaginationCopy,
  type CatalogSearchHeaderCopy,
  type CheckoutWizardCopy,
  type OrderSummaryCopy,
  type ProductCardCopy,
  type ProductColorPickerCopy,
  type ProductGalleryCopy,
  type ProductAvailabilityRequestModalCopy,
  type ProductInfoCopy,
  type ProductInstallmentCardCopy,
  type ProductPurchaseBenefitsCopy,
  type ProductRamPickerCopy,
  type ProductReviewsPanelCopy,
  type ProductSpecsPanelCopy,
  type ProductStoragePickerCopy,
  type OrderStatusLabelMaps,
  type TrustFeatureItem,
  type TrustFeaturesCopy,
} from "@itmarket/ui";

import type { StorefrontMessages } from "./messages";

export function toOrderStatusLabelMaps(
  messages: StorefrontMessages,
): OrderStatusLabelMaps {
  return {
    order: {
      PENDING_PAYMENT: messages.status.orderPendingPayment,
      UNDER_REVIEW: messages.status.orderUnderReview,
      CONFIRMED: messages.status.orderConfirmed,
      PROCESSING: messages.status.orderProcessing,
      READY_FOR_PICKUP: messages.status.orderReadyForPickup,
      READY_FOR_DELIVERY: messages.status.orderReadyForDelivery,
      OUT_FOR_DELIVERY: messages.status.orderOutForDelivery,
      COMPLETED: messages.status.orderCompleted,
      CANCELLED: messages.status.orderCancelled,
    },
    payment: {
      PENDING: messages.status.paymentPending,
      AUTHORIZED: messages.status.paymentAuthorized,
      PAID: messages.status.paymentPaid,
      FAILED: messages.status.paymentFailed,
      CANCELLED: messages.status.paymentCancelled,
      PARTIALLY_REFUNDED: messages.status.paymentPartiallyRefunded,
      REFUNDED: messages.status.paymentRefunded,
    },
    fulfillmentType: {
      DELIVERY: messages.status.fulfillmentTypeDelivery,
      PICKUP: messages.status.fulfillmentTypePickup,
    },
    readyForDelivery: messages.status.readyForDelivery,
    outForDeliveryCourier: messages.status.outForDeliveryCourier,
    completedDelivered: messages.status.completedDelivered,
  };
}

export function toBrandBarCopy(messages: StorefrontMessages): BrandBarCopy {
  return {
    brandsNav: messages.catalog.brandsNav,
    previousBrands: messages.catalog.previousBrands,
    nextBrands: messages.catalog.nextBrands,
  };
}

export function toCartCompleteBarCopy(
  messages: StorefrontMessages,
): CartCompleteBarCopy {
  return {
    countLabel: messages.cart.completeBarCountLabel,
    countLabelShort: messages.cart.completeBarCountLabelShort,
    productCountAria: messages.common.productCount,
    amountLabel: messages.cart.completeBarAmount,
    itemsAria: messages.cart.completeBarItemsAria,
    checkout: messages.cart.completeBarCheckout,
    checkoutShort: messages.cart.completeBarCheckoutShort,
    close: messages.cart.completeBarClose,
  };
}

export function toCartLineItemCopy(
  messages: StorefrontMessages,
): CartLineItemCopy {
  return {
    remove: messages.cart.lineRemove,
    removeConfirm: messages.cart.lineRemoveConfirm,
    removeMessage: messages.cart.lineRemoveMessage,
    unavailable: messages.cart.lineUnavailable,
    lastN: messages.cart.lineLastN,
    pieceCount: messages.common.pieceCount,
  };
}

export function toCatalogFiltersCopy(
  messages: StorefrontMessages,
): CatalogFiltersCopy {
  return {
    filtersTitle: messages.catalog.filtersTitle,
    filtersToggle: messages.catalog.filtersToggle,
    activeFilters: messages.catalog.activeFilters,
    clearFilters: messages.catalog.clearFilters,
    clearAllFilters: messages.catalog.clearAllFilters,
    removeFilterAria: messages.catalog.removeFilterAria,
    inStock: messages.catalog.inStockFilter,
    onSale: messages.catalog.onSaleFilter,
    allCategories: messages.catalog.allCategories,
    apply: messages.catalog.apply,
    min: messages.catalog.min,
    max: messages.catalog.max,
    priceRange: messages.catalog.filterPriceRange,
    priceChipRange: messages.catalog.priceRange,
    priceChipMin: messages.catalog.priceFrom,
    priceChipMax: messages.catalog.priceUpTo,
    priceChipDefault: messages.catalog.filterPrice,
    facetBrand: messages.catalog.filterBrand,
    facetCategory: messages.catalog.filterCategory,
    facetAvailability: messages.catalog.filterAvailability,
    facetStorage: messages.catalog.filterStorage,
    facetRam: messages.catalog.filterRam,
    facetColor: messages.catalog.filterColor,
  };
}

export function toCatalogPaginationCopy(
  messages: StorefrontMessages,
): CatalogPaginationCopy {
  return {
    nav: messages.catalog.paginationNav,
    previous: messages.catalog.previous,
    previousPage: messages.catalog.previousPage,
    next: messages.catalog.next,
    nextPage: messages.catalog.nextPage,
  };
}

export function toCatalogSearchHeaderCopy(
  messages: StorefrontMessages,
): CatalogSearchHeaderCopy {
  return {
    resultsTitle: messages.catalog.resultsTitle,
    queryResultsTitle: messages.catalog.queryResultsTitle,
    productCount: messages.common.productCount,
    sortLabel: messages.catalog.sortLabel,
    sortNewest: messages.catalog.sortNewest,
    sortName: messages.catalog.sortName,
    sortPrice: messages.catalog.sortPrice,
  };
}

export function toOrderSummaryCopy(
  messages: StorefrontMessages,
): OrderSummaryCopy {
  return {
    heading: messages.orderSummary.heading,
    itemCount: messages.orderSummary.itemCount,
    subtotal: messages.orderSummary.subtotal,
    discount: messages.orderSummary.discount,
    delivery: messages.orderSummary.delivery,
    total: messages.orderSummary.total,
  };
}

export function toProductCardCopy(
  messages: StorefrontMessages,
): ProductCardCopy {
  return {
    addToCart: messages.product.addToCart,
    addToCartShort: messages.product.addToCartShort,
    inStock: messages.common.inStock,
    outOfStock: messages.common.outOfStock,
    availableByOrder: messages.product.availableByOrderBadge,
    preorder: messages.product.notifyWhenAvailable,
    preorderShort: messages.product.notifyWhenAvailableShort,
    priceUnavailable: messages.common.priceUnavailable,
    storageLabel: messages.product.storageLabel,
    months: messages.common.monthsUnit,
    compareTitle: messages.product.compare,
    compareAria: messages.product.compareAdd,
    favoriteTitle: messages.product.favorites,
    favoriteAria: messages.product.favoriteAdd,
    reviewCount: messages.product.reviewCount,
    ratingAria: messages.product.ratingAria,
  };
}

export function toProductGalleryCopy(
  messages: StorefrontMessages,
): ProductGalleryCopy {
  return {
    specsShow: messages.product.gallerySpecsShow,
    specsHide: messages.product.gallerySpecsHide,
    galleryAria: messages.product.galleryAria,
    imageN: messages.product.imageN,
  };
}

export function toProductPurchaseBenefitsCopy(
  messages: StorefrontMessages,
): ProductPurchaseBenefitsCopy {
  return {
    sectionAria: messages.product.benefitsSectionAria,
    listAria: messages.product.benefitsListAria,
  };
}

export function toProductAvailabilityRequestModalCopy(
  messages: StorefrontMessages,
): ProductAvailabilityRequestModalCopy {
  return {
    stockAlertTitle: messages.product.availabilityStockAlertTitle,
    stockAlertLead: messages.product.availabilityStockAlertLead,
    stockAlertSubmit: messages.product.availabilityStockAlertSubmit,
    stockAlertSuccess: messages.product.availabilityStockAlertSuccess,
    stockAlertDuplicate: messages.product.availabilityStockAlertDuplicate,
    preorderTitle: messages.product.availabilityPreorderTitle,
    preorderLead: messages.product.availabilityPreorderLead,
    preorderSubmit: messages.product.availabilityPreorderSubmit,
    preorderSuccess: messages.product.availabilityPreorderSuccess,
    preorderDuplicate: messages.product.availabilityPreorderDuplicate,
    productLabel: messages.product.availabilityProductLabel,
    variantLabel: messages.product.availabilityVariantLabel,
    firstName: messages.account.firstName,
    lastName: messages.account.lastName,
    phone: messages.product.availabilityPhone,
    email: messages.account.email,
    emailOptional: messages.product.availabilityEmailOptional,
    emailPlaceholder: messages.product.availabilityEmailPlaceholder,
    close: messages.common.close,
    cancel: messages.common.cancel,
    sending: messages.product.availabilitySending,
    firstNameMin: messages.product.availabilityFirstNameMin,
    lastNameMin: messages.product.availabilityLastNameMin,
    phoneInvalid: messages.product.availabilityPhoneInvalid,
  };
}

export function toProductInstallmentCardCopy(
  messages: StorefrontMessages,
): ProductInstallmentCardCopy {
  return {
    aria: messages.product.installmentAria,
    modeLabel: messages.product.installmentModeLabel,
    buyInstallment: messages.product.installmentBuyInstallment,
    buyPartial: messages.product.installmentBuyPartial,
    description: messages.product.installmentDescription,
    partialDescription: messages.product.installmentPartialDescription,
    providerDescription: messages.product.installmentProviderDescription,
    initialPayment: messages.product.installmentInitialPayment,
    initialPaymentPlaceholder:
      messages.product.installmentInitialPaymentPlaceholder,
    selectBank: messages.product.installmentSelectBank,
    tableAria: messages.product.installmentTableAria,
    choice: messages.product.installmentChoice,
    rate: messages.product.installmentRate,
    initial: messages.product.installmentInitial,
    term: messages.product.installmentTerm,
    monthly: messages.product.installmentMonthly,
    total: messages.product.installmentTotal,
    monthsUnit: messages.common.monthsUnit,
    planAria: messages.product.installmentPlanAria,
  };
}

export function toProductSpecsPanelCopy(
  messages: StorefrontMessages,
): ProductSpecsPanelCopy {
  return {
    title: messages.product.specs,
    showAll: messages.product.showAll,
    hide: messages.product.hide,
  };
}

export function toProductStoragePickerCopy(
  messages: StorefrontMessages,
): ProductStoragePickerCopy {
  return {
    label: messages.product.storageLabel,
    groupAria: messages.product.storageGroupAria,
    outOfStock: messages.product.storageOutOfStock,
    outOfStockForCombo: messages.product.storageOutOfStockForCombo,
  };
}

export function toProductColorPickerCopy(
  messages: StorefrontMessages,
): ProductColorPickerCopy {
  return {
    label: messages.product.colorLabel,
    groupAria: messages.product.colorGroupAria,
    outOfStock: messages.product.colorOutOfStock,
    outOfStockForCombo: messages.product.colorOutOfStockForCombo,
  };
}

export function toProductRamPickerCopy(
  messages: StorefrontMessages,
): ProductRamPickerCopy {
  return {
    label: messages.product.ramLabel,
    groupAria: messages.product.ramGroupAria,
    outOfStock: messages.product.ramOutOfStock,
  };
}

export function toProductReviewsPanelCopy(
  messages: StorefrontMessages,
): ProductReviewsPanelCopy {
  return {
    title: messages.product.reviewsTitle,
    panelAria: messages.product.reviewsPanelAria,
    starsAria: messages.product.reviewStarsAria,
    reviewCount: messages.product.reviewCount,
    ratingAria: messages.product.ratingAria,
  };
}

export function toProductInfoCopy(
  messages: StorefrontMessages,
): ProductInfoCopy {
  return {
    detailsAria: messages.product.detailsAria,
    specs: toProductSpecsPanelCopy(messages),
    reviews: toProductReviewsPanelCopy(messages),
  };
}

export function toTrustFeaturesCopy(
  messages: StorefrontMessages,
): TrustFeaturesCopy {
  return {
    sectionAria: messages.product.trustSectionAria,
  };
}

export function toTrustFeatureItems(
  messages: StorefrontMessages,
): TrustFeatureItem[] {
  return [
    {
      icon: IconWarranty,
      title: messages.product.trust1Title,
      text: messages.product.trust1Text,
    },
    {
      icon: IconDelivery,
      title: messages.product.trust2Title,
      text: messages.product.trust2Text,
    },
    {
      icon: IconInstallmentPayment,
      title: messages.product.trust3Title,
      text: messages.product.trust3Text,
    },
  ];
}

export function toCheckoutWizardCopy(
  messages: StorefrontMessages,
): CheckoutWizardCopy {
  const w = messages.checkoutWizard;
  return {
    stepCompleted: w.stepCompleted,
    personalInfoTitle: w.personalInfoTitle,
    firstName: w.firstName,
    lastName: w.lastName,
    phone: w.phone,
    email: w.email,
    fulfillmentTitle: w.fulfillmentTitle,
    fulfillmentTypeLabel: w.fulfillmentTypeLabel,
    deliveryOption: w.deliveryOption,
    pickupOption: w.pickupOption,
    deliverySpeedLabel: w.deliverySpeedLabel,
    speedStandard: w.speedStandard,
    speedExpress: w.speedExpress,
    expressHint: w.expressHint,
    standardHint: w.standardHint,
    cityDistrictLabel: w.cityDistrictLabel,
    cityDistrictPlaceholder: w.cityDistrictPlaceholder,
    cityDistrictListAria: w.cityDistrictListAria,
    cityDistrictRequired: w.cityDistrictRequired,
    bakuDistrictLabel: w.bakuDistrictLabel,
    bakuDistrictPlaceholder: w.bakuDistrictPlaceholder,
    bakuDistrictListAria: w.bakuDistrictListAria,
    bakuDistrictRequired: w.bakuDistrictRequired,
    addressLabel: w.addressLabel,
    addressPlaceholder: w.addressPlaceholder,
    addressMinLength: w.addressMinLength,
    republicDistrictNotice: w.republicDistrictNotice,
    deliveryFreePrefix: w.deliveryFreePrefix,
    deliveryFreeValue: w.deliveryFreeValue,
    deliveryFeePrefix: w.deliveryFeePrefix,
    feeBreakdownStandard: w.feeBreakdownStandard,
    feeBreakdownExpress: w.feeBreakdownExpress,
    noDeliveryZone: w.noDeliveryZone,
    branchLabel: w.branchLabel,
    branchEmpty: w.branchEmpty,
    optionsLoading: w.optionsLoading,
    optionsError: w.optionsError,
    notesLabel: w.notesLabel,
    notesAddLabel: w.notesAddLabel,
    notesOptional: w.notesOptional,
    paymentTitle: w.paymentTitle,
    paymentMethodLabel: w.paymentMethodLabel,
    debitCard: w.debitCard,
    installmentCard: w.installmentCard,
    paymentModeLabel: w.paymentModeLabel,
    installmentProviderLabel: w.installmentProviderLabel,
    installmentDurationOnline: w.installmentDurationOnline,
    installmentDurationOffline: w.installmentDurationOffline,
    monthsUnit: w.monthsUnit,
    monthlyAria: w.monthlyAria,
    initialPaymentLabel: w.initialPaymentLabel,
    initialPaymentPlaceholder: w.initialPaymentPlaceholder,
    finCodeLabel: w.finCodeLabel,
    finCodePlaceholder: w.finCodePlaceholder,
    finCodeHint: w.finCodeHint,
    termsDisclaimerBefore: w.termsDisclaimerBefore,
    termsLink: w.termsLink,
    termsDisclaimerAfter: w.termsDisclaimerAfter,
    submitOrder: w.submitOrder,
    cardFallbackLabel: w.cardFallbackLabel,
    installmentFallbackLabel: w.installmentFallbackLabel,
  };
}

export function toAccountAuthFormCopy(
  messages: StorefrontMessages,
): AccountAuthFormCopy {
  const a = messages.account;
  return {
    backAria: a.back,
    loginTitle: a.signIn,
    registerTitle: a.register,
    loginLead: a.loginLead,
    registerLead: a.registerLead,
    accountModeAria: a.accountModeAria,
    loginTab: a.signIn,
    registerTab: a.register,
    firstName: a.firstName,
    lastName: a.lastName,
    email: a.email,
    password: a.password,
    forgotPassword: a.forgotPassword,
    passwordConfirm: a.passwordConfirm,
    submitLogin: a.submitLogin,
    submitRegister: a.submitRegister,
    waiting: a.waiting,
    emailRequired: a.emailRequired,
    emailInvalid: a.emailInvalid,
    passwordRequired: a.passwordRequired,
    passwordMinLength: a.passwordMinLength,
    passwordComplexity: a.passwordComplexity,
    firstNameRequired: a.firstNameRequired,
    firstNameMinLength: a.firstNameMinLength,
    lastNameRequired: a.lastNameRequired,
    lastNameMinLength: a.lastNameMinLength,
    passwordConfirmRequired: a.passwordConfirmRequired,
    passwordMismatch: a.passwordMismatch,
  };
}

export function toAccountDashboardCopy(
  messages: StorefrontMessages,
): AccountDashboardCopy {
  const d = messages.accountDashboard;
  return {
    title: d.title,
    logout: d.logout,
    greeting: d.greeting,
    lead: d.lead,
    tabsAria: d.tabsAria,
    profileTab: d.profileTab,
    ordersTab: d.ordersTab,
    addressesTab: d.addressesTab,
    firstName: d.firstName,
    lastName: d.lastName,
    email: d.email,
    phoneLabel: d.phoneLabel,
    saving: d.saving,
    save: d.save,
    profileUpdated: d.profileUpdated,
    addressPhoneRequired: d.addressPhoneRequired,
    addressAdded: d.addressAdded,
    addressUpdated: d.addressUpdated,
    deleteAddressTitle: d.deleteAddressTitle,
    deleteAddressMessage: d.deleteAddressMessage,
    addressDeleted: d.addressDeleted,
    orderCancelled: d.orderCancelled,
    noOrdersTitle: d.noOrdersTitle,
    noOrdersDescription: d.noOrdersDescription,
    viewProducts: d.viewProducts,
    orderDelivery: d.orderDelivery,
    orderPickup: d.orderPickup,
    productCountSuffix: d.productCountSuffix,
    recipientLabel: d.recipientLabel,
    cancelOrder: d.cancelOrder,
    leaveReview: d.leaveReview,
    leaveReviewPending: d.leaveReviewPending,
    reviewTitle: d.reviewTitle,
    reviewTitlePlural: d.reviewTitlePlural,
    reviewPerProductHint: d.reviewPerProductHint,
    yourReviews: d.yourReviews,
    reviewCommentLabel: d.reviewCommentLabel,
    reviewCommentPlaceholder: d.reviewCommentPlaceholder,
    reviewSubmit: d.reviewSubmit,
    reviewSubmitting: d.reviewSubmitting,
    reviewSubmitted: d.reviewSubmitted,
    reviewSuccess: d.reviewSuccess,
    reviewRatingRequired: d.reviewRatingRequired,
    reviewRatingAria: d.reviewRatingAria,
    cityDistrictLabel: d.cityDistrictLabel,
    selectEmpty: d.selectEmpty,
    addressLabel: d.addressLabel,
    notesLabel: d.notesLabel,
    makeDefault: d.makeDefault,
    cancelButton: d.cancelButton,
    noAddressesTitle: d.noAddressesTitle,
    noAddressesDescription: d.noAddressesDescription,
    addAddress: d.addAddress,
    defaultBadge: d.defaultBadge,
    addressFallback: d.addressFallback,
    editButton: d.editButton,
    deleteButton: d.deleteButton,
  };
}

export function toAccountForgotPasswordFormCopy(
  messages: StorefrontMessages,
): AccountForgotPasswordFormCopy {
  return {
    backAria: messages.account.back,
    title: messages.account.forgotTitle,
    lead: messages.account.forgotLead,
    acceptedHint: messages.account.forgotAcceptedHint,
    devResetPrefix: messages.account.forgotDevResetPrefix,
    devResetLink: messages.account.forgotDevResetLink,
    backToSignIn: messages.account.forgotBackToSignIn,
    email: messages.account.email,
    submit: messages.account.forgotSubmit,
    waiting: messages.account.waiting,
  };
}

export function toAccountResetPasswordFormCopy(
  messages: StorefrontMessages,
): AccountResetPasswordFormCopy {
  return {
    backAria: messages.account.back,
    title: messages.account.resetTitle,
    lead: messages.account.resetLead,
    successHint: messages.account.resetSuccessHint,
    signIn: messages.account.signIn,
    password: messages.account.resetPassword,
    submit: messages.account.resetSubmit,
    waiting: messages.account.waiting,
    backToSignIn: messages.account.forgotBackToSignIn,
  };
}
