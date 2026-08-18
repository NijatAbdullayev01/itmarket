import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { headers } from "next/headers";

import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Əməliyyat mərkəzi | IT Market",
  description: "IT Market əməkdaşları üçün daxili əməliyyat səthinin statusu.",
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/favicon.png", type: "image/png" }],
    apple: "/favicon.png",
  },
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nocache: true,
  },
};

/**
 * Operations (login included) is a client shell. A static prerender emits
 * `<script>` tags with no request nonce; production CSP then uses
 * `strict-dynamic`, the browser blocks bootstrap JS, and the UI never leaves
 * "Sessiya yoxlanır…". Reading headers() binds the tree to the request so
 * Next can copy `x-nonce` onto those tags.
 */
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await headers();
  return (
    <html
      lang="az"
      data-theme="backoffice"
      className={montserrat.variable}
      suppressHydrationWarning
    >
      <body className={montserrat.className} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
