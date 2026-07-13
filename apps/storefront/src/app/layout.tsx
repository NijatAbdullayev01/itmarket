import type { Metadata } from "next";

import { getStorefrontOrigin } from "@/lib/site-origin";

import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="az">
      <body>{children}</body>
    </html>
  );
}
