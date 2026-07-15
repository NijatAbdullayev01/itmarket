import { Suspense } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { getCart } from "@/lib/api";
import { getGuestCartSession } from "@/lib/cart-session";
import { getStorefrontOrigin } from "@/lib/site-origin";
import { StorefrontShell } from "@itmarket/ui";

import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-sans",
});

export function generateMetadata(): Metadata {
  const origin = getStorefrontOrigin();
  const description =
    "IT Market — texnologiya məhsullarını anlaşılan məlumat və AZN qiymətləri ilə təqdim edən Azərbaycan dilli vitrin.";

  return {
    metadataBase: origin ?? undefined,
    applicationName: "IT Market",
    title: {
      default: "IT Market — texnologiya vitrini",
      template: "%s | IT Market",
    },
    description,
    icons: {
      icon: "/favicon.png",
      apple: "/favicon.png",
    },
    alternates: origin ? { canonical: "/" } : undefined,
    openGraph: {
      type: "website",
      locale: "az_AZ",
      siteName: "IT Market",
      title: "IT Market — texnologiya vitrini",
      description,
      ...(origin ? { url: "/" } : {}),
    },
    robots: origin ? undefined : { index: false, follow: false },
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cartItemCount = await getCartItemCount();

  return (
    <html lang="az" data-scroll-behavior="smooth">
      <body className={inter.variable}>
        <Suspense fallback={null}>
          <StorefrontShell cartItemCount={cartItemCount}>
            {children}
          </StorefrontShell>
        </Suspense>
      </body>
    </html>
  );
}
