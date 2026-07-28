import {
  ApiUnavailableError,
  getCart,
  listBrands,
  listCategories,
  type BrandSummary,
  type CategorySummary,
} from "@/lib/api";
import { getGuestCartSession } from "@/lib/cart-session";
import {
  HeaderCartLink,
  HeaderCatalogButton,
  HeaderCatalogButtonFallback,
} from "@itmarket/ui";
import {
  getMessages,
  toChromeCopy,
  withLocalizedCategoryNames,
  type Locale,
} from "@/lib/i18n";
import { Suspense } from "react";

async function getCartItemCount(): Promise<number> {
  const session = await getGuestCartSession();
  if (session.cartId === undefined || session.guestToken === undefined) {
    return 0;
  }
  try {
    const cart = await getCart(session.cartId, session.guestToken);
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  } catch {
    return 0;
  }
}

async function getCatalogCategories(): Promise<CategorySummary[]> {
  try {
    return await listCategories();
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return [];
    }
    throw error;
  }
}

async function getCatalogBrands(): Promise<BrandSummary[]> {
  try {
    return await listBrands();
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return [];
    }
    throw error;
  }
}

async function HeaderCatalogButtonLoaded({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);
  const chromeCopy = toChromeCopy(messages);
  const [categories, brands] = await Promise.all([
    getCatalogCategories(),
    getCatalogBrands(),
  ]);

  return (
    <HeaderCatalogButton
      categories={withLocalizedCategoryNames(
        categories,
        messages.catalog.categoryNames,
      )}
      brands={brands}
      labels={{
        catalog: chromeCopy.catalog,
        open: chromeCopy.catalogOpen,
        close: chromeCopy.catalogClose,
        categories: chromeCopy.catalogCategories,
      }}
    />
  );
}

async function HeaderCartLinkLoaded({ locale }: { locale: Locale }) {
  const chromeCopy = toChromeCopy(getMessages(locale));
  const cartItemCount = await getCartItemCount();
  return (
    <HeaderCartLink cartItemCount={cartItemCount} chromeCopy={chromeCopy} />
  );
}

export function StreamingCatalogButton({ locale }: { locale: Locale }) {
  const chromeCopy = toChromeCopy(getMessages(locale));
  return (
    <Suspense
      fallback={
        <HeaderCatalogButtonFallback
          catalogLabel={chromeCopy.catalog}
          openLabel={chromeCopy.catalogOpen}
        />
      }
    >
      <HeaderCatalogButtonLoaded locale={locale} />
    </Suspense>
  );
}

export function StreamingCartLink({ locale }: { locale: Locale }) {
  const chromeCopy = toChromeCopy(getMessages(locale));
  return (
    <Suspense
      fallback={
        <HeaderCartLink
          cartItemCount={0}
          badgePending
          chromeCopy={chromeCopy}
        />
      }
    >
      <HeaderCartLinkLoaded locale={locale} />
    </Suspense>
  );
}
