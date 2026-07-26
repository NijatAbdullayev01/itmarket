import type { StorefrontChromeCopy } from "@itmarket/ui";

import type { StorefrontMessages } from "./messages";

export function toChromeCopy(messages: StorefrontMessages): StorefrontChromeCopy {
  return {
    homeAria: messages.header.homeAria,
    skipToContent: messages.header.skipToContent,
    catalog: messages.header.catalog,
    catalogOpen: messages.header.catalogOpen,
    catalogClose: messages.header.catalogClose,
    catalogCategories: messages.header.catalogCategories,
    searchLabel: messages.header.searchLabel,
    searchPlaceholder: messages.header.searchPlaceholder,
    searchSubmit: messages.header.searchSubmit,
    searchLoading: messages.header.searchLoading,
    searchResults: messages.header.searchResults,
    searchEmptyTitle: messages.search.emptyTitle,
    searchEmptyHint: messages.search.emptyHint,
    searchSuggestions: messages.search.suggestions,
    searchCategories: messages.search.categories,
    searchOutOfStock: messages.common.outOfStock,
    searchViewAllResults: messages.search.viewAllResults,
    categoryNames: messages.catalog.categoryNames,
    utilitiesNav: messages.header.utilitiesNav,
    cart: messages.header.cart,
    cartWithCount: messages.header.cartWithCount,
    footerBrandBlurb: messages.footer.brandBlurb,
    footerShop: messages.footer.shop,
    footerCatalog: messages.footer.catalog,
    footerCart: messages.footer.cart,
    footerTerms: messages.footer.terms,
    footerPrivacy: messages.footer.privacy,
    footerDelivery: messages.footer.delivery,
    footerDeliveryBaku: messages.footer.deliveryBaku,
    footerDeliveryRegions: messages.footer.deliveryRegions,
    footerDeliveryPickup: messages.footer.deliveryPickup,
    footerContact: messages.footer.contact,
    footerAddress: messages.footer.address,
    footerCopyright: messages.footer.copyright,
  };
}
