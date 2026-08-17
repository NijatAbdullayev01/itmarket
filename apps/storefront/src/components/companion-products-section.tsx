import { ProductCompanionList } from "@itmarket/ui";

import {
  ApiError,
  ApiUnavailableError,
  listCompanionProducts,
} from "@/lib/api";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { getMessages } from "@/lib/i18n";
import { getStorefrontProductDisplayTitleFromSummary } from "@/lib/product-display-title";

import { StorefrontMediaImage } from "./storefront-media-image";

type CompanionProductsSectionProps = {
  slug: string;
  cartId: string;
  buyNowAction: (formData: FormData) => void | Promise<void>;
};

export async function CompanionProductsSection({
  slug,
  cartId,
  buyNowAction,
}: CompanionProductsSectionProps) {
  let items: Awaited<ReturnType<typeof listCompanionProducts>>["items"];
  try {
    ({ items } = await listCompanionProducts(slug));
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return null;
    }
    if (error instanceof ApiError && error.isNotFound) {
      return null;
    }
    throw error;
  }

  if (items.length === 0) {
    return null;
  }

  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  return (
    <ProductCompanionList
      items={items.map((item) => ({
        ...item,
        name: getStorefrontProductDisplayTitleFromSummary(item),
      }))}
      cartId={cartId}
      buyNowAction={buyNowAction}
      copy={{ priceUnavailable: messages.common.priceUnavailable }}
      Image={StorefrontMediaImage}
    />
  );
}

export function CompanionProductsFallback() {
  return (
    <section
      className="ui-product-companions"
      aria-label="Yanında ala biləcəyiniz məhsullar"
      aria-busy="true"
    />
  );
}
