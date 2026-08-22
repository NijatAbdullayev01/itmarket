import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { headers } from "next/headers";
import Script from "next/script";
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
import { getCustomerChromeProfile } from "@/lib/customer-session";
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
  googleAnalyticsId,
  googleSiteVerification,
  indexableRobots,
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
      icon: [{ url: "/favicon.ico" }, { url: "/favicon.png", type: "image/png" }],
      apple: "/favicon.png",
    },
    manifest: "/manifest.webmanifest",
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
    robots: origin ? indexableRobots : noIndexRobots,
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

async function DeferredLocalBusinessJsonLd({ nonce }: { nonce?: string }) {
  const pickupLocation = await getCatalogPickupLocation();
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
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
  const [locale, customer, reqHeaders] = await Promise.all([
    getRequestLocale(),
    getCustomerChromeProfile(),
    headers(),
  ]);
  const nonce = reqHeaders.get("x-nonce") ?? undefined;
  const gaId = googleAnalyticsId();

  return (
    <html
      lang={localeToHtmlLang(locale)}
      className={montserrat.variable}
      suppressHydrationWarning
    >
      <body className={montserrat.className} suppressHydrationWarning>
        {gaId ? (
          <>
            <Script
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              nonce={nonce}
            />
            <Script
              id="google-analytics"
              strategy="afterInteractive"
              nonce={nonce}
              dangerouslySetInnerHTML={{
                __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}');
`,
              }}
            />
          </>
        ) : null}
        <Suspense fallback={null}>
          <DeferredLocalBusinessJsonLd nonce={nonce} />
        </Suspense>
        <script
          type="application/ld+json"
          nonce={nonce}
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
