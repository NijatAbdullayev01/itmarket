import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { Suspense } from "react";

import {
  ApiUnavailableError,
  getPrimaryPickupLocation,
  type PickupLocationSummary,
} from "@/lib/api";
import { StorefrontAppShell } from "@/components/storefront-app-shell";
import {
  StreamingCartLink,
  StreamingCatalogButton,
} from "@/components/streaming-header-slots";
import { getCustomerProfile } from "@/lib/customer-session";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import {
  DEFAULT_LOCALE,
  getMessages,
  localeToHtmlLang,
  localeToOgLocale,
} from "@/lib/i18n";
import {
  azPrimaryLanguageAlternates,
  buildLocalBusinessJsonLd,
  buildWebSiteJsonLd,
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_WIDTH,
  defaultOgImageUrl,
  googleSiteVerification,
  noIndexRobots,
  toJsonLd,
  twitterSiteHandle,
} from "@/lib/seo";
import { getStorefrontOrigin } from "@/lib/site-origin";

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
  const twitterSite = twitterSiteHandle();
  const googleVerification = googleSiteVerification();

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
    alternates: {
      ...azPrimaryLanguageAlternates("/"),
      types: {
        "application/rss+xml": "/blog/rss.xml",
      },
    },
    ...(googleVerification
      ? { verification: { google: googleVerification } }
      : {}),
    openGraph: {
      type: "website",
      locale: localeToOgLocale(DEFAULT_LOCALE),
      siteName: "IT Market",
      title: messages.meta.titleDefault,
      description,
      ...(ogImage
        ? {
            images: [
              {
                url: ogImage,
                alt: "IT Market",
                width: DEFAULT_OG_IMAGE_WIDTH,
                height: DEFAULT_OG_IMAGE_HEIGHT,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: messages.meta.titleDefault,
      description,
      ...(twitterSite ? { site: twitterSite } : {}),
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    robots: origin ? undefined : noIndexRobots,
  };
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

async function DeferredLocalBusinessJsonLd() {
  const pickupLocation = await getCatalogPickupLocation();
  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html: toJsonLd(buildLocalBusinessJsonLd(pickupLocation)),
      }}
    />
  );
}

export default async function RootLayout({
  children,
  subnav,
}: Readonly<{
  children: React.ReactNode;
  subnav: React.ReactNode;
}>) {
  // Cookie-only work — keep the document shell streaming. Catalog/cart APIs
  // load behind Suspense slots so hard refresh is not a blank→dump cliff.
  const [locale, customer] = await Promise.all([
    getRequestLocale(),
    getCustomerProfile(),
  ]);

  return (
    <html
      lang={localeToHtmlLang(locale)}
      data-scroll-behavior="smooth"
      className={montserrat.variable}
      suppressHydrationWarning
    >
      <body className={montserrat.className} suppressHydrationWarning>
        {/*
          Critical brand sizing: logo.png is 2164×416 and is preloaded as LCP.
          External layout.css (~278KB) can arrive after first paint — without this,
          the header logo flashes full-bleed then shrinks.
        */}
        <style
          dangerouslySetInnerHTML={{
            __html:
              ".ui-brand__logo{display:block;height:40px;width:auto;max-width:min(200px,48vw);object-fit:contain}" +
              "@media(max-width:639px){.ui-brand__logo{height:32px;max-width:min(120px,34vw)}}" +
              "@media(max-width:379px){.ui-brand__logo{height:28px;max-width:min(108px,32vw)}}" +
              /* Unsized SVGs default to ~300×150 before CSS — clamp above-the-fold icons. */
              ".ui-usp-card__icon svg{width:28px;height:28px}" +
              ".ui-header-utilities__icon svg{width:24px;height:24px}" +
              ".ui-header-catalog__icon svg{width:20px;height:20px}",
          }}
        />
        <Suspense fallback={null}>
          <DeferredLocalBusinessJsonLd />
        </Suspense>
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: toJsonLd(buildWebSiteJsonLd()),
          }}
        />
        <StorefrontAppShell
          locale={locale}
          authenticated={customer !== null}
          customerId={customer?.id}
          supportMessageInitialName={
            [customer?.firstName, customer?.lastName]
              .map((part) => part?.trim())
              .filter((part): part is string => Boolean(part))
              .join(" ") || undefined
          }
          supportMessageInitialPhone={customer?.phone ?? undefined}
          supportMessageInitialEmail={customer?.email ?? undefined}
          subnav={subnav}
          catalogButton={<StreamingCatalogButton locale={locale} />}
          cartLink={<StreamingCartLink locale={locale} />}
        >
          {children}
        </StorefrontAppShell>
      </body>
    </html>
  );
}
