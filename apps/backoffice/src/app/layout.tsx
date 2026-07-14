import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Əməliyyat mərkəzi | IT Market",
  description: "IT Market əməkdaşları üçün daxili əməliyyat səthinin statusu.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nocache: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="az" data-theme="backoffice">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
