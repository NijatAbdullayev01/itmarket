import { Suspense } from "react";
import type { Metadata } from "next";
import { Montserrat } from "next/font/google";

import {
  ApiUnavailableError,
  getCart,
  getPrimaryPickupLocation,
  listBrands,
  listCategories,
  type BrandSummary,
  type CategorySummary,
  type PickupLocationSummary,
} from "@/lib/api";
import { getGuestCartSession } from "@/lib/cart-session";
import { getCustomerProfile } from "@/lib/customer-session";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import {
  DEFAULT_LOCALE,
  getMessages,
  localeToHtmlLang,
  localeToOgLocale,
} from "@/lib/i18n";
import {
  buildLocalBusinessJsonLd,
  buildWebSiteJsonLd,
  defaultOgImageUrl,
  noIndexRobots,
  toJsonLd,
} from "@/lib/seo";
import { getStorefrontOrigin } from "@/lib/site-origin";
import { StorefrontAppShell } from "@/components/storefront-app-shell";

import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
  variable: "--font-sans",
});

/** Indexable metadata stays AZ-primary regardless of UI locale cookie. */
export async function generateMetadata(): Promise<Metadata> {
  const messages = getMessages(DEFAULT_LOCALE);
  const origin = getStorefrontOrigin();
  const description = messages.meta.description;
  const ogImage = defaultOgImageUrl();

  return {
    metadataBase: origin ?? undefined,
    applicationName: "IT Market",
    title: {
      default: messages.meta.titleDefault,
      template: messages.meta.titleTemplate,
    },
    description,
    icons: {
      icon: "/favicon.png",
      apple: "/favicon.png",
    },
    openGraph: {
      type: "website",
      locale: localeToOgLocale(DEFAULT_LOCALE),
      siteName: "IT Market",
      title: messages.meta.titleDefault,
      description,
      ...(ogImage
        ? { images: [{ url: ogImage, alt: "IT Market" }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: messages.meta.titleDefault,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    robots: origin ? undefined : noIndexRobots,
  };
}

async function getCartItemCount(): Promise<number> {
  const session = await getGuestCartSession();
  if (session.cartId === undefined) return 0;
  try {
    const cart = await getCart(session.cartId);
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

async function getCatalogPickupLocation(): Promise<PickupLocationSummary | null> {
  try {
    return await getPrimaryPickupLocation();
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return null;
    }
    throw error;
  }
}

export default async function RootLayout({
  children,
  subnav,
}: Readonly<{
  children: React.ReactNode;
  subnav: React.ReactNode;
}>) {
  const [
    locale,
    cartItemCount,
    customer,
    catalogCategories,
    catalogBrands,
    pickupLocation,
  ] = await Promise.all([
    getRequestLocale(),
    getCartItemCount(),
    getCustomerProfile(),
    getCatalogCategories(),
    getCatalogBrands(),
    getCatalogPickupLocation(),
  ]);

  return (
    <html
      lang={localeToHtmlLang(locale)}
      data-scroll-behavior="smooth"
      className={montserrat.variable}
      suppressHydrationWarning
    >
      <body className={montserrat.className} suppressHydrationWarning>
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: toJsonLd(buildLocalBusinessJsonLd(pickupLocation)),
          }}
        />
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: toJsonLd(buildWebSiteJsonLd()),
          }}
        />
        <StorefrontAppShell
          locale={locale}
          cartItemCount={cartItemCount}
          authenticated={customer !== null}
          subnav={subnav}
          catalogCategories={catalogCategories}
          catalogBrands={catalogBrands}
        >
          <Suspense fallback={null}>{children}</Suspense>
        </StorefrontAppShell>
      </body>
    </html>
  );
}
